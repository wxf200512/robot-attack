import type { GameState } from './simulation';
import { isBossArena } from './simulation';
import { roadStridePhaseV50 } from './runStrideV50';

// A hip-pivoted shoulder counter-swing shares the leg clock. Shooting never
// restarts it. This moves the raster torso, not the entire planted character.
export function runTorsoV56(s:GameState,alpha=0,index=0,reduced=false){
 if(reduced||isBossArena(s))return {roll:0,sway:0};
 const wave=Math.sin(roadStridePhaseV50(s,s.status==='running'?alpha:0,index)*Math.PI*2);
 const weight=s.mechClass==='heavy'?.65:1;
 return {roll:wave*1.8*weight,sway:-wave*.85*weight};
}
