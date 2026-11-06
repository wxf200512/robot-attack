import type { GameState } from './simulation';
import { musicTrack, musicLoopStart, musicLoopEnd, MUSIC_ENCODER_DELAY, type MusicId, type MusicTrack } from './musicTracks';
export type MusicScene={track:MusicId|null;paused:boolean;runId:number;levelIndex:number;volume:number};
export function musicSceneFor(state:GameState,storyBlocked=false):MusicScene{
 const phase=state.status==='paused'?state.resumeStatus:state.status;
 const boss=phase==='boss-intro'||phase==='battle'||phase==='boss-shift';
 const stopped=phase==='defeat'||phase==='result'||phase==='boss-victory';
 return {track:stopped?null:boss?`boss-${Math.max(0,Math.min(4,state.levelIndex))}` as MusicId:'road',paused:state.status==='paused'||storyBlocked,runId:state.runId,levelIndex:state.levelIndex,volume:phase==='home'?.6:1};
}
export function musicPosition(track:MusicTrack,elapsed:number){
 const end=musicLoopEnd(track),start=musicLoopStart(track);
 return elapsed<end?Math.max(0,elapsed):start+(elapsed-end)%(end-start);
}
export function musicTiming(track:MusicTrack,decodedDuration:number){
 const end=musicLoopEnd(track),delay=decodedDuration-end>.04?MUSIC_ENCODER_DELAY:0;
 return {delay,start:musicLoopStart(track)+delay,end:Math.min(decodedDuration,end+delay)};
}
// Repair the decoded waveform at its repeat boundary, after MP3 delay alignment.
// Only the final 10 ms of the repeat region changes; the entrance is untouched.
export function prepareMusicBuffer(buffer:AudioBuffer,track:MusicTrack){
 const timing=musicTiming(track,buffer.duration),start=timing.start*buffer.sampleRate,first=Math.floor(start),fraction=start-first;
 const end=Math.min(buffer.length-1,Math.ceil(timing.end*buffer.sampleRate)),count=Math.max(4,Math.round(buffer.sampleRate*.01));
 for(let channel=0;channel<buffer.numberOfChannels;channel++){
  const data=buffer.getChannelData(channel),target=data[first]*(1-fraction)+data[Math.min(first+1,data.length-1)]*fraction;
  for(let i=Math.max(0,end-count);i<=end;i++){const t=Math.max(0,Math.min(1,(i-(end-count))/(count-2))),blend=t*t*(3-2*t);data[i]=data[i]*(1-blend)+target*blend;}
 }
 return buffer;
}

type Handle={source:AudioBufferSourceNode;gain:GainNode;track:MusicId;key:string;started:number;offset:number};
type Loading={controller:AbortController;promise:Promise<AudioBuffer>};
export function createMusicPlayer(ctx:AudioContext,output:AudioNode,fetcher:typeof fetch=fetch){
 let desired:MusicScene|null=null,live:Handle|null=null,saved:{key:string;offset:number}|null=null,disposed=false,version=0,error:string|null=null;
 const cache=new Map<MusicId,AudioBuffer>(),loading=new Map<MusicId,Loading>(),fading=new Set<Handle>();
 const keyFor=(scene:MusicScene)=>scene.track+':'+scene.runId;
 const release=(handle:Handle)=>{handle.source.disconnect();handle.gain.disconnect();fading.delete(handle);};
 const stop=(handle:Handle,fade:number)=>{
  if(fading.size>=2)for(const old of fading){try{old.source.stop();}catch{/* Ended. */}release(old);}
  fading.add(handle);const now=ctx.currentTime;
  handle.gain.gain.cancelScheduledValues(now);handle.gain.gain.setTargetAtTime(0,now,fade?fade/4:.001);
  try{handle.source.stop(now+fade);}catch{release(handle);}
 };
 const pause=()=>{version++;if(live){saved={key:live.key,offset:musicPosition(musicTrack(live.track),live.offset+Math.max(0,ctx.currentTime-live.started))};stop(live,.025);live=null;}};
 const load=(id:MusicId):Promise<AudioBuffer>=>{
  const buffered=cache.get(id);if(buffered)return Promise.resolve(buffered);
  const pending=loading.get(id);if(pending)return pending.promise;
  const controller=new AbortController();
  const promise=(async()=>{
   const response=await fetcher(musicTrack(id).url,{signal:controller.signal});if(!response.ok)throw new Error('Music HTTP '+response.status);
   const decoded=await ctx.decodeAudioData(await response.arrayBuffer());
   if(disposed||controller.signal.aborted)throw new Error('Music loading cancelled');
   if(decoded.duration<musicLoopEnd(musicTrack(id))-.1)throw new Error('Music asset is truncated');
   prepareMusicBuffer(decoded,musicTrack(id));cache.set(id,decoded);while(cache.size>2){const stale=[...cache.keys()].find(key=>key!==desired?.track&&key!==id);if(!stale)break;cache.delete(stale);}return decoded;
  })();
  const task={controller,promise};loading.set(id,task);
  void promise.finally(()=>{if(loading.get(id)===task)loading.delete(id);}).catch(()=>{});
  return promise;
 };
 const setScene=(scene:MusicScene)=>{
  if(disposed)return;
  const changed=!desired||keyFor(desired)!==keyFor(scene);desired=scene;
  if(changed){version++;saved=null;}
  if(!scene.track){version++;if(live){stop(live,.3);live=null;}saved=null;for(const task of loading.values())task.controller.abort();return;}
  if(scene.paused||ctx.state!=='running'){pause();return;}
  const preload:MusicId=`boss-${Math.max(0,Math.min(4,scene.levelIndex))}` as MusicId;
  const allowed=new Set<MusicId>([scene.track,preload]);
  for(const [id,task]of loading)if(!allowed.has(id)){task.controller.abort();loading.delete(id);}
  for(const id of cache.keys())if(!allowed.has(id))cache.delete(id);
  if(scene.track==='road')void load(preload).catch(()=>{});
  if(live?.key===keyFor(scene)){live.gain.gain.setTargetAtTime(scene.volume,ctx.currentTime,.2);return;}
  const ticket=++version;
  void load(scene.track).then(buffer=>{
   if(disposed||ticket!==version||desired?.paused||ctx.state!=='running')return;
   const track=musicTrack(scene.track!),timing=musicTiming(track,buffer.duration),source=ctx.createBufferSource(),gain=ctx.createGain(),now=ctx.currentTime;
   source.buffer=buffer;source.loop=true;source.loopStart=timing.start;source.loopEnd=timing.end;
   const offset=saved?.key===keyFor(scene)?musicPosition(track,saved.offset):0;
   const handle={source,gain,track:scene.track!,key:keyFor(scene),started:now,offset};
   gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.001,scene.volume),now+.28);
   source.connect(gain);gain.connect(output);source.onended=()=>release(handle);source.start(now,Math.min(timing.end-.01,offset+timing.delay));
   if(live)stop(live,.4);live=handle;saved=null;error=null;
  }).catch(reason=>{if(!disposed&&ticket===version)error=String(reason);});
 };
 return {setScene,pause,status(){return {track:live?.track??null,playing:!!live,cached:[...cache.keys()],loading:[...loading.keys()],offset:live?musicPosition(musicTrack(live.track),live.offset+Math.max(0,ctx.currentTime-live.started)):saved?.offset??0,error};},dispose(){disposed=true;version++;for(const task of loading.values())task.controller.abort();loading.clear();if(live){try{live.source.stop();}catch{/* Ended. */}release(live);live=null;}for(const handle of fading){try{handle.source.stop();}catch{/* Ended. */}release(handle);}cache.clear();saved=null;}};
}
