import { lt } from './i18n';
import { COMBAT_UI_V48 } from './combatArtV48';
import { skillOpportunityV42 } from './polishV42';
import './polishV42.css';
import { skillUtilityV40 } from './tacticsV40';
import { skillReadout } from './skillPresentationV32';
import { frontlineStage } from './frontline';
import type { CSSProperties } from 'react';
import { canActivateBurst, canMove, canShoot, bossAttackLabel, bossWarningTicks, bossRecoveryTicks, BURST_TICKS, MODULES, type GameState, type RunModule } from './simulation';
import { coreSkill, mechSpec } from './mechs';
import { FUSIONS } from './operations';
export const COCKPIT_ART=COMBAT_UI_V48.console;
export const REACTOR_ART=COMBAT_UI_V48.reactor;
export const CORE_EFFECT_ART='/games/toybot-breakout/optimized/core-effects-v22.webp';
export function Cockpit({game:s,blocked,onMove,onBurst}:{game:GameState;blocked:boolean;onMove:(lane:number)=>void;onBurst:()=>void}){
 const opportunity=blocked?null:skillOpportunityV42(s);
 const skill=coreSkill(s.mechClass),active=s.burstTicks>0,ready=canActivateBurst(s)&&!blocked;
 const energy=active?s.burstTicks/BURST_TICKS*100:s.burstEnergy,hp=s.playerHp/s.playerMaxHp*100;
 const disabled=!canMove(s.status)||blocked;
 const combat=(s.status==='paused'?s.resumeStatus:s.status)==='battle',warning=combat&&s.bossStep==='warning';
 const link=combat?warning?bossAttackLabel(s)+' · 蓄力'+(Math.max(0,bossWarningTicks(s)-s.bossStepTicks)/10).toFixed(1)+'s':s.bossStep==='recovery'&&s.bossMoveTicks===0&&s.bossStepTicks>1?'反击窗口 · '+(Math.max(0,bossRecoveryTicks(s)-s.bossStepTicks)/10).toFixed(1)+'s':s.bossStep==='flight'||s.bossStep==='rush'?bossAttackLabel(s)+' · 规避':'首领机动中':active?'核心解放 · '+(s.burstTicks/10).toFixed(1)+'s':ready?'核心就绪':s.breatherTicks>0?'回收整备':frontlineStage(s.levelIndex,s.progress).name;
 return <section className={'toybot-cockpit cockpit-'+s.mechClass+(active?' core-engaged':'')} aria-label={lt("机甲驾驶舱")} onKeyDown={e=>{
   if(e.code==='Space'){e.preventDefault();if(!e.repeat&&ready)onBurst();}
   else if(!disabled&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();onMove(Math.max(0,Math.min(2,s.lane+(e.key==='ArrowLeft'?-1:1))));}
  }}>
  <div className={"cockpit-readout"+(warning?" has-danger":"")}><span>{lt(mechSpec(s.mechClass).name)}</span><b>{lt(link)}</b><span>W{lt(s.weaponLevel)} / A{lt(s.armorLevel)} / R{lt(s.garageCoreLevel)}</span></div>
  <div className="cockpit-console" style={{backgroundImage:`url(${COCKPIT_ART})`}}>{opportunity&&<span className="core-opportunity-badge-v42">{lt(opportunity)}</span>}
   <div className={'cockpit-screen screen-health'+(hp<=25?' critical':'')} aria-label={lt(`核心生命 ${s.playerHp}/${s.playerMaxHp}`)}><small>{lt("机体耐久")}</small><strong>{lt(Math.ceil(s.playerHp))}<em>/{lt(s.playerMaxHp)}</em></strong><div className="cockpit-hp-track" style={{'--hp-before':Math.min(100,(s.playerHp+(s.damageKind==='health'?s.damageLoss:0))/s.playerMaxHp*100)+'%','--hp-now':hp+'%'} as CSSProperties}><i className="cockpit-hp-trail" key={s.damageSequence}/><i style={{width:hp+'%'}}/></div></div>
   <button type="button" className={'cockpit-reactor'+(ready?' is-ready':'')+(active?' is-active':'')+(opportunity?' has-opportunity':'')} disabled={!ready} onClick={onBurst} aria-label={lt(active?`${skill.name}中，剩余${(s.burstTicks/10).toFixed(1)}秒`:ready?'释放'+skill.name+'：'+skill.detail+'，持续5秒，清除干扰'+(opportunity?'。时机提示：'+opportunity:''):`核心爆发充能${Math.floor(s.burstEnergy)}%，击破和成功闪避充能`)} style={{'--core-fill':energy+'%'} as CSSProperties}>
    <span className="reactor-meter" aria-hidden="true"/><img src={REACTOR_ART} alt="" draggable={false}/><b>{lt(active?(s.burstTicks/10).toFixed(1)+'s':ready?'释放':Math.floor(energy)+'%')}</b>
   </button>
   <div className="cockpit-screen screen-squad" aria-label={lt(`小队 ${s.bots} 台，护盾 ${s.shieldCharges}，装甲 ${s.armorPoints}`)}><small>{lt("小队链路")}</small><strong>{lt(s.bots)}<em> {lt(" 台")}</em></strong><span>{lt("盾 ")}{lt(s.shieldCharges)} {lt(" · 甲 ")}{lt(s.armorPoints)}</span></div>
   <div className="cockpit-skill-title">{lt(skill.name)}<small className={opportunity?'skill-opportunity-v42':undefined}>{lt(active?skill.detail:ready?opportunity??'点击核心 / 空格':'击破 · 闪避充能')}</small></div>
  </div>
  <div className="cockpit-module-rail" aria-label={lt("战斗状态")}>{s.flow.guardTicks>0&&s.combo>0&&<span>{lt("防守续连 ")}{lt(s.combo)}</span>}{s.weaponLevel>=4&&<span>{lt("弹头 ")}{lt(s.charge)}/4</span>}{s.chargedVolleys>0&&<span>{lt("强化×")}{lt(s.chargedVolleys)}</span>}{lt((Object.keys(MODULES) as RunModule[]).filter(k=>s.modules[k]>0).map(k=><span key={k}>{lt(MODULES[k].icon)} {lt(MODULES[k].name)}{lt(s.modules[k])}</span>))}{s.ops.fusion&&<span>✧ {lt(FUSIONS[s.ops.fusion].name)}</span>}{s.ops.counterShots>0&&<span>{lt("反击×")}{lt(s.ops.counterShots)}</span>}{s.jamTicks>0&&<span>{lt("干扰 ")}{lt(Math.ceil(s.jamTicks/10))}s</span>}{s.overloadTicks>0&&<span>{lt("过载 ")}{lt(Math.ceil(s.overloadTicks/10))}s</span>}</div>
  <details className="cockpit-steering-access"><summary aria-label={lt("展开换道按钮")}>⇆</summary><div className="cockpit-steering" role="group" aria-label={lt("选择机器人队列")}>{lt([0,1,2].map(lane=><button type="button" key={lane} disabled={disabled} aria-label={lt(`切换到第 ${lane+1} 队列`)} aria-pressed={s.lane===lane} onClick={()=>onMove(lane)}><i aria-hidden="true">{lt(lane===0?'◁':lane===2?'▷':'◇')}</i><span>{lt(['左轨','中轨','右轨'][lane])}</span><b>{lt(lane+1)}</b></button>))}</div></details>
 </section>;
}
export function CoreBurstScreen({game:s,reduced}:{game:GameState;reduced:boolean}){
 if(s.burstTicks<=0||!canShoot(s.status==='paused'?s.resumeStatus??'home':s.status))return null;
 const receipt=skillReadout(s),cell=s.mechClass==='pulse'?0:s.mechClass==='heavy'?1:2;
 return <div className={'toybot-core-screen core-screen-'+s.mechClass+(s.status==='paused'?' is-paused':'')+(reduced?' reduced':'')}>
  <div className="core-status" role="status" aria-live="off" aria-label={lt(coreSkill(s.mechClass).name+'生效中')}>
   <span className="core-status-icon" aria-hidden="true" style={{backgroundImage:`url(${CORE_EFFECT_ART})`,backgroundPosition:cell*50+'% 50%'}}/>
   <div><b>{lt(coreSkill(s.mechClass).name)} {lt(" · 三轨释放")}</b><small>{lt("爆发期伤害 ")}{lt(receipt.damage)} {lt(" · 击破 ")}{lt(receipt.kills)} · {lt(skillUtilityV40(s))}</small></div><em>{lt(receipt.remaining.toFixed(1))}s</em>
   <span className="core-status-track" aria-hidden="true"><i style={{transform:`scaleX(${receipt.fill})`}}/></span>
  </div>
 </div>;
}
