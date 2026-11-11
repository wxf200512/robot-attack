from pathlib import Path
from PIL import Image
import json,hashlib
G=Path(__file__).resolve().parent; R=G.parents[2]; A=G/'art-source'; O=R/'public/games/toybot-breakout/optimized'
sources={'pulse':[('packed',4,0),('packed',4,0)],'heavy':[('packed',8,0),('packed',8,2)],'blade':[('packed',4,0),('packed',4,0)]}
manifest=[]
for kind,skins in sources.items():
 out=Image.new('RGBA',(1536,768)); skinmeta=[]
 for tier,(name,cols,start) in enumerate(skins):
  dest=A/f'run-whole-{kind}-{tier}-v56.png'
  im=Image.open(dest).convert('RGBA');rows=4;cw=im.width/cols;ch=im.height/rows
  cells=[im.crop((round((i%cols)*cw),round((start+i//cols)*ch),round((i%cols+1)*cw),round((start+i//cols+1)*ch))) for i in range(16)]
  # Reject the upgraded pulse frame with an erroneous extra left-hand cannon.
  frame_map=list(range(16));
  if kind=='pulse':frame_map=[9,10,11,2,3,4,5,6,8,7,4,3,2,12,14,15]
  if kind=='heavy':frame_map=[0,14,15,2,10,5,3,4,7,8,12,9,6,11,1,13]
  boxes=[c.getchannel('A').point(lambda a:255 if a>96 else 0).getbbox() for c in cells]
  scale=min(166/max(b[3]-b[1] for b in boxes),148/max(b[2]-b[0] for b in boxes))
  for slot,source in enumerate(frame_map):
   c=cells[source];b=boxes[source]
   # Register the head, not a changing foot/arm silhouette; one scale per skin.
   head=c.getchannel('A').crop((round(c.width*.27),b[1],round(c.width*.73),min(c.height,b[1]+round(c.height*.25))))
   hb=head.point(lambda a:255 if a>180 else 0).getbbox();cx=c.width*.27+(hb[0]+hb[2])/2 if hb else c.width/2
   scaled=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.LANCZOS)
   x=round(96-cx*scale);y=round(12-b[1]*scale)
   cell=Image.new('RGBA',(192,192));cell.alpha_composite(scaled,(x,y));out.alpha_composite(cell,((slot%8)*192,(tier*2+slot//8)*192))
  skinmeta.append({'source':dest.name,'frameMap':frame_map,'scale':scale})
 file=f'combat-run-{kind}-v56.webp';out.save(O/file,'WEBP',lossless=True,method=6)
 manifest.append({'kind':kind,'file':file,'columns':8,'rows':4,'slotsPerSkin':16,'skins':skinmeta,'sha256':hashlib.sha256((O/file).read_bytes()).hexdigest()})
(G/'gait-v56.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
