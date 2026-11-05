import { DEFENSE_VFX_TICKS, type GameState } from './simulation';

const ROOT='/games/toybot-breakout/optimized/';
export const DEFENSE_ART={idle:ROOT+'shield-idle-v13.png',impact:ROOT+'shield-impact-v13.png',break:ROOT+'shield-break-v13.png',armor:ROOT+'shield-armor-v13.png'};
export type DefenseLayer={art:keyof typeof DEFENSE_ART;frame:number;kind:'shield'|'armor';transient:boolean};
export function defenseLayers(game:GameState,index:number,reduced=false):DefenseLayer[]{
 const status=game.status==='paused'?game.resumeStatus:game.status;
 if(game.bots<=index||game.playerHp<=0||!status||['home','result','defeat'].includes(status))return [];
 const layers:DefenseLayer[]=[],frame=reduced?0:Math.floor((game.roadTicks+game.battleTime)/2)%6;
 if(game.shieldCharges>0)layers.push({art:'idle',frame,kind:'shield',transient:false});
 else if(game.armorPoints>0)layers.push({art:'armor',frame,kind:'armor',transient:false});
 const effect=game.defenseFx;
 if(effect&&effect.ticks>0&&(status==='running'||status==='battle')&&(index===0||effect.exhausted))layers.push({art:effect.exhausted?'break':'impact',frame:Math.min(5,Math.floor((DEFENSE_VFX_TICKS-effect.ticks)*6/DEFENSE_VFX_TICKS)),kind:effect.kind,transient:true});
 return layers;
}
export function defenseCell(frame:number){const safe=Math.max(0,Math.min(5,Math.floor(frame)));return `${safe%2*100}% ${Math.floor(safe/2)*50}%`;}
