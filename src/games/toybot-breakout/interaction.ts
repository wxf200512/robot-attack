export type DragState={anchorX:number;lane:number;moved:boolean};
export const advanceDrag=(drag:DragState,x:number,width:number):DragState=>{
 if(!Number.isFinite(x)||!Number.isFinite(width)||width<=0)return drag;
 const step=Math.max(35,width*.1725),threshold=step*.5;
 let {anchorX,lane,moved}=drag;let delta=x-anchorX;
 if(Math.abs(delta)<8&&!moved)return drag;
 moved=true;
 while(Math.abs(delta)>=threshold){
  const direction=delta>0?1:-1,next=Math.max(0,Math.min(2,lane+direction));
  if(next===lane){anchorX=x;break;}
  lane=next;anchorX+=direction*step;delta=x-anchorX;
 }
 return {anchorX,lane,moved};
};
