import { CREW_V45, pilotV45, wingmateV45, sceneSpeakerV45, speakerMetaV45, radioSpeakerV45, PILOT_REPLIES_V45, type SpeakerV45 } from './crewV45';
import { recordUpgradeV41 } from './flowV41';
import { sortieGoalV39 } from './sortiesV39';
import { gameReducer, gateGroundY, playerLaneFor, GATE_CONTACT_Y, type GameState, type Action } from './simulation';
import { STORY_CHAPTERS } from './story';
import { getLevel, hazardLaneAt } from './level';
import { normalizeGarage } from './progression';

export const CHAPTER_FILMS=[1,2,3,4,5].map(n=>`/games/toybot-breakout/optimized/chapter-film-${n}-v38.jpg`);
export const CHAPTER_FILM_RATIOS=[1,1,1,1,1];
export const RELAY_ART='/games/toybot-breakout/optimized/story-relay-v12.png';
export const CHAPTER_DIALOGUE=[
 {intro:'第一盏归航灯就在工厂出口。看准支援门，接回伙伴，再替监工解除错误的安全锁。',boss:'检测到未归箱机体。出口保持高温隔离。',reply:'灯是给伙伴照路的，不是把伙伴留在门外。',lore:'这些补给是工厂伙伴留下的。好门帮你改装，回收闸会削弱机体，看清再选。',win:'工厂航标亮了！监工停止误射，第一批巡游灯具正在出库。'},
 {intro:'蜂后把伙伴当成了待回收货物。沿运输桥接应他们，别让护卫的扑击截断队伍。',boss:'归巢回收已启动。所有游离机体，立即交还蜂巢。',reply:'他们是同行的伙伴，不是你的货物。',lore:'蜂群接到了过期的归箱指令。击破护卫能中止扑击；来不及就躲开它锁定的那一列。',win:'蜂后收到正确名单了！蜂群重新开始运送零件，而不是回收伙伴。'},
 {intro:'城门还没认出我们。拆开城防广播箱，把获救伙伴的归航名单送进去。',boss:'未收到五区安全回执。城门禁止开放。',reply:'看看我身后的伙伴。他们也属于这座城。',lore:'城防护盾连着机体上的安全锁。拆掉部件，是让堡垒重新听懂居民的声音。',win:'城防航标接通。堡垒放下重盾，城外的伙伴终于能够进城。'},
 {intro:'米可在风暴里听见了求救声。先修复中继，再帮先知切断失控的放电回路。',boss:'极性冲突……归箱协议禁止中断……请接收维护信号。',reply:'收到你的信号。坚持住，我们来解除锁定。',lore:'先知一直在抵抗错误指令。预警是它留给我们的机会，沿空白轨道前进。',win:'能源航标恢复！先知送来了最终指令的地址：中央王座运载基地。'},
 {intro:'四区航标已亮。前面是横跨三路的王座要塞，把最后一次归航呼叫送到它的星核里。',boss:'安全回执不完整。全城玩具，立即归箱。',reply:'我们带来的不只是回执，是每一位伙伴的声音。',lore:'要塞把整座城当成了一个储物箱。三路都能命中机体，拆掉锁定部件，给核心留出通信窗口。',win:'五区归航信号完整！归箱指令撤销，王座要塞展开成巡游领航台。欢迎回家，所有伙伴。'},
];
export const CHAPTER_BREAK_RADIO=['伊森：安全锁断连。玛雅，出口交给你，我来护航。','蜂后：归航名单……已收到。请停止回收同行机体。','玛雅：护盾锁已解除。伊森，带伙伴通过城门。','先知：维护信号恢复。谢谢你听见了我。','诺拉：王座锁正在松开。驾驶组，把最后的归航信号送进星核。'];
export const CHAPTER_TURN_RADIO=['伊森：备用炉膛启动。别硬吃热区，等收招再反击。','玛雅：翼巢展开！护卫会变道，预警锁定后再闪。','伊森：第二道城门锁就位。玛雅，我来拆盾，你接应伙伴。','先知：下一段极性即将变化。沿空白轨道移动。','诺拉：最终校验开始。三路都能命中要塞，驾驶组避开裁决预警。'];
export type SupportRoute='rescue'|'signal';
export type NarrativeScene={kind:'briefing'|'confrontation'|'aftermath';step:0|1;synced:number};
export type Narrative={scene:NarrativeScene|null;replay:boolean;route:SupportRoute|null;objective:'inactive'|'pending'|'collected'|'missed';relayLane:number;relayMark:number;radio:{id:string;text:string;ticks:number;speaker?:SpeakerV45}|null;seen:string[]};
export type CampaignState=GameState&{narrative:Narrative};
export type CampaignAction=Action|{type:'STORY_NEXT'|'STORY_SKIP'|'STORY_DISMISS_RADIO'}|{type:'STORY_ROUTE';route:SupportRoute}|{type:'STORY_SYNC';index:number};
export function freshNarrative():Narrative{return {scene:null,replay:false,route:null,objective:'inactive',relayLane:1,relayMark:24,radio:null,seen:[]};}
export const createCampaign=(game:GameState):CampaignState=>({...game,narrative:freshNarrative()});
const radio=(id:string,text:string,speaker:SpeakerV45=radioSpeakerV45(text)):NonNullable<Narrative['radio']>=>({id,text,ticks:75,speaker});
export const relayVisible=(state:CampaignState)=>state.status==='running'&&state.narrative.objective==='pending'&&state.progress>=state.narrative.relayMark-12;
export function filmFrame(kind:NarrativeScene['kind'],step:number,clock:number,reduced=false){const base=kind==='briefing'?(step===0?0:2):kind==='confrontation'?2:4;return base+(reduced?0:Math.min(1,Math.floor(clock/900)));}
export function sceneCopy(state:CampaignState){
 const scene=state.narrative.scene,chapter=STORY_CHAPTERS[state.levelIndex],lines=CHAPTER_DIALOGUE[state.levelIndex];
 const character=scene?sceneSpeakerV45(scene.kind,scene.step,state.mechClass):'nora',person=speakerMetaV45(character),pilot=pilotV45(state.mechClass),wing=CREW_V45[wingmateV45(state.mechClass)];
 const identity={character,speaker:person.short+' / '+person.english};
 if(!scene)return {...identity,title:chapter.title,line:'',hint:''};
 if(scene.kind==='briefing')return scene.step===0?{...identity,title:state.narrative.replay?chapter.title+' · 维修巡查':chapter.title,line:state.narrative.replay?'诺拉呼叫驾驶组：航标已在线，复检残留作战壳。米可负责回收，玛雅与伊森继续接应伙伴。':(state.levelIndex===0?'我是诺拉。玛雅、伊森的远程驾驶链路已连接；米可协助火花核心。我们把伙伴带回家。':'驾驶组，归航频道保持在线。')+lines.intro,hint:state.narrative.replay?'回收故障作战壳，复检'+chapter.permission:chapter.objective}:{...identity,title:'选择这次行动的支援',line:(pilot==='maya'?'我先进入前线，伊森负责护航。':'我来稳住护航线，玛雅接应失联伙伴。')+'诺拉，请米可把支援接到前方中继。',hint:'驶入发光中继所在轨道，接回伙伴或接通护盾。'};
 if(scene.kind==='confrontation')return {...identity,speaker:scene.step===0?(state.narrative.replay?'残留封锁信号':'守护者 / 接管中'):identity.speaker,title:scene.step===0?'封锁指令':'驾驶员回应',line:scene.step===0?lines.boss:PILOT_REPLIES_V45[pilot as 'maya'|'ethan'][state.levelIndex],hint:scene.step===0?'诺拉：只解除封锁部件，守护者也是需要接回的伙伴。':chapter.tip};
 return {...identity,title:scene.step===0?(state.narrative.replay?chapter.permission+'复检完成':state.levelIndex===4?'归航巡游，重新出发':chapter.permission+'已恢复'):'驾驶组回传维护记录',line:scene.step===0?(state.narrative.replay?'残留作战壳已回收。驾驶组，辛苦了；米可会把零件带回机库，下一次归航继续同行。':lines.win+(state.levelIndex===4?'玛雅、伊森、米可和火花，归航频道收到所有人的声音。':'')):(wing.id==='ethan'?'最后一位伙伴也跟上了。玛雅，干得漂亮。':'护航线安全，伊森。下一段路，我来探。')+'依次接通三个维护节点，把行动记录传给诺拉。',hint:scene.step===0?(state.narrative.objective==='collected'?'你接通的中继已加入归航网络，伙伴正在返回航路。':'本区航标已点亮。遗漏的中继会交由维修队处理。'):'战斗胜利已确认；可以跳过同步演出，不影响奖励与解锁。'};
}
export function campaignReducer(state:CampaignState,action:CampaignAction):CampaignState{
 const n=state.narrative;
 if(action.type==='STORY_DISMISS_RADIO')return {...state,narrative:{...n,radio:null}};
 if(action.type.startsWith('STORY_')){
  if(!n.scene||state.status==='paused')return state;
  const scene=n.scene;
  if(action.type==='STORY_SYNC')return scene.kind==='aftermath'&&scene.step===1&&action.index===scene.synced&&scene.synced<3?{...state,narrative:{...n,scene:{...scene,synced:scene.synced+1}}}:state;
  if(action.type==='STORY_ROUTE'&&(scene.kind!=='briefing'||scene.step!==1||!['rescue','signal'].includes(action.route)))return state;
  if(action.type==='STORY_NEXT'&&scene.step===0)return {...state,narrative:{...n,scene:{...scene,step:1}}};
  if(action.type==='STORY_NEXT'&&scene.kind==='briefing')return state;
  if(action.type==='STORY_NEXT'&&scene.kind==='aftermath'&&scene.synced<3)return state;
  if(action.type!=='STORY_NEXT'&&action.type!=='STORY_SKIP'&&action.type!=='STORY_ROUTE')return state;
  const route=action.type==='STORY_ROUTE'?action.route:n.route??'signal';
  const wing=CREW_V45[wingmateV45(state.mechClass)];
  const blocked=getLevel(state.levelIndex).hazards.flatMap((h,i)=>Math.abs(h.progress-n.relayMark)<=5?[hazardLaneAt(state.layoutIndex,i,n.relayMark,state.levelIndex)]:[]);
  const lanes=[0,1,2].filter(lane=>!blocked.includes(lane));
  return {...state,narrative:{...n,scene:null,...(scene.kind==='briefing'?{route,objective:'pending' as const,relayLane:lanes[(state.layoutIndex+state.levelIndex)%Math.max(1,lanes.length)]??1,radio:radio('support-brief',route==='rescue'?'诺拉：失联伙伴已定位。玛雅与伊森保持驾驶链路，驶过前方中继接应。':'诺拉：米可正在接通维护护盾。驾驶组，驶过前方中继同步。')} : scene.kind==='confrontation'?{radio:radio('crew-cover',wing.short+'：'+(wing.id==='ethan'?'护航链路稳定。我看住侧翼，交战交给你。':'侧翼扫描完成。伊森，稳住机体，我来接应伙伴。'),wing.id)}:{})}};
 }
 if(n.scene&&(action.type==='TICK'||action.type==='MOVE_LANE'||action.type==='ACTIVATE_BURST'))return state;
 const next=gameReducer(state,action as Action);
 if(next===state)return state;
 if('garage' in action){const narrative=freshNarrative();if(next.sortie){narrative.radio=radio('sortie-brief',next.sortie.name+'：'+sortieGoalV39(next.sortie)+'，抵达终点后结算。');return {...next,narrative};}narrative.replay=normalizeGarage(action.garage).completedLevels[next.levelIndex]===true;if(next.status==='running'){
 if(action.type==='RESTART'&&n.seen.includes('briefing')){
  narrative.seen=n.seen.filter(key=>['briefing','confrontation','lore','supply-story','aftermath'].includes(key));narrative.route=n.route??'signal';narrative.objective='pending';
  const blocked=getLevel(next.levelIndex).hazards.flatMap((h,i)=>Math.abs(h.progress-narrative.relayMark)<=5?[hazardLaneAt(next.layoutIndex,i,narrative.relayMark,next.levelIndex)]:[]);
  narrative.relayLane=[0,1,2].find(lane=>!blocked.includes(lane))??1;
 }else{narrative.scene={kind:'briefing',step:0,synced:0};narrative.seen=['briefing'];}
 }return {...next,narrative};}
 if(action.type!=='TICK')return {...next,...(action.type==='RESUME'&&n.scene?{finish:{...next.finish,resumeTicks:0}}:{}),narrative:n};
 const narrative:Narrative={...n,seen:[...n.seen],radio:n.radio&&n.radio.ticks>1?{...n.radio,ticks:n.radio.ticks-1}:null};
 if(next.sortie)return {...next,narrative:{...narrative,radio:next.status==='result'||next.status==='defeat'?null:narrative.radio}};
 if(next.status==='running'&&n.objective==='pending'){
  const previousY=gateGroundY(state.progress,n.relayMark),y=gateGroundY(next.progress,n.relayMark);
  if(y>=GATE_CONTACT_Y&&previousY<=GATE_CONTACT_Y+3&&playerLaneFor(next)===n.relayLane){
   narrative.objective='collected';
   if(n.route==='rescue'){next.bots+=Number(next.bots<11);}else next.shieldCharges+=1;recordUpgradeV41(next,'剧情中继',n.route==='rescue'?'友军归队':'护盾+1');
   narrative.radio=radio('support-done',n.route==='rescue'?'伙伴：收到归航呼叫！队伍里给我留个位置。〔机甲 +1〕':'米可：航标护盾接通。诺拉已确认信号，这一路我替你照看。〔护盾 +1〕');
  }else if(y>GATE_CONTACT_Y+3){narrative.objective='missed';narrative.radio=radio('support-missed','诺拉：中继交由米可处理，驾驶组继续前进。别为一次遗漏停下归航。');}
 }
 if(next.status==='running'&&next.progress>=55&&!narrative.seen.includes('lore')){narrative.seen.push('lore');narrative.radio=radio('sector-lore',CHAPTER_DIALOGUE[next.levelIndex].lore);}
 if(next.status==='boss-intro'&&!narrative.seen.includes('confrontation')){narrative.seen.push('confrontation');narrative.radio=null;narrative.scene={kind:'confrontation',step:0,synced:0};}
 if(next.status==='battle'&&next.bossStage===2&&!narrative.seen.includes('turn')){narrative.seen.push('turn');narrative.radio=radio('boss-turn',CHAPTER_TURN_RADIO[next.levelIndex]);}
 if(next.status==='battle'&&next.ops.broken>0&&!narrative.seen.includes('part-release')&&!narrative.radio){narrative.seen.push('part-release');narrative.radio=radio('part-release',CHAPTER_BREAK_RADIO[next.levelIndex]);}
 if(next.status==='running'&&next.gateCollected&&!state.gateCollected&&!narrative.seen.includes('supply-story')&&!narrative.radio){narrative.seen.push('supply-story');const option=next.gateChoices[next.gate]?.[0];narrative.radio=radio('supply-story',option?.polarity==='penalty'?'米可：那是误导机体的回收闸。看清标记，再选下一道门。':'米可：这是伙伴留下的支援门。把力量带上，把同行者接回来。');}
 if(next.status==='result'&&next.won&&next.bossDefeated&&!narrative.seen.includes('aftermath')){narrative.seen.push('aftermath');narrative.radio=null;narrative.scene={kind:'aftermath',step:0,synced:0};}
 if(next.status==='defeat'||next.status==='result')narrative.radio=null;
 return {...next,narrative};
}
