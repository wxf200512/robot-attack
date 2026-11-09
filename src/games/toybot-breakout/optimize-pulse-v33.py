"""Mechanical atlas sizing only: 8 columns x 3 rows, original RGBA retained."""
from pathlib import Path
import json
from PIL import Image
root = Path(__file__).resolve().parent
source = root / 'art-source/pulse-vfx-v33.png'
out = root.parents[2] / 'public/games/toybot-breakout/optimized/pulse-vfx-v33.png'
with Image.open(source) as raw:
    raw = raw.convert('RGBA')
    atlas = Image.new('RGBA', (1024, 384))
    for row in range(3):
        for col in range(8):
            cell = raw.crop((round(col*raw.width/8), round(row*raw.height/3), round((col+1)*raw.width/8), round((row+1)*raw.height/3)))
            cell = cell.resize((120,120), Image.Resampling.LANCZOS)
            atlas.paste(cell, (col*128+4,row*128+4))
    atlas.save(out, optimize=True)
    alpha = atlas.getchannel('A')
    meta = {'width':1024,'height':384,'columns':8,'rows':3,'frames':24,'transparentFraction':alpha.histogram()[0]/(1024*384),'bytes':out.stat().st_size}
    (root / 'pulse-vfx-v33.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
    print(json.dumps(meta))
