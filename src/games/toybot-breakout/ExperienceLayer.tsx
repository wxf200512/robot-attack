import { MATERIAL_ART, atlasCell, materialSample } from './visualArt';
import type { CSSProperties } from 'react';
import { bossAttackLabel, bossRecoveryTicks, bossWarningTicks, LANE_CENTERS, type GameState } from './simulation';
import { visibleFeedback } from './playability';
import { CLASS_TACTICS, encounterBeat, runDebrief } from './experience';
export function ExperienceLayer({game:s,low,reduced,shake}:{game:GameState;low:boolean;reduced:boolean;shake:boolean}){
 const status=s.status==='paused'?s.resumeStatus:s.status,beat=encounterBeat(s.progress,s.breatherTicks),latest=s.feedback[s.feedback.length-1];
 const recovery=status==='battle'&&s.bossStep==='recovery'&&s.bossMoveTicks===0&&s.bossStepTicks>1;
 const phase=s.bossStep==='warning'?'蓄力预警':s.bossStep==='flight'||s.bossStep==='rush'?'技能释放':s.bossStep==='shield'?'护盾整备':'调整站位';
 const amount=recovery?Math.max(0,bossRecoveryTicks(s)-s.bossStepTicks):s.bossStep==='warning'?Math.max(0,bossWarningTicks(s)-s.bossStepTicks):0;
 return <>
  <div className={'toybot-depth-layer sector-'+s.levelIndex} aria-hidden="true"><i/><i/><i/><i/></div>
  {s.burstTicks===0&&!s.pendingShots.some(shot=>shot.burst)&&shake&&!reduced&&latest&&['heavy','elite','boss'].includes(latest.kind)&&<span key={latest.id} className="toybot-impact-pulse" aria-hidden="true"/>}
  {visibleFeedback(s.feedback,low).map(f=><span key={f.id} data-world-y={f.y} data-world-boss={f.boss||f.kind==='boss'} className={'toybot-contact-vfx contact-'+f.kind} style={{left:f.x+'%',top:f.y+'%',zIndex:Math.round((f.y+7)*10)+8,'--contact-life':f.kind==='boss'?12:f.kind==='elite'?8:4,'--contact-age':1-f.ticks/(f.kind==='boss'?12:f.kind==='elite'?8:4)} as CSSProperties} aria-hidden="true"><i data-motion="material" data-motion-id={f.id} style={{backgroundImage:`url(${MATERIAL_ART})`,backgroundPosition:atlasCell(materialSample(f.kind,f.ticks).frame,materialSample(f.kind,f.ticks).row,8,4)}}/></span>)}
  {status==='running'&&<div className={'toybot-tempo-strip intensity-'+beat.intensity} aria-label={'当前节奏：'+beat.name}><i/><i/><i/></div>}
  {status==='battle'&&<div className={'toybot-skill-phase'+(recovery?' is-counter-window':'')} role="status" aria-live="off"><b>{recovery?'反击窗口':phase}</b><span>{recovery?'对准首领集中输出':bossAttackLabel(s)}{amount>0?' · '+(amount/10).toFixed(1)+'s':''}</span><i style={{scale:Math.min(1,recovery?amount/bossRecoveryTicks(s):s.bossStep==='warning'?s.bossStepTicks/bossWarningTicks(s):0)+' 1'}}/></div>}
  {(status==='running'||status==='battle')&&<div className={'toybot-class-tactic tactic-'+s.mechClass} aria-label={CLASS_TACTICS[s.mechClass].detail}><span>{CLASS_TACTICS[s.mechClass].name}</span>{s.mechClass==='pulse'?<b>{s.report.focusReady&&(s.report.focusLane===s.lane||s.report.focusLane<0)?'就绪':s.report.focus+'/6'}</b>:<b>{s.mechClass==='heavy'?'破甲':s.report.bladeReady?'终结斩':s.report.bladeCombo+'/3'}</b>}</div>}
  {s.upgradeFx&&<div key={s.upgradeFx.id} className={'toybot-upgrade-reveal'+(s.upgradeFx.positive?'':' is-penalty')} style={{left:LANE_CENTERS[s.lane]+'%',opacity:Math.min(1,s.upgradeFx.ticks/3)}} role="status"><i/><strong>{s.upgradeFx.title}</strong></div>}
 </>;
}
export function RunAnalysis({game:s}:{game:GameState}){
 const r=runDebrief(s);
 return <section className="toybot-run-analysis" aria-label="本局战术复盘"><div><small>本局流派</small><b>{r.build}</b></div><strong>{r.gap}</strong>{!s.won&&r.remaining!==null&&<div className="toybot-remaining-track" aria-label={'首领剩余耐久'+r.remaining+'%'}><i style={{width:r.remaining+'%'}}/></div>}<dl><div><dt>总输出</dt><dd>{Math.round(s.report.dealt)}</dd></div><div><dt>首领伤害</dt><dd>{Math.round(s.report.bossDamage)}</dd></div><div><dt>防御吸收</dt><dd>{Math.round(s.report.blocked)}</dd></div></dl><p>{r.cause}</p>{!s.won&&<p className="analysis-next"><b>下次尝试</b>{r.tip}</p>}</section>;
}
