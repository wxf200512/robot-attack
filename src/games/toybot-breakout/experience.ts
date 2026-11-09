import type { GameState } from './simulation';
import { getLevel } from './level';
import { FUSIONS } from './operations';
export type CombatReport = { dealt:number; bossDamage:number; taken:number; blocked:number; collisions:number; hostile:number; focus:number; focusReady:boolean; shots:number; focusLane:number; elites:number; bladeCombo:number; bladeReady:boolean; bladeVolley:number };
export type CombatFeedback = { coreStyle?:'pulse'|'heavy'|'blade'; pulseCore?:boolean; boss?:boolean; id:number;x:number;y:number;ticks:number;kind:'hit'|'armor'|'heavy'|'elite'|'boss'; };
export const newReport=():CombatReport=>({dealt:0,bossDamage:0,taken:0,blocked:0,collisions:0,hostile:0,focus:0,focusReady:false,shots:0,focusLane:-1,elites:0,bladeCombo:0,bladeReady:false,bladeVolley:-1});
export function encounterBeat(progress:number,breather=0){
 if(breather>0)return {name:'回收整备',detail:'清理残余威胁，准备下一段推进',intensity:0};
 if(progress<26)return {name:'试探',detail:'观察敌人，收集装备',intensity:1};
 for(const start of [38,54,72]){
  if(progress>=start-12&&progress<start-6)return {name:'集群接近',detail:'选择清场路线',intensity:2};
  if(progress>=start-6&&progress<start+6)return {name:'密集交战',detail:'清场蓄能，适时爆发',intensity:3};
 }
 return {name:progress>=82?'整备':'补给间隙',detail:progress>=82?'保存生命，准备迎战首领':'收集补给，调整站位',intensity:0};
}
export const CLASS_TACTICS={pulse:{name:'聚焦连射',detail:'同轨累计命中6次，下一轮齐射穿透2个敌人'},heavy:{name:'破甲震荡',detail:'溅射同轨目标，破甲并短暂压制蓄力'},blade:{name:'疾刃连段',detail:'三次命中蓄满终结斩，延伸刀距并斩击同轨3目标'}} as const;
export function runDebrief(s:GameState){
 const modules=Object.entries(s.modules).filter(([,v])=>v>0).map(([k])=>({arc:'电弧',burn:'燃烧',recycle:'回能'}[k]));
 const build=s.ops.fusion?FUSIONS[s.ops.fusion].name:modules.join(' · ')||CLASS_TACTICS[s.mechClass].name;
 const bossSeen=s.battleMaxHp>0,remaining=bossSeen?Math.max(0,Math.ceil(s.battleHp/s.battleMaxHp*100)):null;
 const gap=s.won?'区域已解放':bossSeen?`首领剩余 ${remaining}% 耐久`:`距首领还有 ${Math.max(0,Math.ceil(getLevel(s.levelIndex).encounters[0].progress-s.progress))}% 路程`;
 const cause=s.report.taken===0?'本局未损失核心生命':s.report.collisions>s.report.hostile?'主要损伤：道路碰撞':'主要损伤：敌方技能';
 const tip=s.report.collisions>s.report.hostile?'优先改装装甲；密集怪潮保留一条撤离路线。':bossSeen&&s.ops.broken<2?'先击破首领外置部件，再在收招窗口集中输出。':s.burstSequence===0?'核心充满后主动释放，清场与闪避都能回能。':s.mechClass==='blade'?'进入刀距后输出，预警出现时侧闪并反击。':'升级武器与动力，利用收招窗口追击首领。';
 return {build,gap,cause,tip:!s.won&&s.flow.lastHit?s.flow.lastHit.tip:tip,remaining};
}
