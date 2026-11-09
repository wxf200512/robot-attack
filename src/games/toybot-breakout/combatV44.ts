import type { GameState } from './simulation';
import { pressureV41 } from './flowV41';
export const attackSlotsV44=(s:GameState)=>pressureV41(s)==='build'||s.flow.introTicks>0||s.ops.protocol==='standard'&&(s.progress<18||s.bots===1&&s.playerHp/s.playerMaxHp<=.3)?1:2;
export const partEffectV44=(kind:string)=>({cannon:'炮台离线 · 削减炮击',shield:'护盾解除 · 本体可破',engine:'推进失效 · 停止换轨'}[kind]??'部件解除');
export const buildV44=(s:GameState)=>s.modules.arc>=2?{name:'电弧清潮',detail:'电弧跳伤45%，同轨搜寻范围7'}:s.modules.burn>=2?{name:'熔焰猎首',detail:'附着燃烧延长至3秒，重复命中刷新'}:s.modules.recycle>=2?{name:'核心循环',detail:'每5次击破补充1次强化齐射'}:{name:({pulse:'聚焦穿透',heavy:'重炮破阵',blade:'疾刃反击'})[s.mechClass],detail:({pulse:'同轨连续命中，准备穿透齐射',heavy:'溅射同轨敌群，重击打断蓄力',blade:'三次命中接终结斩，规避后追击'})[s.mechClass]};
export type InputReceiptV44={lane:number;queued:boolean;ticks:number};

export function upgradeDeltaV44(before:GameState,after:GameState){
 const changes:string[]=[];
 for(const [key,label]of [['bots','机甲'],['weaponLevel','火力'],['shieldCharges','护盾'],['armorPoints','装甲'],['playerHp','生命']] as const)if(before[key]!==after[key])changes.push(label+' '+before[key]+'→'+after[key]);
 for(const key of ['arc','burn','recycle'] as const)if(before.modules[key]!==after.modules[key])changes.push(({arc:'电弧',burn:'燃烧',recycle:'回能'})[key]+' Lv.'+after.modules[key]+(after.modules[key]===2?' · 流派成型':''));
 if(!changes.length&&before.score!==after.score)changes.push('积分 '+before.score+'→'+after.score);
 return changes.slice(0,2).join(' · ');
}
