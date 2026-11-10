from PIL import Image, ImageOps
from pathlib import Path
import json, hashlib

ROOT=Path(__file__).resolve().parents[3]
GAME=Path(__file__).resolve().parent
OUT=ROOT/'public/games/toybot-breakout/optimized'
GEN=GAME/'art-source'
INPUTS={k:'run-legs-'+k+'-v52.png' for k in ['pulse','heavy','blade']}
# Hip seam measured against the existing 192px character cells. Only AI-painted
# legs replace the old same-leg poses; head, gun and upgraded armor stay intact.
CONFIG={'pulse':(124,6,99),'heavy':(127,5,98),'blade':(119,4,95)}
report=[]
for kind,name in INPUTS.items():
    src=Image.open(GEN/name).convert('RGBA')
    assert src.getpixel((0,0))[3]==0, 'Generated background must actually be transparent'
    old=Image.open(ROOT/f'public/games/toybot-breakout/optimized/combat-run-{kind}-v48.webp').convert('RGBA')
    seam,dy,axis=CONFIG[kind]
    legs=[]
    for i in range(8):
        x,y=i%4,i//4
        crop=src.crop((round(x*src.width/4),round(y*src.height/2),round((x+1)*src.width/4),round((y+1)*src.height/2))).resize((192,192),Image.Resampling.LANCZOS)
        leg=Image.new('RGBA',(192,192))
        leg.alpha_composite(crop,(0,dy))
        leg.paste((0,0,0,0),(0,0,192,seam))
        legs.append(leg)
    if kind=='blade':
        # The generated second row repeats a left support. Build the opposite
        # half from the authored first half by reflecting LEGS ONLY at the hip.
        # Sword, torso, backpack and hands are never reflected.
        for i in range(4):
            mirrored=ImageOps.mirror(legs[i])
            leg=Image.new('RGBA',(192,192));leg.alpha_composite(mirrored,(2*axis-192,0))
            legs[i+4]=leg
    atlas=Image.new('RGBA',(1536,768))
    for tier in range(2):
        torso=old.crop((0,tier*384,192,tier*384+192))
        torso.paste((0,0,0,0),(0,seam,192,192))
        for i in range(16):
            cell=Image.new('RGBA',(192,192));cell.alpha_composite(legs[i//2]);cell.alpha_composite(torso)
            atlas.alpha_composite(cell,((i%8)*192,(tier*2+i//8)*192))
    # Bilateral pose evidence: soles alternate which side extends toward camera.
    foot_deltas=[]
    for leg in legs:
        bottoms=[]
        for left,right in [(axis-42,axis-6),(axis+6,axis+42)]:
            box=leg.getchannel('A').crop((left,seam,right,192)).point(lambda a:255 if a>96 else 0).getbbox()
            bottoms.append(seam+box[3] if box else seam)
        foot_deltas.append(bottoms[0]-bottoms[1])
    assert sum(v>3 for v in foot_deltas)>=2 and sum(v<-3 for v in foot_deltas)>=2, 'Both legs must lead'
    for tier in range(2):
        reference=atlas.crop((0,tier*384,192,tier*384+seam)).tobytes()
        for i in range(16):
            x,y=(i%8)*192,(tier*2+i//8)*192
            assert atlas.crop((x,y,x+192,y+seam)).tobytes()==reference, 'Upper body drift or accidental mirroring'
    atlas.save(OUT/f'combat-run-{kind}-v52.webp',format='WEBP',lossless=True)
    report.append({'kind':kind,'source':name,'seam':seam,'legOffsetY':dy,'hipAxisX':axis,'authoredPhases':8,'footDepthDifference':foot_deltas,'timelineSlots':16,'frameMap':[i//2 for i in range(16)],'sha256':hashlib.sha256((OUT/f'combat-run-{kind}-v52.webp').read_bytes()).hexdigest()})
(GAME/'gait-v52.json').write_text(json.dumps(report,indent=2))
