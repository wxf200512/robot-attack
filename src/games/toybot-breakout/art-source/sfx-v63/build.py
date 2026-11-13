from pathlib import Path
import numpy as np,subprocess,wave,json,hashlib,shutil,sys
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parent;REPO=Path(sys.argv[1]).resolve();SRC=REPO/'src/games/toybot-breakout/art-source/sfx-v63';SRC.mkdir(exist_ok=True);PUB=REPO/'public/games/toybot-breakout/sfx';PUB.mkdir(exist_ok=True)
FF=imageio_ffmpeg.get_ffmpeg_exe();SR=22050;used=set()
def read(name,rate=1):
 path=ROOT/name;used.add(name);raw=subprocess.run([FF,'-v','error','-i',str(path),'-af',f'asetrate=44100*{rate},aresample={SR},highpass=f=65,lowpass=f=4800','-ac','1','-ar',str(SR),'-f','f32le','pipe:1'],check=True,capture_output=True).stdout
 a=np.frombuffer(raw,dtype='<f4').copy();peak=max(.0001,float(np.max(np.abs(a))));idx=np.flatnonzero(np.abs(a)>peak*.02);return a[max(0,idx[0]-44):] if len(idx) else a
K='scifi/Audio/'
recipes={
'pulse':[(K+'laserSmall_002.ogg',1,.7),(K+'impactMetal_001.ogg',1.2,.3)],
'heavy':[(K+'laserLarge_001.ogg',.8,.6),(K+'lowFrequency_explosion_000.ogg',1,.4)],
'blade':[('swish/swosh-04.flac',1.2,1)],
'hit':[(K+'impactMetal_001.ogg',1,.9)],
'hit-heavy':[(K+'impactMetal_003.ogg',.8,.55),(K+'explosionCrunch_001.ogg',1,.45)],
'hit-blade':[(K+'impactMetal_004.ogg',1.1,.7),('swish/swosh-08.flac',1.3,.3)],
'armor-hit':[(K+'impactMetal_000.ogg',1,.8)],
'armor-break':[(K+'impactMetal_002.ogg',.9,.45),(K+'explosionCrunch_003.ogg',1.2,.55)],
'armor-block':[(K+'impactMetal_003.ogg',1,.7)],
'destroy':[(K+'explosionCrunch_002.ogg',1,.65),(K+'lowFrequency_explosion_001.ogg',1,.35)],
'elite-break':[(K+'explosionCrunch_004.ogg',.85,.6),(K+'lowFrequency_explosion_001.ogg',.9,.4)],
'shield':[(K+'forceField_000.ogg',1.15,1)],
'shield-break':[(K+'forceField_002.ogg',.9,.5),(K+'explosionCrunch_000.ogg',1.3,.5)],
'damage':[(K+'impactMetal_003.ogg',.75,.6),(K+'explosionCrunch_001.ogg',1.2,.4)],
'dodge':[('swish/swosh-12.flac',1.3,1)],
'blade-finisher':[('swish/swosh-08.flac',.9,.5),(K+'impactMetal_004.ogg',.8,.5)],
'burst-pulse':[(K+'forceField_004.ogg',1,.5),(K+'laserLarge_002.ogg',.9,.5)],
'burst-heavy':[(K+'explosionCrunch_004.ogg',.75,.55),(K+'lowFrequency_explosion_000.ogg',.8,.45)],
'burst-blade':[('swish/swosh-12.flac',.8,.5),(K+'impactMetal_002.ogg',.85,.5)]}
atlas=[];cells={};offset=0;preview=[];reports=[]
for cue,layers in recipes.items():
 duration=.16 if cue=='pulse' else .2 if cue in ['hit','armor-hit','blade','dodge'] else .65 if cue.startswith('burst') or cue=='elite-break' else .38
 n=int(SR*duration);a=np.zeros(n,dtype=np.float32)
 for name,rate,gain in layers:
  x=read(name,rate);x=x[:n];x=x/(max(.0001,float(np.max(np.abs(x)))));a[:len(x)]+=x*gain
 a-=np.mean(a);peak=max(.0001,float(np.max(np.abs(a))));rms=max(.0001,float(np.sqrt(np.mean(a*a))));a*=min(.7/peak,.15/rms)
 fade=min(441,n//5);a[:66]*=np.linspace(0,1,66);a[-fade:]*=np.linspace(1,0,fade)
 cells[cue]={'start':offset/SR,'duration':n/SR};atlas.extend([a,np.zeros(1102,dtype=np.float32)]);offset+=n+1102
 reports.append({'cue':cue,'layers':layers,'duration':n/SR,'peak':float(np.max(np.abs(a))),'rms':float(np.sqrt(np.mean(a*a)))})
 if cue in ['pulse','hit','heavy','hit-heavy','blade','hit-blade','destroy','shield','shield-break','damage']:
  preview.extend([a,np.zeros(int(SR*.4),dtype=np.float32)])
def wav(file,a):
 with wave.open(str(file),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((np.clip(a,-1,1)*32767).astype('<i2').tobytes())
file=PUB/'combat-samples-v63.wav';wav(file,np.concatenate(atlas));wav(ROOT/'combat-sfx-v63-preview.wav',np.concatenate(preview))
for name in used:
 target=SRC/name;target.parent.mkdir(parents=True,exist_ok=True);
 if (ROOT/name).resolve()!=target.resolve():shutil.copy2(ROOT/name,target)
if (ROOT/'scifi/License.txt').exists():shutil.copy2(ROOT/'scifi/License.txt',SRC/'KENNEY_LICENSE.txt')
rows=[]
for name in sorted(used):data=(ROOT/name).read_bytes();rows.append({'file':name,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'author':'qubodup' if name.startswith('swish') else 'Kenney','license':'CC0 1.0'})
manifest={'sampleRate':SR,'channels':1,'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'sources':[{'author':'Kenney','page':'https://kenney.nl/assets/sci-fi-sounds','downloadPage':'https://opengameart.org/content/sci-fi-sounds'},{'author':'qubodup','page':'https://opengameart.org/content/swish-bamboo-stick-weapon-swhoshes'}],'sourceFiles':rows,'cues':reports,'cells':cells}
(REPO/'src/games/toybot-breakout/sfx-v63.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(REPO/'src/games/toybot-breakout/sampleAtlasV63.ts').write_text("export const SAMPLE_URL_V63='/games/toybot-breakout/sfx/combat-samples-v63.wav';\nexport const SAMPLE_CELLS_V63:Record<string,{start:number;duration:number}>="+json.dumps(cells)+";\n",encoding='utf-8')
print('cues',len(cells),'atlas bytes',file.stat().st_size,'source files',len(used))
