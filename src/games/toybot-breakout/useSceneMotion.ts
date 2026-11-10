import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { STEP_MS, type GameState } from './simulation';
import { collectMotionEntries, motionAlpha, paintMotion, startMotionLoop, type MotionEntry, type SceneSize } from './motion';
export function useSceneMotion(root:RefObject<HTMLDivElement>,state:GameState,enabled:boolean,low:boolean,reduced:boolean){
 const size=useRef<SceneSize>({width:390,height:700}),hasScene=state.status!=='home';
 const latest=useRef(state),anchor=useRef(0),phase=useRef(0),key=useRef(''),entries=useRef<MotionEntry[]>([]);
 useLayoutEffect(()=>{
  latest.current=state;const node=root.current;if(!node)return;
  const nextKey=[state.runId,state.progress,state.battleTime,state.bossPhaseTicks,state.defeatTicks].join(':');
  if(nextKey!==key.current){key.current=nextKey;anchor.current=performance.now();phase.current=0;}
  entries.current=collectMotionEntries(node);node.classList.add('has-motion-clock');
  paintMotion(node,state,phase.current,entries.current,reduced,size.current);
 },[state,root,reduced]);
 useLayoutEffect(()=>{
  const node=root.current;if(!node||typeof ResizeObserver==='undefined')return;
  const observer=new ResizeObserver(([entry])=>{if(entry.contentRect.width>0&&entry.contentRect.height>0){size.current={width:entry.contentRect.width,height:entry.contentRect.height};paintMotion(node,latest.current,phase.current,entries.current,reduced,size.current);}});
  observer.observe(node.querySelector<HTMLElement>('.toybot-world')??node);return()=>observer.disconnect();
 },[root,hasScene,reduced]);
 useEffect(()=>{
  const node=root.current;if(!node||!enabled||reduced)return;
  anchor.current=performance.now()-phase.current*STEP_MS;let frames=Number(node.dataset.motionFrames??0);
  return startMotionLoop(requestAnimationFrame,cancelAnimationFrame,now=>{phase.current=motionAlpha(now-anchor.current);const start=performance.now();paintMotion(node,latest.current,phase.current,entries.current,false,size.current);node.dataset.motionCost=(performance.now()-start).toFixed(2);node.dataset.motionFrames=String(++frames);},low);
 },[root,enabled,low,reduced]);
}
