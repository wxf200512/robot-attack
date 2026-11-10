"""Rebuild the three runtime portraits from preserved Image Gen PNG originals."""
from pathlib import Path
import json
from PIL import Image
here=Path(__file__).resolve().parent
runtime=(here/'../../../public/games/toybot-breakout/optimized').resolve()
records=[]
for name in ['maya','ethan','nora']:
    with Image.open(here/f'art-source/crew-{name}-v45.png') as original:
        image=original.convert('RGBA')
        assert image.getchannel('A').getextrema()[0]==0
        image.thumbnail((768,768),Image.Resampling.LANCZOS)
        target=runtime/f'crew-{name}-v45.webp'
        image.save(target,'WEBP',quality=91,method=6,alpha_quality=100)
        records.append({'id':name,'width':image.width,'height':image.height,'bytes':target.stat().st_size,'alpha':True})
(here/'crew-art-v45.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
print('Rebuilt three transparent crew portraits.')
