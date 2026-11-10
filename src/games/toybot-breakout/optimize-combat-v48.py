"""V48 mechanical cell normalization and encoding. Source artwork retained."""
from pathlib import Path
from PIL import Image
import json,hashlib
here=Path(__file__).resolve().parent;out=here.parents[2]/'public/games/toybot-breakout/optimized';meta=[]
def atlas(name,cols,rows,pixels=192):
 im=Image.open(here/f'art-source/combat-{name}-v48.png').convert('RGBA');target=Image.new('RGBA',(cols*pixels,rows*pixels));hashes=[]
 for y in range(rows):
  for x in range(cols):
   cell=im.crop((round(x*im.width/cols),round(y*im.height/rows),round((x+1)*im.width/cols),round((y+1)*im.height/rows)))
   cell.thumbnail((pixels-8,pixels-8),Image.Resampling.LANCZOS)
   assert cell.getchannel('A').getbbox(),(name,x,y)
   target.alpha_composite(cell,(x*pixels+(pixels-cell.width)//2,y*pixels+(pixels-cell.height)//2));hashes.append(hashlib.sha256(cell.tobytes()).hexdigest())
 p=out/f'combat-{name}-v48.webp';target.save(p,'WEBP',quality=94,method=6,alpha_quality=100);meta.append(dict(file=p.name,width=target.width,height=target.height,columns=cols,rows=rows,frames=cols*rows,distinctFrames=len(set(hashes)),bytes=p.stat().st_size))
for kind in ['pulse','heavy','blade']:atlas('run-'+kind,8,4);atlas('arena-'+kind,8,6)
atlas('blade-strike',8,4);atlas('gate',4,2,256)
im=Image.open(here/'art-source/combat-cockpit-v48.png').convert('RGBA').resize((1536,512),Image.Resampling.LANCZOS);p=out/'combat-cockpit-v48.webp';im.save(p,'WEBP',quality=95,method=6,alpha_quality=100);meta.append(dict(file=p.name,width=1536,height=512,bytes=p.stat().st_size))
# Extract the generated circular equipment core; no synthesized replacement art.
im=Image.open(here/'art-source/interface-equipment-v47.png').convert('RGBA');im=im.crop((im.width//3,im.height//2,im.width*2//3,im.height)).resize((256,256),Image.Resampling.LANCZOS);p=out/'combat-reactor-v48.webp';im.save(p,'WEBP',quality=95,method=6,alpha_quality=100);meta.append(dict(file=p.name,width=256,height=256,bytes=p.stat().st_size))
im=Image.open(here/'art-source/combat-roads-v48.png').convert('RGB')
for i in range(5):
 cell=im.crop((round(i*im.width/5)+1,0,round((i+1)*im.width/5)-1,im.height)).resize((512,512),Image.Resampling.LANCZOS);p=out/f'combat-road-{i+1}-v48.webp';cell.save(p,'WEBP',quality=91,method=6);meta.append(dict(file=p.name,width=512,height=512,bytes=p.stat().st_size))
# Existing five guardians retain independent motion sheets; crop matching small HUD portraits.
im=Image.open(out/'boss-roster-ai-v2.webp').convert('RGBA');faces=Image.new('RGBA',(480,96));cw=im.width/4;ch=im.height/5
for i in range(5):
 cell=im.crop((round(cw*.18),round(ch*(i+.04)),round(cw*.82),round(ch*(i+.68)))).resize((96,96),Image.Resampling.LANCZOS);faces.alpha_composite(cell,(i*96,0))
p=out/'combat-boss-icons-v48.webp';faces.save(p,'WEBP',quality=95,method=6,alpha_quality=100);meta.append(dict(file=p.name,width=480,height=96,frames=5,bytes=p.stat().st_size))
(here/'combat-art-v48.json').write_text(json.dumps(meta,indent=2),encoding='utf-8');print(json.dumps(dict(files=len(meta),bytes=sum(m['bytes'] for m in meta),frames=sum(m.get('frames',0) for m in meta))))
