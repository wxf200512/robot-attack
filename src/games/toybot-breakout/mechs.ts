export type MechClass = 'pulse' | 'heavy' | 'blade';
export const MECH_CLASSES = [
  { id: 'pulse' as const, name: '脉冲先锋', role: '基础型', interval: 4, power: 1, range: Infinity, detail: '高速连射 · 单发伤害低', weapon: '脉冲光炮' },
  { id: 'heavy' as const, name: '重锤泰坦', role: '力量型', interval: 10, power: 3, range: Infinity, detail: '慢速重炮 · 单发伤害高', weapon: '泰坦重炮' },
  { id: 'blade' as const, name: '疾刃游侠', role: '近战型', interval: 7, power: 2.2, range: 9, detail: '近身挥刀 · 需进入斩击范围', weapon: '能量战刃' },
];
export const normalizeMechClass = (value: unknown): MechClass => value === 'heavy' || value === 'blade' ? value : 'pulse';
export const mechSpec = (value: unknown) => MECH_CLASSES.find(m => m.id === normalizeMechClass(value))!;
