import { STORY_ART } from './art';

export const STORY_PAGES = [
  { title:'云海之上的星穹城', caption:'工厂制造机体，航道运送零件，能源网络托起整座城市。每一台小机器人，都有自己的位置。', speaker:'米可 · 城市档案', line:'那时，城市的灯光总会在黎明前亮起。', alt:'云海上的玩具都市与连接五区的能源桥，能源塔突然出现紫色风暴。' },
  { title:'静默协议启动', caption:'一场能源风暴打断夜间检修。失控的中枢将自由机体标记为故障源，命令五位守护者封锁城市。', speaker:'中央广播', line:'未经登记的机体，停止运行。', alt:'中央管理机的投影笼罩城市，巡逻无人机和能量屏障封锁居民的道路。' },
  { title:'一枚火花，重新回应', caption:'废弃机库里，维修终端米可唤醒了自主核心火花。它没有通行许可，却仍能选择自己的道路。', speaker:'米可 · 维修终端', line:'收到你的信号了，队长。大家还在等着回家。', alt:'暗处的奶白色机甲重新亮起青色核心，在琥珀色终端的陪伴下抬起头。' },
  { title:'向着黎明出发', caption:'选择机型，单机出发。沿途接通补给、集结伙伴，逐区恢复权限，抵达中央基地，关闭静默协议。', speaker:'火花 · SPK-01', line:'给我一条路。米可，我们出发。', alt:'机库终端展示五区路线，一台背部核心发光的机甲踏上通往金色中央基地的道路。' },
].map((page,index)=>({...page,art:STORY_ART[index]}));

export const STORY_CHAPTERS = [
  { title:'重燃火花', permission:'生产权限', objective:'击败铸炉监工，打开工厂出口', district:'生产与补给', background:'铸炉监工把工厂出口改成高温隔离区。恢复补给生产，才有机会接通高空航路。', tip:'避开熔喷与持续热区，穿过补给门集结伙伴。' },
  { title:'穿越蜂网', permission:'航路权限', objective:'击败苍穹蜂后，恢复空中航路', district:'空中货运与维护', background:'苍穹蜂后封锁运输桥，不断孵化新的维护蜂群。打通航路，小队才能进入城市内部。', tip:'击破蜂卵阻止孵化，优先切断汲能蜂的回血支援。' },
  { title:'打开城门', permission:'城防权限', objective:'击败赤铁堡垒，解除城防封锁', district:'城市防护与通行', background:'赤铁堡垒仍在保护城市，却已无法识别需要通行的居民。解除接管链路，才能打开能源区入口。', tip:'先拆护盾塔再攻击核心，判断移动盾墙留下的空隙。' },
  { title:'平息风暴', permission:'能源权限', objective:'击败风暴先知，稳定能源网络', district:'风暴预测与供能', background:'风暴先知不断切换极性，电场在轨道之间流动。稳定供能后，中央基地的重启通道才会开放。', tip:'击破导电核心关闭电场，按每段预警完成侧移。' },
  { title:'黎明重启', permission:'中央权限', objective:'击败星核帝皇，重启黎明中枢', district:'中央管理与居民权限', background:'星核帝皇仍在执行静默协议。恢复四区权限的火花，将抵达这里，解除最后的封锁。', tip:'处理王权符印，跟随三重裁决留下的安全列。' },
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
