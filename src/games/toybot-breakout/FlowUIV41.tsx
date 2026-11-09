import { BuildIdentityV44 } from './ReplayUIV44';
import type { GameState } from './simulation';
import { MODULES } from './simulation';
import { mechSpec, coreSkill } from './mechs';
import { FUSIONS } from './operations';
import { TRIALS, trialProgressV40 } from './tacticsV40';
import { LESSONS_V41, strongestContributionV41, CONTRIBUTIONS_V41 } from './flowV41';
import './flowV41.css';
export function BuildLogV41({game:s}:{game:GameState}){
 const modules=(Object.keys(s.modules) as (keyof typeof s.modules)[]).filter(k=>s.modules[k]>0);
 return <details className="build-log-v41"><summary>本局装备与强化 <span>{s.flow.log.length} 条来源 ▾</span></summary><div className="build-log-body-v41"><BuildIdentityV44 game={s}/><dl><div><dt>机型 / 武器</dt><dd>{mechSpec(s.mechClass).name} · W{s.weaponLevel}</dd></div><div><dt>防御 / 队伍</dt><dd>装甲{s.armorLevel} · 护盾{s.shieldCharges} · {s.bots}台</dd></div><div><dt>改装加成</dt><dd>伤害×{s.garageDamageScale.toFixed(2)} · 动力Lv.{s.garageCoreLevel}</dd></div><div><dt>模块 / 融合</dt><dd>{modules.map(k=>MODULES[k].name+' Lv.'+s.modules[k]).join('、')||'尚未收集'}{s.ops.fusion?' · '+FUSIONS[s.ops.fusion].name:''}</dd></div></dl><p><b>{coreSkill(s.mechClass).name}</b>：{coreSkill(s.mechClass).detail}</p>{s.tactics.trial&&<p>试炼：{TRIALS[s.tactics.trial].name} · {trialProgressV40(s)}</p>}{s.flow.lastLesson&&<p>敌情：{LESSONS_V41[s.flow.lastLesson]?.tip}</p>}<ol aria-label="本局强化来源">{s.flow.log.map((entry,i)=><li key={i}><small>{Math.floor(entry.time/600)}:{String(Math.floor(entry.time/10)%60).padStart(2,'0')} · {entry.source}</small><span>{entry.title}</span></li>)}</ol>{!s.flow.log.length&&<p>尚未获得额外强化，穿过补给门后会在此记录。</p>}</div></details>;
}
export function BuildReportV41({game:s}:{game:GameState}){
 const strongest=strongestContributionV41(s),extra=strongestContributionV41(s,true);
 return <section className="build-report-v41" aria-label="构筑贡献与改进建议"><p>{strongest?<>贡献最高：<b>{strongest.name}</b> · 实际伤害 {strongest.damage}</>:'本局尚无有效输出记录'} · 防守续连 <b>{s.flow.defenseSaves}</b></p>{extra&&strongest?.name!==extra.name&&<p>额外收益：{extra.name} · 实际伤害 {extra.damage}</p>}{!s.won&&s.flow.lastHit&&<p className="last-hit-v41">最近损伤：{s.flow.lastHit.label} · −{Math.ceil(s.flow.lastHit.loss)}生命<br/><strong>下次尝试：</strong>{s.flow.lastHit.tip}</p>}<details><summary>查看各类伤害贡献</summary><dl>{(Object.keys(CONTRIBUTIONS_V41) as (keyof typeof CONTRIBUTIONS_V41)[]).map(key=><div key={key}><dt>{CONTRIBUTIONS_V41[key]}</dt><dd>{Math.round(s.flow.contribution[key])}</dd></div>)}</dl></details><BuildLogV41 game={s}/></section>;
}
export function LessonCueV41({game:s}:{game:GameState}){
 const lesson=s.flow.lastLesson&&LESSONS_V41[s.flow.lastLesson];
 if(s.status!=='running'||s.flow.introTicks<=0||!lesson||s.burstTicks>0)return null;
 return <aside className="lesson-cue-v41" role="status"><b>首次遭遇 · {lesson.name}</b><span>{lesson.tip}</span></aside>;
}
