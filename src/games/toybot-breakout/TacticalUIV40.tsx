import { lt } from './i18n';
import type { GameState } from './simulation';
import type { Garage } from './progression';
import { mechSpec } from './mechs';
import { TRIALS, SECTOR_MECHS, trialPassedV40, trialProgressV40, type Trial } from './tacticsV40';
import './tacticsV40.css';
export function TrialPickerV40({game:s,garage:g,onSelect}:{game:GameState;garage:Garage;onSelect:(trial:Trial|null)=>void}){
 if(!g.completedLevels[s.levelIndex])return null;
 return <details className="trial-picker-v40"><summary>{lt("驾驶员试炼 · ")}{lt(s.tactics.trial?TRIALS[s.tactics.trial].name:'未启用')}<span>⌄</span></summary><p>{lt("可选目标，不影响主线解锁。首次达成：徽记＋2零件。与挑战协议互斥。")}</p><div role="group" aria-label={lt("选择驾驶员试炼")}><button type="button" aria-pressed={!s.tactics.trial} onClick={()=>onSelect(null)}>{lt("不启用")}</button>{lt((Object.keys(TRIALS) as Trial[]).map(key=><button key={key} type="button" aria-pressed={s.tactics.trial===key} onClick={()=>onSelect(key)}><b>{lt(TRIALS[key].name)}</b><small>{lt(key==='signature'?mechSpec(SECTOR_MECHS[s.levelIndex]).name: key==='speed'?'5分钟内通关':'含护盾挡撞')}</small>{g.trialClears?.includes(s.levelIndex+':'+key)&&<em>{lt("徽记已获")}</em>}</button>))}</div>{s.tactics.trial&&<p>{lt(TRIALS[s.tactics.trial].detail)}{lt(s.tactics.trial==='signature'&&s.mechClass!==SECTOR_MECHS[s.levelIndex]?' · 请先到机库切换指定机型':'')}</p>}</details>;
}
export function TacticalHudV40({game:s}:{game:GameState}){
 if(s.status!=='running'&&s.status!=='battle')return null;
 const text=s.tactics.windowTicks===0&&s.burstTicks===0&&s.tactics.noteTicks>0?s.tactics.note:'';
 return <>{text&&<div className={'tactical-receipt-v40'+(s.tactics.windowTicks>0?' is-window':'')} role="status">{lt(text)}</div>}{s.tactics.trial&&<div className="trial-tracker-v40">{lt(TRIALS[s.tactics.trial].name)} · {lt(trialProgressV40(s))}</div>}</>;
}
export function TacticalResultV40({game:s}:{game:GameState}){
 return <section className="tactical-result-v40" aria-label={lt("战术成果")}><p>{lt("连锁击破 ")}<b>{lt(s.tactics.chainKills)}</b> {lt(" · 护卫断链 ")}<b>{lt(s.tactics.guardBreaks)}</b> {lt(" · 规避反击 ")}<b>{lt(s.tactics.windows)}</b></p>{s.tactics.trial&&<div><strong>{lt(trialPassedV40(s)?'试炼达成 · '+TRIALS[s.tactics.trial].badge:'试炼未达成')}</strong><small>{lt(trialProgressV40(s))}{lt(trialPassedV40(s)?s.tactics.firstTrial?' · 徽记解锁，零件+2':' · 已获得徽记，无重复首通奖励':' · 可自由重试，不扣除零件')}</small></div>}</section>;
}
export function TrialBadgeV40({garage:g}:{garage:Garage}){
 const key=g.trialBadge?.split(':')[1] as Trial|undefined;
 return key&&TRIALS[key]?<span className="trial-badge-v40" aria-label={lt("驾驶员试炼徽记")}>◆ {lt(TRIALS[key].badge)}</span>:null;
}
