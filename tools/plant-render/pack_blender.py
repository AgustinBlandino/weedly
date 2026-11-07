# Une los cuadros en una hoja de sprites WebP, sin dependencias: solo el Python que trae Blender.
# Uso: blender -b -P pack_blender.py -- DIR_CUADROS SALIDA [calidad]
# Hace lo mismo que pack.py: la sombra se desvanece antes del borde del cuadro; el follaje y la maceta no se tocan.
import glob, os, sys
import bpy
import numpy as np

argv = sys.argv[sys.argv.index('--') + 1:]
frames = sorted(glob.glob(os.path.join(argv[0], 'f*.png')))
out = os.path.abspath(argv[1])
quality = int(argv[2]) if len(argv) > 2 else 82
COLS = 7 if len(frames) > 1 else 1
ANCHOR_Y = 0.819


def load(path):
    im = bpy.data.images.load(path)
    im.colorspace_settings.name = 'Non-Color'
    im.alpha_mode = 'STRAIGHT'
    w, h = im.size
    px = np.empty(w * h * 4, dtype=np.float32)
    im.pixels.foreach_get(px)
    bpy.data.images.remove(im)
    return np.flipud(px.reshape(h, w, 4))


def blur(a, sigma):
    r = max(1, int(sigma * 3))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    a = np.apply_along_axis(lambda m: np.convolve(m, k, mode='same'), 0, a)
    return np.apply_along_axis(lambda m: np.convolve(m, k, mode='same'), 1, a)


first = load(frames[0])
size = first.shape[0]
# Degradé elíptico centrado en la base de la maceta, en 0 antes de llegar al borde.
w, h = int(size * 0.96), int(size * 0.34)
ys, xs = np.mgrid[0:h, 0:w]
dist = np.hypot((xs + 0.5 - w / 2) / (w / 2), (ys + 0.5 - h / 2) / (h / 2))
blob = np.clip((1 - dist) * 255 - 8, 0, None) * 1.9 / 255
falloff = np.zeros((size, size), dtype=np.float32)
left, top = (size - w) // 2, min(size - h, int(size * ANCHOR_Y - h / 2))
falloff[top:top + h, left:left + w] = np.clip(blob, 0, 1)
falloff = blur(falloff, size * 0.012)

rows = (len(frames) + COLS - 1) // COLS
sheet = np.zeros((rows * size, COLS * size, 4), dtype=np.float32)
for i, path in enumerate(frames):
    im = first if i == 0 else load(path)
    luma = im[..., 0] * 0.299 + im[..., 1] * 0.587 + im[..., 2] * 0.114
    solid = blur((luma > 14 / 255).astype(np.float32), 1.2)
    im = im.copy()
    im[..., 3] *= np.maximum(falloff, solid)
    x, y = (i % COLS) * size, (i // COLS) * size
    sheet[y:y + size, x:x + size] = im

result = bpy.data.images.new('sheet', COLS * size, rows * size, alpha=True, float_buffer=True)
result.colorspace_settings.name = 'Non-Color'
result.alpha_mode = 'STRAIGHT'
result.pixels.foreach_set(np.flipud(sheet).ravel())

scene = bpy.context.scene
settings = scene.render.image_settings
settings.file_format = 'WEBP'
settings.color_mode = 'RGBA'
settings.quality = quality
settings.color_management = 'OVERRIDE'
settings.view_settings.view_transform = 'Raw'
settings.view_settings.look = 'None'
settings.linear_colorspace_settings.name = 'Non-Color'
result.save_render(out, scene=scene)
print(len(frames), 'cuadros', (COLS * size, rows * size), os.path.getsize(out) // 1024, 'KB')
