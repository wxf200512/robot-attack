import type { CSSProperties } from 'react';
import { LANE_CENTERS, type GameState } from './simulation';
import { MATERIAL_ART, PROP_ART, atlasCell, salvageSample } from './visualArt';
export function ArtDetails({game:s,low,reduced}:{game:GameState;low:boolean;reduced:boolean}){
 return <>
  {!low&&<div className={'toybot-v28-foreground sector-'+s.levelIndex} aria-hidden="true"><i/><i/></div>}
  {s.killEffects.slice(low?-2:-5).map(e=>{const p=salvageSample(e.x,e.y,e.ticks,LANE_CENTERS[s.lane]);return <span key={'salvage-'+e.id} data-motion="salvage" data-motion-id={e.id} className="toybot-v28-salvage" style={{left:p.x+'%',top:p.y+'%',opacity:p.opacity,scale:p.scale,zIndex:Math.round((p.y+7)*10),backgroundImage:`url(${PROP_ART})`,backgroundPosition:atlasCell(e.id%3,0,4,2)}} aria-hidden="true"/>;})}
  {s.upgradeFx?.positive&&<span key={'assembly-'+s.upgradeFx.id} className="toybot-v28-assembly" data-motion="assembly" style={{left:LANE_CENTERS[s.lane]+'%',top:'60%',opacity:Math.min(1,s.upgradeFx.ticks/3),backgroundImage:`url(${PROP_ART})`,backgroundPosition:atlasCell(0,1,4,2),'--assembly-age':(12-s.upgradeFx.ticks)/12} as CSSProperties} aria-hidden="true"/>}
  {s.defenseFx&&s.defenseFx.ticks>0&&<span className="toybot-v28-local-impact" data-motion="defense-contact" style={{left:LANE_CENTERS[s.damageLane]+'%',top:'57%',backgroundImage:`url(${MATERIAL_ART})`,backgroundPosition:atlasCell(reduced?3:Math.min(7,Math.floor((1-s.defenseFx.ticks/8)*8)),s.defenseFx.kind==='shield'?1:2,8,4),zIndex:900}} aria-hidden="true"/>}
 </>;
}
export function BattleWear({amount}:{amount:number}){return <span className="toybot-v28-battlewear" style={{backgroundImage:`url(${PROP_ART})`,backgroundPosition:atlasCell(3,0,4,2),opacity:Math.max(.2,Math.min(.85,amount))}} aria-hidden="true"/>;}
