import type { PendingShot } from './simulation';
import { actorPixels, cameraFlight } from './referenceCamera';

export const PULSE_VFX_V33='/games/toybot-breakout/optimized/pulse-vfx-v33.webp';
export function pulseFlightV33(logical:{x:number;y:number;angle:number;progress:number},shot:PendingShot,alpha:number,size:{width:number;height:number},reduced=false){
 const t=reduced?0:Math.max(0,Math.min(.999,alpha)),p={...cameraFlight(logical,shot),progress:logical.progress},age=shot.duration-shot.ticks+t;
 return {x:p.x,y:p.y,lift:shot.muzzle?actorPixels(shot.count,size.width)/4*(1-p.progress):0,angle:p.angle,scale:1-p.progress*.3,opacity:shot.target?.95:.85*(1-p.progress*.65),frame:reduced?0:Math.floor(age*2+shot.origins[0].index*.7)%8,progress:p.progress,spin:reduced?0:(age*42+shot.origins[0].index*12)%360};
}
export function pulseMuzzlesV33(shots:PendingShot[]){
 const emitters=new Map<number,PendingShot>();
 for(const shot of shots)if(shot.burst&&shot.attackStyle==='pulse'&&shot.muzzle&&shot.duration-shot.ticks<2){const index=shot.origins[0].index,old=emitters.get(index);if(!old||shot.id>old.id)emitters.set(index,shot);}
 return [...emitters.values()];
}
export function pulseImpactV33(ticks:number,life:number,alpha:number,reduced=false){const age=Math.max(0,Math.min(1,(life-ticks+(reduced?0:alpha))/life));return {frame:reduced?3:Math.min(7,Math.floor(age*8)),opacity:Math.min(1,(1-age)*2)};}
