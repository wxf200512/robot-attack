import type { MechClass } from './mechs';
import type { PendingShot } from './simulation';
import type { CombatFeedback } from './experience';
import { pulseFlightV33 } from './pulseVfxV33';
export const CORE_FX_V34:Record<MechClass,string>={pulse:'/games/toybot-breakout/optimized/core-pulse-v34.png',heavy:'/games/toybot-breakout/optimized/core-heavy-v34.png',blade:'/games/toybot-breakout/optimized/core-blade-v34.png'};
export const signatureShotV34=(shot:PendingShot)=>shot.burst&&shot.origins[0].index===0&&!shot.splashDone;
export function coreMuzzlesV34(shots:PendingShot[]){
 const emitters=new Map<number,PendingShot>();
 for(const shot of shots)if(shot.burst&&!shot.splashDone&&shot.duration-shot.ticks<2){const id=shot.origins[0].index,old=emitters.get(id);if(!old||shot.id>old.id)emitters.set(id,shot);}
 return [...emitters.values()];
}
export function coreFlightV34(logical:{x:number;y:number;angle:number;progress:number},shot:PendingShot,alpha:number,size:{width:number;height:number},reduced=false){
 const t=reduced?0:Math.max(0,Math.min(.999,alpha)),age=shot.duration-shot.ticks+t,emission=shot.muzzle||!shot.splashDone;
 const sample=pulseFlightV33(logical,{...shot,muzzle:emission},t,size,reduced),birth=Math.max(0,Math.min(1,(age+.25)/.9));
 return {...sample,scale:sample.scale*(.75+.25*birth*birth*(3-2*birth)),frame:reduced?0:Math.floor(age*({pulse:2.4,heavy:1.4,blade:2}[shot.attackStyle??'pulse'])+shot.origins[0].index*.6)%8};
}
export function signatureFeedbackV34(feedback:CombatFeedback[]){
 const groups=new Map<string,CombatFeedback>(),rank={hit:0,armor:1,heavy:2,elite:3,boss:4};
 const key=(f:CombatFeedback)=>[f.coreStyle??(f.pulseCore?'pulse':''),Math.round(f.x/6),Math.round(f.y/4)].join(':');
 for(const f of feedback)if(f.coreStyle||f.pulseCore){const old=groups.get(key(f));if(!old||rank[f.kind]>rank[old.kind]||rank[f.kind]===rank[old.kind]&&f.id>old.id)groups.set(key(f),f);}
 return feedback.filter(f=>!f.coreStyle&&!f.pulseCore||groups.get(key(f))===f);
}
