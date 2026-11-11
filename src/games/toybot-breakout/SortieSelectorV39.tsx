import { lt } from './i18n';
import type { Garage } from './progression';
import { canChallengeBossV53 } from './progression';
import type { GameState } from './simulation';
import { SORTIES_V39, canEnterSortieV39, sortieCountV39, sortieGoalV39 } from './sortiesV39';
export function SortieSelectorV39({garage,level,selected,onSelect}:{garage:Garage;level:number;selected:string|null;onSelect:(key:string|null)=>void}){
 const stages=SORTIES_V39.filter(s=>s.level===level),clears=stages.filter(s=>(garage.sortieClears??[]).includes(s.key)).length;
 return <section className="prelude-route-v53" aria-label={lt("地区作战路线")}><header><b>{lt("前线行动 ")}<span>{lt(clears)}/5</span></b><small>{lt("5 个小关 → 守护者")}</small></header><div className="sortie-picker-v39" role="group" aria-label={lt("选择前置小关或守护者行动")}>
  {lt(stages.map(s=>{const cleared=(garage.sortieClears??[]).includes(s.key),open=canEnterSortieV39(garage,s.key);return <button type="button" key={s.key} disabled={!open} aria-pressed={selected===s.key} aria-label={lt('前置 '+(s.slot+1)+' '+s.name+(cleared?' 已完成':open?' 可挑战':' 未解锁'))} onClick={()=>onSelect(s.key)}><b>{lt(cleared?'✓':String(s.slot+1).padStart(2,'0'))}</b><span>{lt(s.name)}<small>{lt(cleared?'已通关':!garage.tutorialCompleted?'先训练':open?'无首领 · '+Math.round(s.end/.8)+'秒':'先完成第 '+s.slot+' 小关')}</small></span></button>;}))}
  <button type="button" className="prelude-boss-v53" disabled={!canChallengeBossV53(garage,level)} aria-pressed={selected===null} onClick={()=>onSelect(null)}><b>◆</b><span>{lt("守护者行动")}<small>{lt(canChallengeBossV53(garage,level)?'前线 + 首领战':'完成前置 '+clears+'/5')}</small></span></button>
 </div></section>;
}
export function SortieHudV39({game:s}:{game:GameState}){return s.sortie&&s.status==='running'?<aside className="ops-mission-hud sortie-hud-v39" aria-label={lt("前置小关任务")}><div><b>{lt(s.sortie.slot+1)}/5 · {lt(s.sortie.name)}</b><small>{lt("击破 ")}{lt(sortieCountV39(s))}/{lt(s.sortie.target)} {lt(" · 抵达接应点")}</small></div></aside>:null;}
export const PreludeResultV53=({game:s}:{game:GameState})=>s.sortie&&s.won?<p className="prelude-story-v53">{lt(s.sortie.outro)}<small>{lt(sortieGoalV39(s.sortie))} {lt(" · 已完成")}</small></p>:null;
