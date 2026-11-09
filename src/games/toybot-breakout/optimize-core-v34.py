"""Mechanical 8x3 atlas normalization; preserve AI-generated RGBA."""
from pathlib import Path
import json
from PIL import Image
root = Path(__file__).resolve().parent
metadata = []
for kind in ('pulse','heavy','blade'):
    source = root / f'art-source/core-{kind}-v34.png'
    out = root.parents[2] / f'public/games/toybot-breakout/optimized/core-{kind}-v34.png'
    with Image.open(source) as raw:
        raw = raw.convert('RGBA')
        atlas = Image.new('RGBA',(1536,576))
        for row in range(3):
            for col in range(8):
                cell = raw.crop((round(col*raw.width/8),round(row*raw.height/3),round((col+1)*raw.width/8),round((row+1)*raw.height/3)))
                cell = cell.resize((160,160),Image.Resampling.LANCZOS)
                atlas.paste(cell,(col*192+16,row*192+16))
        atlas.save(out,optimize=True)
        metadata.append(dict(kind=kind,width=1536,height=576,columns=8,rows=3,frames=24,transparentFraction=atlas.getchannel('A').histogram()[0]/(1536*576),bytes=out.stat().st_size))
(root/'core-vfx-v34.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
print(json.dumps(metadata))
