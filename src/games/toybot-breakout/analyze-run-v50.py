"""Read-only atlas analysis; output anchor metadata, never replace artwork."""
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
import hashlib,json
repo=Path(__file__).resolve().parents[3]
out=Path(__file__).parent
patches={'pulse':(82,82,108,110),'heavy':(64,78,94,108),'blade':(84,66,109,96)}
order=[v for i in range(8) for v in (i,i+8)]
data={};report=[];orders={}
for kind,patch in patches.items():
 p=repo/f'public/games/toybot-breakout/optimized/combat-run-{kind}-v48.webp'
 im=Image.open(p).convert('RGBA');assert im.size==(1536,768)
 data[kind]=[];tier_images=[]
 for tier in range(2):
  frames=[im.crop(((i%8)*192,(tier*2+i//8)*192,(i%8+1)*192,(tier*2+i//8+1)*192)) for i in range(16)]
  template=frames[0].crop(patch).convert('RGB');offsets=[];aligned=[]
  for frame in frames:
   score,dx,dy=min((sum(ImageStat.Stat(ImageChops.difference(template,frame.crop((patch[0]+dx,patch[1]+dy,patch[2]+dx,patch[3]+dy)).convert('RGB'))).mean),dx,dy) for dx in range(-10,11) for dy in range(-10,11))
   offsets.append([-dx,-dy]);canvas=Image.new('RGBA',(192,192));canvas.alpha_composite(frame,(-dx,-dy));black=Image.new('RGB',(192,192));black.paste(canvas,mask=canvas.getchannel('A'));aligned.append(black.crop((35,108,145,181)))
  def jumps(sequence):return [sum(ImageStat.Stat(ImageChops.difference(aligned[a],aligned[b])).mean)/3 for a,b in zip(sequence,sequence[1:]+sequence[:1])]
  old=jumps(list(range(16)));new=jumps(order)
  report.append(dict(kind=kind,tier=tier,oldMean=round(sum(old)/16,2),newMean=round(sum(new)/16,2),oldPeak=round(max(old),2),newPeak=round(max(new),2),offsets=offsets,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
  data[kind].append(offsets)
  tier_images.append(aligned)
 candidates=[list(range(16))]+[[v for i in range(8) for v in (i,8+(i+shift)%8)] for shift in range(8)]
 def quality(sequence,images):
  values=[sum(ImageStat.Stat(ImageChops.difference(images[a],images[b])).mean)/3 for a,b in zip(sequence,sequence[1:]+sequence[:1])]
  return sum(values)/16,max(values)
 baseline=[quality(candidates[0],images) for images in tier_images]
 valid=[seq for seq in candidates if all(quality(seq,images)[0]<=base[0]+.001 and quality(seq,images)[1]<=base[1]+.001 for images,base in zip(tier_images,baseline))]
 selected=min(valid,key=lambda seq:sum(mean+.4*peak for mean,peak in (quality(seq,images) for images in tier_images)))
 orders[kind]=selected
 for tier,images in enumerate(tier_images):
  mean,peak=quality(selected,images);report[-2+tier]['selectedMean']=round(mean,2);report[-2+tier]['selectedPeak']=round(peak,2);report[-2+tier]['order']=selected
(out/'run-registration-analysis-v50.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
(out/'runRegistrationV50.ts').write_text("// Registration offsets in the unchanged 192px V48 atlas cells.\nexport const RUN_REGISTRATION_V50="+json.dumps(data,separators=(',',':'))+" as const;\nexport const RUN_FRAME_ORDER_V50="+json.dumps(orders,separators=(',',':'))+" as const;\n",encoding='utf-8')
print(json.dumps([{k:v for k,v in row.items() if k not in ['offsets','sha256']} for row in report]))
