import { lt } from './i18n';
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
 return <details className="build-log-v41"><summary>{lt("本局装备与强化 ")}<span>{lt(s.flow.log.length)} {lt(" 条来源 ▾")}</span></summary><div className="build-log-body-v41"><BuildIdentityV44 game={s}/><dl><div><dt>{lt("机型 / 武器")}</dt><dd>{lt(mechSpec(s.mechClass).name)} · W{lt(s.weaponLevel)}</dd></div><div><dt>{lt("防御 / 队伍")}</dt><dd>{lt("装甲")}{lt(s.armorLevel)} {lt(" · 护盾")}{lt(s.shieldCharges)} · {lt(s.bots)}{lt("台")}</dd></div><div><dt>{lt("改装加成")}</dt><dd>{lt("伤害×")}{lt(s.garageDamageScale.toFixed(2))} {lt(" · 动力Lv.")}{lt(s.garageCoreLevel)}</dd></div><div><dt>{lt("模块 / 融合")}</dt><dd>{lt(modules.map(k=>MODULES[k].name+' Lv.'+s.modules[k]).join('、')||'尚未收集')}{lt(s.ops.fusion?' · '+FUSIONS[s.ops.fusion].name:'')}</dd></div></dl><p><b>{lt(coreSkill(s.mechClass).name)}</b>：{lt(coreSkill(s.mechClass).detail)}</p>{s.tactics.trial&&<p>{lt("试炼：")}{lt(TRIALS[s.tactics.trial].name)} · {lt(trialProgressV40(s))}</p>}{s.flow.lastLesson&&<p>{lt("敌情：")}{lt(LESSONS_V41[s.flow.lastLesson]?.tip)}</p>}<ol aria-label={lt("本局强化来源")}>{lt(s.flow.log.map((entry,i)=><li key={i}><small>{lt(Math.floor(entry.time/600))}:{lt(String(Math.floor(entry.time/10)%60).padStart(2,'0'))} · {lt(entry.source)}</small><span>{lt(entry.title)}</span></li>))}</ol>{!s.flow.log.length&&<p>{lt("尚未获得额外强化，穿过补给门后会在此记录。")}</p>}</div></details>;
}
export function BuildReportV41({game:s}:{game:GameState}){
 const strongest=strongestContributionV41(s),extra=strongestContributionV41(s,true);
 return <section className="build-report-v41" aria-label={lt("构筑贡献与改进建议")}><p>{lt(strongest?<>{lt("贡献最高：")}<b>{lt(strongest.name)}</b> {lt(" · 实际伤害 ")}{lt(strongest.damage)}</>:'本局尚无有效输出记录')} {lt(" · 防守续连 ")}<b>{lt(s.flow.defenseSaves)}</b></p>{extra&&strongest?.name!==extra.name&&<p>{lt("额外收益：")}{lt(extra.name)} {lt(" · 实际伤害 ")}{lt(extra.damage)}</p>}{!s.won&&s.flow.lastHit&&<p className="last-hit-v41">{lt("最近损伤：")}{lt(s.flow.lastHit.label)} · −{lt(Math.ceil(s.flow.lastHit.loss))}{lt("生命")}<br/><strong>{lt("下次尝试：")}</strong>{lt(s.flow.lastHit.tip)}</p>}<details><summary>{lt("查看各类伤害贡献")}</summary><dl>{lt((Object.keys(CONTRIBUTIONS_V41) as (keyof typeof CONTRIBUTIONS_V41)[]).map(key=><div key={key}><dt>{lt(CONTRIBUTIONS_V41[key])}</dt><dd>{lt(Math.round(s.flow.contribution[key]))}</dd></div>))}</dl></details><BuildLogV41 game={s}/></section>;
}
export function LessonCueV41({game:s}:{game:GameState}){
 const lesson=s.flow.lastLesson&&LESSONS_V41[s.flow.lastLesson];
 if(s.status!=='running'||s.flow.introTicks<=0||!lesson||s.burstTicks>0)return null;
 return <aside className="lesson-cue-v41" role="status"><b>{lt("首次遭遇 · ")}{lt(lesson.name)}</b><span>{lt(lesson.tip)}</span></aside>;
}
