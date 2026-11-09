"""Mechanical crop, atlas assembly, resize and encoding only; originals retained."""
from pathlib import Path
from PIL import Image
import json
r=Path(__file__).resolve().parent
out=r.parents[2]/'public/games/toybot-breakout/optimized'
meta=[]
comic=Image.open(r/'art-source/story-comic-v38.png').convert('RGB')
for i in range(4):
 x=i%2;y=i//2
 cell=comic.crop((round(x*comic.width/2)+2,round(y*comic.height/2)+2,round((x+1)*comic.width/2)-2,round((y+1)*comic.height/2)-2)).resize((768,768),Image.Resampling.LANCZOS)
 p=out/f'story-comic-{i+1}-v38.jpg';cell.save(p,quality=90,optimize=True);meta.append(dict(kind='comic',index=i,bytes=p.stat().st_size))
raw=Image.open(r/'art-source/story-chapters-v38.png').convert('RGB')
for i in range(5):
 atlas=Image.new('RGB',(512,768))
 for frame in range(6):
  cell=raw.crop((round(i*raw.width/5)+1,round(frame*raw.height/6)+1,round((i+1)*raw.width/5)-1,round((frame+1)*raw.height/6)-1)).resize((256,256),Image.Resampling.LANCZOS)
  atlas.paste(cell,((frame%2)*256,(frame//2)*256))
 p=out/f'chapter-film-{i+1}-v38.jpg';atlas.save(p,quality=89,optimize=True);meta.append(dict(kind='chapter',index=i,frames=6,bytes=p.stat().st_size))
raw=Image.open(r/'art-source/part-damage-v38.png').convert('RGBA');atlas=Image.new('RGBA',(1024,384))
for row in range(3):
 for col in range(8):
  cell=raw.crop((round(col*raw.width/8),round(row*raw.height/3),round((col+1)*raw.width/8),round((row+1)*raw.height/3))).resize((120,120),Image.Resampling.LANCZOS)
  atlas.paste(cell,(col*128+4,row*128+4))
p=out/'part-damage-v38.png';atlas.save(p,optimize=True);meta.append(dict(kind='damage',frames=24,transparentFraction=atlas.getchannel('A').histogram()[0]/(1024*384),bytes=p.stat().st_size))
(r/'story-art-v38.json').write_text(json.dumps(meta,indent=2),encoding='utf-8');print(json.dumps(meta))
