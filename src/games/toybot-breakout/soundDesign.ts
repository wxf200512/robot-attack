// Locally synthesized combat Foley; no remote audio, codec loading or autoplay.
export type AudioCue='armor-hit'|'armor-block'|'elite-break'|'perfect'|'pulse'|'heavy'|'blade'|'hit'|'hit-heavy'|'hit-blade'|'destroy'|'shield'|'shield-break'|'damage'|'warning'|'boss-warning'|'gate'|'upgrade'|'victory'|'defeat'|'dodge'|'evade'|'burst-pulse'|'burst-heavy'|'burst-blade'|'burst-ready'|'pulse-up'|'heavy-up'|'blade-up'|'core-shot-pulse'|'core-shot-heavy'|'core-shot-blade';
export type SoundLayer={wave:OscillatorType|'noise';from:number;to:number;duration:number;gain:number;delay?:number;filter?:BiquadFilterType;q?:number;attack?:number};
export type SoundSpec={layers:SoundLayer[];priority:number;gap:number;bus:'weapon'|'impact'|'signal';vary?:boolean};
const tone=(from:number,to:number,duration:number,gain:number,wave:OscillatorType='sine',delay=0):SoundLayer=>({wave,from,to,duration,gain,delay});
const noise=(from:number,to:number,duration:number,gain:number,filter:BiquadFilterType='lowpass',delay=0):SoundLayer=>({wave:'noise',from,to,duration,gain,filter,delay,q:.65});
const shot=(layers:SoundLayer[]):SoundSpec=>({layers,priority:1,gap:70,bus:'weapon'});
const impact=(layers:SoundLayer[],priority=2,gap=80):SoundSpec=>({layers,priority,gap,bus:'impact'});
const signal=(layers:SoundLayer[],priority=4,gap=180):SoundSpec=>({layers,priority,gap,bus:'signal',vary:false});
const pulse=[tone(940,280,.075,.2,'triangle'),tone(170,65,.065,.25),noise(4100,1600,.045,.12,'bandpass')];
const heavy=[noise(2400,220,.22,.42),tone(105,38,.29,.43),noise(5200,1800,.045,.2,'highpass'),tone(220,75,.13,.18,'triangle',.025)];
const blade=[noise(650,5200,.13,.3,'bandpass'),noise(5800,800,.09,.2,'bandpass',.045),tone(900,300,.12,.075,'triangle')];
export const SOUND_BANK:Record<AudioCue,SoundSpec>={
 pulse:shot(pulse),heavy:shot(heavy),blade:shot(blade),
 'pulse-up':shot([...pulse,tone(1500,500,.11,.1,'sine',.012)]),
 'heavy-up':shot([...heavy,tone(64,27,.36,.2,'sine',.02)]),
 'blade-up':shot([...blade,tone(2100,650,.17,.12,'sine',.03)]),
 hit:impact([noise(2600,600,.065,.27,'bandpass'),tone(260,90,.07,.2)]),
 'hit-heavy':impact([noise(1800,180,.13,.35),tone(125,42,.19,.33),noise(4200,1400,.05,.13,'highpass')]),
 'hit-blade':impact([noise(4800,1200,.08,.25,'bandpass'),tone(1850,1050,.11,.16,'sine'),tone(190,65,.075,.15)]),
 'armor-hit':impact([tone(2650,1840,.12,.14),tone(3910,2750,.085,.08,'sine',.008),noise(6200,2300,.045,.17,'highpass')]),
 destroy:impact([noise(2400,140,.3,.38),tone(110,32,.3,.35),noise(5800,700,.19,.17,'bandpass',.025)],3,110),
 'armor-block':impact([noise(2400,700,.1,.24,'bandpass'),tone(320,95,.12,.19),tone(1650,880,.1,.11)],4,140),
 'elite-break':impact([noise(3400,170,.48,.45),tone(85,25,.48,.4),noise(6500,1700,.24,.2,'highpass',.07),tone(760,1180,.2,.12,'sine',.16)],5,260),
 shield:impact([tone(1250,700,.18,.2),tone(1650,1100,.16,.09,'sine',.025),noise(2800,1400,.11,.08,'bandpass')],3,120),
 'shield-break':impact([noise(7100,1800,.22,.24,'highpass'),tone(1840,260,.3,.2,'triangle'),noise(3200,600,.3,.18,'bandpass',.035),tone(145,42,.22,.21)],5,250),
 damage:impact([tone(115,34,.22,.37),noise(1500,180,.19,.3),tone(230,90,.1,.12,'triangle')],6,180),
 dodge:impact([noise(550,3400,.12,.17,'bandpass')],2,100),
 evade:signal([tone(1050,1540,.12,.11),noise(4200,2400,.08,.06,'highpass')],3,200),
 perfect:signal([noise(4800,1600,.1,.16,'highpass'),tone(660,1320,.18,.17),tone(1980,1980,.2,.11,'sine',.055)],5,280),
 warning:signal([tone(390,390,.09,.095),tone(390,390,.09,.075,'sine',.16)],3,950),
 'boss-warning':signal([tone(175,175,.2,.19,'triangle'),tone(350,280,.22,.15,'sine',.23),noise(1800,800,.16,.08,'bandpass')],6,1200),
 gate:signal([tone(740,740,.1,.13),tone(1110,1110,.16,.13,'sine',.07)],3,150),
 upgrade:signal([tone(520,780,.15,.14,'triangle'),tone(1040,1560,.23,.13,'sine',.09),noise(3800,6500,.17,.07,'highpass')],4,220),
 'burst-ready':signal([tone(880,880,.11,.12),tone(1320,1320,.22,.13,'sine',.13)],4,700),
 'burst-pulse':signal([noise(600,4800,.24,.23,'bandpass'),tone(130,45,.36,.34),tone(520,1400,.34,.2,'triangle',.06),tone(2100,1100,.3,.1,'sine',.17)],7,500),
 'burst-heavy':signal([tone(180,48,.24,.2,'triangle'),noise(4200,180,.65,.46,'lowpass',.08),tone(80,26,.72,.45,'sine',.08),noise(6500,1300,.24,.17,'highpass',.12)],7,500),
 'burst-blade':signal([noise(700,6400,.19,.34,'bandpass'),noise(5800,600,.35,.28,'bandpass',.14),tone(2500,750,.28,.16,'sine',.08),tone(120,38,.38,.28,'sine',.1)],7,500),
 'core-shot-pulse':shot([noise(2200,1400,.16,.16,'bandpass'),tone(590,390,.2,.21,'triangle'),tone(1180,780,.15,.09)]),
 'core-shot-heavy':shot([noise(3200,180,.36,.42),tone(78,25,.4,.45),noise(6400,2000,.06,.17,'highpass')]),
 'core-shot-blade':shot([noise(700,5200,.16,.33,'bandpass'),tone(1420,550,.19,.13),tone(150,45,.14,.2)]),
 victory:signal([523,659,784,1046].map((f,i)=>tone(f,f,.3,.15,'triangle',i*.12)),8,1000),
 defeat:signal([tone(90,30,.5,.3),noise(1800,170,.45,.24),...[280,210,140].map((f,i)=>tone(f,f*.7,.28,.11,'triangle',.12+i*.16))],8,1000),
};
export const MAX_SOUND_VOICES=40;
// One reusable, deterministic noise buffer per AudioContext, not one per shot.
export function makeCombatNoise(ctx:BaseAudioContext):AudioBuffer{
 const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*2),ctx.sampleRate),data=buffer.getChannelData(0);let seed=431,low=0;
 for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const white=seed/2147483648-1;low=(low+.08*white)/1.08;data[i]=white*.65+low*1.6;}
 return buffer;
}
export type SoundVoice={source:AudioScheduledSourceNode;nodes:AudioNode[];gain:GainNode;end:number;priority:number};
export function scheduleCombatSound(ctx:BaseAudioContext,output:AudioNode,buffer:AudioBuffer,spec:SoundSpec,at:number,pan=0,pitch=1):SoundVoice[]{
 const result:SoundVoice[]=[];
 for(const layer of spec.layers){
  const start=at+(layer.delay??0),end=start+layer.duration,gain=ctx.createGain();
  gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(layer.gain,start+Math.min(layer.attack??.004,layer.duration/3));gain.gain.exponentialRampToValueAtTime(.0001,end);
  const nodes:AudioNode[]=[gain];let source:AudioScheduledSourceNode;
  if(layer.wave==='noise'){
   const noiseSource=ctx.createBufferSource(),filter=ctx.createBiquadFilter();noiseSource.buffer=buffer;filter.type=layer.filter??'lowpass';filter.Q.value=layer.q??.7;
   filter.frequency.setValueAtTime(layer.from*pitch,start);filter.frequency.exponentialRampToValueAtTime(Math.max(25,layer.to*pitch),end);
   noiseSource.connect(filter);filter.connect(gain);source=noiseSource;nodes.push(filter);
  }else{
   const oscillator=ctx.createOscillator();oscillator.type=layer.wave;oscillator.frequency.setValueAtTime(layer.from*pitch,start);oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,layer.to*pitch),end);oscillator.connect(gain);source=oscillator;
  }
  if(ctx.createStereoPanner){const panner=ctx.createStereoPanner();panner.pan.value=Math.max(-.55,Math.min(.55,pan));gain.connect(panner);panner.connect(output);nodes.push(panner);}else gain.connect(output);
  const voice={source,nodes,gain,end:end+.015,priority:spec.priority};result.push(voice);
  source.onended=()=>{source.disconnect();nodes.forEach(node=>node.disconnect());};source.start(start);source.stop(voice.end);
 }
 return result;
}
