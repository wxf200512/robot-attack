"""Run after historical art generators to migrate their optimized PNG outputs.
Original art-source files are never changed. Uses existing Pillow, no runtime dependency.
"""
from pathlib import Path
import json
from PIL import Image

here=Path(__file__).resolve().parent
root=(here/'../../../public/games/toybot-breakout/optimized').resolve()
manifest=json.loads((here/'asset-migration-v43.json').read_text(encoding='utf-8'))
for item in manifest['converted']:
    source=(root/item['from']).resolve()
    target=(root/item['to']).resolve()
    assert source.parent==root and target.parent==root
    if not source.exists():
        assert target.is_file(),target
        continue
    with Image.open(source) as image:
        image.save(target,'WEBP',lossless=True,method=4,exact=True)
        with Image.open(target) as decoded:
            assert image.convert('RGBA').tobytes()==decoded.convert('RGBA').tobytes(),source
    source.unlink()
print('Runtime lossless migration complete; original artwork preserved.')
