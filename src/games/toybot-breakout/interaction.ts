export type DragState={anchorX:number;lane:number;moved:boolean};
export const advanceDrag=(drag:DragState,x:number,width:number,sensitivity=1):DragState=>{
 if(!Number.isFinite(x)||!Number.isFinite(width)||width<=0)return drag;
 const gain=Number.isFinite(sensitivity)?Math.max(.6,Math.min(1.6,sensitivity)):1;
 const threshold=Math.max(35,width*.1725)*.5/gain;
 let {anchorX,lane,moved}=drag;let delta=x-anchorX;
 if(Math.abs(delta)<8&&!moved)return drag;
 moved=true;
 // Consume only distance already travelled. Subtracting a full step after
 // half a step reversed delta and could oscillate forever at the boundary.
 for(let hops=0;hops<3&&Math.abs(delta)+1e-7>=threshold;hops++){
  const direction=delta>0?1:-1,next=Math.max(0,Math.min(2,lane+direction));
  if(next===lane){anchorX=x;break;}
  lane=next;anchorX+=direction*threshold;delta=x-anchorX;
 }
 return {anchorX,lane,moved};
};

export const canStartPointerGesture=(heldPointer:number|null,event:{button:number;isPrimary?:boolean})=>heldPointer===null&&event.button===0&&event.isPrimary!==false;
