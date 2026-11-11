// Campaign-only pressure; never scales from acquired equipment or current HP.
// First contacts retain their extra tutorial warning and the safety scheduler.
export function difficultyV57(level:number,slot?:number){
 const sector=Math.max(0,Math.min(4,Math.floor(level)));
 const step=slot===undefined?5:Math.max(0,Math.min(4,Math.floor(slot)));
 const rank=sector*5+step;
 return {rank,damageScale:1+Math.max(0,rank-5)*.008,warningReduction:Math.floor(rank/8),
  eliteHpScale:1+rank*.012,rearmScale:1-rank*.005,
  bossRecovery:30-sector};
}
