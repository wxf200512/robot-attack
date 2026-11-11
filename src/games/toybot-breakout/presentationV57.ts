import type { GameState } from './simulation';
export function encounterPresentationV57(s:GameState,mark?:number){
 const status=s.status==='paused'?s.resumeStatus:s.status;
 const arena=['boss-intro','battle','boss-shift','boss-victory'].includes(status??'')||
  (status==='defeat'||status==='result')&&(s.bossDefeated||s.defeatReason==='boss-wipe');
 const approach=!s.sortie&&status==='running'&&!s.bossDefeated&&mark!==undefined&&s.progress>=mark-5;
 return {boss:!s.sortie&&(arena||approach),hud:!s.sortie&&arena&&s.battleMaxHp>0&&status!=='result'&&status!=='defeat',approach,
  road:status==='running',approachScale:mark===undefined?.55:.55+.4*Math.max(0,Math.min(1,(s.progress-mark+5)/5))};
}
// Recoil is local to the raster torso and triggered by each member's real shot.
// Legs remain distance-driven; blade and arena retain their independent clips.
export function runFireKickV57(s:GameState,alpha:number,index:number,reduced=false){
 const status=s.status==='paused'?s.resumeStatus:s.status;
 if(reduced||status!=='running'||s.mechClass==='blade')return 0;
 const t=s.status==='paused'?0:Math.max(0,Math.min(.999,alpha));
 const length=s.mechClass==='heavy'?2.6:1.4,amount=s.mechClass==='heavy'?.9:.45;
 let kick=0;
 for(const shot of s.pendingShots){
  const age=shot.duration-shot.ticks+t;
  if(!shot.muzzle||age<0||age>=length||!shot.origins.some(o=>o.index===index))continue;
  kick=Math.max(kick,Math.sin(age/length*Math.PI)*amount);
 }
 return kick;
}
