"""V47 mechanical atlas normalization/cropping/encoding; no art synthesis."""
from pathlib import Path
from PIL import Image
import json
here=Path(__file__).resolve().parent
out=here.parents[2]/'public/games/toybot-breakout/optimized'
meta=[]
for kind in ['pulse','heavy','blade']:
 im=Image.open(here/f'art-source/interface-{kind}-v47.png').convert('RGBA')
 atlas=Image.new('RGBA',(1536,768))
 for cell in range(8):
  x=cell%4;y=cell//4
  crop=im.crop((round(x*im.width/4),round(y*im.height/2),round((x+1)*im.width/4),round((y+1)*im.height/2)))
  crop.thumbnail((368,368),Image.Resampling.LANCZOS)
  atlas.alpha_composite(crop,(x*384+(384-crop.width)//2,y*384+(384-crop.height)//2))
 p=out/f'showcase-{kind}-v47.webp';atlas.save(p,'WEBP',quality=94,method=6,alpha_quality=100)
 meta.append(dict(file=p.name,width=1536,height=768,frames=8,bytes=p.stat().st_size))
im=Image.open(here/'art-source/interface-hangar-v47.png').convert('RGB');im.thumbnail((810,1080),Image.Resampling.LANCZOS)
p=out/'interface-hangar-v47.jpg';im.save(p,quality=91,optimize=True);meta.append(dict(file=p.name,bytes=p.stat().st_size))
im=Image.open(here/'art-source/interface-chrome-v47.png').convert('RGBA')
for cell,name in enumerate(['gold','steel','panel','selected']):
 x=cell%2;y=cell//2;crop=im.crop((round(x*im.width/2),round(y*im.height/2),round((x+1)*im.width/2),round((y+1)*im.height/2)))
 box=crop.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox();assert box
 crop=crop.crop(box).resize((512,512),Image.Resampling.LANCZOS)
 p=out/f'interface-{name}-v47.webp';crop.save(p,'WEBP',lossless=True,method=6);meta.append(dict(file=p.name,width=512,height=512,bytes=p.stat().st_size))
im=Image.open(here/'art-source/interface-equipment-v47.png').convert('RGBA').resize((768,512),Image.Resampling.LANCZOS)
p=out/'interface-equipment-v47.webp';im.save(p,'WEBP',quality=94,method=6,alpha_quality=100);meta.append(dict(file=p.name,width=768,height=512,frames=6,bytes=p.stat().st_size))
(here/'interface-art-v47.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
print(json.dumps(dict(files=len(meta),bytes=sum(m['bytes'] for m in meta))))
