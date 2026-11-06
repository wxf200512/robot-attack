import { attackIntervalFor, effectiveWeapon, isBossArena, DODGE_TICKS, type GameState } from './simulation';
const ROOT='/games/toybot-breakout/optimized/';
export const MOTION_ART={pulse:ROOT+'mech-pulse-motion-v28.png',heavy:ROOT+'mech-heavy-motion-v28.png',blade:ROOT+'mech-blade-motion-v28.png'};
export const BOSS_EVOLUTION_ART=ROOT+'boss-evolution-v28.png';
export const MATERIAL_ART=ROOT+'material-v28.png';
export const PROP_ART=ROOT+'props-v28.png';
export const PORTRAIT_ART=ROOT+'mech-portraits-v28.png';
export function equipmentCell(kind:'pulse'|'heavy'|'blade',weapon:boolean,armor:boolean,core:boolean){return atlasCell(Number(weapon)+Number(armor)*2+Number(core)*4,{pulse:0,heavy:1,blade:2}[kind],8,3);}
export const atlasCell=(column:number,row:number,columns=8,rows=8)=>`${Math.max(0,Math.min(columns-1,column))*100/(columns-1)}% ${Math.max(0,Math.min(rows-1,row))*100/(rows-1)}%`;
export function motionTier(weapon:number,armor:number,core:number){return weapon>0||armor>0||core>0?4:0;}
// Eight-frame attack phases share the authoritative launch tick, never change cadence.
// At launch the emitter is extended (frame 3); previous cooldown ticks anticipate it.
export function artPose(s:GameState,alpha=0,index=0,reduced=false){
 const t=reduced?0:Math.max(0,Math.min(.999,alpha)),interval=attackIntervalFor(s);
 const elapsed=interval-s.fireCooldown+t,chargeWindow=Math.min(2,interval*.2),attackSpan=Math.min(4,interval-chargeWindow),launched=s.fireCooldown>0&&elapsed<attackSpan;
 const charging=s.fireCooldown>0&&s.fireCooldown-t<=chargeWindow,arena=isBossArena(s);
 const tier=motionTier(effectiveWeapon(s),s.armorLevel,Math.max(s.coreLevel,s.garageCoreLevel));
 const attackFrame=launched?Math.min(7,3+Math.floor(elapsed*5/attackSpan)):charging?Math.min(2,Math.floor((chargeWindow-s.fireCooldown+t)*3/chargeWindow)):0;
 const dodge=s.dodgeTicks>0&&arena,runFrame=Math.floor((s.roadTicks+t+index*.8)/.8)%8;
 const row=tier+(dodge?3:arena?launched||charging?2:1:0);
 const frame=reduced?0:dodge?Math.min(7,Math.floor((1-(s.dodgeTicks-t)/DODGE_TICKS)*8)):arena?launched||charging?attackFrame:Math.floor((s.battleTime+t)/3)%8:runFrame;
 const roadLean=s.ops.roadDodgeTicks>0?(s.lane-s.ops.roadFromLane)*Math.sin(Math.PI*(1-(s.ops.roadDodgeTicks-t)/3))*-7:0;
 return {row,frame,upperRow:tier+2,upperFrame:reduced?0:attackFrame,upperOpacity:!arena&&(launched||charging)?Math.min(1,launched?(attackSpan-elapsed)/.65:(chargeWindow-s.fireCooldown+t)/.5):0,lean:reduced?0:roadLean,recoil:reduced||!launched?0:Math.sin(Math.PI*elapsed/4)*(s.mechClass==='heavy'?2:s.mechClass==='blade'?1:.5)};
}
export function bossArtFrame(s:GameState){
 const status=s.status==='paused'?s.resumeStatus:s.status;
 const phase2=s.bossStage===2||status==='boss-shift'&&s.bossPhaseTicks>=5;
 return (phase2?4:0)+(s.bossStep==='warning'?1:s.bossStep==='flight'||s.bossStep==='rush'?2:s.bossStep==='recovery'?3:0);
}
export function materialSample(kind:'hit'|'armor'|'heavy'|'elite'|'boss',ticks:number,alpha=0){
 const life=kind==='boss'?12:kind==='elite'?8:4,age=Math.max(0,Math.min(.999,1-(ticks-alpha)/life));
 return {row:kind==='armor'?2:kind==='boss'||kind==='elite'||kind==='heavy'?3:0,frame:Math.min(7,Math.floor(age*8)),age};
}
// Presentation only: pickups are a visual receipt of an already-resolved kill,
// not a second currency award or an extra collision/collection requirement.
export function salvageSample(x:number,y:number,ticks:number,laneX:number,alpha=0){
 const age=Math.max(0,Math.min(1,(7-ticks+alpha)/7)),p=Math.max(0,(age-.2)/.8),ease=p*p;
 return {x:x+(laneX-x)*ease,y:y+(59-y)*ease-Math.sin(age*Math.PI)*2,opacity:1-Math.max(0,(age-.8)/.2),scale:1-age*.55};
}
