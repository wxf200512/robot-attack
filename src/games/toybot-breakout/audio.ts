import type { GameState } from './simulation';
import { attackIntervalFor, canShoot } from './simulation';
import type { PlayerSettings } from './settings';
export type AudioCue='pulse'|'heavy'|'blade'|'hit'|'destroy'|'shield'|'shield-break'|'damage'|'warning'|'gate'|'upgrade'|'victory'|'defeat'|'dodge'|'evade'|'burst'|'burst-ready';
export function gameSoundEvents(previous:GameState,current:GameState):AudioCue[]{
 if(previous.runId!==current.runId||current.status==='paused'||previous.status==='paused')return [];
 const cues:AudioCue[]=[];
 if(current.burstSequence>previous.burstSequence)cues.push('burst');
 if(canShoot(current.status)&&previous.burstEnergy<100&&current.burstEnergy>=100)cues.push('burst-ready');
 if(current.dodgeSequence>previous.dodgeSequence)cues.push('dodge');
 if(current.evadeSequence>previous.evadeSequence)cues.push('evade');
 if(current.shotSequence>previous.shotSequence&&current.fireCooldown===attackIntervalFor(current))cues.push(current.mechClass);
 if(current.impactSequence>previous.impactSequence){
  const destroyed=current.hazardHps.some((hp,i)=>hp===0&&previous.hazardHps[i]>0)||current.threats.some(t=>t.hp===0&&previous.threats.some(p=>p.id===t.id&&p.hp>0));
  cues.push(destroyed?'destroy':'hit');
 }
 if(current.damageSequence>previous.damageSequence)cues.push(current.damageKind==='shield'&&current.defenseFx?.exhausted?'shield-break':current.damageKind==='shield'||current.damageKind==='armor'?'shield':'damage');
 if(current.gateCollected&&!previous.gateCollected)cues.push('gate');
 if(current.status==='running'&&current.enemyAttackSequence>previous.enemyAttackSequence)cues.push('warning');
 if(current.status==='battle'&&current.bossStep==='warning'&&(previous.status!=='battle'||previous.bossStep!=='warning'||previous.bossWave!==current.bossWave))cues.push('warning');
 if(current.status==='boss-victory'&&previous.status!=='boss-victory')cues.push('victory');
 if(current.status==='defeat'&&previous.status!=='defeat')cues.push('defeat');
 return cues;
}
// Generated locally with Web Audio: no downloads, microphone or background music.
export function createGameAudio(){
 let context:AudioContext|null=null,master:GainNode|null=null,settings:PlayerSettings={muted:false,volume:.45,quality:'auto'},voices=0,disposed=false;
 const last=new Map<AudioCue,number>();
 const unlock=()=>{
  if(disposed||settings.muted||settings.volume===0)return;
  try{
   if(!context){const Ctor=window.AudioContext||(window as Window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!Ctor)return;context=new Ctor();master=context.createGain();master.gain.value=settings.volume*.28;master.connect(context.destination);}
   if(context.state==='suspended')void context.resume().catch(()=>{});
  }catch{/* Silent fallback for unsupported/blocked Web Audio. */}
 };
 const tone=(frequency:number,end:number,duration:number,type:OscillatorType,delay=0,strength=1)=>{
  if(!context||!master||voices>=10)return;const at=context.currentTime+delay,osc=context.createOscillator(),gain=context.createGain();voices++;
  osc.type=type;osc.frequency.setValueAtTime(frequency,at);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),at+duration);
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(Math.max(.001,strength*.18),at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  osc.connect(gain);gain.connect(master);osc.onended=()=>{voices--;osc.disconnect();gain.disconnect();};osc.start(at);osc.stop(at+duration+.02);
 };
 const play=(cue:AudioCue)=>{
  if(disposed||settings.muted||settings.volume===0||!context||context.state!=='running'||document.hidden)return;
  const now=performance.now(),gap=cue==='hit'?75:cue==='warning'?700:60;if(now-(last.get(cue)??-Infinity)<gap)return;last.set(cue,now);
  switch(cue){
   case 'burst':tone(180,900,.3,'triangle',0,.65);tone(1600,450,.3,'sine',.12,.4);break;
   case 'burst-ready':tone(880,880,.1,'sine',0,.35);tone(1320,1320,.18,'sine',.12,.35);break;
   case 'pulse':tone(1100,380,.065,'triangle',0,.65);break;
   case 'heavy':tone(150,36,.22,'sawtooth',0,.8);tone(360,95,.1,'triangle',0,.5);break;
   case 'blade':tone(1200,180,.15,'sawtooth',0,.45);tone(1900,600,.07,'sine',.035,.3);break;
   case 'hit':tone(640,230,.045,'triangle',0,.3);break;
   case 'destroy':tone(210,40,.16,'sawtooth',0,.6);tone(720,190,.09,'triangle',0,.35);break;
   case 'shield':tone(1450,750,.16,'sine',0,.7);break;
   case 'shield-break':tone(1900,390,.24,'triangle',0,.45);tone(2600,800,.14,'sine',.045,.3);tone(700,130,.25,'sine',.08,.35);break;
   case 'dodge':tone(680,140,.12,'triangle',0,.3);break;
   case 'evade':tone(1200,1800,.12,'sine',0,.4);break;
   case 'damage':tone(120,38,.2,'square',0,.55);break;
   case 'warning':tone(380,360,.12,'sine');tone(380,360,.12,'sine',.19);break;
   case 'gate':tone(880,880,.12,'sine');tone(1175,1175,.16,'sine',.09);break;
   case 'upgrade':tone(520,780,.13,'triangle');tone(1040,1560,.18,'sine',.1);break;
   case 'victory':[523,659,784,1046].forEach((f,i)=>tone(f,f,.28,'triangle',i*.11));break;
   case 'defeat':[280,210,140].forEach((f,i)=>tone(f,f*.7,.3,'triangle',i*.17));break;
  }
 };
 return {unlock,play,setSettings(next:PlayerSettings){settings=next;if(master&&context)master.gain.setTargetAtTime(next.muted?0:next.volume*.28,context.currentTime,.025);},suspend(){if(context?.state==='running')void context.suspend().catch(()=>{});},dispose(){disposed=true;if(context)void context.close().catch(()=>{});context=null;master=null;}};
}
