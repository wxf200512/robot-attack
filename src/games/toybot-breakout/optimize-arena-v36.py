"""Only normalize atlas cells, anchor planted feet, and encode runtime assets."""
from PIL import Image
from pathlib import Path
import json
r=Path(__file__).resolve().parent
metadata=[]
for kind in ('pulse','heavy','blade','emperor'):
 rows=4 if kind=='emperor' else 6
 cellpx=192 if kind=='emperor' else 128
 raw=Image.open(r/f'art-source/{kind}-arena-v36.png').convert('RGBA')
 atlas=Image.new('RGBA',(cellpx*8,cellpx*rows))
 for row in range(rows):
  for col in range(8):
   cell=raw.crop((round(col*raw.width/8),round(row*raw.height/rows),round((col+1)*raw.width/8),round((row+1)*raw.height/rows)))
   cell=cell.resize((cellpx-8,cellpx-8),Image.Resampling.LANCZOS)
   dy=4
   if kind!='emperor':
    # One stable foot baseline; never resize individual poses by their bounds.
    a=cell.getchannel('A');box=a.crop((round(cell.width*.22),round(cell.height*.45),round(cell.width*.78),cell.height)).point(lambda v:255 if v>180 else 0).getbbox()
    if box:dy=round(cellpx*.89)-(round(cell.height*.45)+box[3])
   atlas.paste(cell,(col*cellpx+4,row*cellpx+dy))
 name='boss-emperor-wide-v36.webp' if kind=='emperor' else f'mech-{kind}-arena-v36.png'
 out=r.parents[2]/'public/games/toybot-breakout/optimized'/name
 if kind=='emperor':atlas.save(out,lossless=True,method=6)
 else:atlas.save(out,optimize=True)
 metadata.append(dict(kind=kind,frames=8*rows,columns=8,rows=rows,width=atlas.width,height=atlas.height,transparentFraction=atlas.getchannel('A').histogram()[0]/(atlas.width*atlas.height),bytes=out.stat().st_size))
(r/'arena-v36.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
print(json.dumps(metadata))
