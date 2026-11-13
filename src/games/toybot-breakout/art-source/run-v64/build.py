from pathlib import Path
from PIL import Image
from scipy import ndimage as nd
import numpy as np
import json,hashlib,shutil,sys
R=Path(sys.argv[1] if len(sys.argv)>1 else 'E:/H5_game/fb-bored-day-games-repo').resolve();G=R/'src/games/toybot-breakout';P=R/'public/games/toybot-breakout/optimized';W=Path(__file__).parent
A=G/'art-source/run-v64';A.mkdir(exist_ok=True)

def flow(a,b):
 # Coarse-to-fine optical correspondence; baking only, never a runtime dependency.
 x=np.array(a).astype(float)/255;y=np.array(b).astype(float)/255
 ga=(x[:,:,:3]*np.array([.21,.72,.07])).sum(2)*x[:,:,3]+x[:,:,3]*.25
 gb=(y[:,:,:3]*np.array([.21,.72,.07])).sum(2)*y[:,:,3]+y[:,:,3]*.25
 u=v=None
 for size in [24,48,96,192]:
  aa=nd.zoom(ga,size/192,order=1);bb=nd.zoom(gb,size/192,order=1);yy,xx=np.mgrid[:size,:size].astype(float)
  if u is None:u=np.zeros_like(aa);v=np.zeros_like(aa)
  else:u=nd.zoom(u,2,order=1)*2;v=nd.zoom(v,2,order=1)*2
  for k in range(8):
   warped=nd.map_coordinates(bb,[yy+v,xx+u],order=1,mode='constant');gy,gx=np.gradient((aa+warped)/2);dt=warped-aa
   s=lambda z:nd.gaussian_filter(z,1.5)
   ax=s(gx*gx)+.0003;ay=s(gy*gy)+.0003;axy=s(gx*gy);bx=-s(gx*dt);by=-s(gy*dt);det=ax*ay-axy*axy
   du=(bx*ay-by*axy)/det;dv=(by*ax-bx*axy)/det
   u=nd.gaussian_filter(u+np.clip(du,-1.5,1.5),.45);v=nd.gaussian_filter(v+np.clip(dv,-1.5,1.5),.45)
 return u,v
def tween(a,b,ab,ba,t):
 yy,xx=np.mgrid[:192,:192].astype(float)
 def warp(im,f,amount):
  x=np.array(im).astype(float)/255;x[:,:,:3]*=x[:,:,3:4]
  return np.stack([nd.map_coordinates(x[:,:,c],[yy-amount*f[1],xx-amount*f[0]],order=1,mode='constant') for c in range(4)],axis=2)
 x=warp(a,ab,t)*(1-t)+warp(b,ba,1-t)*t;alpha=x[:,:,3:4];x[:,:,:3]=np.divide(x[:,:,:3],alpha,out=np.zeros_like(x[:,:,:3]),where=alpha>.001)
 return Image.fromarray((np.clip(x,0,1)*255).astype('uint8'))
meta=[];gifs={}
for kind in ['pulse','heavy','blade']:
 old=Image.open(P/f'combat-run-{kind}-v56.webp').convert('RGBA');out=Image.new('RGBA',(1536,1536));preview=[]
 for tier in [0,1]:
  cells=[old.crop(((i%8)*192,(tier*2+i//8)*192,(i%8+1)*192,(tier*2+i//8+1)*192)) for i in [0,2,3]]
  clean=[]
  for c in cells:
   x=np.array(c);labels,n=nd.label(x[:,:,3]>96);counts=np.bincount(labels.ravel());counts[0]=0;mask=nd.binary_dilation(labels==counts.argmax(),iterations=2);x[:,:,3]*=mask;c=Image.fromarray(x);clean.append(c)
  # Alternate the legs only. Preserve the right-hand weapon and the whole upper silhouette.
  for c in clean[:3]:
   mirrored=c.copy();region=c.crop((46,111,146,192)).transpose(Image.Transpose.FLIP_LEFT_RIGHT);mirrored.paste(region,(46,111));clean.append(mirrored)
  frames=[]
  for i,a in enumerate(clean):
   b=clean[(i+1)%6];ab=flow(a,b);ba=flow(b,a)
   for j in range(32):
    phase=j/32*6
    if int(phase)==i:frames.append((j,tween(a,b,ab,ba,phase-i)))
  frames=sorted(frames)
  for j,c in frames:out.alpha_composite(c,((j%8)*192,(tier*4+j//8)*192))
  if tier==0:preview=[c for _,c in frames]
 file=P/f'combat-run-{kind}-v64.webp';out.save(file,'WEBP',lossless=True,method=6)
 meta.append({'kind':kind,'file':file.name,'frames':32,'rows':8,'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'source':f'combat-run-{kind}-v56.webp','sourceCells':[0,2,3],'method':'full-silhouette optical inbetweening, mirrored lower gait only, fixed right-hand aim, no runtime joint reconstruction'})
 bg=Image.new('RGB',(240,240),'#18394a');gif=[]
 for c in preview:
  f=bg.copy();f.paste(c,(24,24),c);gif.append(f)
 gif[0].save(W/f'run-{kind}-v64.gif',save_all=True,append_images=gif[1:],duration=30,loop=0)
(G/'run-v64.json').write_text(json.dumps(meta,indent=2),encoding='utf8')
if Path(__file__).resolve()!=(A/'build.py').resolve():shutil.copy2(__file__,A/'build.py')
(A/'README.md').write_text('V64 keeps the existing V56 complete character raster shapes. Offline processing removes disconnected alpha specks, establishes alternating left/right leg passes and computes 32 optical in-between cells per equipment tier. No runtime cutout puppet, body-part scaling, new rig model or character redesign. Upper right-hand weapon is never mirrored. Sources remain in the public V56 atlas and original V56 art-source files. Development-only tools: Pillow, numpy, scipy. Runtime uses the existing atlas presentation clock. Generated candidates from the rejected cutout experiment are kept outside the repository.\n',encoding='utf8')
print(json.dumps(meta,indent=2))
