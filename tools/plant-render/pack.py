# Une los cuadros en una hoja de sprites WebP: pack.py DIR_CUADROS SALIDA [calidad]
# La sombra se desvanece antes del borde del cuadro; el follaje y la maceta no se tocan.
import glob, os, sys
from PIL import Image, ImageChops, ImageFilter
frames = sorted(glob.glob(os.path.join(sys.argv[1], 'f*.png')))
q = int(sys.argv[3]) if len(sys.argv) > 3 else 82
size = Image.open(frames[0]).width
cols = 7
rows = (len(frames) + cols - 1) // cols
ANCHOR_Y = 0.819
# Degradé elíptico centrado en la base de la maceta, en 0 antes de llegar al borde.
w, h = int(size * 0.96), int(size * 0.34)
blob = ImageChops.invert(Image.radial_gradient('L')).resize((w, h)).point(lambda v: min(255, int(max(0, v - 8) * 1.9)))
falloff = Image.new('L', (size, size), 0)
falloff.paste(blob, ((size - w) // 2, min(size - h, int(size * ANCHOR_Y - h / 2))))
falloff = falloff.filter(ImageFilter.GaussianBlur(size * 0.012))
sheet = Image.new('RGBA', (cols * size, rows * size), (0, 0, 0, 0))
for i, f in enumerate(frames):
    im = Image.open(f).convert('RGBA')
    r, g, b, a = im.split()
    luma = im.convert('RGB').convert('L')
    solid = luma.point(lambda v: 255 if v > 14 else 0).filter(ImageFilter.GaussianBlur(1.2))
    im.putalpha(ImageChops.multiply(a, ImageChops.lighter(falloff, solid)))
    sheet.paste(im, ((i % cols) * size, (i // cols) * size))
sheet.save(sys.argv[2], 'WEBP', quality=q, alpha_quality=90, method=6)
print(len(frames), 'cuadros', sheet.size, os.path.getsize(sys.argv[2]) // 1024, 'KB')
