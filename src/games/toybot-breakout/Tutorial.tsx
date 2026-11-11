import { lt } from './i18n';
import { advanceDrag, canStartPointerGesture } from './interaction';
import type { AudioCue } from './audio';
import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { BOSS_ART, THREAT_ART, GATE_ART, MAP_ART } from './art';
import { createTrainingState, readTrainingCheckpoint, saveTrainingCheckpoint, trainingReducer, TRAINING_LESSONS, trainingGateY, trainingBossPhase } from './training';
import './tutorial.css';
const centers=[27,50,73];
export default function Tutorial({ onExit, onComplete, first, renderMech, onSettings, settingsOpen, onSound,dragSensitivity=1,persist=true }: {dragSensitivity?:number;persist?:boolean;onSettings:()=>void;settingsOpen:boolean;onSound:(cue:AudioCue)=>void;onExit:()=>void;onComplete:()=>void;first:boolean;renderMech:(index:number,firing:boolean)=>ReactNode}) {
  const [s,dispatch]=useReducer(trainingReducer,undefined,persist?readTrainingCheckpoint:createTrainingState);
  const [engagedStep,setEngagedStep]=useState(-1);
  const engaged=engagedStep===s.step;
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{root.current?.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});},[]);
  const sound=useRef(onSound); sound.current=onSound;
  const previous=useRef(s);
  useEffect(()=>{const before=previous.current;if(!s.paused&&!before.paused){if(s.sequence>before.sequence)sound.current('pulse');if(s.damageSequence>before.damageSequence)sound.current('damage');if(s.done&&!before.done)sound.current(s.step===2?'gate':s.step===4?'victory':'destroy');}previous.current=s;},[s]);
  useEffect(()=>{if(persist)saveTrainingCheckpoint({step:s.step});},[s.step,persist]);
  useEffect(()=>{const pause=()=>{if(!s.paused)dispatch({type:'PAUSE'});};const hidden=()=>{if(document.hidden)pause();};document.addEventListener('visibilitychange',hidden);window.addEventListener('blur',pause);window.addEventListener('pagehide',pause);return()=>{document.removeEventListener('visibilitychange',hidden);window.removeEventListener('blur',pause);window.removeEventListener('pagehide',pause);};},[s.paused]);
  useEffect(()=>{if(settingsOpen&&!s.paused)dispatch({type:'PAUSE'});},[settingsOpen,s.paused]);
  const drag=useRef<{id:number;x:number;lane:number;moved:boolean}|null>(null);
  useEffect(()=>{if(!engaged||s.paused||s.done||s.step===0||s.step===5)return;const timer=window.setInterval(()=>dispatch({type:'TICK'}),100);return()=>window.clearInterval(timer);},[s.paused,s.done,s.step,engaged]);
  useEffect(()=>{drag.current=null;},[s.paused,s.step,dragSensitivity]);
  const lesson=TRAINING_LESSONS[s.step],phase=trainingBossPhase(s),enemyLane=s.step===1?2:1;
  const move=(lane:number)=>{setEngagedStep(s.step);dispatch({type:'MOVE',lane});};
  return <div ref={root} onKeyDown={e=>{if(e.key!=='Tab'||e.ctrlKey||e.metaKey||e.altKey)return;const items=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),[tabindex="0"]'));const firstItem=items[0],lastItem=items[items.length-1];if(e.shiftKey&&e.target===firstItem){e.preventDefault();lastItem?.focus();}else if(!e.shiftKey&&e.target===lastItem){e.preventDefault();firstItem?.focus();}}} className={'toybot-overlay toybot-tutorial'+(s.paused?' training-paused':'')} role="dialog" aria-modal="true" aria-labelledby="toybot-training-title">
    <div className="toybot-training-top"><button type="button" onClick={onExit}>{lt("‹ 返回首页")}</button><span>{lt("训练场 / ")}{lt(s.step+1)} · {lt(TRAINING_LESSONS.length)}</span><button type="button" onClick={onSettings}>{lt("设置")}</button><button type="button" onClick={()=>dispatch({type:'PAUSE'})}>{lt(s.paused?'继续':'暂停')}</button></div>
    <div className="toybot-training-dots" aria-label={lt('教学进度 '+(s.step+1)+'/'+TRAINING_LESSONS.length)}>{lt(TRAINING_LESSONS.map((_,i)=><i key={i} className={i<s.step?'complete':i===s.step?'current':''}/>))}</div>
    <div className="toybot-training-heading" aria-live="polite"><small>BASIC TRAINING / 0{lt(s.step+1)}</small><h2 id="toybot-training-title">{lt(lesson.title)}</h2><p>{lt(lesson.copy)}</p></div>
    <div className="toybot-training-board" tabIndex={0} role="application" aria-label={lt("训练场景：左右拖拽，或按方向键换道")} aria-keyshortcuts="ArrowLeft ArrowRight"
      onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(s.lane+(e.key==='ArrowLeft'?-1:1));}}}
      onPointerDown={e=>{if(s.paused||!canStartPointerGesture(drag.current?.id??null,e))return;try{e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:e.pointerId,x:e.clientX,lane:s.lane,moved:false};}catch{drag.current=null;}}}
      onPointerMove={e=>{const d=drag.current;if(!d||d.id!==e.pointerId||s.paused)return;const next=advanceDrag({anchorX:d.x,lane:d.lane,moved:d.moved},e.clientX,e.currentTarget.getBoundingClientRect().width,dragSensitivity);d.x=next.anchorX;d.moved=next.moved;if(next.lane!==d.lane){d.lane=next.lane;move(next.lane);}}}
      onPointerUp={e=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;if(!d.moved&&!s.paused){const bounds=e.currentTarget.getBoundingClientRect(),position=(e.clientX-bounds.left)/bounds.width;move(position<.385?0:position>.615?2:1);}if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);drag.current=null;}}
      onPointerCancel={()=>{drag.current=null;}}>
      <img className="training-map" src={MAP_ART[0]} alt="" draggable={false}/><div className="training-shade"/>
      <span className="training-mode">{lt("脉冲先锋 · 训练保护")}</span>
      <div className="training-hp" aria-label={lt('训练核心生命 '+s.health+'/100')}><span style={{width:s.health+'%'}}/><b>{lt(s.health)}/100</b></div>
      {lt(centers.map((x,i)=><span key={i} className={'training-track'+(s.lane===i?' selected':'')} style={{left:x+'%'}}/>))}
      {s.step===0&&<div className="training-gesture" aria-hidden="true"><span>↔</span><small>{lt("按住后左右拖动")}</small></div>}
      {(s.step===1||s.step===4)&&s.enemyHp>0&&<div className={'training-target '+(s.step===4?'boss':'drone')} style={{left:centers[enemyLane]+'%'}} aria-label={lt(s.step===4?'中轨训练首领':'右轨训练无人机')}><span style={{backgroundImage:'url('+(s.step===4?BOSS_ART:'/games/toybot-breakout/optimized/hazard-drone.png')+')', ...(s.step===1?{backgroundSize:'contain',backgroundPosition:'center'}:{})}}/><i><b style={{width:s.enemyHp/6*100+'%'}}/></i></div>}
      {s.step===2&&!s.done&&<div className="training-gate" style={{left:centers[0]+'%',top:trainingGateY(s)+'%',backgroundImage:'url('+GATE_ART+')'}} role="img" aria-label={lt("左轨奖励门：机甲加2")}><b>{lt("机甲 +2")}</b><span/></div>}
      {s.step===3&&!s.done&&<><span className="training-danger" style={{left:centers[s.lockedLane]+'%'}}/><div className="training-obstacle" style={{left:centers[s.lockedLane]+'%',top:trainingGateY(s)+'%',backgroundImage:'url('+THREAT_ART+')'}} aria-label={lt("接近中的训练路障")}/></>}
      {s.step===4&&!s.done&&phase!=='recovery'&&<span className={'training-danger boss-warning '+(phase==='flight'?'firing':'')} style={{left:centers[s.lockedLane]+'%'}}/>}
      {s.step===4&&!s.done&&phase==='flight'&&<span className="training-hostile" style={{left:(centers[1]+(centers[s.lockedLane]-centers[1])*((s.clock%60-18)/12))+'%',top:(36+19*((s.clock%60-18)/12))+'%',backgroundImage:'url('+THREAT_ART+')'}}/>}
      {s.step===4&&phase==='recovery'&&!s.done&&<span className="training-window">{lt("恢复窗口 · 回中轨反击")}</span>}
      {lt(s.shots.map(p=><span key={p.id} className="training-shot" style={{left:(centers[p.lane]+(p.slot===0?0:p.slot===1?-7:7)*p.ticks/p.duration)+'%',top:((p.slot===0?55:66)-(p.slot===0?19:30)*(1-p.ticks/p.duration))+'%'}}/>))}
      {lt(Array.from({length:s.bots},(_,i)=><div key={i} className="training-player" style={{left:(centers[s.lane]+(i===0?0:i===1?-7:7))+'%',top:(i===0?66:77)+'%'}}>{lt(renderMech(i,s.shots.some(p=>p.ticks===p.duration)))}</div>))}
      {s.done&&<div className="training-success" role="status">{lt("✓ 练习完成")}</div>}
      {s.damageSequence>0&&<span key={s.damageSequence} className="training-hit" aria-hidden="true"/>}
      {s.paused&&<div className="training-pause-mask">{lt("训练已暂停")}</div>}
    </div>
    <div className="toybot-training-controls" role="group" aria-label={lt("训练换道")}>{lt(centers.map((_,i)=><button key={i} type="button" disabled={s.paused} aria-pressed={s.lane===i} onClick={()=>move(i)}>{lt(['左轨','中轨','右轨'][i])}{lt(s.step===0&&((i===0&&(s.visited&1))||(i===2&&(s.visited&2)))?' ✓':'')}</button>))}</div>
    <div className="toybot-training-brief" aria-live="polite">{s.step>0&&s.step<5&&!engaged&&!s.done&&<p className="training-ready-v42">{lt("先选择轨道开始练习，阅读期间不会受击。")}</p>}<strong>{lt(lesson.goal)}</strong>{s.notice&&<p className="training-notice">{lt(s.notice)}</p>}<details><summary>{lt("查看操作要点")}</summary><p>{lt(lesson.explain)}</p></details></div>
    {s.step===5?<button type="button" className="toybot-primary" disabled={s.paused} onClick={onComplete}>{lt(first?'完成训练，开始第1关':'完成训练，返回首页')}<span>›</span></button>:<button type="button" className="toybot-primary" disabled={!s.done||s.paused} onClick={()=>dispatch({type:'NEXT'})}>{lt(s.done?'继续下一项':'完成当前练习后继续')}<span>›</span></button>}
    <button type="button" className="toybot-training-restart" onClick={()=>dispatch({type:'RESTART'})}>{lt("从头训练 · 不影响正式进度与零件")}</button>
  </div>;
}
