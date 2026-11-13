import { useEffect, useMemo, useState } from 'react';
import type { GameState } from './simulation';
import { MAP_ART, THREAT_ART, GATE_ART } from './art';
import { RUN_ART } from './visualArt';
import { ROAD_TILES_V37 } from './roadMotionV37';
import { ARENA_ART_V36, EMPEROR_ART_V36 } from './arenaMotionV36';
import { BOSS_MOTION_V31 } from './hostileMotionV31';
import { COMBAT_UI_V48 } from './combatArtV48';
import { preloadImages } from './loading';

export function useAssetGateV59(s:GameState){
 const status=s.status==='paused'?s.resumeStatus:s.status;
 const mode=['boss-intro','battle','boss-shift'].includes(status??'')?'boss':status==='running'?'road':'';
 const key=mode?s.levelIndex+':'+s.mechClass+':'+mode:'';
 const urls=useMemo(()=>!mode?[]:[MAP_ART[s.levelIndex],ROAD_TILES_V37[s.levelIndex],COMBAT_UI_V48.console,
  ...(mode==='road'?[RUN_ART[s.mechClass],GATE_ART]:[ARENA_ART_V36[s.mechClass],s.levelIndex===4?EMPEROR_ART_V36:BOSS_MOTION_V31[s.levelIndex],THREAT_ART])], [mode,s.levelIndex,s.mechClass]);
 const [attempt,setAttempt]=useState(0),[loaded,setLoaded]=useState({key:'',attempt:0,done:0,failed:false,ready:false});
 useEffect(()=>{
  if(!key){setLoaded({key:'',attempt,done:0,failed:false,ready:false});return;}let live=true,done=0,finished=0,failed=false;
  setLoaded({key,attempt,done,failed,ready:false});
  void Promise.all(urls.map(async url=>{
   const [result]=await preloadImages([url],'high');finished++;if(result.status==='fulfilled')done++;failed=failed||result.status==='rejected';
   if(live)setLoaded({key,attempt,done,failed,ready:finished===urls.length&&!failed});
  }));return()=>{live=false;};
 },[key,urls,attempt]);
 const current=loaded.key===key&&loaded.attempt===attempt;
 return {blocked:!!key&&(!current||!loaded.ready),failed:current&&loaded.failed,done:current?loaded.done:0,total:urls.length,retry:()=>setAttempt(n=>n+1)};
}
