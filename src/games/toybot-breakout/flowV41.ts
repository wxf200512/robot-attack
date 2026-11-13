import type { GameState, GateOption } from './simulation';
import type { HazardSpec } from './level';
export const LESSONS_V41:Record<string,{name:string;tip:string}>={
 'drone-burst':{name:'巡逻机连射',tip:'预警会锁定轨道，换到空白轨道；也可提前击破发射者。'},
 charge:{name:'敌机突袭',tip:'突袭锁定后再侧移；预警结束前击破敌人可阻止突袭。'},
 'sniper-shot':{name:'狙击锁定',tip:'离开瞄准标记；已发射的炮弹不会因狙击手倒下而消失。'},
 bombard:{name:'双列轰炸',tip:'保留空白轨道；先击破轰炸机可引爆同轨附近敌人。'},
 shockwave:{name:'电磁冲击',tip:'离开冲击轨道，避免在预警中停留。'},
 pounce:{name:'召唤物扑击',tip:'优先打破召唤物，否则等锁定后再换轨。'},
 'heat-mine':{name:'熔焰地雷',tip:'避开残留地雷；力量爆发或重击能压制尚在蓄力的投手。'},
 'hunter-fan':{name:'猎蜂扇射',tip:'看两条锁定轨道，移向没有标记的一列。'},
 'siege-laser':{name:'重轨贯射',tip:'蓄力光束不能靠清弹解除；提前换轨，或打断炮台。'},
 'storm-orb':{name:'导电球场',tip:'避开落点及残留电场，不要刚躲开就返回。'},
 'royal-salvo':{name:'禁卫交错炮',tip:'预警按顺序发射，留在安全轨道，不要追着炮口移动。'},
};
export const LESSON_KEYS_V41=Object.keys(LESSONS_V41);
export type ContributionV41='direct'|'burst'|'arc'|'burn'|'chain'|'counter';
export const CONTRIBUTIONS_V41:Record<ContributionV41,string>={direct:'武器直击',burst:'核心爆发',arc:'电弧跳击',burn:'持续燃烧',chain:'连锁爆破',counter:'格挡反击'};
export type UpgradeRecordV41={time:number;source:string;title:string};
export type DamageAdviceV41={label:string;tip:string};
export type FlowV41={lessons:string[];introSources:string[];introTicks:number;lastLesson:string|null;preparedGate:number;moveGuard:boolean;defenseCooldown:number;defenseSaves:number;guardTicks:number;relievedStages:number[];log:UpgradeRecordV41[];contribution:Record<ContributionV41,number>;lastHit:(DamageAdviceV41&{loss:number;time:number})|null};
export const newFlowV41=(lessons:string[]=[]):FlowV41=>({lessons:[...lessons],introSources:[],introTicks:0,lastLesson:null,preparedGate:-1,moveGuard:false,defenseCooldown:0,defenseSaves:0,guardTicks:0,relievedStages:[],log:[],contribution:{direct:0,burst:0,arc:0,burn:0,chain:0,counter:0},lastHit:null});
export const copyFlowV41=(f:FlowV41):FlowV41=>({...f,lessons:[...f.lessons],introSources:[...f.introSources],relievedStages:[...f.relievedStages],log:[...f.log],contribution:{...f.contribution},lastHit:f.lastHit&&{...f.lastHit}});
export const pressureV41=(s:GameState)=>s.breatherTicks>0||s.progress>=86?'recover':s.progress<18?'scout':s.progress<28||s.progress>=43&&s.progress<50||s.progress>=62&&s.progress<72?'build':'surge';
export const PRESSURE_NAMES_V41={recover:'回收喘息',scout:'外围侦察',build:'分批接近',surge:'集中清场'};
// Rear ranks enter later, but every rank uses this same lead for rendering and targeting.
export const enemyLeadV41=(h:HazardSpec)=>h.reveal!==undefined?Math.max(4,Math.min(14,h.reveal)):h.horde&&!h.eliteRole?Math.max(10,14-Math.floor((h.slot??0)/6)*2):14;
export const enemyVisibleV41=(s:GameState,h:HazardSpec)=>s.progress>=h.progress-enemyLeadV41(h)&&s.progress<h.progress;
export function protectComboV41(s:GameState,kind:'move'|'defense'){
 if(s.combo<=0||s.comboTicks<=0)return false;
 if(kind==='move'){if(!s.flow.moveGuard)return false;s.flow.moveGuard=false;s.comboTicks=Math.max(s.comboTicks,12);}
 else{if(s.flow.defenseCooldown>0)return false;s.flow.defenseCooldown=12;s.comboTicks=Math.max(s.comboTicks,35);s.flow.defenseSaves++;}
 s.flow.guardTicks=8;return true;
}
export function recordUpgradeV41(s:GameState,source:string,title:string){s.flow.log=[...s.flow.log,{time:s.tactics.elapsed,source,title}].slice(-28);}
export function recordContributionV41(s:GameState,damage:number,source:ContributionV41){if(damage>0)s.flow.contribution[source]=Number((s.flow.contribution[source]+damage).toFixed(2));}
export function damageAdviceV41(kind:string,level=0):DamageAdviceV41{
 if(LESSONS_V41[kind])return {label:LESSONS_V41[kind].name,tip:LESSONS_V41[kind].tip};
 if(kind==='guard')return {label:'护卫碰撞',tip:'先击破护卫解除同轨减伤，再清理后排；靠近时先留一条退路。'};
 if(kind==='collision')return {label:'道路碰撞',tip:'敌人到达机体前未击破时，先换到空白轨道；不要为了保持连击硬吃碰撞。'};
 if(kind==='boss')return [
  {label:'铸炉监工攻击',tip:'避开熔岩残留，利用喷口收招窗口；先拆隔热发生器。'},
  {label:'苍穹蜂后攻击',tip:'优先击破蜂卵和链路；扑击锁定后再换轨。'},
  {label:'赤铁堡垒攻击',tip:'先拆城防重盾；重轨蓄力时提前离开标记轨道。'},
  {label:'风暴先知攻击',tip:'避开残留电场，等待极性预警固定后换轨反击。'},
  {label:'星核帝皇攻击',tip:'先清符印与召唤物，沿裁决预警的空白轨道移动。'},
 ][Math.max(0,Math.min(4,level))];
 return {label:'敌方攻击',tip:'观察锁轨预警再侧移；核心爆发可用于清弹、压制或格挡。'};
}
export function usefulGatesV41(s:GameState,options:GateOption[]):GateOption[]{
 const useless=(o:GateOption)=>((o.effect==='weaponUp'||o.effect==='riskyWeapon')&&s.weaponLevel>=4)||(o.effect==='fieldRepair'&&s.playerHp>=s.playerMaxHp)||(o.effect==='repair'&&s.playerHp>=s.playerMaxHp&&s.bots>=11)||(o.effect==='coreUp'&&s.bots>=11)||(o.effect==='shieldUp'&&s.shieldCharges>=3)||((o.effect==='arc'||o.effect==='burn'||o.effect==='recycle')&&s.modules[o.effect]>=3);
 const emergency=(o:GateOption)=>options.length===1&&s.playerHp<s.playerMaxHp*.35&&['scoreUp','charge','overload'].includes(o.effect);
 // Reserve still-useful alternatives before replacing a capped reward.
 const used=new Set(options.filter(o=>o.polarity==='reward'&&!useless(o)&&!emergency(o)).map(o=>o.effect));
 const choose=(o:GateOption,effect:GateOption['effect'],title:string,icon:string,amount=1):GateOption=>({...o,id:'adaptive-'+o.id+'-'+effect,effect,title,icon,amount,detail:title});
 const fallback=(o:GateOption):GateOption=>{
  if(s.playerHp<s.playerMaxHp*.65&&!used.has('fieldRepair'))return choose(o,'fieldRepair','维修+30','✚');
  if(s.weaponLevel<4&&!used.has('weaponUp'))return choose(o,'weaponUp','火力+1','⚡');
  if(s.shieldCharges<3&&!used.has('shieldUp'))return choose(o,'shieldUp','护盾+1','◈');
  if(s.chargedVolleys<3&&!used.has('charge'))return choose(o,'charge','强化齐射','✹');
  return choose(o,'scoreUp','回收+60','★',60);
 };
 return options.map(o=>{
  if(o.polarity!=='reward')return o;
  const next=useless(o)||emergency(o)?fallback(o):o;used.add(next.effect);return next;
 });
}
export const strongestContributionV41=(s:GameState,extraOnly=false)=>{const entries=(Object.entries(s.flow.contribution) as [ContributionV41,number][]).filter(([key,v])=>v>0&&(!extraOnly||key!=='direct')).sort((a,b)=>b[1]-a[1]);return entries[0]?{name:CONTRIBUTIONS_V41[entries[0][0]],damage:Math.round(entries[0][1])}:null;};
