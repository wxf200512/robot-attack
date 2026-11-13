import { SAMPLE_URL_V64 as SAMPLE_URL_V63, SAMPLE_CELLS_V64 as SAMPLE_CELLS_V63 } from './sampleAtlasV64';
import type { AudioCue, SoundVoice } from './soundDesign';
const aliases:Partial<Record<AudioCue,string>>={'pulse-up':'pulse','heavy-up':'heavy','blade-up':'blade','core-shot-pulse':'pulse','core-shot-heavy':'heavy','core-shot-blade':'blade'};
export const sampleCellV63=(cue:AudioCue)=>SAMPLE_CELLS_V63[aliases[cue]??cue];
// One decoded PCM atlas. Pending/failed loads never queue old combat events.
export function createSampleBankV63(ctx:AudioContext,fetcher:typeof fetch=fetch){
 let buffer:AudioBuffer|null=null,controller:AbortController|null=null,pending:Promise<void>|null=null,disposed=false,error:string|null=null,hits=0;
 const warm=()=>{
  if(disposed||buffer||pending||typeof ctx.decodeAudioData!=='function')return pending??Promise.resolve();
  const abort=new AbortController();controller=abort;const timer=setTimeout(()=>abort.abort(),8000);
  pending=(async()=>{const response=await fetcher(SAMPLE_URL_V63,{signal:abort.signal});if(!response.ok)throw Error('SFX HTTP '+response.status);const decoded=await ctx.decodeAudioData(await response.arrayBuffer());if(disposed||abort.signal.aborted)return;const end=Math.max(...Object.values(SAMPLE_CELLS_V63).map(c=>c.start+c.duration));if(decoded.duration<end-.005)throw Error('SFX atlas truncated');buffer=decoded;error=null;})().catch(e=>{if(!disposed)error=String(e);}).finally(()=>{clearTimeout(timer);pending=null;controller=null;});return pending;
 };
 return {warm,ready(cue:AudioCue){return !!buffer&&!!sampleCellV63(cue);},status(){return {ready:!!buffer,loading:!!pending,error,hits};},
 play(cue:AudioCue,output:AudioNode,at:number,pan:number,pitch:number,priority:number):SoundVoice[]|null{
  const cell=sampleCellV63(cue);if(disposed||!buffer||!cell)return null;
  const upgraded=cue.endsWith('-up')||cue.startsWith('core-shot-'),rate=pitch*(upgraded?.93:1),source=ctx.createBufferSource(),gain=ctx.createGain(),nodes:AudioNode[]=[gain],end=at+cell.duration/rate;
  source.buffer=buffer;source.playbackRate.value=rate;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(upgraded?.70:.60,at+.002);gain.gain.setValueAtTime(upgraded?.70:.60,Math.max(at+.003,end-.018));gain.gain.linearRampToValueAtTime(0,end);source.connect(gain);
  if(ctx.createStereoPanner){const panner=ctx.createStereoPanner();panner.pan.value=Math.max(-.5,Math.min(.5,pan));gain.connect(panner);panner.connect(output);nodes.push(panner);}else gain.connect(output);
  source.onended=()=>{source.disconnect();nodes.forEach(n=>n.disconnect());};source.start(at,cell.start,cell.duration);source.stop(end);hits++;return [{source,nodes,gain,end:end+.015,priority}];
 },dispose(){disposed=true;controller?.abort();buffer=null;}};
}
