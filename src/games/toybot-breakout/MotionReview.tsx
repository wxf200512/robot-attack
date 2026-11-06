/* Standalone development-only entry. Not registered as a game route. */
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Game from './index';
import { applyGateEffect, createInitialState, RUN_SPEED, type GameState } from './simulation';
import { normalizeGarage } from './progression';
import { makeBossParts } from './operations';
import { createCampaign } from './campaign';
import { getLevel } from './level';
import type { MechClass } from './mechs';
function seed(mechClass:MechClass,battle:boolean):GameState{
 const g=normalizeGarage({mechClass,tutorialCompleted:true,completedLevels:[true,true,true,true,true]});
 const s=createInitialState(g,1,0);Object.assign(s,{status:battle?'battle':'running',progress:battle?93:32,bots:3,weaponLevel:2,shieldCharges:1,fireCooldown:0,gate:battle?6:2,burstEnergy:100});
 if(battle){Object.assign(s,{battleHp:1800,battleMaxHp:1800,battleLane:1,bossStep:'recovery',bossStepTicks:3,bossCycle:1});s.ops.parts=makeBossParts(s);}
 return s;
}
export default function MotionReview(){
 const monitor=useRef<HTMLOutputElement>(null);
 useEffect(()=>{let last=performance.now(),frames=0;const timer=window.setInterval(()=>{const node=document.querySelector<HTMLElement>('.has-motion-clock'),count=Number(node?.dataset.motionFrames??0),now=performance.now();if(monitor.current)monitor.current.textContent=`绘制采样 ${Math.max(0,Math.round((count>=frames?count-frames:count)*1000/(now-last)))} Hz · ${node?.dataset.motionCost??'0'} ms · 对象 ${document.querySelectorAll('[data-motion]').length}`;frames=count;last=now;},1000);return()=>clearInterval(timer);},[]);
 const [mech,setMech]=useState<MechClass>('pulse'),[battle,setBattle]=useState(false),[revision,setRevision]=useState(0);
 const [state,setState]=useState(()=>seed('pulse',false));
 const reset=(kind:MechClass,arena:boolean)=>{setMech(kind);setBattle(arena);setRevision(n=>n+1);setState(seed(kind,arena));};
 const inspect=(result:boolean)=>{const sample=seed(mech,true);if(result)Object.assign(sample,{status:'result',battleHp:540,playerHp:0,bots:0,defeatReason:'boss-wipe',score:650,report:{...sample.report,dealt:1360,bossDamage:1260,taken:100,hostile:72,collisions:28}});setRevision(n=>n+1);setState(result?sample:applyGateEffect(sample,{id:'preview',title:'火力+1',detail:'升级演出预览',icon:'⚡',polarity:'reward',effect:'weaponUp',amount:1,lane:1}));};
 const frontlinePreview=(sector:number)=>{
  const g=normalizeGarage({mechClass:mech,tutorialCompleted:true,completedLevels:[true,true,true,true,true]});
  const sample=createInitialState(g,sector,0),level=getLevel(sector),elite=level.hazards.find(h=>h.elite)!;
  Object.assign(sample,{status:'running',progress:elite.progress-13.4,roadTicks:Math.round((elite.progress-13.4)/RUN_SPEED),bots:3,weaponLevel:2,fireCooldown:10000,gate:level.gateMarks.length,playerHp:1000,playerMaxHp:1000});
  setState(sample);setRevision(n=>n+1);
 };
 const playabilityPreview=(kind:'win'|'breather'|'finisher')=>{
  const sample=seed(kind==='finisher'?'blade':mech,kind!=='breather');
  if(kind==='win')Object.assign(sample,{status:'result',won:true,bossDefeated:true,progress:100,battleHp:0,score:1500,bestCombo:26,kills:75,report:{...sample.report,elites:3,dealt:3900,bossDamage:1800,blocked:25,taken:15},ops:{...sample.ops,bonusParts:6,mission:{...sample.ops.mission,status:'done'},broken:3}});
  else if(kind==='breather')Object.assign(sample,{breatherTicks:25,report:{...sample.report,elites:1}});
  else sample.report={...sample.report,bladeReady:true,bladeCombo:3};
  setState(sample);setRevision(n=>n+1);
 };
 const storyPreview=()=>{const sample=createCampaign(seed(mech,false));sample.narrative.seen=['briefing','confrontation','aftermath','lore'];sample.narrative.radio={id:'layout-preview',ticks:75,text:'米可：三条航道已接通。启动核心解放清理敌群，注意首领的蓄力预警。'};setState(sample);setRevision(n=>n+1);};
 return <MemoryRouter><div style={{maxWidth:430,margin:'0 auto',background:'#0e263c',color:'#d9f7ff',font:'11px sans-serif',padding:'6px 8px',display:'flex',gap:5,flexWrap:'wrap'}}><b>动作验收 · 不写存档</b><output ref={monitor} style={{width:'100%',height:14,minHeight:14}}/>{(['pulse','heavy','blade'] as const).map((kind,i)=><button key={kind} type="button" onClick={()=>reset(kind,battle)}>{['脉冲','力量','近战'][i]}</button>)}<button type="button" onClick={()=>reset(mech,!battle)}>{battle?'切到跑图':'切到首领战'}</button><button type="button" onClick={()=>reset(mech,battle)}>重置预览</button><button type="button" onClick={()=>inspect(false)}>强化预览</button><button type="button" onClick={()=>inspect(true)}>失败复盘</button><button type="button" onClick={storyPreview}>顶部通信</button><button type="button" onClick={()=>playabilityPreview('win')}>通关复盘</button><button type="button" onClick={()=>playabilityPreview('breather')}>精英回收</button><button type="button" onClick={()=>playabilityPreview('finisher')}>终结斩</button>{[0,1,2,3,4].map(sector=><button type="button" key={sector} onClick={()=>frontlinePreview(sector)}>前线{sector+1}</button>)}</div><Game key={revision} previewState={state}/></MemoryRouter>;
}
const reviewRoot=createRoot(document.getElementById('motion-review-root')!);reviewRoot.render(<MotionReview/>);
if(import.meta.hot)import.meta.hot.dispose(()=>reviewRoot.unmount());
