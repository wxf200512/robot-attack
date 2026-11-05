import { gameReducer, gateGroundY, playerLaneFor, GATE_CONTACT_Y, type GameState, type Action } from './simulation';
import { STORY_CHAPTERS } from './story';
import { getLevel, hazardLaneAt } from './level';
import { normalizeGarage } from './progression';

export const CHAPTER_FILMS=[1,2,3,4,5].map(n=>`/games/toybot-breakout/optimized/chapter-film-${n}-v12.jpg`);
export const CHAPTER_FILM_RATIOS=[1,1,1,128/57,128/57];
export const RELAY_ART='/games/toybot-breakout/optimized/story-relay-v12.png';
export const CHAPTER_DIALOGUE=[
  {intro:'出口被铸炉监工封住了。附近还有失联伙伴，先让他们听见我们的信号。',boss:'检测到未登记机体。执行高温隔离。',reply:'我们来接伙伴回家。请让开出口。',lore:'这些机体原本负责生产补给。静默协议把他们自己的工作区变成了隔离区。',win:'补给线恢复了！高空航道的维护路径已经接通。'},
  {intro:'运输桥被蜂群接管了。沿着维护航标前进，我们去恢复空中航路。',boss:'航路已关闭。所有游离能源，立即归巢。',reply:'伙伴不是需要被回收的能源。我们会打开航路。',lore:'这些蜂群以前运送零件。最后一道错误指令，让它们开始回收仍在工作的机体。',win:'蜂群的接管信号停了。沿着这条航路，我们能抵达城市内墙。'},
  {intro:'堡垒挡住了能源区入口。它还在保护城市，却认不出需要通行的居民。',boss:'城门保持封闭。未经授权，不得通行。',reply:'城门之外，也有你应该保护的居民。',lore:'护盾塔把城防网接进堡垒的装甲。我们要切断错误接管，保住城市的守护者。',win:'接管链路中断，居民通行权限恢复。城门开了，能源塔就在前面。'},
  {intro:'供能平台正在失稳。接通维护信号，再去切断持续放电的导电核心。',boss:'风暴尚未解除。切换极性，维持隔离。',reply:'继续隔离只会让风暴更强。让我修好它。',lore:'先知已经发现控制冲突，但静默协议不允许它停止隔离。它也在等待有人结束这一切。',win:'供能稳定了。封锁指令来自中央基地——静默协议还在执行。'},
  {intro:'四区权限已接通。解除符印、突破裁决，我们就能关闭静默协议。',boss:'全城进入静默。所有自主机体，停止运行。',reply:'大家还在等着回家。米可，和我一起把灯点亮。',lore:'中枢将失去的权限集中到帝皇身上。恢复城市，是让守护者重新听见居民的声音。',win:'黎明中枢重启完成。五区重新开放，欢迎回家，火花。'},
];
export type SupportRoute='rescue'|'signal';
export type NarrativeScene={kind:'briefing'|'confrontation'|'aftermath';step:0|1;synced:number};
export type Narrative={scene:NarrativeScene|null;replay:boolean;route:SupportRoute|null;objective:'inactive'|'pending'|'collected'|'missed';relayLane:number;relayMark:number;radio:{id:string;text:string;ticks:number}|null;seen:string[]};
export type CampaignState=GameState&{narrative:Narrative};
export type CampaignAction=Action|{type:'STORY_NEXT'|'STORY_SKIP'|'STORY_DISMISS_RADIO'}|{type:'STORY_ROUTE';route:SupportRoute}|{type:'STORY_SYNC';index:number};
export function freshNarrative():Narrative{return {scene:null,replay:false,route:null,objective:'inactive',relayLane:1,relayMark:24,radio:null,seen:[]};}
export const createCampaign=(game:GameState):CampaignState=>({...game,narrative:freshNarrative()});
const radio=(id:string,text:string):NonNullable<Narrative['radio']>=>({id,text,ticks:75});
export const relayVisible=(state:CampaignState)=>state.status==='running'&&state.narrative.objective==='pending'&&state.progress>=state.narrative.relayMark-12;
export function filmFrame(kind:NarrativeScene['kind'],step:number,clock:number,reduced=false){const base=kind==='briefing'?(step===0?0:2):kind==='confrontation'?2:4;return base+(reduced?0:Math.min(1,Math.floor(clock/900)));}
export function sceneCopy(state:CampaignState){
 const scene=state.narrative.scene,chapter=STORY_CHAPTERS[state.levelIndex],lines=CHAPTER_DIALOGUE[state.levelIndex];
 if(!scene)return {speaker:'米可',title:chapter.title,line:'',hint:''};
 if(scene.kind==='briefing')return scene.step===0?{speaker:'米可 / MIKO',title:state.narrative.replay?chapter.title+' · 维修巡查':chapter.title,line:state.narrative.replay?'这里的权限已经恢复。这次回收残留故障作战壳，接应仍在维修的伙伴，让城市继续正常运转。':lines.intro,hint:state.narrative.replay?'回收故障作战壳，复检'+chapter.permission:chapter.objective}:{speaker:'米可 / 支援频道',title:'选择这次行动的支援',line:'选定支援后，驶入发光中继所在轨道，接回伙伴或接通护盾。',hint:''};
 if(scene.kind==='confrontation')return {speaker:scene.step===0?(state.narrative.replay?'残留封锁信号':'守护者 / 接管中'):'火花 / SPK-01',title:scene.step===0?'封锁指令':'自主回应',line:scene.step===0?lines.boss:lines.reply,hint:scene.step===0?'击破作战外壳，解除错误接管。':chapter.tip};
 return {speaker:state.levelIndex===4?'黎明中枢 / 通信恢复':'米可 / 回收频道',title:scene.step===0?(state.narrative.replay?chapter.permission+'复检完成':state.levelIndex===4?'黎明，重新亮起':chapter.permission+'已恢复'):'同步城市维护记录',line:scene.step===0?(state.narrative.replay?'残留作战壳已回收，维护网络保持在线。辛苦了，队长，伙伴们的归途更安全了。':lines.win):'依次接通三个维护节点，把这次行动传回城市网络。',hint:scene.step===0?(state.narrative.objective==='collected'?'你接通的中继也已恢复，伙伴正在返回航路。':'城市权限已恢复。遗漏的中继会交由维修队处理。'):'战斗胜利已确认；可以跳过同步演出，不影响奖励与解锁。'};
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
  const blocked=getLevel(state.levelIndex).hazards.flatMap((h,i)=>Math.abs(h.progress-n.relayMark)<=5?[hazardLaneAt(state.layoutIndex,i,n.relayMark,state.levelIndex)]:[]);
  const lanes=[0,1,2].filter(lane=>!blocked.includes(lane));
  return {...state,narrative:{...n,scene:null,...(scene.kind==='briefing'?{route,objective:'pending' as const,relayLane:lanes[(state.layoutIndex+state.levelIndex)%Math.max(1,lanes.length)]??1,radio:radio('support-brief',route==='rescue'?'已呼叫失联伙伴。前方中继处会合，驶入它所在的轨道。':'已请求维护护盾。前方中继处同步，驶入它所在的轨道。')}:{})}};
 }
 if(n.scene&&(action.type==='TICK'||action.type==='MOVE_LANE'))return state;
 const next=gameReducer(state,action as Action);
 if(next===state)return state;
 if('garage' in action){const narrative=freshNarrative();narrative.replay=normalizeGarage(action.garage).completedLevels[next.levelIndex]===true;if(next.status==='running'){narrative.scene={kind:'briefing',step:0,synced:0};narrative.seen=['briefing'];}return {...next,narrative};}
 if(action.type!=='TICK')return {...next,narrative:n};
 const narrative:Narrative={...n,seen:[...n.seen],radio:n.radio&&n.radio.ticks>1?{...n.radio,ticks:n.radio.ticks-1}:null};
 if(next.status==='running'&&n.objective==='pending'){
  const previousY=gateGroundY(state.progress,n.relayMark),y=gateGroundY(next.progress,n.relayMark);
  if(y>=GATE_CONTACT_Y&&previousY<=GATE_CONTACT_Y+3&&playerLaneFor(next)===n.relayLane){
   narrative.objective='collected';
   if(n.route==='rescue'){next.bots+=Number(next.bots<11);}else next.shieldCharges+=1;
   narrative.radio=radio('support-done',n.route==='rescue'?'伙伴：收到你的呼叫！这次我们一起回家。〔机甲 +1〕':'米可：中继接通，城市的维护护盾已到位。〔护盾 +1〕');
  }else if(y>GATE_CONTACT_Y+3){narrative.objective='missed';narrative.radio=radio('support-missed','米可：没能接上中继也没关系，维修队会接手。我们继续恢复城市权限。');}
 }
 if(next.status==='running'&&next.progress>=55&&!narrative.seen.includes('lore')){narrative.seen.push('lore');narrative.radio=radio('sector-lore',CHAPTER_DIALOGUE[next.levelIndex].lore);}
 if(next.status==='boss-intro'&&!narrative.seen.includes('confrontation')){narrative.seen.push('confrontation');narrative.radio=null;narrative.scene={kind:'confrontation',step:0,synced:0};}
 if(next.status==='battle'&&next.bossStage===2&&!narrative.seen.includes('turn')){narrative.seen.push('turn');narrative.radio=radio('boss-turn','米可：接管链路正在松动。'+STORY_CHAPTERS[next.levelIndex].tip);}
 if(next.status==='result'&&next.won&&next.bossDefeated&&!narrative.seen.includes('aftermath')){narrative.seen.push('aftermath');narrative.radio=null;narrative.scene={kind:'aftermath',step:0,synced:0};}
 if(next.status==='defeat'||next.status==='result')narrative.radio=null;
 return {...next,narrative};
}
