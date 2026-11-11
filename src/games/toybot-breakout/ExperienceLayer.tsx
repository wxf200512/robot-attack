import { lt } from './i18n';
import { readableFeedbackV42, strongFeedbackV42 } from './polishV42';
import { pressureV41, PRESSURE_NAMES_V41 } from './flowV41';
import { CORE_FX_V34, signatureFeedbackV34 } from './signatureV34';
import { MATERIAL_ART, atlasCell, materialSample } from './visualArt';
import type { CSSProperties } from 'react';
import { bossAttackLabel, bossRecoveryTicks, bossWarningTicks, LANE_CENTERS, type GameState } from './simulation';
import { CLASS_TACTICS, runDebrief } from './experience';
export function ExperienceLayer({game:s,low,reduced,shake}:{game:GameState;low:boolean;reduced:boolean;shake:boolean}){
 const status=s.status==='paused'?s.resumeStatus:s.status,beat={intensity:{recover:0,scout:1,build:2,surge:3}[pressureV41(s)]},latest=s.feedback[s.feedback.length-1];
 const recovery=status==='battle'&&s.bossStep==='recovery'&&s.bossMoveTicks===0&&s.bossStepTicks>1;
 const phase=s.bossStep==='warning'?'蓄力预警':s.bossStep==='flight'||s.bossStep==='rush'?'技能释放':s.bossStep==='shield'?'护盾整备':'调整站位';
 const amount=recovery?Math.max(0,bossRecoveryTicks(s)-s.bossStepTicks):s.bossStep==='warning'?Math.max(0,bossWarningTicks(s)-s.bossStepTicks):0;
 return <>
  <div className={'toybot-depth-layer sector-'+s.levelIndex} aria-hidden="true"><i/><i/><i/><i/></div>
  {s.burstTicks===0&&!s.pendingShots.some(shot=>shot.burst)&&shake&&!reduced&&latest&&strongFeedbackV42(latest)&&<span key={latest.id} className="toybot-impact-pulse" aria-hidden="true"/>}
  {lt(readableFeedbackV42(signatureFeedbackV34(s.feedback),low).map(f=><span key={f.id} data-world-y={f.y} data-world-boss={f.boss||f.kind==='boss'} className={'toybot-contact-vfx'+(f.destroyed?' is-destroyed':'')+(f.armorBreak?' is-armor-break':'')+' contact-'+f.kind+((f.coreStyle||f.pulseCore)?' contact-pulse-core core-impact-'+(f.coreStyle??'pulse'):'')} style={{left:f.x+'%',top:f.y+'%',zIndex:Math.round((f.y+7)*10)+8,'--contact-life':f.kind==='boss'?12:f.kind==='elite'?8:4,'--contact-age':1-f.ticks/(f.kind==='boss'?12:f.kind==='elite'?8:4)} as CSSProperties} aria-hidden="true">{f.armorBreak&&<small className="contact-readout-v42">{lt("破甲")}</small>}<i data-motion={(f.coreStyle||f.pulseCore)?'pulse-impact':'material'} data-motion-id={f.id} style={{backgroundImage:`url(${(f.coreStyle||f.pulseCore)?CORE_FX_V34[f.coreStyle??'pulse']:MATERIAL_ART})`,backgroundPosition:(f.coreStyle||f.pulseCore)?atlasCell(0,2,8,3):atlasCell(materialSample(f.destroyed&&(f.kind==='hit'||f.kind==='armor')?'heavy':f.kind,f.ticks).frame,materialSample(f.destroyed&&(f.kind==='hit'||f.kind==='armor')?'heavy':f.kind,f.ticks).row,8,4)}}/>{(f.coreStyle||f.pulseCore)&&<span data-motion="pulse-impact-ring" data-motion-id={f.id} className="pulse-impact-ring" style={{backgroundImage:`url(${CORE_FX_V34[f.coreStyle??'pulse']})`,backgroundPosition:atlasCell(0,0,8,3)}}/>}</span>))}
  {status==='running'&&<div className={'toybot-tempo-strip intensity-'+beat.intensity} aria-label={lt('当前节奏：'+PRESSURE_NAMES_V41[pressureV41(s)])}><i/><i/><i/></div>}
  {status==='battle'&&<div className={'toybot-skill-phase'+(recovery?' is-counter-window':'')} role="status" aria-live="off"><b>{lt(s.bossStage===2?'Ⅱ · ': 'Ⅰ · ')}{lt(recovery?'反击窗口':phase)}</b><span>{lt(recovery?'对准首领集中输出':bossAttackLabel(s))}{lt(amount>0?' · '+(amount/10).toFixed(1)+'s':'')}</span><i style={{scale:Math.min(1,recovery?amount/bossRecoveryTicks(s):s.bossStep==='warning'?s.bossStepTicks/bossWarningTicks(s):0)+' 1'}}/></div>}
  {(status==='running'||status==='battle')&&<div className={'toybot-class-tactic tactic-'+s.mechClass} aria-label={lt(CLASS_TACTICS[s.mechClass].detail)}><span>{lt(CLASS_TACTICS[s.mechClass].name)}</span>{s.mechClass==='pulse'?<b>{lt(s.report.focusReady&&(s.report.focusLane===s.lane||s.report.focusLane<0)?'就绪':s.report.focus+'/6')}</b>:<b>{lt(s.mechClass==='heavy'?'破甲':s.report.bladeReady?'终结斩':s.report.bladeCombo+'/3')}</b>}</div>}
  {s.upgradeFx&&<div key={s.upgradeFx.id} className={'toybot-upgrade-reveal'+(s.upgradeFx.positive?'':' is-penalty')} style={{left:LANE_CENTERS[s.lane]+'%',opacity:Math.min(1,s.upgradeFx.ticks/3)}} role="status"><i/><strong>{lt(s.upgradeFx.title)}</strong>{s.upgradeFx.detail&&<small className="upgrade-detail-v44">{lt(s.upgradeFx.detail)}</small>}</div>}
 </>;
}
export function RunAnalysis({game:s}:{game:GameState}){
 const r=runDebrief(s);
 return <section className="toybot-run-analysis" aria-label={lt("本局战术复盘")}><div><small>{lt("本局流派")}</small><b>{lt(r.build)}</b></div><strong>{lt(r.gap)}</strong>{!s.won&&r.remaining!==null&&<div className="toybot-remaining-track" aria-label={lt('首领剩余耐久'+r.remaining+'%')}><i style={{width:r.remaining+'%'}}/></div>}<dl><div><dt>{lt("总输出")}</dt><dd>{lt(Math.round(s.report.dealt))}</dd></div><div><dt>{lt("首领伤害")}</dt><dd>{lt(Math.round(s.report.bossDamage))}</dd></div><div><dt>{lt("防御吸收")}</dt><dd>{lt(Math.round(s.report.blocked))}</dd></div></dl><p>{lt(r.cause)}</p>{!s.won&&!s.flow.lastHit&&<p className="analysis-next"><b>{lt("下次尝试")}</b>{lt(r.tip)}</p>}</section>;
}
