export type MechClass = 'pulse' | 'heavy' | 'blade';
export const BLADE_REACH={normal:10.5,empowered:12.5} as const;
export const MECH_CLASSES = [
  { id: 'pulse' as const, name: '脉冲先锋', role: '基础型', interval: 4, power: 1, range: Infinity, detail: '高速连射 · 单发伤害低', weapon: '脉冲光炮' },
  { id: 'heavy' as const, name: '重锤泰坦', role: '力量型', interval: 10, power: 3, range: Infinity, detail: '慢速重炮 · 单发伤害高', weapon: '泰坦重炮' },
  { id: 'blade' as const, name: '疾刃游侠', role: '近战型', interval: 7, power: 2.2, range: BLADE_REACH.normal, detail: '近身挥刀 · 需进入斩击范围', weapon: '能量战刃' },
];
export const normalizeMechClass = (value: unknown): MechClass => value === 'heavy' || value === 'blade' ? value : 'pulse';
export const mechSpec = (value: unknown) => MECH_CLASSES.find(m => m.id === normalizeMechClass(value))!;
export const CORE_SKILLS = {
  pulse: { name:'贯流光束', detail:'三轨贯流 · 穿透并净化飞行弹幕', damage:1.6, bossDamage:1.25, pierce:2, splash:0, cleave:1, range:Infinity, color:'#73eaff' },
  heavy: { name:'震荡榴炮', detail:'三轨轰炸 · 破甲压制，部件伤害翻倍', damage:2, bossDamage:1.2, pierce:0, splash:8, cleave:1, range:Infinity, color:'#ffc16a' },
  blade: { name:'弧光剑阵', detail:'三轨剑阵 · 起手1秒格挡并反击', damage:1.6, bossDamage:1.15, pierce:0, splash:0, cleave:3, range:14, color:'#c4a2ff' },
} as const;
export const coreSkill = (value:unknown) => CORE_SKILLS[normalizeMechClass(value)];
