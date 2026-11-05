export type BossSpecial = 'vents' | 'smelt' | 'eggs' | 'hive-link' | 'pylons' | 'lockdown' | 'orbits' | 'polarity' | 'seals' | 'judgement';
export const BOSS_LOADOUTS = [
  ['vents', 'smelt', 'mortar'],
  ['eggs', 'hive-link', 'swarm'],
  ['pylons', 'lockdown', 'bunker'],
  ['orbits', 'polarity', 'storm'],
  ['seals', 'judgement', 'crossfire'],
] as const;
export const SPECIAL_LABELS: Record<BossSpecial, string> = {
  vents: '地脉熔喷', smelt: '熔池封路', eggs: '蜂巢孵化', 'hive-link': '蜂后汲能',
  pylons: '双塔护阵', lockdown: '移动盾墙', orbits: '导电核心', polarity: '极性轮转', seals: '王权符印', judgement: '三重裁决',
};
export const OBJECTIVE_NAMES = { egg: '孵化卵：击破阻止孵化', tether: '汲能蜂：击破停止首领恢复', pylon: '护盾塔：击破解除首领护盾', wall: '移动盾墙：击破或换道', orb: '导电核心：击破关闭两列电场', seal: '王权符印：击破解除保护并避免爆发', field: '带电轨道：离开高亮区域' };
