from pathlib import Path
import json, subprocess, hashlib, wave, shutil, sys
import numpy as np
import imageio_ffmpeg

R=Path(sys.argv[1] if len(sys.argv)>1 else 'E:/H5_game/fb-bored-day-games-repo').resolve(); G=R/'src/games/toybot-breakout'; P=R/'public/games/toybot-breakout'
W=Path(__file__).parent; A=G/'art-source/audio-v64'; A.mkdir(exist_ok=True)
FF=imageio_ffmpeg.get_ffmpeg_exe(); SR=22050
def decode(file,filters='',start=0,seconds=None):
 cmd=[FF,'-v','error','-ss',str(start),'-i',str(file)]
 if filters:cmd+=['-af',filters]
 if seconds:cmd+=['-t',str(seconds)]
 return np.frombuffer(subprocess.run(cmd+['-ar',str(SR),'-ac','2','-f','f32le','pipe:1'],check=True,capture_output=True).stdout,dtype='<f4').reshape(-1,2).copy()
def wav(file,data):
 with wave.open(str(file),'wb') as w:
  w.setnchannels(1 if data.ndim==1 else 2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((np.clip(data,-1,1)*32767).astype('<i2').tobytes())
def digest(file):return hashlib.sha256(file.read_bytes()).hexdigest()

# Archive contains BY 3.0, so retain that stricter license even though the upload page says CC0.
src=A if (A/'cz.wav').exists() else W/'licensed-sfx-v64/originals/sounds'
for name in ['cz.wav','mosin.wav','creativecommons.txt']:
 if (src/name).resolve()!=(A/name).resolve():shutil.copy2(src/name,A/name)
old=json.loads((G/'sfx-v63.json').read_text()); raw=decode(P/'sfx/combat-samples-v63.wav').mean(axis=1)
clips=[];cells={};reports=[];offset=0
for cue,c in old['cells'].items():
 a=raw[round(c['start']*SR):round((c['start']+c['duration'])*SR)].copy()
 if cue in ['pulse','heavy']:
  source='cz.wav' if cue=='pulse' else 'mosin.wav'
  x=decode(A/source,'highpass=f=170,lowpass=f=3500,equalizer=f=2300:t=q:w=1:g=-4').mean(axis=1)
  # Choose the first recorded shot rather than a loud later shot in the multi-shot file.
  env=np.convolve(np.abs(x),np.ones(220)/220,mode='same'); idx=np.flatnonzero(env>env.max()*.18);first=max(0,int(idx[0])-44)
  n=int((.10 if cue=='pulse' else .23)*SR);a=x[first:first+n].copy();a-=a.mean()
  if cue=='heavy':a[:min(len(a),len(raw))]+=raw[:len(a)]*.035
  peak=max(.0001,float(np.max(np.abs(a))));rms=max(.0001,float(np.sqrt(np.mean(a*a))));a*=min(.55/peak,.105/rms)
  fade=min(len(a)//3,int(.025*SR));a[:22]*=np.linspace(0,1,22);a[-fade:]*=np.linspace(1,0,fade)
 gain=.78 if cue in ['hit','armor-hit','destroy'] else .9 if cue in ['hit-heavy','hit-blade'] else 1
 a*=gain
 cells[cue]={'start':offset/SR,'duration':len(a)/SR};clips.extend([a,np.zeros(1102,dtype=np.float32)]);offset+=len(a)+1102
 reports.append({'cue':cue,'peak':float(np.max(np.abs(a))),'rms':float(np.sqrt(np.mean(a*a)))})
file=P/'sfx/combat-samples-v64.wav';wav(file,np.concatenate(clips))
(G/'sampleAtlasV64.ts').write_text("export const SAMPLE_URL_V64='/games/toybot-breakout/sfx/combat-samples-v64.wav';\nexport const SAMPLE_CELLS_V64:Record<string,{start:number;duration:number}>="+json.dumps(cells)+";\n",encoding='utf8')
music=[]
recipes=[
 ('furnace','boss-battle-theme.mp3',25,64,1,'equalizer=f=170:t=q:w=1:g=2','熔炉重锤：低鼓与铜管'),
 ('queen','hope.flac',4,60,1.02,'equalizer=f=850:t=q:w=1:g=1','蜂群追猎：快速弦乐'),
 ('fortress','boss-battle-theme.mp3',65,64,.87,'equalizer=f=140:t=q:w=1:g=3,lowpass=f=4200','钢铁壁垒：慢速重鼓'),
 ('oracle','hope.flac',12,60,.86,'equalizer=f=1600:t=q:w=1:g=1','极性跃迁：舒展管弦'),
 ('emperor','boss-battle-theme.mp3',97,64,1.04,'equalizer=f=650:t=q:w=1:g=1.5','终局指令：紧迫重奏'),
]
for id,name,start,duration,tempo,eq,title in recipes:
 source=G/'art-source/music-v62'/name
 filt=f'atempo={tempo},highpass=f=55,lowpass=f=6000,{eq},loudnorm=I=-18:TP=-2:LRA=8'
 a=decode(source,filt,start,duration+.3);n=int(duration*SR);c=int(.25*SR)
 if len(a)<n+c:raise ValueError((name,start,len(a)/SR))
 data=a[:n].copy();u=np.linspace(0,1,c)[:,None];u=u*u*(3-2*u);data[:c]=a[n:n+c]*(1-u)+data[:c]*u
 if np.max(np.abs(data))>.82:data*=.82/np.max(np.abs(data))
 temp=A/(id+'.wav');wav(temp,data);file=P/'music'/('boss-'+id+'-v64.mp3')
 subprocess.run([FF,'-v','error','-y','-i',str(temp),'-c:a','libmp3lame','-b:a','64k',str(file)],check=True)
 temp.unlink()
 music.append({'id':id,'title':title,'file':file.name,'seconds':duration,'original':name,'sourceStart':start,'tempo':tempo,'filter':filt,'sha256':digest(file),'rms':float(np.sqrt(np.mean(data.astype(float)**2))),'peak':float(np.max(np.abs(data)))})
manifest={'sfx':{'file':'combat-samples-v64.wav','sha256':digest(P/'sfx/combat-samples-v64.wav'),'cells':cells,'measurements':reports,'sourceFiles':[{'file':n,'sha256':digest(A/n)} for n in ['cz.wav','mosin.wav']],'author':'Vincent Sevedge','uploader':'Tabasco','page':'https://opengameart.org/content/gunshot-sounds','license':'CC-BY 3.0 (archive license)','licenseUrl':'https://creativecommons.org/licenses/by/3.0/','changes':'first transient extraction, 170Hz highpass, 3.5kHz lowpass, short decay, reduced RMS; remaining cues derived from V63 CC0 masters'},'music':music,'musicSources':'art-source/music-v62/sources.json'}
(G/'audio-v64.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False),encoding='utf8')
if Path(__file__).resolve()!=(A/'build.py').resolve():shutil.copy2(__file__,A/'build.py')
(A/'README.md').write_text('V64 audio sources and edits are recorded in ../../audio-v64.json. Gun recordings: Vincent Sevedge, uploaded by Tabasco at https://opengameart.org/content/gunshot-sounds . The page lists CC0 but the archive includes CC-BY 3.0; this project conservatively complies with the included BY 3.0 license and displays credit in audio settings. Source license is preserved in creativecommons.txt. Kenney/qubodup layers remain credited in V63. Music uses existing licensed V62 source masters; V64 contains five separately edited boss excerpts, not five original compositions. Development tools: numpy, imageio-ffmpeg. No game dependency added.\n',encoding='utf8')
print(json.dumps({'sfxBytes':(P/'sfx/combat-samples-v64.wav').stat().st_size,'bossFiles':[m['file'] for m in music]},indent=2))
