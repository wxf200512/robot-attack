import { COMBAT_ROADS_V48 } from './combatArtV48';
import type { GameState } from './simulation';
export const ROAD_TILES_V37=COMBAT_ROADS_V48;
// Render from authoritative distance, never elapsed wall-clock time.
export function roadOffsetV37(s:GameState,alpha:number,step:number,reduced=false){
 if(reduced)return 0;
 const travel=s.progress+(s.status==='running'?Math.max(0,Math.min(.999,alpha))*step:0);
 return (travel*96)%256;
}
