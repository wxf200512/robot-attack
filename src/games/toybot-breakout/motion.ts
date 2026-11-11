import { runFireKickV57 } from './presentationV57';
import { runTorsoV56 } from './runTorsoV56';
import { partDamageV38 } from './partDamageV38';
import { roadOffsetV37 } from './roadMotionV37';
import { ARENA_ART_V36, EMPEROR_ART_V36 } from './arenaMotionV36';
import { BLADE_ATTACK_V35 } from './bladeMotionV35';
import { coreFlightV34 } from './signatureV34';
import { pulseImpactV33 } from './pulseVfxV33';
import { bossMotionV31, enemyMotionV31, BOSS_MOTION_V31, ENEMY_MOTION_V31 } from './hostileMotionV31';
import { worldScreenY, bossScreenY, projectedMuzzleX, squadScreenX, actorPixels, cameraFlight, FURNACE_ART } from './referenceCamera';
import { MOTION_ART, RUN_ART, artPose, atlasCell, bossArtFrame, BOSS_EVOLUTION_ART, materialSample, salvageSample } from './visualArt';
import { STEP_MS, RUN_SPEED, roadStepFor, DODGE_TICKS, attackIntervalFor, playerFormation, roadEnemyLane, enemyThreatLane, enemyThreatX, roadEnemyX, roadEnemyY, targetX, targetY, bossX, bossY, isBossArena, gateGroundY, laneXAt, LANE_CENTERS, enemyThreatY, type GameState, type PendingShot } from './simulation';
import { getLevel } from './level';
import { fieldY, prepMark } from './operations';
export const clamp01=(n:number)=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
export const motionAlpha=(elapsedMs:number)=>Math.min(.999,clamp01(elapsedMs/STEP_MS));
// Forecast at most one authoritative tick. This state is presentation-only.
export function visualState(s:GameState,alpha:number):GameState{
 const t=clamp01(alpha),status=s.status==='paused'?s.resumeStatus:s.status;
 return {...s,progress:s.progress+(status==='running'?roadStepFor(s,true)*t:0),dodgeTicks:Math.max(0,s.dodgeTicks-t),bossMoveTicks:Math.max(0,s.bossMoveTicks-t),bossStepTicks:s.bossStepTicks+t,enemyAttacks:s.enemyAttacks.map(a=>a.phase==='flight'?{...a,ticks:Math.max(0,a.ticks-t)}:a)};
}
export function hazardVisualX(s:GameState,index:number){
 const h=getLevel(s.levelIndex,s.sortie?.key).hazards[index],x=roadEnemyX(s,index);
 if(!h.moving||s.enemyAttacks.some(a=>a.source==='hazard'&&a.sourceId===index&&a.kind==='charge'&&a.phase==='flight'))return x;
 const p=clamp01((s.progress-h.progress+8)/(RUN_SPEED*2));
 if(s.progress<h.progress-8||p===1)return x;
 const y=roadEnemyY(s,index),from=laneXAt((h.lane+s.layoutIndex)%3,y),to=laneXAt((h.lane+s.layoutIndex+1)%3,y),ease=p*p*(3-2*p);
 return x+(from-to)*(1-ease);
}
export function poseSample(s:GameState,alpha:number){
 const t=clamp01(alpha),elapsed=attackIntervalFor(s)-s.fireCooldown+t,attack=clamp01(elapsed/4),dodge=clamp01(1-(s.dodgeTicks-t)/DODGE_TICKS);
 const active=s.fireCooldown>attackIntervalFor(s)-4;
 return {idleFrame:Math.floor((s.battleTime+t)/2)%8,attackFrame:Math.min(7,Math.floor(attack*8)),dodgeFrame:Math.min(7,Math.floor(dodge*8)),recoil:active&&s.dodgeTicks===0?Math.sin(attack*Math.PI)*(s.mechClass==='heavy'?2.2:s.mechClass==='blade'?.8:1):0,attackBlend:clamp01(active?Math.min(1,elapsed/.7,(4-elapsed)/.7):0)};
}
export function projectileSample(s:GameState,shot:PendingShot,alpha:number,predicted?:GameState){
 const progress=clamp01(1-(shot.ticks-clamp01(alpha))/Math.max(1,shot.duration)),origin=shot.origins[0],v=predicted??visualState(s,alpha);
 const endY=shot.target?targetY(v,shot.target,shot.targetIndex):shot.y,capturedLane=shot.target==='hazard'?roadEnemyLane(v,shot.targetIndex):shot.target==='boss'?(s.levelIndex===4?shot.lane:s.battleLane):shot.target==='threat'?enemyThreatLane(v,s.threats.find(x=>x.id===shot.targetIndex)??{id:shot.targetIndex,lane:shot.lane} as typeof s.threats[number]):shot.lane,endX=shot.target?(capturedLane!==shot.lane?laneXAt(shot.lane,endY):shot.target==='hazard'?hazardVisualX(v,shot.targetIndex):targetX(v,shot.target,shot.targetIndex,shot.lane)):shot.targetIndex>=0||shot.burst?laneXAt(shot.lane,endY):50;
 return {progress,x:origin.x+(endX-origin.x)*progress,y:origin.y+(endY-origin.y)*progress-(shot.burst&&shot.attackStyle==='heavy'?Math.sin(progress*Math.PI)*Math.min(5,Math.max(0,origin.y-endY)*.2):0),angle:Math.atan2((endX-origin.x)*.56,Math.max(1,origin.y-endY))*180/Math.PI};
}
function paintHostile(body:HTMLElement,p:ReturnType<typeof bossMotionV31>,image:string,rows:number){body.style.backgroundImage=`url(${image})`;body.style.backgroundSize=`800% ${rows*100}%`;body.style.backgroundPosition=atlasCell(p.frame,p.row,8,rows);body.style.translate=`0 ${p.bob}px`;body.style.rotate=p.lean+'deg';body.style.setProperty('--hostile-flash',String(1+p.flash));body.dataset.hostileAction=p.action;body.dataset.hostileProfile=p.profile;}
export type MotionEntry={node:HTMLElement;kind:string;id:number};
export type SceneSize={width:number;height:number};
export function coreBeamSample(s:GameState,shot:PendingShot,alpha:number,size:SceneSize,predicted?:GameState){
 const end=projectileSample(s,{...shot,ticks:0},0,predicted??visualState(s,alpha)),o=shot.origins[0];
 const actor=actorPixels(shot.count,size.width);
 const lift=shot.muzzle?actor/4:0,dx=(end.x-o.x)*size.width/100,dy=(o.y-end.y)*size.height/100-lift;
 return {x:o.x,y:o.y,lift,length:Math.hypot(dx,dy),angle:Math.atan2(dx,dy)*180/Math.PI};
}
export const collectMotionEntries=(root:HTMLElement):MotionEntry[]=>Array.from(root.querySelectorAll<HTMLElement>('[data-motion],[data-world-y]')).map(node=>({node,kind:node.dataset.motion??'world-decor',id:Number(node.dataset.motionId??0)}));
const place=(node:HTMLElement,x:number,y:number)=>{node.style.left=x+'%';node.style.top=worldScreenY(y)+'%';};
export function paintMotion(root:HTMLElement,s:GameState,alpha:number,entries:MotionEntry[],reduced=false,size:SceneSize={width:390,height:700}){
 const t=reduced?0:clamp01(alpha),v=visualState(s,t),pose=poseSample(s,t),formation=playerFormation(v);
 root.style.setProperty('--road-scroll-v37',roadOffsetV37(s,t,roadStepFor(s,true),reduced)+'px');root.style.setProperty('--motion-phase',String(t));root.style.setProperty('--perfect-alpha',String(Math.max(0,(s.ops.perfectTicks-t)/8)));
 root.style.setProperty('--idle-frame',((reduced?0:pose.idleFrame)*100/7)+'%');
 root.style.setProperty('--attack-frame',((reduced?0:pose.attackFrame)*100/7)+'%');
 root.style.setProperty('--dodge-frame',((reduced?0:pose.dodgeFrame)*100/7)+'%');
 root.style.setProperty('--pose-recoil',(reduced?0:pose.recoil)+'px');
 root.style.setProperty('--attack-blend',String(reduced?1:Math.max(0,pose.attackBlend)));
 const shots=new Map(s.pendingShots.map(shot=>[shot.id,shot])),attacks=new Map(s.enemyAttacks.map(a=>[a.id,a]));
 for(const {node,kind,id}of entries){
  if(kind==='robot'){
   const p=formation[id];if(p)place(node,squadScreenX(p.x,formation[0]?.x??50,s.bots),p.y);
   const art=artPose(s,t,id,reduced),body=node.querySelector<HTMLElement>('.toybot-v28-body');
   if(body){body.style.backgroundImage=`url(${art.sheet==='arena'?ARENA_ART_V36[s.mechClass]:art.sheet==='blade'?BLADE_ATTACK_V35:(art.sheet==='run'?RUN_ART:MOTION_ART)[s.mechClass]})`;body.style.backgroundSize=art.sheet==='arena'?'800% 600%':art.sheet==='run'||art.sheet==='blade'?'800% 400%':'800% 800%';body.style.backgroundPosition=art.sheet==='run'?atlasCell(art.frame%8,(art.row>=4?2:0)+Math.floor(art.frame/8),8,4):atlasCell(art.frame,art.row,8,art.sheet==='arena'?6:art.sheet==='blade'?4:8);body.dataset.mechAction=art.action;body.dataset.mechSheet=art.sheet;const torso=runTorsoV56(s,t,id,reduced);body.style.setProperty?.('--torso-roll',torso.roll+'deg');body.style.setProperty?.('--torso-sway',torso.sway+'px');body.style.setProperty?.('--torso-recoil',runFireKickV57(s,t,id,reduced)+'px');body.style.scale=isBossArena(s)?'1':'var(--art-mirror,1) 1';body.style.rotate=art.lean+'deg';body.style.translate='0 '+art.recoil+'px';body.style.transform='none';}

   const dust=node.querySelector<HTMLElement>('.toybot-v28-footdust');if(dust){dust.style.opacity='0';dust.style.translate='0 0';}


  }
  else if(kind==='part-damage-v38'){const part=s.ops.parts[id];if(part){const p=partDamageV38(part,s.battleTime,t,id,reduced);node.style.backgroundPosition=atlasCell(p.frame,p.row,8,3);node.dataset.phase=p.phase;node.style.opacity=String(p.opacity);}}
  else if(kind==='world-decor'){const y=Number(node.dataset.worldY);node.style.top=(node.dataset.worldBoss==='true'?bossScreenY(y):worldScreenY(y))+'%';}
  else if(kind==='muzzle'){const shot=shots.get(id);if(shot){const o=shot.origins[0],x=projectedMuzzleX(shot);node.style.left=x+'%';node.style.top=`calc(${worldScreenY(o.y)}% - ${actorPixels(shot.count,size.width)/4}px)`;}}
  else if(kind==='material'){const f=s.feedback.find(f=>f.id===id);if(f){const p=materialSample(f.kind,f.ticks,t);node.style.backgroundPosition=atlasCell(p.frame,p.row,8,4);}}
  else if(kind==='defense-contact'){place(node,LANE_CENTERS[s.damageLane],57);if(s.defenseFx)node.style.backgroundPosition=atlasCell(reduced?3:Math.min(7,Math.floor((1-(s.defenseFx.ticks-t)/8)*8)),s.defenseFx.kind==='shield'?1:2,8,4);}
  else if(kind==='salvage'){const e=s.killEffects.find(e=>e.id===id);if(e){const p=salvageSample(e.x,e.y,e.ticks,LANE_CENTERS[s.lane],t);place(node,p.x,p.y);node.style.opacity=String(p.opacity);node.style.scale=String(p.scale);}}
  else if(kind==='assembly'){place(node,LANE_CENTERS[s.lane],60);}
  else if(kind==='hazard'){const body=node.querySelector<HTMLElement>('.hostile-v31-body');if(body){const p=enemyMotionV31(s,id,t,reduced);paintHostile(body,p,ENEMY_MOTION_V31[p.kind],4);}const y=roadEnemyY(v,id);place(node,hazardVisualX(v,id),y);node.style.setProperty('--hazard-scale',String(.72+(y-39)/19*.34));}
  else if(kind==='core-pulse'){
   const shot=shots.get(id);if(shot){const p=coreFlightV34(projectileSample(s,shot,t,v),shot,t,size,reduced);node.style.left=p.x+'%';node.style.top=`calc(${p.y}% - ${p.lift}px)`;node.style.transform=`translate(-50%,-50%) rotate(${p.angle}deg) scale(${p.scale})`;node.style.opacity=String(p.opacity);const art=node.querySelector<HTMLElement>('.core-pulse-flight-art');if(art)art.style.backgroundPosition=atlasCell(p.frame,1,8,3);const vortex=node.querySelector<HTMLElement>('.core-pulse-vortex');if(vortex){vortex.style.backgroundPosition=atlasCell(1+p.frame%4,0,8,3);vortex.style.rotate=p.spin+'deg';}const wake=node.querySelector<HTMLElement>('.core-pulse-wake');if(wake)wake.style.backgroundPosition=atlasCell((p.frame+2)%8,1,8,3);}
  }else if(kind==='core-pulse-muzzle'){
   const shot=shots.get(id);if(shot){node.style.left=projectedMuzzleX(shot)+'%';node.style.top=`calc(${worldScreenY(shot.origins[0].y)}% - ${actorPixels(shot.count,size.width)/4}px)`;const art=node.querySelector<HTMLElement>('.core-pulse-muzzle-art');if(art)art.style.backgroundPosition=atlasCell(reduced?2:Math.min(7,Math.floor((shot.duration-shot.ticks+t)*4)),0,8,3);}
  }else if(kind==='pulse-impact-ring'){
   const f=s.feedback.find(f=>f.id===id);if(f){const life=f.kind==='boss'?12:f.kind==='elite'?8:4,p=pulseImpactV33(f.ticks,life,t,reduced),age=Math.max(0,(life-f.ticks+t)/life);node.style.backgroundPosition=atlasCell(p.frame,0,8,3);node.style.opacity=String(p.opacity*.55);node.style.transform=reduced?'none':`rotate(${age*35}deg) scale(${.65+age*.65})`;}
  }else if(kind==='pulse-impact'){
   const f=s.feedback.find(f=>f.id===id);if(f){const p=pulseImpactV33(f.ticks,f.kind==='boss'?12:f.kind==='elite'?8:4,t,reduced);node.style.backgroundPosition=atlasCell(p.frame,2,8,3);node.style.opacity=String(p.opacity);}
  }
  else if(kind==='shot'){
   const shot=shots.get(id);if(!shot||shot.attackStyle==='blade'&&!shot.burst)continue;
   const logical=projectileSample(s,shot,t,v),p={...logical,...cameraFlight(logical,shot)};node.style.left=p.x+'%';node.style.top=`calc(${p.y}% - var(--shot-lift,0px) * ${(1-p.progress)/4})`;
   node.style.transform=`translate(-50%,-50%) rotate(${p.angle}deg) scale(${1-p.progress*(shot.target ? .35 : .78)})`;
   node.style.opacity=String(shot.target?1:1-p.progress);
  }else if(kind==='slash'){
   const shot=shots.get(id);if(shot?.target){const y=targetY(v,shot.target,shot.targetIndex),x=targetX(v,shot.target,shot.targetIndex,shot.lane)+(shot.origins[0].x-LANE_CENTERS[shot.lane])*.22;place(node,x,y);if(shot.target==='boss'||shot.target==='part')node.style.top=bossScreenY(y)+'%';node.style.backgroundPositionX=Math.min(3,Math.floor((shot.duration-shot.ticks+t)*4/shot.duration))*100/3+'%';}
  }else if(kind==='enemy-bolt'){
   const a=attacks.get(id);if(a){const p=clamp01(1-(a.ticks-t)/a.duration),from=a.fromX??laneXAt(a.fromLane,a.fromY);place(node,from+(LANE_CENTERS[a.lane]-from)*p,a.fromY+(59-a.fromY)*p);}
  }else if(kind==='boss'){
   place(node,isBossArena(s)?bossX(v):50,bossY(v));node.style.top=bossScreenY(isBossArena(s)?bossY(v):40)+'%';
   const body=node.querySelector<HTMLElement>('.robot-boss-sprite');
   if(body?.classList.contains('hostile-v31-body')){const p=bossMotionV31(s,t,reduced);paintHostile(body,s.levelIndex===4?{...p,row:p.row%4,lean:0,bob:reduced?0:Math.sin((s.battleTime+t)*.12)*.35}:p,s.levelIndex===4?EMPEROR_ART_V36:BOSS_MOTION_V31[s.levelIndex],s.levelIndex===4?4:8);body.style.opacity=String(p.action==='destroyed'?Math.max(0,1-(s.bossPhaseTicks+t-8)/8):1);}
   else if(body&&body.style.backgroundImage.includes(FURNACE_ART)){const f=bossArtFrame(s);body.style.backgroundPosition=atlasCell(f%4,Math.floor(f/4),4,2);}
   else if(body&&body.style.backgroundImage.includes(BOSS_EVOLUTION_ART)){body.style.backgroundPositionX=bossArtFrame(s)*100/7+'%';body.style.translate=reduced?'0 0':`0 ${Math.sin((s.battleTime+t)*.35)*.65}px`;}

   if(isBossArena(s))node.style.setProperty('--boss-scale',String(s.levelIndex===4?1.02:1.12*(1+Math.max(0,(bossY(v)-(s.mechClass==='blade'?51:40))/(59-(s.mechClass==='blade'?51:40)))*.25)));
  }else if(kind==='gate'){
   const mark=getLevel(s.levelIndex,s.sortie?.key).gateMarks[s.gate],option=s.gateChoices[s.gate]?.[id];if(mark!==undefined&&option){const y=gateGroundY(v.progress,mark);place(node,laneXAt(option.lane,y-5),y);node.style.setProperty('--gate-scale',String(.85+clamp01((v.progress-mark+12)/14)*.3));}
  }else if(kind==='threat'){
   const threat=s.threats.find(a=>a.id===id);if(threat){const body=node.querySelector<HTMLElement>('.hostile-v31-body');if(body){const p=enemyMotionV31(s,id,t,reduced,'threat');paintHostile(body,p,ENEMY_MOTION_V31[p.kind],4);}const predicted={...threat,ticks:Math.max(0,threat.ticks-t)},y=enemyThreatY(v,predicted);const progress=clamp01(1-predicted.ticks/predicted.duration),from=laneXAt(threat.fromLane,threat.originY??43);place(node,threat.kind==='shell'?from+(LANE_CENTERS[threat.lane]-from)*progress:enemyThreatX(v,predicted),y);if(threat.kind==='shell')node.style.top=(worldScreenY(y)-12*(1-progress))+'%';}
  }else if(kind==='mission'||kind==='cargo'){
   const o=kind==='mission'?s.ops.mission:s.ops.event,y=fieldY(v,o);place(node,laneXAt(o.lane,y),y);
  }else if(kind==='prep'){const y=gateGroundY(v.progress,prepMark(s));place(node,laneXAt(id,y),y);}

 }
}

export function startMotionLoop(request:(callback:(time:number)=>void)=>number,cancel:(id:number)=>void,paint:(time:number)=>void,low=false){
 let handle=0,last=-Infinity,disposed=false;
 const draw=(now:number)=>{if(disposed)return;if(now-last>=(low?1000/30:1000/60)-1){last=now;paint(now);}handle=request(draw);};
 handle=request(draw);return()=>{disposed=true;cancel(handle);};
}
