import { lt } from './i18n';
import { sortieCountV39, sortieGoalV39 } from './sortiesV39';
import type { GameState } from './simulation';
import type { Garage } from './progression';
import { nextUpgrade, rewardLedger } from './playability';
export function RunGoals({game,garage,onGarage}:{game:GameState;garage:Garage;onGarage:()=>void}){
 const ledger=rewardLedger(game),target=nextUpgrade(garage,game);
 return <section className="toybot-run-goals" aria-label={lt("零件来源与下次改装目标")}>
  <div className="run-reward-ledger"><span>{lt("回收 ")}<b>+{lt(ledger.salvage)}</b></span><span>{lt("通关 ")}<b>+{lt(ledger.victory)}</b></span><span>{lt(game.sortie?'首通奖励':'精英与任务')} <b>+{lt(ledger.tactical)}</b></span>{ledger.trial>0&&<span>{lt("试炼首通 ")}<b>+{lt(ledger.trial)}</b></span>}{ledger.protocol>0&&<span>{lt("挑战 ")}<b>+{lt(ledger.protocol)}</b></span>}</div>
  <p className="run-elite-record">{game.sortie?<>{lt(sortieGoalV39(game.sortie))} {lt(" · 实际 ")}<b>{lt(sortieCountV39(game))}</b></>:<>{lt("具名精英 ")}<b>{lt(game.report.elites)}/3</b></>} {lt(" · 最佳连击 ")}<b>{lt(game.bestCombo)}</b></p>
  {target?<button type="button" className="run-upgrade-goal" onClick={onGarage}><small>{lt("下一次改装")}</small><strong>{lt(target.title)} Lv.{lt(target.level)}</strong><span>{lt(target.missing>0?'还差 '+target.missing+' 零件':'零件足够，可以升级')} <b aria-hidden="true">›</b></span><i aria-hidden="true"><em style={{width:Math.min(100,garage.parts/Math.max(1,target.cost)*100)+'%'}}/></i></button>:<p>{lt("通用模块已满级，试试新的机型与挑战协议。")}</p>}
 </section>;
}
