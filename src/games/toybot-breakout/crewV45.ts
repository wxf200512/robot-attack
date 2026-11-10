import type { MechClass } from './mechs';
export type CrewIdV45='maya'|'ethan'|'nora';
export type SpeakerV45=CrewIdV45|'miko'|'spark'|'guardian'|'system';
const ROOT='/games/toybot-breakout/optimized/';
export const CREW_V45={
 maya:{id:'maya',name:'玛雅·克鲁兹',short:'玛雅',english:'MAYA CRUZ',role:'前线驾驶员',call:'SKYLARK',age:29,art:ROOT+'crew-maya-v45.webp',color:'#70e6f2',bio:'敢于先伸出援手的试飞员。负责脉冲与战刃机体的远程驾驶，重视机动和伙伴的位置。她把每次突围都当作一次接人回家的任务。',quote:'先把伙伴带出来，再谈漂亮的战绩。'},
 ethan:{id:'ethan',name:'伊森·里德',short:'伊森',english:'ETHAN REED',role:'重装驾驶员',call:'ANCHOR',age:34,art:ROOT+'crew-ethan-v45.webp',color:'#ffc57c',bio:'从维修工转任的护航驾驶员，负责重锤机体与撤离掩护。习惯先找结构薄弱点，再用最少的火力解除接管装置；冷静中带一点幽默。',quote:'装甲厚一点，是为了让身后的人放心。'},
 nora:{id:'nora',name:'诺拉·海斯',short:'诺拉',english:'NORA HAYES',role:'通信与任务指挥',call:'BEACON',age:37,art:ROOT+'crew-nora-v45.webp',color:'#9fe8cc',bio:'归航网络的通信工程师。负责简报、航标校验和失联伙伴定位，与维修终端米可搭档。她坚持核对每一条指令，让守护者重新听见城市。',quote:'频道里的每个声音，都要有回应。'},
} as const;
export const CREW_LIST_V45=Object.values(CREW_V45);
export const pilotV45=(mech:MechClass):CrewIdV45=>mech==='heavy'?'ethan':'maya';
export const wingmateV45=(mech:MechClass):CrewIdV45=>mech==='heavy'?'maya':'ethan';
export function radioSpeakerV45(text:string):SpeakerV45{
 if(/^(玛雅|MAYA)/.test(text))return 'maya';if(/^(伊森|ETHAN)/.test(text))return 'ethan';if(/^(诺拉|NORA)/.test(text))return 'nora';
 if(/^米可/.test(text))return 'miko';if(/^(先知|蜂后|监工|堡垒|帝皇)/.test(text))return 'guardian';if(/^(火花|伙伴)/.test(text))return 'spark';return 'nora';
}
export const cleanRadioV45=(text:string)=>text.replace(/^(玛雅|伊森|诺拉|米可|先知|蜂后|监工|堡垒|帝皇|火花|伙伴)[：:]\s*/,'');
export function speakerMetaV45(id:SpeakerV45){
 if(Object.prototype.hasOwnProperty.call(CREW_V45,id))return CREW_V45[id as CrewIdV45];
 return ({miko:{name:'米可',short:'米可',english:'MIKO',role:'维修终端',call:'SUPPORT',color:'#8ce4ec'},spark:{name:'火花',short:'火花',english:'SPK-01',role:'自主机甲核心',call:'SPARK',color:'#87e4ff'},guardian:{name:'守护者',short:'守护者',english:'GUARDIAN',role:'城市守护者频道',call:'LOCAL LINK',color:'#ffc57c'},system:{name:'中央安全系统',short:'中枢',english:'CITY CORE',role:'城市指令网络',call:'SYSTEM',color:'#aeb8cc'}} as const)[id as Exclude<SpeakerV45,CrewIdV45>];
}
export const PILOT_REPLIES_V45={
 maya:['灯是给伙伴照路的。火花，绕开炉口，我们把出口打开。','他们是同行的伙伴，不是货物。伊森，替我看住撤离线。','城外的伙伴也属于这里。我们带着他们，一起进城。','听见了。诺拉锁定信号，火花跟我走空白轨道。','五区的声音都在这里。我们把最后一位伙伴接回家。'],
 ethan:['炉口交给我。玛雅带伙伴撤离，我们只拆接管装置。','护航位置已就绪。诺拉，告诉蜂后：这批伙伴不回仓库。','装甲不是用来把居民挡在外面的。让我替你卸下错误的锁。','别急着追能量球，先拆放电节点。玛雅，我来掩护。','护航到最后一程。火花，把所有伙伴的回执送进去。'],
};
export const CREW_WORLD_V45='星穹玩具城是人类与自主玩具机甲共同维护的巡游城市。玛雅、伊森在城外驾驶舱通过远程链路协同火花核心；诺拉负责通信，米可执行现场维修。驾驶员在远程座舱守住链路，火花与守护者保有自主意识；人与机甲以信任协同，让每位伙伴都有回家的路。';

export function sceneSpeakerV45(kind:'briefing'|'confrontation'|'aftermath',step:number,mech:MechClass):SpeakerV45{return kind==='briefing'?(step===0?'nora':pilotV45(mech)):kind==='confrontation'?(step===0?'guardian':pilotV45(mech)):step===0?'nora':wingmateV45(mech);}
