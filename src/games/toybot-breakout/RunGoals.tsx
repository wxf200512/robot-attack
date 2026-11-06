import type { GameState } from './simulation';
import type { Garage } from './progression';
import { nextUpgrade, rewardLedger } from './playability';
export function RunGoals({game,garage,onGarage}:{game:GameState;garage:Garage;onGarage:()=>void}){
 const ledger=rewardLedger(game),target=nextUpgrade(garage,game);
 return <section className="toybot-run-goals" aria-label="零件来源与下次改装目标">
  <div className="run-reward-ledger"><span>回收 <b>+{ledger.salvage}</b></span><span>通关 <b>+{ledger.victory}</b></span><span>精英与任务 <b>+{ledger.tactical}</b></span>{ledger.protocol>0&&<span>挑战 <b>+{ledger.protocol}</b></span>}</div>
  <p className="run-elite-record">具名精英 <b>{game.report.elites}/3</b> · 最佳连击 <b>{game.bestCombo}</b></p>
  {target?<button type="button" className="run-upgrade-goal" onClick={onGarage}><small>下一次改装</small><strong>{target.title} Lv.{target.level}</strong><span>{target.missing>0?'还差 '+target.missing+' 零件':'零件足够，可以升级'} <b aria-hidden="true">›</b></span><i aria-hidden="true"><em style={{width:Math.min(100,garage.parts/Math.max(1,target.cost)*100)+'%'}}/></i></button>:<p>通用模块已满级，试试新的机型与挑战协议。</p>}
 </section>;
}
