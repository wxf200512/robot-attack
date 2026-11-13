/* Original score + local synthesis. No runtime dependency. Regenerate with:
   node src/games/toybot-breakout/compose-music.cjs /absolute/path/to/lamejs/lame.all.js
   The optional preview WAV is written outside the repo with --preview=/absolute/path.wav. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const encoderPath=process.argv[2];if(!encoderPath)throw new Error('Pass the temporary lamejs/lame.all.js encoder path.');
const sandbox={};vm.runInNewContext(fs.readFileSync(encoderPath,'utf8'),sandbox);const lame=sandbox.lamejs;
const moduleScope={exports:{}};new Function('exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'art-source/retired-music-v62/tracks.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(moduleScope.exports);
const {MUSIC_TRACKS,musicLoopStart,musicLoopEnd}=moduleScope.exports,SR=22050,TAU=Math.PI*2;
const scores=[
 {tonic:40,chords:[[0,3,7],[8,12,15],[3,7,10],[10,14,17],[5,8,12],[8,12,15],[7,10,14],[10,14,17]],motif:[0,2,1,2,0,1,2,1],style:'road'},
 {tonic:38,chords:[[0,3,7],[1,5,8],[8,12,15],[7,11,14]],motif:[0,0,1,0,2,1,0,2],style:'forge'},
 {tonic:42,chords:[[0,3,7],[8,12,15],[10,14,17],[7,10,14]],motif:[2,0,1,2,1,0,2,1],style:'hive'},
 {tonic:36,chords:[[0,3,7],[8,12,15],[5,8,12],[7,11,14]],motif:[0,0,2,1,0,2,1,0],style:'bastion'},
 {tonic:47,chords:[[0,3,7],[8,12,15],[5,8,12],[7,11,14]],motif:[0,2,1,2,1,0,2,0],style:'storm'},
 {tonic:38,chords:[[0,3,7],[8,12,15],[5,8,12],[7,11,14]],motif:[0,2,1,0,2,1,2,0],style:'emperor'},
];
const preview=[];
function compose(track,score){
 const duration=musicLoopEnd(track),beat=60/track.bpm,loopAt=Math.round(musicLoopStart(track)*SR),length=Math.round(duration*SR),out=new Float64Array(length);let seed=7351+scores.indexOf(score)*911;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
 function put(at,samples,gain,wrap){const start=Math.round(at*SR);for(let i=0;i<samples.length;i++){let index=start+i;if(index>=length){if(!wrap)break;index=loopAt+(index-length)%(length-loopAt);}if(index>=0)out[index]+=samples[i]*gain;}}
 function note(midi,at,duration,kind,gain,wrap){
  const n=Math.ceil(duration*SR),data=new Float64Array(n),freq=440*2**((midi-69)/12);
  for(let i=0;i<n;i++){const t=i/SR,u=t/duration,p=TAU*freq*t,edge=Math.min(1,t/(kind==='pad'||kind==='choir'?.13:.006),(duration-t)/.04);let x;
   if(kind==='pad')x=(Math.sin(p)+.3*Math.sin(p*1.004)+.16*Math.sin(2*p))*.7;
   else if(kind==='choir')x=(Math.sin(p+.02*Math.sin(TAU*5*t))+.3*Math.sin(2*p)+.1*Math.sin(3*p))*.7;
   else if(kind==='brass')x=(Math.sin(p)+.42*Math.sin(2*p)+.2*Math.sin(3*p)+.1*Math.sin(4*p))*Math.exp(-u*.8);
   else if(kind==='bell')x=(Math.sin(p)+.24*Math.sin(2.76*p)+.08*Math.sin(4.1*p))*Math.exp(-u*5);
   else if(kind==='bass')x=Math.tanh((Math.sin(p)+.25*Math.sin(2*p)+.13*Math.sin(3*p))*1.1)*Math.exp(-u*2);
   else x=(Math.sin(p+.25*Math.sin(2*p))+.18*Math.sin(2*p))*Math.exp(-u*3);
   data[i]=x*edge;
  }put(at,data,gain,wrap);
 }
 function drum(kind,at,gain,wrap){const duration=kind==='kick'?.4:kind==='hat'?.09:kind==='crash'?.7:.25,data=new Float64Array(Math.ceil(duration*SR));let last=0;
  for(let i=0;i<data.length;i++){const t=i/SR,r=random(),high=r-last*.8;last=r;
   const attack=Math.min(1,t/.001),tail=Math.min(1,(duration-t)/.02);let x;
   if(kind==='kick')x=Math.sin(TAU*(43*t+105*.024*(1-Math.exp(-t/.024))))*Math.exp(-t*12)+r*.08*Math.exp(-t*120);
   else if(kind==='snare')x=high*.65*Math.exp(-t*21)+Math.sin(TAU*185*t)*.23*Math.exp(-t*24);
   else if(kind==='hat')x=high*.42*Math.exp(-t*65);
   else if(kind==='tom')x=Math.sin(TAU*(65*t+55*.04*(1-Math.exp(-t/.04))))*Math.exp(-t*14)+high*.12*Math.exp(-t*25);
   else x=high*.3*Math.exp(-t*6);
   data[i]=x*attack*tail;
  }put(at,data,gain,wrap);
 }
 const bars=track.introBars+track.loopBars;
 for(let bar=0;bar<bars;bar++){
  const intro=bar<track.introBars,k=intro?bar:bar-track.introBars,chord=score.chords[k%score.chords.length],at=bar*beat*4,wrap=!intro,energy=intro?.48+bar*.12:1;
  const pad=score.style==='emperor'?'choir':score.style==='bastion'?'brass':'pad';
  for(const n of chord){note(score.tonic+n+12,at,beat*4.6,pad,.034*energy,wrap);if(score.style==='emperor')note(score.tonic+n+24,at,beat*4.4,'choir',.018*energy,wrap);}
  if(intro){
   note(score.tonic,at,beat*3.8,'bass',.13,wrap);drum('tom',at,.23,wrap);
   if(bar>=1)drum('tom',at+beat*2,.16,wrap);
   // Each guardian announces its own instrumentation from the first bar.
   if(score.style==='forge'){drum('tom',at+beat*1.75,.2,wrap);note(score.tonic+19,at+beat*.5,beat*1.2,'bell',.065,wrap);}
   if(score.style==='hive')for(let i=0;i<8;i++)note(score.tonic+chord[score.motif[i]]+24,at+i*beat/2,beat*.4,'bell',.065,wrap);
   if(score.style==='bastion'){for(const b of [1,2,3,3.5])drum('snare',at+b*beat,.12,wrap);note(score.tonic+chord[2]+12,at+beat,beat*1.5,'brass',.07,wrap);}
   if(score.style==='storm')for(let i=0;i<12;i++)note(score.tonic+chord[i%3]+24+(i%4===3?12:0),at+i*beat/3,beat*.24,'bell',.055,wrap);
   if(score.style==='emperor'){note(score.tonic+24,at+beat*.5,beat*2,'bell',.075,wrap);note(score.tonic+chord[2]+12,at+beat*2,beat*1.8,'brass',.08,wrap);}

   if(bar>=2){for(let i=0;i<8;i++)drum('hat',at+i*beat/2,.075+i*.004,wrap);}
   if(bar===track.introBars-1){for(let i=0;i<8;i++)drum('snare',at+beat*2+i*beat/4,.07+i*.016,wrap);for(let i=0;i<4;i++)note(score.tonic+chord[i%3]+24,at+i*beat,beat*.8,score.style==='hive'?'bell':'brass',.055+i*.012,wrap);}
   continue;
  }
  const thin=score.style==='road'&&(k%16===14||k%16===15);
  const kicks=score.style==='forge'?[0,2.5]:score.style==='bastion'?[0,1.5,2,3.5]:score.style==='hive'?[0,1.5,2.75]:score.style==='storm'?[0,.75,2,3]:[0,2,2.75];
  for(const b of kicks)if(!thin||b===0)drum('kick',at+b*beat,.32*energy,wrap);
  for(const b of (score.style==='forge'?[2]:[1,3]))drum('snare',at+b*beat,.19,wrap);
  if(score.style==='bastion'||score.style==='emperor')for(const b of [2.75,3.5,3.75])drum('snare',at+b*beat,.07,wrap);
  const hats=score.style==='storm'||score.style==='hive'?16:8;
  for(let i=0;i<hats;i++)if(!thin||i%2===1)drum('hat',at+i*beat*4/hats,i%2?.07:.045,wrap);
  if(k%4===0)drum('crash',at,.12,wrap);
  for(let i=0;i<8;i++){const fifth=i%4===3?7:0,octave=score.style==='hive'&&i%2?12:0;note(score.tonic+chord[0]+fifth+octave,at+i*beat/2,beat*.42,'bass',.14,wrap);}
  if(score.style==='forge')for(const b of [1.5,3,3.5])drum('tom',at+b*beat,.2,wrap);
  const count=score.style==='storm'?16:score.style==='forge'?4:8,kind=score.style==='hive'||score.style==='storm'?'bell':score.style==='bastion'||score.style==='emperor'?'brass':'pluck';
  for(let i=0;i<count;i++){
   if(score.style==='road'&&k%8<2&&i%2)continue;
   const pos=score.motif[(i+k%4)%score.motif.length],octave=score.style==='storm'?24:score.style==='forge'?12:24;
   note(score.tonic+chord[pos]+octave,at+i*beat*4/count,beat*4/count*.85,kind,(score.style==='storm'?.04:score.style==='forge'?.065:.052)*(thin?.5:1),wrap);
  }
  if((score.style==='road'||score.style==='emperor')&&k%8>=4){note(score.tonic+chord[2]+24,at,beat*1.45,'bell',.045,wrap);note(score.tonic+chord[1]+24,at+beat*2,beat*1.45,'bell',.04,wrap);}
 }
 // Diffuse delay is mixed from the dry signal; loop tails wrap into the loop body.
 const dry=out.slice();for(const [delay,gain]of [[.17,.12],[.31,.08],[.47,.045]])for(let i=0;i<length;i++){let dst=i+Math.round(delay*SR);if(dst>=length)dst=loopAt+(dst-length)%(length-loopAt);out[dst]+=dry[i]*gain;}
 let peak=0,sum=0;for(let i=0;i<length;i++){out[i]=Math.tanh(out[i]*1.4);peak=Math.max(peak,Math.abs(out[i]));sum+=out[i]**2;}const gain=Math.min(.82/peak,.145/Math.sqrt(sum/length));
 for(let i=0;i<length;i++)out[i]*=gain;
 const fade=Math.round(SR*.015);for(let i=0;i<fade;i++){const a=i/(fade-1);out[length-fade+i]=out[length-fade+i]*(1-a)+out[loopAt]*a;}
 if(track.introBars)for(let i=0;i<Math.round(SR*.04);i++)out[i]*=i/(SR*.04);
 return out;
}
function wav(data,file){const b=Buffer.alloc(44+data.length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(SR,24);b.writeUInt32LE(SR*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(data.length*2,40);for(let i=0;i<data.length;i++)b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,data[i]))*32767),44+i*2);fs.writeFileSync(file,b);}
const output=path.resolve(__dirname,'../../../public/games/toybot-breakout/music');fs.mkdirSync(output,{recursive:true});
for(const [i,track]of MUSIC_TRACKS.entries()){
 const data=compose(track,scores[i]),encoder=new lame.Mp3Encoder(1,SR,64),chunks=[];
 for(let start=0;start<data.length;start+=1152){const samples=new Int16Array(Math.min(1152,data.length-start));for(let j=0;j<samples.length;j++)samples[j]=Math.round(Math.max(-1,Math.min(1,data[start+j]))*32767);const mp3=encoder.encodeBuffer(samples);if(mp3.length)chunks.push(Buffer.from(mp3));}chunks.push(Buffer.from(encoder.flush()));
 const file=path.join(output,path.basename(track.url));fs.writeFileSync(file,Buffer.concat(chunks));let sum=0,peak=0;for(const value of data){sum+=value*value;peak=Math.max(peak,Math.abs(value));}console.log(track.id,track.title,'seconds='+ (data.length/SR).toFixed(3),'bytes='+fs.statSync(file).size,'peak='+peak.toFixed(3),'RMS='+Math.sqrt(sum/data.length).toFixed(3));
 const excerpt=data.slice(0,Math.round(SR*(i===0?8:10)));for(let j=0;j<Math.round(SR*.05);j++)excerpt[excerpt.length-1-j]*=j/(SR*.05);preview.push(excerpt,new Float64Array(Math.round(SR*.4)));
}
const option=process.argv.find(arg=>arg.startsWith('--preview='));if(option){const length=preview.reduce((n,a)=>n+a.length,0),combined=new Float64Array(length);let at=0;for(const part of preview){combined.set(part,at);at+=part.length;}wav(combined,option.slice('--preview='.length));}
