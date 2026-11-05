import type { GameState } from './simulation';
import { DEFENSE_ART, defenseCell, defenseLayers } from './defenseArt';
import './defense.css';

export default function DefenseVfx({game,index,reduced=false}:{game:GameState;index:number;reduced?:boolean}){
 const layers=defenseLayers(game,index,reduced);
 if(!layers.length)return null;
 return <span className={'toybot-defense-vfx '+(index===0?'is-leader':'is-wingman')} aria-hidden="true">
  {layers.map(layer=><span key={layer.transient?`hit-${game.defenseFx?.id}`:'guard-'+layer.art} className={`defense-layer defense-${layer.art} defense-kind-${layer.kind}${layer.transient?' is-impact':''}`} style={{backgroundImage:`url(${DEFENSE_ART[layer.art]})`,backgroundPosition:defenseCell(layer.frame)}}/>)}
 </span>;
}
