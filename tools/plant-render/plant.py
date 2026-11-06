# Genera una planta procedural y la renderiza girando, con fondo transparente.
# Uso: blender -b -P plant.py -- --out DIR [--frames 48] [--res 480] [--samples 48] [--only 0] [--seed 7]
import argparse, math, random, sys, os
import bpy, bmesh
from mathutils import Vector, Matrix, Quaternion

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--out', required=True)
ap.add_argument('--frames', type=int, default=48)
ap.add_argument('--res', type=int, default=480)
ap.add_argument('--samples', type=int, default=48)
ap.add_argument('--only', type=int, default=-1)
ap.add_argument('--seed', type=int, default=7)
args = ap.parse_args(argv)
rng = random.Random(args.seed)

# Elevación de cámara equivalente a ALPHA = 58° de Tent3D (piso * 0.53, altura * 0.85).
ELEVATION = math.radians(32)
ORTHO = 1.25
TARGET_Z = 0.47
WORLD_UP = Vector((0, 0, 1))


class MeshBuilder:
    def __init__(self, *attrs):
        self.verts, self.faces = [], []
        self.attrs = {a: [] for a in attrs}

    def add(self, co, **vals):
        self.verts.append(tuple(co))
        for k in self.attrs:
            self.attrs[k].append(vals.get(k, 0.0))
        return len(self.verts) - 1

    def build(self, name, material, parent):
        me = bpy.data.meshes.new(name)
        me.from_pydata(self.verts, [], self.faces)
        me.update()
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
        for k, data in self.attrs.items():
            me.attributes.new(k, 'FLOAT', 'POINT').data.foreach_set('value', data)
        me.materials.append(material)
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        ob.parent = parent
        print(f'{name}: {len(me.vertices)} verts')
        return ob


def perp(d):
    p = d.cross(Vector((0.31, 0.57, 0.76)))
    return p.normalized() if p.length > 1e-4 else Vector((1, 0, 0))


def tube(mb, pts, radii, sides=8, **vals):
    base = len(mb.verts)
    n = perp((pts[1] - pts[0]).normalized())
    for i, p in enumerate(pts):
        d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        n = (n - d * n.dot(d)).normalized()
        b = d.cross(n)
        for s in range(sides):
            a = 2 * math.pi * s / sides
            mb.add(p + (n * math.cos(a) + b * math.sin(a)) * radii[i], **vals)
    for i in range(len(pts) - 1):
        for s in range(sides):
            a, c = base + i * sides + s, base + i * sides + (s + 1) % sides
            mb.faces.append((a, c, c + sides, a + sides))


def bezier(a, b, c, t):
    return a.lerp(b, t).lerp(b.lerp(c, t), t)


def leaflet(mb, origin, d, up, length, half_w, droop, tint, teeth=13):
    """Hoja dentada: cinco filas a lo ancho para el pliegue central y el ahuecado."""
    side = up.cross(d).normalized()
    nrm = d.cross(side).normalized()
    segs = teeth * 2
    rows = (-1.0, -0.5, 0.0, 0.5, 1.0)
    base = len(mb.verts)
    wave = rng.uniform(0, 6.28)
    for i in range(segs + 1):
        t = i / segs
        w = half_w * math.sin(math.pi * t ** 0.62) ** 1.2
        tip = 1.0 if i % 2 else 0.74
        for v in rows:
            e = abs(v)
            width = w * (e * tip + (1 - e))
            x = t * length + (0.012 * length if (i % 2 and e == 1.0) else 0.0)
            z = -droop * length * t * t
            z += e * width * 0.34 - (e ** 2) * width * 0.16
            z += math.sin(t * 9 + wave + v * 1.5) * 0.006 * length * e
            mb.add(origin + d * x + side * (v * width) + nrm * z, u=t, v=v, tint=tint)
    for i in range(segs):
        for r in range(len(rows) - 1):
            a = base + i * len(rows) + r
            mb.faces.append((a, a + 1, a + 1 + len(rows), a + len(rows)))


FINGERS = {
    7: ([-112, -76, -38, 0, 38, 76, 112], [0.36, 0.64, 0.88, 1, 0.88, 0.64, 0.36]),
    5: ([-80, -40, 0, 40, 80], [0.5, 0.82, 1, 0.82, 0.5]),
    3: ([-42, 0, 42], [0.7, 1, 0.7]),
}


def fan(leaves, stems, p, d, up, size, tint):
    d = d.normalized()
    up = (up - d * up.dot(d)).normalized()
    pet_end = p + d * size * 0.5 + WORLD_UP * size * 0.03
    tube(stems, [p, p.lerp(pet_end, 0.5), pet_end], [0.0034, 0.0028, 0.002], sides=5, tint=0.55)
    n = 7 if size > 0.11 else 5 if size > 0.06 else 3
    angles, lens = FINGERS[n]
    for a, l in zip(angles, lens):
        q = Quaternion(up, math.radians(a + rng.uniform(-5, 5)))
        fd = (q @ d).normalized()
        fup = (up + fd * rng.uniform(-0.05, 0.1) + perp(fd) * rng.uniform(-0.12, 0.12)).normalized()
        leaflet(leaves, pet_end, fd, fup, size * l, size * l * 0.108,
                rng.uniform(0.2, 0.42) * (0.6 + 0.4 * l), tint + rng.uniform(-0.05, 0.05))


# Plantilla de cáliz: icosfera estirada hacia la punta.
_bm = bmesh.new()
bmesh.ops.create_icosphere(_bm, subdivisions=2, radius=1.0)
CALYX_V = [v.co.copy() for v in _bm.verts]
CALYX_F = [tuple(v.index for v in f.verts) for f in _bm.faces]
_bm.free()


def calyx(buds, pos, d, size, tint):
    d = d.normalized()
    rot = d.to_track_quat('Z', 'Y')
    base = len(buds.verts)
    for c in CALYX_V:
        z = c.z * 1.25
        taper = 1.0 - 0.52 * max(0.0, c.z) ** 1.5
        co = Vector((c.x * taper * 0.72, c.y * taper * 0.72, z)) * size
        buds.add(pos + rot @ co, tint=tint)
    buds.faces.extend(tuple(base + i for i in f) for f in CALYX_F)


def cola(buds, pistils, leaves, stems, a, b, radius, density=1.0):
    """Racimo fusiforme de cálices, con pelos y hojitas de azúcar."""
    axis = b - a
    length = axis.length
    d = axis.normalized()
    n1 = perp(d)
    n2 = d.cross(n1)
    count = int(300 * density * (length / 0.2) ** 0.8 + 30)
    knot = rng.uniform(0, 6.28)
    for _ in range(count):
        t = rng.random() ** 0.85
        ang = rng.uniform(0, 6.28)
        lump = 0.8 + 0.28 * math.sin(t * 15 + knot + math.sin(ang * 3))
        env = math.sin(math.pi * min(1.0, 0.08 + t * 0.94) ** 0.72) ** 0.62
        r = radius * env * lump * rng.uniform(0.62, 1.08)
        radial = n1 * math.cos(ang) + n2 * math.sin(ang)
        pos = a + axis * t + radial * r
        out = (radial + d * rng.uniform(0.25, 1.0)).normalized()
        size = rng.uniform(0.0062, 0.0108)
        calyx(buds, pos, out, size, rng.random())
        if rng.random() < 0.2:
            tip = pos + out * size * 1.2
            hair = (out + Vector((rng.uniform(-.7, .7), rng.uniform(-.7, .7), rng.uniform(-.2, .8)))).normalized()
            hlen = rng.uniform(0.012, 0.024)
            mid = tip + hair * hlen * 0.55
            end = mid + (hair + Vector((rng.uniform(-.9, .9), rng.uniform(-.9, .9), rng.uniform(-.7, .3)))).normalized() * hlen * 0.5
            tube(pistils, [tip, mid, end], [0.0021, 0.0017, 0.0009], sides=3, tint=rng.random())
    for _ in range(int(18 * density + 6)):
        t = rng.uniform(0.05, 0.98)
        ang = rng.uniform(0, 6.28)
        env = math.sin(math.pi * min(1.0, 0.08 + t * 0.94) ** 0.72) ** 0.62
        radial = n1 * math.cos(ang) + n2 * math.sin(ang)
        pos = a + axis * t + radial * radius * env * 0.7
        out = (radial * 0.75 + d * 0.65).normalized()
        L = rng.uniform(0.028, 0.058)
        leaflet(leaves, pos, out, (d - out * d.dot(out)).normalized() + perp(out) * 0.2, L, L * 0.17,
                rng.uniform(0.1, 0.35), rng.uniform(0.72, 1.0), teeth=6)


def build_plant(parent, mats):
    leaves = MeshBuilder('u', 'v', 'tint')
    sugar = MeshBuilder('u', 'v', 'tint')
    stems = MeshBuilder('tint')
    buds = MeshBuilder('tint')
    pistils = MeshBuilder('tint')

    soil_z = 0.205
    height = 0.72
    # Tallo principal, con una curva apenas perceptible.
    bend = Vector((rng.uniform(-.015, .015), rng.uniform(-.015, .015), 0))
    stem_pts = [Vector((0, 0, soil_z + height * i / 14)) + bend * (i / 14) ** 2 for i in range(15)]
    tube(stems, stem_pts, [0.0115 - 0.0075 * i / 14 for i in range(15)], sides=10, tint=0.4)

    nodes = 8
    az = rng.uniform(0, 6.28)
    for n in range(nodes):
        f = n / (nodes - 1)
        idx = int(2 + f * 11)
        s = stem_pts[idx]
        az += math.radians(90 + rng.uniform(-14, 14))
        for side in (0, math.pi):
            a = az + side + rng.uniform(-.25, .25)
            out = Vector((math.cos(a), math.sin(a), 0))
            blen = (0.31 - 0.2 * f ** 1.1) * rng.uniform(0.85, 1.12)
            rise = 0.27 * (1 - 0.72 * f) * rng.uniform(0.85, 1.15)
            c1 = s + out * blen * 0.55 + WORLD_UP * blen * 0.1
            tip = s + out * blen + WORLD_UP * (blen * 0.5 + rise)
            n_pts = 8
            pts = [bezier(s, c1, tip, i / (n_pts - 1)) for i in range(n_pts)]
            tube(stems, pts, [0.0058 - 0.0038 * i / (n_pts - 1) for i in range(n_pts)], sides=6, tint=0.5)

            # Cogollo en la punta, más chico cuanto más bajo.
            cola_len = 0.075 + 0.085 * (0.3 + 0.7 * f)
            axis_d = (tip - pts[-3]).normalized().lerp(WORLD_UP, 0.75).normalized()
            cola(buds, pistils, sugar, stems, tip - axis_d * cola_len * 0.5, tip + axis_d * cola_len * 0.5,
                 0.03 + 0.016 * f, density=0.8 + 0.35 * f)

            # Hojas de abanico sobre la rama.
            for k, t in enumerate((0.22, 0.42, 0.62, 0.84)):
                p = bezier(s, c1, tip, t)
                for sgn in (-1, 1):
                    ang = a + sgn * rng.uniform(0.55, 1.2)
                    d = Vector((math.cos(ang), math.sin(ang), rng.uniform(-0.06, 0.35)))
                    size = (0.24 - 0.09 * f) * (1 - 0.13 * k) * rng.uniform(0.82, 1.1)
                    up = (WORLD_UP + Vector((rng.uniform(-.2, .2), rng.uniform(-.2, .2), 0))).normalized()
                    fan(leaves, stems, p, d, up, size, 0.28 + 0.5 * (1 - f) * rng.random() + 0.2 * f * rng.random())

    # Cola principal.
    top = stem_pts[-1]
    cola(buds, pistils, sugar, stems, top - WORLD_UP * 0.11, top + WORLD_UP * 0.14, 0.058, density=2.2)
    for i in range(7):
        a = az + i * 2.4
        d = Vector((math.cos(a), math.sin(a), rng.uniform(0.25, 0.7)))
        fan(leaves, stems, top - WORLD_UP * rng.uniform(0.06, 0.15), d, WORLD_UP,
            rng.uniform(0.075, 0.115), rng.uniform(0.45, 0.7))

    leaves.build('leaves', mats['leaf'], parent)
    sugar.build('sugar', mats['sugar'], parent)
    stems.build('stems', mats['stem'], parent)
    buds.build('buds', mats['bud'], parent)
    pistils.build('pistils', mats['pistil'], parent)


def lathe(profile, sides, name, mat, parent):
    bm_verts, faces = [], []
    for r, z in profile:
        for s in range(sides):
            a = 2 * math.pi * s / sides
            bm_verts.append((r * math.cos(a), r * math.sin(a), z))
    for i in range(len(profile) - 1):
        for s in range(sides):
            a, b = i * sides + s, i * sides + (s + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    me = bpy.data.meshes.new(name)
    me.from_pydata(bm_verts, [], faces)
    me.update()
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = parent
    return ob


def build_pot(parent, mats):
    prof = [(0, 0), (0.112, 0), (0.118, 0.006), (0.133, 0.205), (0.1365, 0.218),
            (0.134, 0.225), (0.127, 0.222), (0.124, 0.2)]
    lathe(prof, 96, 'pot', mats['pot'], parent)
    # Tierra: disco con relieve.
    verts, faces, rings, sides = [(0, 0, 0.206)], [], 26, 96
    for r in range(1, rings + 1):
        for s in range(sides):
            a = 2 * math.pi * s / sides
            rad = 0.127 * r / rings
            verts.append((rad * math.cos(a), rad * math.sin(a), 0.206 + rng.uniform(-.0035, .0035)))
    for s in range(sides):
        faces.append((0, 1 + s, 1 + (s + 1) % sides))
    for r in range(rings - 1):
        for s in range(sides):
            a, b = 1 + r * sides + s, 1 + r * sides + (s + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    me = bpy.data.meshes.new('soil')
    me.from_pydata(verts, [], faces)
    me.update()
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    me.materials.append(mats['soil'])
    ob = bpy.data.objects.new('soil', me)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = parent


def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    return m, m.node_tree, m.node_tree.nodes['Principled BSDF']


def attr(nt, name):
    n = nt.nodes.new('ShaderNodeAttribute')
    n.attribute_name = name
    return n.outputs['Fac']


def ramp(nt, fac, stops):
    n = nt.nodes.new('ShaderNodeValToRGB')
    cr = n.color_ramp
    while len(cr.elements) < len(stops):
        cr.elements.new(0.5)
    for el, (pos, col) in zip(cr.elements, stops):
        el.position = pos
        el.color = (*col, 1)
    nt.links.new(fac, n.inputs['Fac'])
    return n.outputs['Color']


def math_node(nt, op, a, b=None):
    n = nt.nodes.new('ShaderNodeMath')
    n.operation = op
    for i, val in enumerate((a, b)):
        if val is None:
            continue
        if isinstance(val, (int, float)):
            n.inputs[i].default_value = val
        else:
            nt.links.new(val, n.inputs[i])
    return n.outputs[0]


def mix_color(nt, a, b, fac, blend='MIX'):
    n = nt.nodes.new('ShaderNodeMix')
    n.data_type = 'RGBA'
    n.blend_type = blend
    nt.links.new(fac, n.inputs['Factor'])
    nt.links.new(a, n.inputs['A'] if False else n.inputs[6])
    if isinstance(b, tuple):
        n.inputs[7].default_value = (*b, 1)
    else:
        nt.links.new(b, n.inputs[7])
    return n.outputs[2]


def leaf_material(name, stops, translucent=0.42):
    m, nt, p = new_mat(name)
    u, v = attr(nt, 'u'), attr(nt, 'v')
    absv = math_node(nt, 'ABSOLUTE', v)
    base = ramp(nt, attr(nt, 'tint'), stops)
    # Nervadura central y laterales.
    mid = math_node(nt, 'LESS_THAN', absv, 0.075)
    wave = math_node(nt, 'SUBTRACT', math_node(nt, 'MULTIPLY', u, 110.0), math_node(nt, 'MULTIPLY', absv, 16.0))
    lateral = math_node(nt, 'POWER', math_node(nt, 'ABSOLUTE', math_node(nt, 'SINE', wave)), 24.0)
    vein = math_node(nt, 'MAXIMUM', mid, math_node(nt, 'MULTIPLY', lateral, 0.42))
    col = mix_color(nt, base, (0.3, 0.46, 0.13), math_node(nt, 'MULTIPLY', vein, 0.62))
    nt.links.new(col, p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.46
    p.inputs['Specular IOR Level'].default_value = 0.45
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.35
    bump.inputs['Distance'].default_value = 0.002
    nt.links.new(math_node(nt, 'MULTIPLY', vein, -1.0), bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], p.inputs['Normal'])
    tr = nt.nodes.new('ShaderNodeBsdfTranslucent')
    bright = mix_color(nt, col, (0.42, 0.72, 0.1), math_node(nt, 'MULTIPLY', absv, 0.0))
    nt.links.new(bright, tr.inputs['Color'])
    mixs = nt.nodes.new('ShaderNodeMixShader')
    mixs.inputs[0].default_value = translucent
    nt.links.new(p.outputs['BSDF'], mixs.inputs[1])
    nt.links.new(tr.outputs['BSDF'], mixs.inputs[2])
    nt.links.new(mixs.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
    return m


def materials():
    mats = {}
    mats['leaf'] = leaf_material('leaf', [(0, (0.022, 0.1, 0.022)), (0.55, (0.045, 0.2, 0.036)), (1, (0.2, 0.35, 0.05))])
    mats['sugar'] = leaf_material('sugar', [(0, (0.05, 0.2, 0.04)), (1, (0.17, 0.36, 0.09))], translucent=0.25)

    m, nt, p = new_mat('stem')
    nt.links.new(ramp(nt, attr(nt, 'tint'), [(0, (0.06, 0.13, 0.03)), (1, (0.1, 0.22, 0.045))]), p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.55
    mats['stem'] = m

    # Cogollos: verde lima con escarcha de tricomas.
    m, nt, p = new_mat('bud')
    base = ramp(nt, attr(nt, 'tint'), [(0, (0.05, 0.19, 0.035)), (0.65, (0.11, 0.33, 0.05)), (1, (0.25, 0.46, 0.1))])
    tc = nt.nodes.new('ShaderNodeTexCoord')
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 420.0
    noise.inputs['Detail'].default_value = 2.0
    nt.links.new(tc.outputs['Object'], noise.inputs['Vector'])
    frost = ramp(nt, noise.outputs['Fac'], [(0.58, (0, 0, 0)), (0.66, (1, 1, 1))])
    col = mix_color(nt, base, (0.9, 0.93, 0.82), math_node(nt, 'MULTIPLY', frost, 0.42))
    nt.links.new(col, p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.32
    p.inputs['Specular IOR Level'].default_value = 0.65
    p.inputs['Subsurface Weight'].default_value = 0.2
    p.inputs['Subsurface Radius'].default_value = (0.01, 0.018, 0.006)
    mats['bud'] = m

    m, nt, p = new_mat('pistil')
    nt.links.new(ramp(nt, attr(nt, 'tint'), [(0, (0.72, 0.62, 0.42)), (0.5, (0.62, 0.24, 0.05)), (1, (0.36, 0.09, 0.015))]), p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.5
    mats['pistil'] = m

    # Maceta de geotextil: trama fina en el relieve.
    m, nt, p = new_mat('pot')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 340.0
    noise.inputs['Detail'].default_value = 3.0
    nt.links.new(tc.outputs['Object'], noise.inputs['Vector'])
    nt.links.new(ramp(nt, noise.outputs['Fac'], [(0.35, (0.016, 0.017, 0.018)), (0.7, (0.055, 0.056, 0.058))]), p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.92
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.55
    bump.inputs['Distance'].default_value = 0.003
    nt.links.new(noise.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], p.inputs['Normal'])
    mats['pot'] = m

    m, nt, p = new_mat('soil')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 170.0
    noise.inputs['Detail'].default_value = 6.0
    nt.links.new(tc.outputs['Object'], noise.inputs['Vector'])
    nt.links.new(ramp(nt, noise.outputs['Fac'], [(0.38, (0.012, 0.007, 0.004)), (0.68, (0.055, 0.032, 0.018))]), p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.95
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.9
    bump.inputs['Distance'].default_value = 0.008
    nt.links.new(noise.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], p.inputs['Normal'])
    mats['soil'] = m
    return mats


def add_light(kind, name, loc, energy, color, size=None, target=(0, 0, 0.5)):
    data = bpy.data.lights.new(name, kind)
    data.energy = energy
    data.color = color
    if size is not None:
        data.size = size
    ob = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return ob


def setup_scene():
    sc = bpy.context.scene
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob)
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = args.samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.02
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 6
    sc.cycles.transparent_max_bounces = 2
    sc.render.film_transparent = True
    sc.render.resolution_x = sc.render.resolution_y = args.res
    sc.render.use_persistent_data = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.compression = 40
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Medium High Contrast'
    sc.view_settings.exposure = 0.25

    world = bpy.data.worlds.new('w')
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.42, 0.5, 0.42, 1)
    bg.inputs['Strength'].default_value = 0.2
    sc.world = world

    cam_data = bpy.data.cameras.new('cam')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = ORTHO
    cam = bpy.data.objects.new('cam', cam_data)
    sc.collection.objects.link(cam)
    target = Vector((0, 0, TARGET_Z))
    cam.location = target + Vector((0, -math.cos(ELEVATION), math.sin(ELEVATION))) * 5
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam

    # Panel LED arriba, relleno frontal suave y contraluz para recortar la silueta.
    add_light('AREA', 'key', (0.12, -0.25, 2.1), 58, (1.0, 0.95, 0.86), size=1.5)
    add_light('AREA', 'fill', (-1.5, -1.6, 0.8), 11, (0.86, 0.95, 1.0), size=1.6)
    add_light('AREA', 'rim', (1.1, 1.5, 1.35), 30, (0.82, 1.0, 0.66), size=0.9)

    bpy.ops.mesh.primitive_plane_add(size=4, location=(0, 0, 0))
    bpy.context.active_object.is_shadow_catcher = True

    rig = bpy.data.objects.new('rig', None)
    sc.collection.objects.link(rig)
    return sc, rig


sc, rig = setup_scene()
mats = materials()
build_pot(rig, mats)
build_plant(rig, mats)
args.out = os.path.abspath(args.out)
os.makedirs(args.out, exist_ok=True)

indices = [args.only] if args.only >= 0 else range(args.frames)
for i in indices:
    # Sentido igual al de Tent3D: la vista gira -theta alrededor de Z.
    rig.rotation_euler = (0, 0, -2 * math.pi * i / args.frames)
    sc.render.filepath = os.path.join(args.out, f'f{i:03d}.png')
    bpy.ops.render.render(write_still=True)
print('LISTO')
