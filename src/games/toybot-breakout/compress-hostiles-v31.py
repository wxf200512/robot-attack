"""Mechanical PNG -> WebP encoding only; keep the drawn sprites and alpha."""
import sys
from PIL import Image
with Image.open(sys.argv[1]) as image:
    image.convert('RGBA').save(sys.argv[2], 'WEBP', quality=90, method=6, exact=True)
