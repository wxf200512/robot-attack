import type { GameState, RunModule } from './simulation';
import { getLevel, hazardLaneAt } from './level';
export type Protocol = 'standard' | 'elite' | 'scarcity' | 'overdrive';
export const PROTOCOLS: Record<Protocol,{name:string;detail:string}> = {
 standard:{name:'标准作战',detail:'原始难度，推进城市主线'},
 elite:{name:'精英强化',detail:'道路敌人耐久提高40%，胜利额外零件+3'},
 scarcity:{name:'补给紧缩',detail:'维修恢复减半，胜利额外零件+3'},
 overdrive:{name:'首领超载',detail:'首领耐久及伤害提高20%，恢复窗口缩短，胜利额外零件+3'},
};
export type Fusion = 'stormfire' | 'furnace' | 'ion';
export const FUSIONS: Record<Fusion,{name:string;pair:RunModule[];detail:string;cell:number}> = {
 stormfire:{name:'雷焰反应',pair:['arc','burn'],detail:'电弧多跳1目标，燃烧伤害强化',cell:0},
 furnace:{name:'熔炉循环',pair:['burn','recycle'],detail:'每击破6名敌人补充一次强化齐射',cell:1},
 ion:{name:'离子级联',pair:['arc','recycle'],detail:'额外穿透1目标，完美闪避回能+10',cell:2},
};
export const eligibleFusion = (modules:Record<RunModule,number>) => (Object.keys(FUSIONS) as Fusion[]).find(key=>FUSIONS[key].pair.every(m=>modules[m]>=1))??null;
export type FieldObjective = {lane:number;mark:number;hp:number;maxHp:number;status:'pending'|'done'|'missed'};
export type BossPart = {kind:'cannon'|'shield'|'engine';name:string;lane:number;hp:number;maxHp:number;brokenAt?:number};
export type Operations = {
 roadDodgeTicks:number;roadFromLane:number;protocol:Protocol;fusion:Fusion|null;perfectCooldown:number;perfectTicks:number;perfects:number;counterShots:number;
 mission:FieldObjective;event:FieldObjective;eventWarning:number;eventFired:boolean;eventLane:number;
 prep:'pending'|'repair'|'retune'|'amplify'|'missed';bonusParts:number;parts:BossPart[];breakTicks:number;broken:number;
};
export const MISSION_NAMES=['切断封锁电源','拦截接管运输机','摧毁城防中继','关闭风暴干扰塔','回收中枢密钥'];
export const MISSION_REWARDS=['首领炮台耐久减半','接回1台友军机甲','首领护盾部件失效','清除后续干扰，首领伤害降低15%','核心能量+25'];
export const PART_NAMES=[['熔炉喷口','隔热发生器','输送履带'],['蜂刺炮巢','蜂群链路','飞翼引擎'],['堡垒主炮','城防重盾','重型履带'],['导雷线圈','折射护罩','极性引擎'],['裁决炮台','星核符印','王座推进器']];
const safeLane=(levelIndex:number,layout:number,mark:number)=>{
 const l=getLevel(levelIndex),blocked=new Set(l.hazards.flatMap((h,i)=>Math.abs(h.progress-mark)<5?[hazardLaneAt(layout,i,mark,levelIndex)]:[]));
 return [0,1,2].find(lane=>!blocked.has(lane))??(levelIndex+layout)%3;
};
export function createOperations(levelIndex:number,layout:number):Operations{
 const missionLane=safeLane(levelIndex,layout,49),eventLane=safeLane(levelIndex,layout,66);
 const object=(mark:number,lane:number,hp:number):FieldObjective=>({lane,mark,hp,maxHp:hp,status:'pending'});
 return {roadDodgeTicks:0,roadFromLane:1,protocol:'standard',fusion:null,perfectCooldown:0,perfectTicks:0,perfects:0,counterShots:0,mission:object(49,missionLane,8+levelIndex*2),event:object(66,eventLane,10+levelIndex*2),eventWarning:0,eventFired:false,eventLane,prep:'pending',bonusParts:0,parts:[],breakTicks:0,broken:0};
}
export const fieldY=(s:GameState,object:FieldObjective)=>Math.max(30,Math.min(64,59-(object.mark-s.progress)*1.8));
export const fieldVisible=(s:GameState,object:FieldObjective)=>s.status==='running'&&object.status==='pending'&&s.progress>=object.mark-12&&s.progress<object.mark;
export const prepMark=(s:GameState)=>getLevel(s.levelIndex).encounters[0].progress-6;
export const copyOperations=(ops:Operations):Operations=>({...ops,parts:ops.parts.map(p=>({...p})),mission:{...ops.mission},event:{...ops.event}});
export function makeBossParts(s:GameState):BossPart[]{return (['cannon','shield','engine'] as const).map((kind,lane)=>{
 let hp=Math.max(12,Math.round(s.battleMaxHp*.025));
 if(s.ops.mission.status==='done'&&((s.levelIndex===0&&kind==='cannon')||(s.levelIndex===2&&kind==='shield')))hp=s.levelIndex===2?0:Math.round(hp*.5);
 return {kind,name:PART_NAMES[s.levelIndex][lane],lane,hp,maxHp:Math.max(12,Math.round(s.battleMaxHp*.025))};
});}
export const partBroken=(s:GameState,kind:BossPart['kind'])=>s.ops.parts.some(p=>p.kind===kind&&p.hp===0);
export const ART_V19='/games/toybot-breakout/optimized/operations-atlas-v19.png';
export const FUSION_ART_V19='/games/toybot-breakout/optimized/fusion-atlas-v19.png';
