import { normalizeGarage } from './progression';
/* Development-only visual gallery: uses the same samplers and assets as combat. */
import { useEffect, useMemo, useState } from 'react';
import { BOSS_MOTION_V31, ENEMY_MOTION_V31, ENEMY_MOTION_PROFILES, type HostileKind, BOSS_MOTION_PROFILES, bossMotionV31, enemyMotionV31 } from './hostileMotionV31';
import { createInitialState, bossWarningTicks, type EnemyAttack, type GameState } from './simulation';
import { LEVELS, getLevel } from './level';
import { BOSS_NAMES } from './art';
import { atlasCell } from './visualArt';
type Clip='move'|'charge'|'attack'|'hit';
export function HostileMotionReview({close}:{close:()=>void}){
 const [clip,setClip]=useState<Clip>('move'),[phase2,setPhase2]=useState(false),[paused,setPaused]=useState(false),[time,setTime]=useState(0);
 useEffect(()=>{if(paused)return;let handle=0,last=performance.now();const frame=(now:number)=>{const delta=Math.min(50,now-last);last=now;setTime(t=>t+delta/100);handle=requestAnimationFrame(frame);};handle=requestAnimationFrame(frame);return()=>cancelAnimationFrame(handle);},[paused]);
 const seeds=useMemo(()=>LEVELS.map((_,i)=>createInitialState(normalizeGarage({tutorialCompleted:true,completedLevels:[true,true,true,true,true]}),i,0)),[]);
 const cycle=time%10/10;
 const sample=(levelIndex:number):GameState=>({...seeds[levelIndex],status:'battle',battleTime:100+time,bossStage:phase2?2:1,bossStep:'recovery',bossMoveTicks:0,enemyAttacks:[],roadTicks:time});
 return <main style={{minHeight:'100vh',background:'#10253a',color:'#e2f4ff',font:'13px sans-serif',padding:16}}>
  <h1 style={{fontSize:20}}>敌方独立动作 · 不写存档</h1><p>直接使用战斗中的图集与动作采样；每张卡片只有一个机体。</p>
  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>{(['move','charge','attack','hit'] as Clip[]).map((c,i)=><button type="button" key={c} aria-pressed={clip===c} onClick={()=>{setClip(c);setTime(0);}}>{['移动','蓄力','攻击','受击'][i]}</button>)}<button type="button" onClick={()=>setPhase2(v=>!v)}>{phase2?'首领一阶段':'首领二阶段'}</button><button type="button" onClick={()=>setPaused(v=>!v)}>{paused?'播放动作':'冻结动作'}</button><button type="button" onClick={close}>返回战斗验收</button></div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,maxWidth:1000,margin:'auto'}}>
  {BOSS_MOTION_V31.map((image,levelIndex)=>{
   const s=sample(levelIndex),profile=BOSS_MOTION_PROFILES[levelIndex];
   if(clip==='move')s.bossMoveTicks=5-cycle*5;
   if(clip==='charge'){s.bossStep='warning';s.bossStepTicks=cycle*bossWarningTicks(s);}
   if(clip==='attack'){s.bossStep='flight';s.bossFiredTick=s.battleTime-cycle*profile.attack;}
   if(clip==='hit')s.hostileReactions={'boss:0':{ticks:6-cycle*6,cooldown:14}};
   const p=bossMotionV31(s);return <article key={image} style={{background:'#19374c',borderRadius:12,padding:12,textAlign:'center'}}><strong>{BOSS_NAMES[levelIndex]}</strong><div className="hostile-v31-body" data-hostile-profile={p.profile} data-hostile-action={p.action} style={{width:140,height:140,margin:'auto',backgroundImage:`url(${image})`,backgroundSize:'800% 800%',backgroundPosition:atlasCell(p.frame,p.row),translate:`0 ${p.bob}px`,rotate:p.lean+'deg'}}/><small>{p.profile} · {p.action} · 帧 {p.frame+1}</small></article>;
  })}
  {(['drone','swarm','sniper','bomber','medic','minion','barrier'] as HostileKind[]).map((kind,i)=>{
   const summoned=kind==='minion'||kind==='barrier',levelIndex=summoned?1:LEVELS.findIndex(l=>l.hazards.some(h=>h.kind===kind)),index=summoned?500+i:getLevel(levelIndex).hazards.findIndex(h=>h.kind===kind),s=sample(levelIndex),source=summoned?'threat':'hazard';s.status='running';if(summoned)s.threats=[{id:index,kind,ticks:32,duration:32,hp:10,maxHp:10,damage:1,lane:1,fromLane:1}];
   if(clip==='charge'||clip==='attack')s.enemyAttacks=[{id:1,source,sourceId:index,phase:clip==='charge'?'warning':'flight',duration:20,ticks:clip==='charge'?20*(1-cycle):20-cycle*ENEMY_MOTION_PROFILES[kind].attack,kind:'drone-burst',lane:1,fromLane:1,fromY:48,damage:1,shotsRemaining:1} as EnemyAttack];
   if(clip==='hit')s.hostileReactions={[source+':'+index]:{ticks:6-cycle*6,cooldown:14}};
   const p=enemyMotionV31(s,index,0,false,source);return <article key={kind} style={{background:'#19374c',borderRadius:12,padding:12,textAlign:'center'}}><strong>{['巡逻机','突击蜂','狙击哨','轰炸机','维修机','奔袭机器人','震荡路障'][i]}</strong><div className="hostile-v31-body" data-hostile-profile={p.profile} data-hostile-action={p.action} style={{width:120,height:140,margin:'auto',backgroundImage:`url(${ENEMY_MOTION_V31[kind]})`,backgroundSize:'800% 400%',backgroundPosition:atlasCell(p.frame,p.row,8,4),translate:`0 ${p.bob}px`}}/><small>{p.profile} · {p.action} · 帧 {p.frame+1}</small></article>;
  })}</div>
 </main>;
}
