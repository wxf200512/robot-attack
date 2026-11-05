export type EnemyKind = 'drone' | 'swarm' | 'sniper' | 'bomber' | 'medic';
export const ENEMY_NAMES: Record<EnemyKind, string> = { drone: '巡逻机', swarm: '突击蜂', sniper: '狙击哨', bomber: '轰炸机', medic: '维修机' };
export type HazardSpec = { progress: number; hp: number; lane: number; armor?: number; moving?: boolean; kind?: EnemyKind; wave?: number; slot?: number; horde?: boolean };
export type LevelSpec = {
  title: string; focus: string; gateMarks: number[]; hazards: HazardSpec[];
  encounters: { progress: number; reward: number; label: string }[];
  bossTargetSeconds: number; bossDamage: number; shield: boolean; doubleStrike: boolean;
  zones: { from: number; to: number }[];
  layouts: { name: string; offset: number }[];
};
const layouts = [{ name: '中央突破', offset: 0 }, { name: '右路迂回', offset: 1 }, { name: '双翼夹击', offset: 2 }];
export const LEVELS: LevelSpec[] = [
  { title: '工厂出口', focus: '换道 · 成长 · 基础射击', gateMarks: [7, 15, 30, 43, 63, 80],
    hazards: [{ progress: 22, hp: 8, lane: 1 }, { progress: 37, hp: 12, lane: 0 }, { progress: 55, hp: 15, lane: 2 }, { progress: 72, hp: 18, lane: 1 }],
    encounters: [{ progress: 93, reward: 90, label: '铸炉监工' }], bossTargetSeconds: 85, bossDamage: 1, shield: false, doubleStrike: false, zones: [], layouts },
  { title: '无人机走廊', focus: '移动目标 · 穿透射击', gateMarks: [7, 15, 33, 46, 63, 80],
    hazards: [{ progress: 24, hp: 14, lane: 0, moving: true }, { progress: 28, hp: 16, lane: 1 }, { progress: 40, hp: 20, lane: 2, moving: true }, { progress: 54, hp: 22, lane: 1 }, { progress: 58, hp: 24, lane: 1 }, { progress: 72, hp: 26, lane: 0, moving: true }],
    encounters: [{ progress: 93, reward: 120, label: '苍穹蜂后' }], bossTargetSeconds: 95, bossDamage: 1, shield: false, doubleStrike: false, zones: [], layouts },
  { title: '装甲封锁线', focus: '装甲目标 · 持续伤害', gateMarks: [7, 15, 33, 46, 63, 80, 87],
    hazards: [{ progress: 24, hp: 22, lane: 0, armor: 1 }, { progress: 28, hp: 24, lane: 0, armor: 1 }, { progress: 40, hp: 26, lane: 2, armor: 2 }, { progress: 54, hp: 30, lane: 1, armor: 2 }, { progress: 58, hp: 32, lane: 1, armor: 2 }, { progress: 72, hp: 36, lane: 2, armor: 2 }],
    encounters: [{ progress: 97, reward: 150, label: '赤铁堡垒' }], bossTargetSeconds: 105, bossDamage: 2, shield: true, doubleStrike: false, zones: [], layouts },
  { title: '能量风暴区', focus: '临时干扰 · 过载反击', gateMarks: [7, 15, 33, 46, 63, 80, 87],
    hazards: [{ progress: 24, hp: 24, lane: 2, moving: true }, { progress: 28, hp: 26, lane: 0 }, { progress: 40, hp: 30, lane: 1 }, { progress: 54, hp: 32, lane: 2, moving: true }, { progress: 58, hp: 34, lane: 0 }, { progress: 72, hp: 38, lane: 1, armor: 1 }],
    encounters: [{ progress: 97, reward: 180, label: '风暴先知' }], bossTargetSeconds: 115, bossDamage: 2, shield: true, doubleStrike: true, zones: [{ from: 35, to: 43 }, { from: 66, to: 75 }], layouts },
  { title: '重装机甲基地', focus: '组合强化 · 最终决战', gateMarks: [7, 15, 33, 46, 63, 80, 87],
    hazards: [{ progress: 24, hp: 28, lane: 0, armor: 1 }, { progress: 28, hp: 30, lane: 0, armor: 1 }, { progress: 40, hp: 34, lane: 2, moving: true }, { progress: 54, hp: 38, lane: 1, armor: 2 }, { progress: 58, hp: 40, lane: 1, armor: 2 }, { progress: 72, hp: 44, lane: 2, moving: true }],
    encounters: [{ progress: 97, reward: 240, label: '星核帝皇' }], bossTargetSeconds: 125, bossDamage: 3, shield: true, doubleStrike: true, zones: [], layouts },
];
// Fixed encounter recipes, rotated by the existing layout. Small weak targets
// provide clear-through moments; specialists arrive only after their introduction.
LEVELS.forEach((level, sector) => {
  const patrols = [...level.hazards];
  [38, 54, 72].forEach((mark, wave) => {
    const lane = [...patrols].sort((a, b) => Math.abs(a.progress - mark) - Math.abs(b.progress - mark))[0].lane;
    const count = 3 + Math.floor(sector / 2);
    for (let i = 0; i < count; i++) level.hazards.push({ progress: mark + i * 1.1, hp: 2 + sector, lane, kind: 'swarm', wave, slot: i });
    if (sector >= 1 || wave === 2) level.hazards.push({ progress: mark + 1.5, hp: 6 + sector * 2, lane: (lane + 1) % 3, kind: 'sniper', wave });
    if (sector >= 2 && wave !== 0) level.hazards.push({ progress: mark + 3, hp: 8 + sector * 2, lane, kind: 'bomber', wave });
    if (sector >= 3) level.hazards.push({ progress: mark + 4.5, hp: 5 + sector, lane, kind: 'medic', wave });
    // Three columns in each of two lanes, alternating ranks. The third lane
    // remains an escape route; the final supply follows a clear breathing gap.
    const hordeCount=18+sector*3;
    for(let i=0;i<hordeCount;i++)level.hazards.push({progress:mark+2+Math.floor(i/6)*1.5,hp:1+Math.floor(sector/2),lane:(lane+i%2)%3,kind:'swarm',wave,slot:i,horde:true});
  });
});
export const getLevel = (index: number): LevelSpec => LEVELS[Math.max(0, Math.min(LEVELS.length - 1, index))];
export const hazardLaneAt = (layout: number, index: number, progress: number, levelIndex = 0): number => {
  const hazard = getLevel(levelIndex).hazards[index];
  if (!hazard) return 1;
  return (hazard.lane + layout + (hazard.moving && progress >= hazard.progress - 8 ? 1 : 0)) % 3;
};
export const bossLaneAt = (layout: number, _index: number, levelIndex = 0): number => (levelIndex + layout) % 3;
export const stageLabel = (progress: number): string => progress >= 85 ? '最终防线' : progress >= 60 ? '火力突破' : progress >= 30 ? '机甲强化' : '集结出击';
