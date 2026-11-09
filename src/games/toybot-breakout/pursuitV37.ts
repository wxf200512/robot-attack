import type { EnemyAttack, GameState } from './simulation';
export const isPursuitV37=(a:EnemyAttack)=>a.kind==='charge'||a.kind==='pounce';
export const pursuitForV37=(s:GameState,source:'hazard'|'threat',id:number)=>s.enemyAttacks.find(a=>a.source===source&&a.sourceId===id&&isPursuitV37(a)&&a.phase==='flight');
export function pursuitPointV37(a:EnemyAttack,project:(lane:number,y:number)=>number){
 const progress=Math.max(0,Math.min(1,1-a.ticks/Math.max(1,a.duration))),ease=progress*progress*(3-2*progress),y=a.fromY+(59-a.fromY)*progress;
 return {x:(a.fromX??project(a.fromLane,a.fromY))+(project(a.lane,y)-(a.fromX??project(a.fromLane,a.fromY)))*ease,y,progress};
}
export function pursuitLaneV37(a:EnemyAttack,project:(lane:number,y:number)=>number){const p=pursuitPointV37(a,project);return [0,1,2].reduce((best,lane)=>Math.abs(project(lane,p.y)-p.x)<Math.abs(project(best,p.y)-p.x)?lane:best,a.fromLane);}
