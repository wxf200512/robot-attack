import { STORY_ART } from './art';
export const STORY_PAGES=[
 {character:'nora' as const,title:'归航巡游前夜',caption:'星穹玩具城准备迎接远行伙伴。通信员诺拉校验五区航标，驾驶员玛雅与伊森在城外机库待命；米可和自主核心火花负责现场接应。',speaker:'诺拉 · 归航通信',line:'每一盏灯，都在等一位伙伴回家。',alt:'蓝色工业玩具城的机器人装点归航巡游，五区航标连接云海中的道路。'},
 {character:'system' as const,title:'一条发错的归箱指令',caption:'风暴打断了巡游校准。中枢将“保护所有玩具”误读为“把所有玩具收回仓库”，补给通道变成回收闸，守护者开始拦截伙伴。',speaker:'中央安全系统',line:'归箱协议生效。未归队机体，立即回收。',alt:'琥珀色回收指令笼罩玩具城市，自动门将伙伴引向储存箱。'},
 {character:'maya' as const,title:'火花维修队，上线',caption:'米可唤醒火花核心，诺拉恢复远程驾驶链路。玛雅负责脉冲与战刃突入，伊森驾驶重锤护航；同一枚核心协同不同机体，沿途接应伙伴，回收零件改装。',speaker:'玛雅 · SKYLARK',line:'我们拆掉错误的锁，不拆散这座城。',alt:'维修机库中米可唤醒奶白色机甲，工作台上放着橙色重炮与紫色战刃模块。'},
 {character:'ethan' as const,title:'把回家的路重新接起来',caption:'穿过支援门，躲开回收闸；阻止追袭蜂群，解除守护者的炮台、护盾与推进锁。点亮四区航标后，向横跨三路的王座要塞发送最后一次归航呼叫。',speaker:'伊森 · ANCHOR',line:'火花说得对：伙伴到齐，才能叫作回家。',alt:'三台相同大小的玩具机甲背对镜头驶入三路蓝色道路，青色补给门与远方金色王座要塞相对。'},
].map((page,index)=>({...page,art:STORY_ART[index]}));
export const STORY_CHAPTERS=[
 {title:'第一盏归航灯',permission:'工厂航标',objective:'解除铸炉监工的封锁，点亮工厂航标',district:'灯具工厂',background:'铸炉监工原本负责给巡游制作灯具。过热警报与归箱指令冲突，它把出口认成了危险区。先追回灯芯，再卸下错误接管的安全锁。',tip:'躲开热区；击破炮台与隔热装置，让监工停止误射。'},
 {title:'别把伙伴带回蜂巢',permission:'航路航标',objective:'解除苍穹蜂后的回收指令，重开运输航路',district:'蜂群运输桥',background:'苍穹蜂后把仍在工作的伙伴当成了待回收货物。蜂卵会孵化，存活的护卫会预警变道扑来；拆掉蜂刺炮巢和链路，让它重新听见伙伴的呼叫。',tip:'预警前击破蜂卵和护卫；扑击锁轨后换道，切断汲能节点。'},
 {title:'城门为谁而开',permission:'城防航标',objective:'解除赤铁堡垒的城门锁，接通城防航标',district:'城防装配线',background:'赤铁堡垒记得“保护居民”，却忘了城外也有居民。带着获救伙伴抵达城门，拆除护盾链路，把正确的归航名单交给它。',tip:'击破护盾节点和移动盾墙，注意未击破单位的变道突袭。'},
 {title:'风暴里的求救声',permission:'能源航标',objective:'帮助风暴先知稳定供能，点亮能源航标',district:'极性供能塔',background:'风暴先知发现了错误指令，却只能用极性变化夹带求救信号。拆掉放电线圈和折射护罩，为米可争取一次清晰的通信窗口。',tip:'击破导电节点，辨认分段预警；不要让能量球在目标轨道冲到身前。'},
 {title:'让整座城回家',permission:'中枢航标',objective:'解除星核帝皇的最终封锁，重启归航巡游',district:'王座运载基地',background:'最后的归箱指令藏在横跨三路的王座要塞里。星核帝皇一直在等待“五区安全”的完整回执。击破裁决炮台、星核符印与王座推进器，把伙伴的归航信号送入中枢。',tip:'三路均能攻击大型机体；拆除符印，沿预警空隙闪避，保留核心爆发处理围攻。'},
];
export type StoryProgress = { version:1; page:number; dismissed:boolean; completed:boolean };
export const STORY_STORAGE_KEY='toybot-breakout:story:v1';
export function normalizeStoryProgress(value:unknown):StoryProgress {
  const p=value&&typeof value==='object'?value as Partial<StoryProgress>:{};
  if(p.version!==1)return {version:1,page:0,dismissed:false,completed:false};
  const page=typeof p.page==='number'&&Number.isFinite(p.page)?Math.max(0,Math.min(STORY_PAGES.length-1,Math.floor(p.page))):0;
  return {version:1,page,dismissed:p.dismissed===true||p.completed===true,completed:p.completed===true};
}
export const readStoryProgress=():StoryProgress=>{try{return normalizeStoryProgress(JSON.parse(window.localStorage.getItem(STORY_STORAGE_KEY)||'null'));}catch{return normalizeStoryProgress(null);}};
export const saveStoryProgress=(progress:StoryProgress)=>{try{window.localStorage.setItem(STORY_STORAGE_KEY,JSON.stringify(normalizeStoryProgress(progress)));}catch{/* Reading the comic never blocks the game if storage is unavailable. */}};
export const finishStory=(progress:StoryProgress,completed:boolean):StoryProgress=>normalizeStoryProgress({...progress,dismissed:true,completed:progress.completed||completed});
