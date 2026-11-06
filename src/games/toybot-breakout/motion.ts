import { STEP_MS, RUN_SPEED, effectiveWeapon, DODGE_TICKS, attackIntervalFor, playerFormation, roadEnemyX, roadEnemyY, targetX, targetY, bossX, bossY, bossWarningTicks, isBossArena, isRush, gateGroundY, laneXAt, LANE_CENTERS, enemyThreatY, type GameState, type PendingShot } from './simulation';
import { getLevel, hazardLaneAt } from './level';
import { mechSpriteStyle } from './mechArt';
import { fieldY, prepMark } from './operations';
export const clamp01=(n:number)=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
export const motionAlpha=(elapsedMs:number)=>Math.min(.999,clamp01(elapsedMs/STEP_MS));
// Forecast at most one authoritative tick. This state is presentation-only.
export function visualState(s:GameState,alpha:number):GameState{
 const t=clamp01(alpha),status=s.status==='paused'?s.resumeStatus:s.status;
 return {...s,progress:s.progress+(status==='running'?RUN_SPEED*t:0),dodgeTicks:Math.max(0,s.dodgeTicks-t),bossMoveTicks:Math.max(0,s.bossMoveTicks-t),bossStepTicks:s.bossStepTicks+t,enemyAttacks:s.enemyAttacks.map(a=>a.phase==='flight'?{...a,ticks:Math.max(0,a.ticks-t)}:a)};
}
export function hazardVisualX(s:GameState,index:number){
 const h=getLevel(s.levelIndex).hazards[index],x=roadEnemyX(s,index);
 if(!h.moving)return x;
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
 const endY=shot.target?targetY(v,shot.target,shot.targetIndex):shot.y,capturedLane=shot.target==='hazard'?hazardLaneAt(s.layoutIndex,shot.targetIndex,v.progress,s.levelIndex):shot.target==='boss'?s.battleLane:shot.lane,endX=shot.target?(capturedLane!==shot.lane?laneXAt(shot.lane,endY):shot.target==='hazard'?hazardVisualX(v,shot.targetIndex):targetX(v,shot.target,shot.targetIndex)):shot.targetIndex>=0?laneXAt(shot.lane,endY):50;
 return {progress,x:origin.x+(endX-origin.x)*progress,y:origin.y+(endY-origin.y)*progress-(shot.burst&&shot.attackStyle==='heavy'?Math.sin(progress*Math.PI)*Math.min(5,Math.max(0,origin.y-endY)*.2):0),angle:Math.atan2((endX-origin.x)*.56,Math.max(1,origin.y-endY))*180/Math.PI};
}
export type MotionEntry={node:HTMLElement;kind:string;id:number};
export const collectMotionEntries=(root:HTMLElement):MotionEntry[]=>Array.from(root.querySelectorAll<HTMLElement>('[data-motion]')).map(node=>({node,kind:node.dataset.motion??'',id:Number(node.dataset.motionId??0)}));
const place=(node:HTMLElement,x:number,y:number)=>{node.style.left=x+'%';node.style.top=y+'%';};
export function paintMotion(root:HTMLElement,s:GameState,alpha:number,entries:MotionEntry[],reduced=false){
 const t=reduced?0:clamp01(alpha),v=visualState(s,t),pose=poseSample(s,t),formation=playerFormation(v);
 root.style.setProperty('--motion-phase',String(t));root.style.setProperty('--perfect-alpha',String(Math.max(0,(s.ops.perfectTicks-t)/8)));
 root.style.setProperty('--idle-frame',((reduced?0:pose.idleFrame)*100/7)+'%');
 root.style.setProperty('--attack-frame',((reduced?0:pose.attackFrame)*100/7)+'%');
 root.style.setProperty('--dodge-frame',((reduced?0:pose.dodgeFrame)*100/7)+'%');
 root.style.setProperty('--pose-recoil',(reduced?0:pose.recoil)+'px');
 root.style.setProperty('--attack-blend',String(reduced?1:Math.max(0,pose.attackBlend)));
 const shots=new Map(s.pendingShots.map(shot=>[shot.id,shot])),attacks=new Map(s.enemyAttacks.map(a=>[a.id,a]));
 for(const {node,kind,id}of entries){
  if(kind==='robot'){
   const p=formation[id];if(p&&s.dodgeTicks>0)place(node,p.x,p.y);
   const stride=node.querySelector<HTMLElement>('.class-mech > .toybot-class-sprite');
   if(stride&&s.mechClass!=='pulse'){
    const frame=reduced?0:Math.floor((s.roadTicks+t+id*1.6)/1.6)%4,tier=Math.min(3,effectiveWeapon(s)+Math.min(1,s.armorLevel)+Math.min(1,Math.max(s.coreLevel,s.garageCoreLevel)));
    Object.assign(stride.style,mechSpriteStyle(s.mechClass,1+frame,tier));
   }
  }
  else if(kind==='hazard'){const y=roadEnemyY(v,id);place(node,hazardVisualX(v,id),y);node.style.setProperty('--hazard-scale',String(.72+(y-39)/19*.34));}
  else if(kind==='core-beam'){
   const shot=shots.get(id);if(shot){const o=shot.origins[0],p=projectileSample(s,shot,t,v),y=shot.target?targetY(v,shot.target,shot.targetIndex):shot.y;place(node,o.x,y);node.style.height=`calc(${Math.max(1,o.y-y)}% - var(--beam-lift,0px) / 4)`;node.style.transform=`translateX(-50%) rotate(${p.angle}deg)`;node.style.opacity=String(.65+Math.sin((shot.duration-shot.ticks+t)*Math.PI)*.2);}
  }
  else if(kind==='shot'){
   const shot=shots.get(id);if(!shot||shot.attackStyle==='blade'&&!shot.burst)continue;
   const p=projectileSample(s,shot,t,v);node.style.left=p.x+'%';node.style.top=`calc(${p.y}% - var(--shot-lift,0px) * ${(1-p.progress)/4})`;
   node.style.transform=`translate(-50%,-50%) rotate(${p.angle}deg) scale(${1-p.progress*(shot.target ? .35 : .78)})`;
   node.style.opacity=String(shot.target?1:1-p.progress);
  }else if(kind==='slash'){
   const shot=shots.get(id);if(shot?.target){const y=targetY(v,shot.target,shot.targetIndex),x=targetX(v,shot.target,shot.targetIndex)+(shot.origins[0].x-LANE_CENTERS[shot.lane])*.22;place(node,x,y);node.style.backgroundPositionX=Math.min(3,Math.floor((shot.duration-shot.ticks+t)*4/shot.duration))*100/3+'%';}
  }else if(kind==='enemy-bolt'){
   const a=attacks.get(id);if(a){const p=clamp01(1-(a.ticks-t)/a.duration),from=a.fromX??laneXAt(a.fromLane,a.fromY);place(node,from+(LANE_CENTERS[a.lane]-from)*p,a.fromY+(59-a.fromY)*p);}
  }else if(kind==='boss'){
   place(node,bossX(v),bossY(v));
   const body=node.querySelector<HTMLElement>('.robot-boss-sprite');
   if(body&&s.status==='battle'&&!isRush(s)){
    const frame=s.bossStep==='warning'?Math.min(4,Math.floor((s.bossStepTicks+t)*5/bossWarningTicks(s))):s.bossStep==='flight'?Math.min(7,5+Math.floor((s.bossStepTicks+t)/2)):7;
    body.style.backgroundPositionX=frame*100/7+'%';
   }
   if(isBossArena(s))node.style.setProperty('--boss-scale',String(1.12*(1+Math.max(0,(bossY(v)-(s.mechClass==='blade'?51:40))/(59-(s.mechClass==='blade'?51:40)))*.25)));
  }else if(kind==='gate'){
   const mark=getLevel(s.levelIndex).gateMarks[s.gate],option=s.gateChoices[s.gate]?.[id];if(mark!==undefined&&option){const y=gateGroundY(v.progress,mark);place(node,laneXAt(option.lane,y-5),y);node.style.setProperty('--gate-scale',String(.5+clamp01((v.progress-mark+12)/14)*.62));}
  }else if(kind==='threat'){
   const threat=s.threats.find(a=>a.id===id);if(threat){const predicted={...threat,ticks:Math.max(0,threat.ticks-t)},y=enemyThreatY(v,predicted);const progress=clamp01(1-predicted.ticks/predicted.duration),from=laneXAt(threat.fromLane,threat.originY??43);place(node,threat.kind==='shell'?from+(LANE_CENTERS[threat.lane]-from)*progress:laneXAt(threat.lane,y),y);}
  }else if(kind==='mission'||kind==='cargo'){
   const o=kind==='mission'?s.ops.mission:s.ops.event,y=fieldY(v,o);place(node,laneXAt(o.lane,y),y);
  }else if(kind==='prep'){const y=gateGroundY(v.progress,prepMark(s));place(node,laneXAt(id,y),y);}
  else if(kind==='part'){const p=s.ops.parts[id];if(p){const y=bossY(v)+4;place(node,laneXAt(p.lane,y),y);}}
 }
}

export function startMotionLoop(request:(callback:(time:number)=>void)=>number,cancel:(id:number)=>void,paint:(time:number)=>void,low=false){
 let handle=0,last=-Infinity,disposed=false;
 const draw=(now:number)=>{if(disposed)return;if(now-last>=(low?1000/30:1000/60)-1){last=now;paint(now);}handle=request(draw);};
 handle=request(draw);return()=>{disposed=true;cancel(handle);};
}
