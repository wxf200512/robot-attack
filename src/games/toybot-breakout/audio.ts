import type { GameState } from './simulation';
import { attackIntervalFor, canShoot, effectiveWeapon } from './simulation';
import type { PlayerSettings } from './settings';
import { createMusicPlayer, type MusicScene } from './music';
import { SOUND_BANK, MAX_SOUND_VOICES, makeCombatNoise, scheduleCombatSound, type AudioCue, type SoundVoice } from './soundDesign';
export type { AudioCue } from './soundDesign';

export function gameSoundEvents(previous:GameState,current:GameState):AudioCue[]{
 if(previous.runId!==current.runId||current.status==='paused'||previous.status==='paused')return [];
 if(current.status==='boss-victory'&&previous.status!=='boss-victory')return ['victory'];
 if(current.status==='defeat'&&previous.status!=='defeat')return ['defeat'];
 const cues:AudioCue[]=[];
 if(current.burstSequence>previous.burstSequence)cues.push(`burst-${current.mechClass}`);
 if(canShoot(current.status)&&previous.burstEnergy<100&&current.burstEnergy>=100)cues.push('burst-ready');
 if(current.dodgeSequence>previous.dodgeSequence)cues.push('dodge');
 if(current.evadeSequence>previous.evadeSequence)cues.push('evade');
 if(current.ops.perfects>previous.ops.perfects)cues.push('perfect');
 if(current.ops.fusion!==previous.ops.fusion||current.ops.mission.status==='done'&&previous.ops.mission.status!=='done'||current.ops.event.status==='done'&&previous.ops.event.status!=='done')cues.push('upgrade');
 if(current.ops.eventWarning>0&&previous.ops.eventWarning===0)cues.push('warning');
 if(previous.ops.prep==='pending'&&current.ops.prep!=='pending')cues.push('gate');
 if(current.shotSequence>previous.shotSequence&&current.fireCooldown===attackIntervalFor(current)&&current.burstSequence===previous.burstSequence)cues.push(current.mechClass==='blade'&&current.pendingShots.some(p=>p.finisher&&p.ticks===p.duration)?'blade-finisher':current.burstTicks>0?`core-shot-${current.mechClass}`:effectiveWeapon(current)>=2?`${current.mechClass}-up`:current.mechClass);
 if(current.impactSequence>previous.impactSequence){
  const destroyed=current.ops.broken>previous.ops.broken||current.hazardHps.some((hp,i)=>hp===0&&previous.hazardHps[i]>0)||current.threats.some(t=>t.hp===0&&previous.threats.some(p=>p.id===t.id&&p.hp>0));
  const elite=current.feedback.some(f=>f.id>previous.feedbackSequence&&f.kind==='elite');
  cues.push(elite?'elite-break':destroyed?'destroy':current.feedback.some(f=>f.id>previous.feedbackSequence&&f.armorBreak)?'armor-break':current.feedback.some(f=>f.id>previous.feedbackSequence&&f.kind==='armor')?'armor-hit':current.mechClass==='heavy'?'hit-heavy':current.mechClass==='blade'?'hit-blade':'hit');
 }
 if(current.damageSequence>previous.damageSequence)cues.push(current.damageKind==='shield'&&current.defenseFx?.exhausted?'shield-break':current.damageKind==='shield'?'shield':current.damageKind==='armor'?'armor-block':'damage');
 if(current.gateCollected&&!previous.gateCollected)cues.push('gate');
 if(current.status==='running'&&current.enemyAttackSequence>previous.enemyAttackSequence)cues.push('warning');
 if(current.status==='battle'&&current.bossStep==='warning'&&(previous.status!=='battle'||previous.bossStep!=='warning'||previous.bossWave!==current.bossWave))cues.push('boss-warning');
 return [...new Set(cues)].sort((a,b)=>SOUND_BANK[b].priority-SOUND_BANK[a].priority);
}
// Restrained stereo positioning complements visible lanes without making headphones mandatory.
export function soundPan(cue:AudioCue,state:GameState):number{
 if(SOUND_BANK[cue].bus==='signal'||cue==='damage'||cue==='shield'||cue==='shield-break'||cue==='armor-block')return 0;
 return Math.max(-.5,Math.min(.5,(SOUND_BANK[cue].bus==='weapon'?(state.lane-1)*.35:(state.impactX-50)/60)));
}
export const combatDuckV60=(priority:number)=>priority>=7?{weapon:.24,music:.15,hold:.5}:priority>=6?{weapon:.38,music:.22,hold:.28}:priority>=4?{weapon:.58,music:.3,hold:.14}:null;
export function createCombatMixer(ctx:BaseAudioContext,volume:number){
 const weapon=ctx.createGain(),impact=ctx.createGain(),signal=ctx.createGain(),compressor=ctx.createDynamicsCompressor(),limiter=ctx.createDynamicsCompressor(),master=ctx.createGain(),music=ctx.createGain(),musicVolume=ctx.createGain();
 weapon.gain.value=.8;impact.gain.value=1;signal.gain.value=.85;
 compressor.threshold.value=-14;compressor.knee.value=14;compressor.ratio.value=4;compressor.attack.value=.003;compressor.release.value=.1;
 limiter.threshold.value=-3;limiter.knee.value=0;limiter.ratio.value=20;limiter.attack.value=.001;limiter.release.value=.07;
 weapon.connect(compressor);impact.connect(compressor);signal.connect(compressor);compressor.connect(master);master.connect(limiter);limiter.connect(ctx.destination);master.gain.value=volume*.9;music.gain.value=.4;musicVolume.gain.value=.55*.65;music.connect(musicVolume);musicVolume.connect(limiter);
 return {weapon,impact,signal,master,music,musicVolume,nodes:[weapon,impact,signal,compressor,limiter,master,music,musicVolume]};
}
// Built only after a pointer/key gesture. Buffers and mixer are shared by all cues.
export function createGameAudio(){
 let context:AudioContext|null=null,mixer:ReturnType<typeof createCombatMixer>|null=null,buffer:AudioBuffer|null=null,settings:PlayerSettings={muted:false,volume:.45,quality:'auto'},disposed=false,active:SoundVoice[]=[];
 let music:ReturnType<typeof createMusicPlayer>|null=null,musicScene:MusicScene|null=null;
 const syncMusic=()=>{if(music&&musicScene)music.setScene({...musicScene,paused:musicScene.paused||settings.muted||(settings.musicVolume??.55)===0});};
 let duckUntil=0,duckPriority=0;
 const last=new Map<string,number>();
 const silence=()=>{for(const voice of active){try{voice.source.stop();voice.source.disconnect();voice.nodes.forEach(node=>node.disconnect());}catch{/* Already ended. */}}active=[];last.clear();duckUntil=0;duckPriority=0;};
 const unlock=()=>{
  if(disposed||settings.muted||settings.volume===0&&(settings.musicVolume??.55)===0)return;
  try{
   if(!context){const Ctor=window.AudioContext||(window as Window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!Ctor)return;context=new Ctor({latencyHint:'interactive'});mixer=createCombatMixer(context,settings.volume);buffer=makeCombatNoise(context);music=createMusicPlayer(context,mixer.music);mixer.musicVolume.gain.value=(settings.musicVolume??.55)*.65;}
   if(context.state!=='running')void context.resume().then(syncMusic).catch(()=>{});else syncMusic();
  }catch{silence();music?.dispose();music=null;if(context)void context.close().catch(()=>{});context=null;mixer=null;buffer=null;}
 };
 const play=(cue:AudioCue,pan=0)=>{
  if(disposed||settings.muted||settings.volume===0||!context||!mixer||!buffer||context.state!=='running'||document.hidden)return;
  const now=context.currentTime,spec=SOUND_BANK[cue];
  const group=cue==='warning'||cue==='boss-warning'?'telegraph':cue==='hit'||cue==='hit-heavy'||cue==='hit-blade'||cue==='armor-hit'?'contact':cue;
  if(now-(last.get(cue)??-Infinity)<spec.gap/1000||now-(last.get(group)??-Infinity)<(group==='contact'?.055:group==='telegraph'&&cue==='warning'?.7:0))return;
  active=active.filter(voice=>voice.end>now);
  // Reserve headroom for warnings, shield breaks and damage even in a large squad.
  if(spec.priority>=7){const retained:SoundVoice[]=[];for(const voice of active){if(voice.priority<4){try{voice.source.stop();}catch{/* Ended. */}}else retained.push(voice);}active=retained;}
  while(active.length+spec.layers.length>MAX_SOUND_VOICES){
   let steal=-1;active.forEach((voice,i)=>{if(voice.priority<spec.priority&&(steal<0||voice.priority<active[steal].priority))steal=i;});if(steal<0)return;
   const [voice]=active.splice(steal,1);try{voice.source.stop();}catch{/* Ended. */}
  }
  last.set(cue,now);last.set(group,now);
  const duck=combatDuckV60(spec.priority);if(duck&&(now>=duckUntil||spec.priority>=duckPriority)){duckUntil=now+duck.hold;duckPriority=spec.priority;const gain=mixer.weapon.gain;gain.cancelScheduledValues(now);gain.setTargetAtTime(duck.weapon,now,.012);gain.setTargetAtTime(.8,now+duck.hold,.09);const bed=mixer.music.gain;bed.cancelScheduledValues(now);bed.setTargetAtTime(duck.music,now,.025);bed.setTargetAtTime(.4,now+duck.hold,.18);}
  const pitch=spec.vary===false?1:.97+Math.random()*.06;
  try{active.push(...scheduleCombatSound(context,mixer[spec.bus],buffer,spec,now,pan,pitch));}catch{/* Audio loss must never interrupt combat. */}
 };
 return {unlock,play,setMusic(next:MusicScene){musicScene=next;syncMusic();},musicStatus(){return music?.status()??null;},setSettings(next:PlayerSettings){settings={...next,volume:Number.isFinite(next.volume)?Math.max(0,Math.min(1,next.volume)):.45,musicVolume:next.musicVolume===undefined?.55:Number.isFinite(next.musicVolume)?Math.max(0,Math.min(1,next.musicVolume)):.55};if(settings.muted||settings.volume===0)silence();if(mixer&&context){mixer.master.gain.setTargetAtTime(settings.muted?0:settings.volume*.9,context.currentTime,.025);mixer.musicVolume.gain.setTargetAtTime(settings.muted?0:(settings.musicVolume??.55)*.65,context.currentTime,.06);}syncMusic();},suspend(){silence();music?.pause();if(context?.state==='running')void context.suspend().catch(()=>{});},dispose(){disposed=true;silence();music?.dispose();music=null;mixer?.nodes.forEach(node=>node.disconnect());if(context)void context.close().catch(()=>{});context=null;mixer=null;buffer=null;}};
}
