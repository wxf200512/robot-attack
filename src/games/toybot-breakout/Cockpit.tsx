import { skillUtilityV40 } from './tacticsV40';
import { skillReadout } from './skillPresentationV32';
import { frontlineStage } from './frontline';
import type { CSSProperties } from 'react';
import { canActivateBurst, canMove, canShoot, bossAttackLabel, bossWarningTicks, bossRecoveryTicks, BURST_TICKS, MODULES, type GameState, type RunModule } from './simulation';
import { coreSkill, mechSpec } from './mechs';
import { FUSIONS } from './operations';
export const COCKPIT_ART='/games/toybot-breakout/optimized/cockpit-v29.png';
export const REACTOR_ART='/games/toybot-breakout/optimized/reactor-core-v22.png';
export const CORE_EFFECT_ART='/games/toybot-breakout/optimized/core-effects-v22.png';
export function Cockpit({game:s,blocked,onMove,onBurst}:{game:GameState;blocked:boolean;onMove:(lane:number)=>void;onBurst:()=>void}){
 const skill=coreSkill(s.mechClass),active=s.burstTicks>0,ready=canActivateBurst(s)&&!blocked;
 const energy=active?s.burstTicks/BURST_TICKS*100:s.burstEnergy,hp=s.playerHp/s.playerMaxHp*100;
 const disabled=!canMove(s.status)||blocked;
 const combat=(s.status==='paused'?s.resumeStatus:s.status)==='battle',warning=combat&&s.bossStep==='warning';
 const link=combat?warning?bossAttackLabel(s)+' · 蓄力'+(Math.max(0,bossWarningTicks(s)-s.bossStepTicks)/10).toFixed(1)+'s':s.bossStep==='recovery'&&s.bossMoveTicks===0&&s.bossStepTicks>1?'反击窗口 · '+(Math.max(0,bossRecoveryTicks(s)-s.bossStepTicks)/10).toFixed(1)+'s':s.bossStep==='flight'||s.bossStep==='rush'?bossAttackLabel(s)+' · 规避':'首领机动中':active?'核心解放 · '+(s.burstTicks/10).toFixed(1)+'s':ready?'核心就绪':s.breatherTicks>0?'回收整备':frontlineStage(s.levelIndex,s.progress).name;
 return <section className={'toybot-cockpit cockpit-'+s.mechClass+(active?' core-engaged':'')} aria-label="机甲驾驶舱" onKeyDown={e=>{
   if(e.code==='Space'){e.preventDefault();if(!e.repeat&&ready)onBurst();}
   else if(!disabled&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();onMove(Math.max(0,Math.min(2,s.lane+(e.key==='ArrowLeft'?-1:1))));}
  }}>
  <div className={"cockpit-readout"+(warning?" has-danger":"")}><span>{mechSpec(s.mechClass).name}</span><b>{link}</b><span>W{s.weaponLevel} / A{s.armorLevel} / R{s.garageCoreLevel}</span></div>
  <div className="cockpit-console" style={{backgroundImage:`url(${COCKPIT_ART})`}}>
   <div className={'cockpit-screen screen-health'+(hp<=25?' critical':'')} aria-label={`核心生命 ${s.playerHp}/${s.playerMaxHp}`}><small>机体耐久</small><strong>{Math.ceil(s.playerHp)}<em>/{s.playerMaxHp}</em></strong><div className="cockpit-hp-track" style={{'--hp-before':Math.min(100,(s.playerHp+(s.damageKind==='health'?s.damageLoss:0))/s.playerMaxHp*100)+'%','--hp-now':hp+'%'} as CSSProperties}><i className="cockpit-hp-trail" key={s.damageSequence}/><i style={{width:hp+'%'}}/></div></div>
   <button type="button" className={'cockpit-reactor'+(ready?' is-ready':'')+(active?' is-active':'')} disabled={!ready} onClick={onBurst} aria-label={active?`${skill.name}中，剩余${(s.burstTicks/10).toFixed(1)}秒`:ready?'释放'+skill.name+'：'+skill.detail+'，持续5秒，清除干扰':`核心爆发充能${Math.floor(s.burstEnergy)}%，击破和成功闪避充能`} style={{'--core-fill':energy+'%'} as CSSProperties}>
    <span className="reactor-meter" aria-hidden="true"/><img src={REACTOR_ART} alt="" draggable={false}/><b>{active?(s.burstTicks/10).toFixed(1)+'s':ready?'释放':Math.floor(energy)+'%'}</b>
   </button>
   <div className="cockpit-screen screen-squad" aria-label={`小队 ${s.bots} 台，护盾 ${s.shieldCharges}，装甲 ${s.armorPoints}`}><small>小队链路</small><strong>{s.bots}<em> 台</em></strong><span>盾 {s.shieldCharges} · 甲 {s.armorPoints}</span></div>
   <div className="cockpit-skill-title">{skill.name}<small>{active?skill.detail:ready?'点击核心 / 空格':'击破 · 闪避充能'}</small></div>
  </div>
  <div className="cockpit-module-rail" aria-label="战斗状态">{s.flow.guardTicks>0&&s.combo>0&&<span>防守续连 {s.combo}</span>}{s.weaponLevel>=4&&<span>弹头 {s.charge}/4</span>}{s.chargedVolleys>0&&<span>强化×{s.chargedVolleys}</span>}{(Object.keys(MODULES) as RunModule[]).filter(k=>s.modules[k]>0).map(k=><span key={k}>{MODULES[k].icon} {MODULES[k].name}{s.modules[k]}</span>)}{s.ops.fusion&&<span>✧ {FUSIONS[s.ops.fusion].name}</span>}{s.ops.counterShots>0&&<span>反击×{s.ops.counterShots}</span>}{s.jamTicks>0&&<span>干扰 {Math.ceil(s.jamTicks/10)}s</span>}{s.overloadTicks>0&&<span>过载 {Math.ceil(s.overloadTicks/10)}s</span>}</div>
  <details className="cockpit-steering-access"><summary aria-label="展开换道按钮">⇆</summary><div className="cockpit-steering" role="group" aria-label="选择机器人队列">{[0,1,2].map(lane=><button type="button" key={lane} disabled={disabled} aria-label={`切换到第 ${lane+1} 队列`} aria-pressed={s.lane===lane} onClick={()=>onMove(lane)}><i aria-hidden="true">{lane===0?'◁':lane===2?'▷':'◇'}</i><span>{['左轨','中轨','右轨'][lane]}</span><b>{lane+1}</b></button>)}</div></details>
 </section>;
}
export function CoreBurstScreen({game:s,reduced}:{game:GameState;reduced:boolean}){
 if(s.burstTicks<=0||!canShoot(s.status==='paused'?s.resumeStatus??'home':s.status))return null;
 const receipt=skillReadout(s),cell=s.mechClass==='pulse'?0:s.mechClass==='heavy'?1:2;
 return <div className={'toybot-core-screen core-screen-'+s.mechClass+(s.status==='paused'?' is-paused':'')+(reduced?' reduced':'')}>
  <div className="core-status" role="status" aria-live="off" aria-label={coreSkill(s.mechClass).name+'生效中'}>
   <span className="core-status-icon" aria-hidden="true" style={{backgroundImage:`url(${CORE_EFFECT_ART})`,backgroundPosition:cell*50+'% 50%'}}/>
   <div><b>{coreSkill(s.mechClass).name} · 三轨释放</b><small>爆发期伤害 {receipt.damage} · 击破 {receipt.kills} · {skillUtilityV40(s)}</small></div><em>{receipt.remaining.toFixed(1)}s</em>
   <span className="core-status-track" aria-hidden="true"><i style={{transform:`scaleX(${receipt.fill})`}}/></span>
  </div>
 </div>;
}
