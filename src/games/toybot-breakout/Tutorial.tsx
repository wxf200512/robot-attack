import type { AudioCue } from './audio';
import { useEffect, useReducer, useRef, type ReactNode } from 'react';
import { BOSS_ART, THREAT_ART, GATE_ART, MAP_ART } from './art';
import { readTrainingCheckpoint, saveTrainingCheckpoint, trainingReducer, TRAINING_LESSONS, trainingGateY, trainingBossPhase } from './training';
import './tutorial.css';
const centers=[27,50,73];
export default function Tutorial({ onExit, onComplete, first, renderMech, onSettings, settingsOpen, onSound }: {onSettings:()=>void;settingsOpen:boolean;onSound:(cue:AudioCue)=>void;onExit:()=>void;onComplete:()=>void;first:boolean;renderMech:(index:number,firing:boolean)=>ReactNode}) {
  const [s,dispatch]=useReducer(trainingReducer,undefined,readTrainingCheckpoint);
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{root.current?.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});},[]);
  const sound=useRef(onSound); sound.current=onSound;
  const previous=useRef(s);
  useEffect(()=>{const before=previous.current;if(!s.paused&&!before.paused){if(s.sequence>before.sequence)sound.current('pulse');if(s.damageSequence>before.damageSequence)sound.current('damage');if(s.done&&!before.done)sound.current(s.step===2?'gate':s.step===4?'victory':'destroy');}previous.current=s;},[s]);
  useEffect(()=>{saveTrainingCheckpoint({step:s.step});},[s.step]);
  useEffect(()=>{const pause=()=>{if(!s.paused)dispatch({type:'PAUSE'});};const hidden=()=>{if(document.hidden)pause();};document.addEventListener('visibilitychange',hidden);window.addEventListener('blur',pause);window.addEventListener('pagehide',pause);return()=>{document.removeEventListener('visibilitychange',hidden);window.removeEventListener('blur',pause);window.removeEventListener('pagehide',pause);};},[s.paused]);
  useEffect(()=>{if(settingsOpen&&!s.paused)dispatch({type:'PAUSE'});},[settingsOpen,s.paused]);
  const drag=useRef<{id:number;x:number;lane:number}|null>(null);
  useEffect(()=>{if(s.paused||s.done||s.step===0||s.step===5)return;const timer=window.setInterval(()=>dispatch({type:'TICK'}),100);return()=>window.clearInterval(timer);},[s.paused,s.done,s.step]);
  const lesson=TRAINING_LESSONS[s.step],phase=trainingBossPhase(s),enemyLane=s.step===1?2:1;
  const move=(lane:number)=>dispatch({type:'MOVE',lane});
  return <div ref={root} onKeyDown={e=>{if(e.key!=='Tab'||e.ctrlKey||e.metaKey||e.altKey)return;const items=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),[tabindex="0"]'));const firstItem=items[0],lastItem=items[items.length-1];if(e.shiftKey&&e.target===firstItem){e.preventDefault();lastItem?.focus();}else if(!e.shiftKey&&e.target===lastItem){e.preventDefault();firstItem?.focus();}}} className={'toybot-overlay toybot-tutorial'+(s.paused?' training-paused':'')} role="dialog" aria-modal="true" aria-labelledby="toybot-training-title">
    <div className="toybot-training-top"><button type="button" onClick={onExit}>‹ 返回首页</button><span>训练场 / {s.step+1} · {TRAINING_LESSONS.length}</span><button type="button" onClick={onSettings}>设置</button><button type="button" onClick={()=>dispatch({type:'PAUSE'})}>{s.paused?'继续':'暂停'}</button></div>
    <div className="toybot-training-dots" aria-label={'教学进度 '+(s.step+1)+'/'+TRAINING_LESSONS.length}>{TRAINING_LESSONS.map((_,i)=><i key={i} className={i<s.step?'complete':i===s.step?'current':''}/>)}</div>
    <div className="toybot-training-heading" aria-live="polite"><small>BASIC TRAINING / 0{s.step+1}</small><h2 id="toybot-training-title">{lesson.title}</h2><p>{lesson.copy}</p></div>
    <div className="toybot-training-board" tabIndex={0} role="application" aria-label="训练场景：左右拖拽，或按方向键换道" aria-keyshortcuts="ArrowLeft ArrowRight"
      onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(s.lane+(e.key==='ArrowLeft'?-1:1));}}}
      onPointerDown={e=>{if(e.button!==0||s.paused)return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:e.pointerId,x:e.clientX,lane:s.lane};}}
      onPointerMove={e=>{const d=drag.current;if(!d||d.id!==e.pointerId||s.paused)return;const width=e.currentTarget.getBoundingClientRect().width,threshold=width*.2;if(threshold<=0)return;let delta=e.clientX-d.x;let changed=false;while(Math.abs(delta)>=threshold){const direction=delta>0?1:-1;d.lane=Math.max(0,Math.min(2,d.lane+direction));d.x+=direction*threshold;delta=e.clientX-d.x;changed=true;}if(changed)move(d.lane);}}
      onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);drag.current=null;}}
      onPointerCancel={()=>{drag.current=null;}}>
      <img className="training-map" src={MAP_ART[0]} alt="" draggable={false}/><div className="training-shade"/>
      <span className="training-mode">脉冲先锋 · 训练保护</span>
      <div className="training-hp" aria-label={'训练核心生命 '+s.health+'/100'}><span style={{width:s.health+'%'}}/><b>{s.health}/100</b></div>
      {centers.map((x,i)=><span key={i} className={'training-track'+(s.lane===i?' selected':'')} style={{left:x+'%'}}/>)}
      {s.step===0&&<div className="training-gesture" aria-hidden="true"><span>↔</span><small>按住后左右拖动</small></div>}
      {(s.step===1||s.step===4)&&s.enemyHp>0&&<div className={'training-target '+(s.step===4?'boss':'drone')} style={{left:centers[enemyLane]+'%'}} aria-label={s.step===4?'中轨训练首领':'右轨训练无人机'}><span style={{backgroundImage:'url('+(s.step===4?BOSS_ART:'/games/toybot-breakout/optimized/hazard-drone.png')+')', ...(s.step===1?{backgroundSize:'contain',backgroundPosition:'center'}:{})}}/><i><b style={{width:s.enemyHp/6*100+'%'}}/></i></div>}
      {s.step===2&&!s.done&&<div className="training-gate" style={{left:centers[0]+'%',top:trainingGateY(s)+'%',backgroundImage:'url('+GATE_ART+')'}} role="img" aria-label="左轨奖励门：机甲加2"><b>机甲 +2</b><span/></div>}
      {s.step===3&&!s.done&&<><span className="training-danger" style={{left:centers[s.lockedLane]+'%'}}/><div className="training-obstacle" style={{left:centers[s.lockedLane]+'%',top:trainingGateY(s)+'%',backgroundImage:'url('+THREAT_ART+')'}} aria-label="接近中的训练路障"/></>}
      {s.step===4&&!s.done&&phase!=='recovery'&&<span className={'training-danger boss-warning '+(phase==='flight'?'firing':'')} style={{left:centers[s.lockedLane]+'%'}}/>}
      {s.step===4&&!s.done&&phase==='flight'&&<span className="training-hostile" style={{left:(centers[1]+(centers[s.lockedLane]-centers[1])*((s.clock%60-18)/12))+'%',top:(36+19*((s.clock%60-18)/12))+'%',backgroundImage:'url('+THREAT_ART+')'}}/>}
      {s.step===4&&phase==='recovery'&&!s.done&&<span className="training-window">恢复窗口 · 回中轨反击</span>}
      {s.shots.map(p=><span key={p.id} className="training-shot" style={{left:(centers[p.lane]+(p.slot===0?0:p.slot===1?-7:7)*p.ticks/p.duration)+'%',top:((p.slot===0?55:66)-(p.slot===0?19:30)*(1-p.ticks/p.duration))+'%'}}/>)}
      {Array.from({length:s.bots},(_,i)=><div key={i} className="training-player" style={{left:(centers[s.lane]+(i===0?0:i===1?-7:7))+'%',top:(i===0?66:77)+'%'}}>{renderMech(i,s.shots.some(p=>p.ticks===p.duration))}</div>)}
      {s.done&&<div className="training-success" role="status">✓ 练习完成</div>}
      {s.damageSequence>0&&<span key={s.damageSequence} className="training-hit" aria-hidden="true"/>}
      {s.paused&&<div className="training-pause-mask">训练已暂停</div>}
    </div>
    <div className="toybot-training-controls" role="group" aria-label="训练换道">{centers.map((_,i)=><button key={i} type="button" disabled={s.paused} aria-pressed={s.lane===i} onClick={()=>move(i)}>{['左轨','中轨','右轨'][i]}{s.step===0&&((i===0&&(s.visited&1))||(i===2&&(s.visited&2)))?' ✓':''}</button>)}</div>
    <div className="toybot-training-brief" aria-live="polite"><strong>{lesson.goal}</strong>{s.notice&&<p className="training-notice">{s.notice}</p>}<details><summary>查看操作要点</summary><p>{lesson.explain}</p></details></div>
    {s.step===5?<button type="button" className="toybot-primary" disabled={s.paused} onClick={onComplete}>{first?'完成训练，开始第1关':'完成训练，返回首页'}<span>›</span></button>:<button type="button" className="toybot-primary" disabled={!s.done||s.paused} onClick={()=>dispatch({type:'NEXT'})}>{s.done?'继续下一项':'完成当前练习后继续'}<span>›</span></button>}
    <button type="button" className="toybot-training-restart" onClick={()=>dispatch({type:'RESTART'})}>从头训练 · 不影响正式进度与零件</button>
  </div>;
}
