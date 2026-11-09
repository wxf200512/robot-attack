from PIL import Image
from pathlib import Path
import json
r=Path(__file__).resolve().parent
raw=Image.open(r/'art-source/road-tiles-v37.png').convert('RGB')
meta=[]
for i in range(5):
 tile=raw.crop((round(i*raw.width/5),0,round((i+1)*raw.width/5),raw.height)).resize((256,256),Image.Resampling.LANCZOS)
 out=r.parents[2]/f'public/games/toybot-breakout/optimized/road-{i+1}-v37.webp'
 tile.save(out,quality=88,method=6)
 meta.append(dict(level=i,width=256,height=256,bytes=out.stat().st_size))
(r/'road-tiles-v37.json').write_text(json.dumps(meta,indent=2))
