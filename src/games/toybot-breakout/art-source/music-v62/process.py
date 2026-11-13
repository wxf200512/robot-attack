from pathlib import Path
import subprocess,json,wave,hashlib
import numpy as np
import imageio_ffmpeg
ROOT=Path(__file__).parent;FF=imageio_ffmpeg.get_ffmpeg_exe();SR=22050
recipes=[
 {'id':'road-soft','file':'battle-theme.mp3','start':8,'seconds':60,'filter':'highpass=f=55,lowpass=f=4800,equalizer=f=2600:t=q:w=0.8:g=-3.5,equalizer=f=180:t=q:w=0.8:g=1.2,loudnorm=I=-20:TP=-2:LRA=7','source':'battle-theme','purpose':'普通关：较柔和的管弦乐推进'},
 {'id':'boss-rock','file':'boss-battle-theme.mp3','start':25,'seconds':64,'filter':'highpass=f=45,lowpass=f=6200,equalizer=f=3100:t=q:w=0.9:g=-3,loudnorm=I=-18:TP=-2:LRA=8','source':'boss-battle-theme','purpose':'首领战：摇滚与管弦乐混合'},
 {'id':'boss-orchestra','file':'hope.flac','start':0,'seconds':60,'filter':'atempo=0.9,highpass=f=50,lowpass=f=5800,equalizer=f=2800:t=q:w=0.8:g=-2.5,loudnorm=I=-18.5:TP=-2:LRA=8','source':'hope','purpose':'首领战备选：明亮管弦乐，165 BPM放缓至约148.5'}
]
report=[]
def save(file,data):
 with wave.open(str(file),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((np.clip(data,-1,1)*32767).astype('<i2').tobytes())
for r in recipes:
 cross=.24;duration=r['seconds'];need=duration+cross
 cmd=[FF,'-v','error','-ss',str(r['start']),'-i',str(ROOT/r['file']),'-af',r['filter'],'-t',str(need),'-ar',str(SR),'-ac','2','-f','f32le','pipe:1']
 raw=subprocess.run(cmd,check=True,capture_output=True).stdout;data=np.frombuffer(raw,dtype='<f4').reshape(-1,2).copy();n=int(duration*SR);c=int(cross*SR);assert len(data)>=n+c,(r['id'],len(data))
 # Fold the post-loop tail over the first 240ms; full mix retained, not isolated stems.
 loop=data[:n].copy();u=np.linspace(0,1,c)[:,None];smooth=u*u*(3-2*u);loop[:c]=data[n:n+c]*(1-smooth)+data[:c]*smooth
 peak=float(np.max(np.abs(loop)));assert np.isfinite(loop).all()
 if peak>.85:loop*=.85/peak
 peak=float(np.max(np.abs(loop)));rms=float(np.sqrt(np.mean(loop.astype(np.float64)**2)))
 file=ROOT/(r['id']+'-loop.wav');save(file,loop)
 # Listening preview includes an actual wrap at 10s, not just the opening.
 preview=np.concatenate([loop[-10*SR:],loop[:20*SR]]);fade=int(.05*SR);preview[:fade]*=np.linspace(0,1,fade)[:,None];preview[-fade:]*=np.linspace(1,0,fade)[:,None]
 save(ROOT/(r['id']+'-preview.wav'),preview)
 compressed=ROOT/(r['id']+'-loop.mp3');subprocess.run([FF,'-v','error','-y','-i',str(file),'-c:a','libmp3lame','-b:a','128k',str(compressed)],check=True)
 report.append({**r,'loopSeconds':len(loop)/SR,'channels':2,'sampleRate':SR,'peak':peak,'rms':rms,'boundaryDelta':float(np.max(np.abs(loop[-1]-loop[0]))),'output':compressed.name,'sha256':hashlib.sha256(compressed.read_bytes()).hexdigest(),'edits':['excerpt selection','equalization and lowpass','loudness processing','240ms overlap loop','stereo MP3 export']})
 print(json.dumps(report[-1],ensure_ascii=False),flush=True)
(ROOT/'adaptation-report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
