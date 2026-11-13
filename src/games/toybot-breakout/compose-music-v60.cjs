/* V60 original electro-breaks score. Offline, deterministic stereo synthesis.
   node src/games/toybot-breakout/compose-music-v60.cjs <lame.all.js> <preview.wav>
   Encoder is a development tool only; no runtime dependency or remote music. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const box={};vm.runInNewContext(fs.readFileSync(process.argv[2],'utf8'),box);
const scope={exports:{}};new Function('exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'musicTracks.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(scope.exports);
const {MUSIC_TRACKS,musicLoopStart,musicLoopEnd}=scope.exports,SR=22050,TAU=2*Math.PI;
const profiles=[
 {root:40,chords:[0,8,3,10],hook:[0,0,7,10,7,3,5,7],kick:[0,1.5,2,2.75],snare:[1,3],style:'road'},
 {root:38,chords:[0,0,1,7],hook:[0,0,3,0,7,5,3,1],kick:[0,1.75,2.5],snare:[2],style:'forge'},
 {root:42,chords:[0,8,10,7],hook:[0,7,12,10,7,3,10,7],kick:[0,1.5,2.75],snare:[1,3],style:'hive'},
 {root:36,chords:[0,8,5,7],hook:[0,0,7,0,3,5,7,3],kick:[0,1.5,2,3.5],snare:[1,3],style:'fortress'},
 {root:47,chords:[0,5,8,7],hook:[0,7,3,10,7,12,10,3],kick:[0,.75,2,2.75],snare:[1,3],style:'storm'},
 {root:38,chords:[0,8,5,7],hook:[0,7,10,12,10,7,3,5],kick:[0,1.5,2,2.75],snare:[1,3],style:'emperor'}
];
const renders=[],metrics=[];
function render(track,p,index){
 const beat=60/track.bpm,N=Math.round(musicLoopEnd(track)*SR),loop=Math.round(musicLoopStart(track)*SR),L=new Float64Array(N),R=new Float64Array(N);let seed=60017+index*97;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
 function add(at,dur,gain,pan,fn,wrap=true){const start=Math.round(at*SR),len=Math.ceil(dur*SR),l=Math.sqrt((1-pan)/2),r=Math.sqrt((1+pan)/2);for(let i=0;i<len;i++){let j=start+i;if(j>=N){if(!wrap)break;j=loop+(j-N)%(N-loop);}if(j<0)continue;const t=i/SR,x=fn(t,i)*gain*Math.min(1,t/.003,(dur-t)/.018);L[j]+=x*l;R[j]+=x*r;}}
 function note(midi,at,dur,type,gain,pan=0,wrap=true){const f=440*2**((midi-69)/12);add(at,dur,gain,pan,t=>{const a=TAU*f*t,u=t/dur;
  if(type==='bass')return Math.tanh((Math.sin(a)+.24*Math.sin(a*2)+.1*Math.sin(a*3))*1.8)*Math.exp(-u*2.4);
  if(type==='stab')return (Math.sin(a)+.3*Math.sin(a*2)+.18*Math.sin(a*3)+.07*Math.sin(a*5))*Math.exp(-u*4);
  if(type==='pad')return (Math.sin(a)+.25*Math.sin(a*1.003)+.12*Math.sin(a*2))*Math.min(1,t/.14)*Math.sin(Math.PI*u);
  if(type==='metal')return (Math.sin(a)+.22*Math.sin(a*2.71)+.07*Math.sin(a*4.13))*Math.exp(-u*6);
  return (Math.sin(a+.35*Math.sin(a*2))+.13*Math.sin(a*3))*Math.exp(-u*3.5);
 },wrap);}
 function drum(kind,at,gain,pan=0,wrap=true){let last=0;const d={kick:.28,snare:.16,hat:.045,tom:.24,clank:.12}[kind];add(at,d,gain,pan,t=>{const n=rand(),hi=n-last*.82;last=n;
  if(kind==='kick')return Math.sin(TAU*(49*t+90*.019*(1-Math.exp(-t/.019))))*Math.exp(-t*15)+n*.05*Math.exp(-t*160);
  if(kind==='snare')return hi*.6*Math.exp(-t*27)+Math.sin(TAU*174*t)*.29*Math.exp(-t*31);
  if(kind==='hat')return hi*.3*Math.exp(-t*100);
  if(kind==='tom')return Math.sin(TAU*(72*t+45*.027*(1-Math.exp(-t/.027))))*Math.exp(-t*18)+n*.07*Math.exp(-t*25);
  return (Math.sin(TAU*610*t)+.4*Math.sin(TAU*1291*t))*Math.exp(-t*60)+hi*.13*Math.exp(-t*60);
 },wrap);}
 const bars=track.introBars+track.loopBars;
 for(let bar=0;bar<bars;bar++){
  const intro=bar<track.introBars,k=intro?bar:bar-track.introBars,at=bar*beat*4,root=p.root+p.chords[Math.floor(k/2)%4],wrap=!intro;
  // One recognizable eight-note hook, voiced sparingly; the transient band is reserved for weapons.
  for(const [j,n]of [0,3,7].entries())note(root+n+12,at,beat*4.2,'pad',intro?.035:.018,(j-1)*.5,wrap);
  if(intro){drum('tom',at,.35,0,false);note(p.root,at,beat*3.8,'bass',.19,0,false);
   if(p.style==='forge')for(const b of [1.5,3])drum('clank',at+b*beat,.1,b===3?.3:-.3,false);
   if(p.style==='hive'||p.style==='storm')for(let j=0;j<8;j++)note(root+p.hook[j]+12,at+j*beat/2,beat*.36,'pluck',.05,j%2?.4:-.4,false);
   if(p.style==='fortress'||p.style==='emperor')for(const b of [1,2,3,3.5])drum('snare',at+b*beat,.12,0,false);
   if(bar===track.introBars-1)for(let j=0;j<8;j++)drum('tom',at+beat*2+j*beat/4,.07+j*.014,(j%2-.5)*.3,false);
   continue;
  }
  const section=Math.floor(k/4)%4,breakdown=section===2&&k%4<2;
  for(const b of p.kick)if(!breakdown||b===0)drum('kick',at+b*beat,.44);
  for(const b of p.snare)drum('snare',at+b*beat,breakdown?.12:.25);
  const hats=p.style==='hive'||p.style==='storm'?16:8;
  for(let j=0;j<hats;j++)if(!breakdown||j%4===0)drum('hat',at+j*beat*4/hats,j%2?.09:.065,j%2?.32:-.32);
  const bassSteps=p.style==='forge'?[0,1.5,2,2.75,3.5]:[0,.75,1.5,2,2.75,3.5];
  for(const b of bassSteps)note(root+(b===2.75?7:0),at+b*beat,beat*.4,'bass',breakdown?.12:.23);
  for(const b of [0,1.5,2.75])if(!breakdown){note(root+12,at+b*beat,beat*.22,'stab',.055,-.22);note(root+19,at+b*beat+.012,beat*.2,'stab',.035,.22);}
  if(k%4===0||section===3)for(let j=0;j<8;j++){if(p.style==='forge'&&j%2)continue;note(p.root+p.hook[j]+24,at+j*beat/2,beat*.38,p.style==='forge'?'metal':'pluck',p.style==='forge'?.045:.047,j%2?.25:-.25);}
  if(p.style==='forge')for(const b of [1.5,3.5])drum('clank',at+b*beat,.12,b===1.5?-.4:.4);
  if(p.style==='fortress')for(const b of [2.75,3.75])drum('snare',at+b*beat,.09);
  if(p.style==='storm')for(let j=0;j<8;j++)note(root+[0,7,12,3][j%4]+24,at+j*beat/2,beat*.18,'pluck',.027,j%2?.5:-.5);
  if(p.style==='emperor'&&section!==2)for(const b of [0,2])note(root+7,at+b*beat,beat*.65,'stab',.065);
  if(k%4===3&&!breakdown)for(const [j,b]of [3,3.5,3.75].entries())drum('tom',at+b*beat,.13+j*.025,(j-1)*.3);
 }
 // Short stereo reflections, with tails folded into the loop rather than cut.
 const dryL=L.slice(),dryR=R.slice();for(let i=0;i<N;i++){let j=i+Math.round(beat*.75*SR);if(j>=N)j=loop+(j-N)%(N-loop);L[j]+=dryR[i]*.1;R[j]+=dryL[i]*.1;}
 let sum=0,peak=0;for(let i=0;i<N;i++){L[i]=Math.tanh(L[i]*1.35);R[i]=Math.tanh(R[i]*1.35);sum+=(L[i]**2+R[i]**2)/2;peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]));}
 const gain=Math.min(.62/peak,.11/Math.sqrt(sum/N));for(const a of [L,R]){for(let i=0;i<N;i++)a[i]*=gain;for(let j=0;j<220;j++){const u=j/219;a[N-220+j]=a[N-220+j]*(1-u)+a[loop]*u;}for(let j=0;j<180;j++)a[j]*=j/180;}
 return {L,R,seconds:N/SR,rms:Math.sqrt(sum/N)*gain,peak:peak*gain};
}
const output=path.resolve(__dirname,'../../../public/games/toybot-breakout/music');
for(const [i,t]of MUSIC_TRACKS.entries()){
 const a=render(t,profiles[i],i),enc=new box.lamejs.Mp3Encoder(2,SR,64),chunks=[];
 for(let k=0;k<a.L.length;k+=1152){const n=Math.min(1152,a.L.length-k),l=new Int16Array(n),r=new Int16Array(n);for(let j=0;j<n;j++){l[j]=Math.round(a.L[k+j]*32767);r[j]=Math.round(a.R[k+j]*32767);}const b=enc.encodeBuffer(l,r);if(b.length)chunks.push(Buffer.from(b));}chunks.push(Buffer.from(enc.flush()));const file=path.join(output,path.basename(t.url));fs.writeFileSync(file,Buffer.concat(chunks));metrics.push({id:t.id,bpm:t.bpm,seconds:a.seconds,bytes:fs.statSync(file).size,peak:a.peak,rms:a.rms,channels:2});renders.push(a);console.log(JSON.stringify(metrics.at(-1)));
}
fs.writeFileSync(path.join(__dirname,'music-v60.json'),JSON.stringify({sampleRate:SR,bitrate:64,tracks:metrics},null,2)+'\n');
if(process.argv[3]){const parts=renders.map(a=>({L:a.L.slice(0,SR*9),R:a.R.slice(0,SR*9)})),N=parts.reduce((n,a)=>n+a.L.length+SR*.4,0),b=Buffer.alloc(44+N*4);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(SR,24);b.writeUInt32LE(SR*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(N*4,40);let at=0;for(const a of parts){for(let j=0;j<a.L.length;j++){const fade=Math.min(1,(a.L.length-j)/(SR*.06));b.writeInt16LE(Math.round(a.L[j]*fade*32767),44+(at+j)*4);b.writeInt16LE(Math.round(a.R[j]*fade*32767),46+(at+j)*4);}at+=a.L.length+SR*.4;}fs.writeFileSync(process.argv[3],b);}

