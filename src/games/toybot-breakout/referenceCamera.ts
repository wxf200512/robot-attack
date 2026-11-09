import type { GameState, PendingShot } from './simulation';
import { LANE_CENTERS, formationFor } from './simulation';
const ROOT='/games/toybot-breakout/optimized/';
export const REFERENCE_LOGO=ROOT+'logo-v29.webp';
export const FURNACE_ART=ROOT+'boss-furnace-v29.webp';
// Camera projection only: simulation distances, collision times and saved state
// stay in their original coordinates. Every projectile and contact uses this map.
export const worldScreenY=(y:number)=>y<=59?34+(y-39)*1.7:68+(y-59)*1.5;
export const bossScreenY=(y:number)=>worldScreenY(y)-12;
export const squadScreenX=(x:number,center:number,count:number)=>center+(x-center)*(count<=4?1.6:1);
export const actorPixels=(count:number,width:number)=>count<=1?68:count<=4?Math.min(82,width*.2055):Math.max(27,Math.min(38,width*.098));
export function projectedMuzzleX(shot:PendingShot){const o=shot.origins[0],base=formationFor(shot.count,shot.lane)[o.index];return o.x+(shot.count<=4&&base?(base.x-LANE_CENTERS[shot.lane])*.6:0);}
export function cameraFlight(p:{x:number;y:number;angle:number;progress:number},shot:PendingShot){
 const spread=projectedMuzzleX(shot)-shot.origins[0].x;
 return {x:p.x+spread*(1-p.progress),y:worldScreenY(p.y)-(shot.target==='boss'||shot.target==='part'?12*p.progress:0),angle:Math.atan(Math.tan(p.angle*Math.PI/180)/1.7)*180/Math.PI};
}
export const bossPixels=(s:GameState)=>[238,218,236,218,330][s.levelIndex];
