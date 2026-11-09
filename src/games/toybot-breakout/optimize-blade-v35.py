from pathlib import Path
from PIL import Image
import json
r=Path(__file__).resolve().parent
raw=Image.open(r/'art-source/mech-blade-attack-v35.png').convert('RGBA')
atlas=Image.new('RGBA',(1024,512))
for row in range(4):
 for col in range(8):
  cell=raw.crop((round(col*raw.width/8),round(row*raw.height/4),round((col+1)*raw.width/8),round((row+1)*raw.height/4)))
  cell=cell.resize((120,120),Image.Resampling.LANCZOS)
  atlas.paste(cell,(col*128+4,row*128+4))
out=r.parents[2]/'public/games/toybot-breakout/optimized/mech-blade-attack-v35.png'
atlas.save(out,optimize=True)
(r/'blade-motion-v35.json').write_text(json.dumps(dict(frames=32,framesPerTier=16,columns=8,rows=4,transparentFraction=atlas.getchannel('A').histogram()[0]/(1024*512),bytes=out.stat().st_size),indent=2))
