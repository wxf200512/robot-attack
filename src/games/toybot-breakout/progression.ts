import { mechSpec, normalizeMechClass, type MechClass } from './mechs';
export type UpgradeId = 'weapon' | 'armor' | 'core';
export type Garage = {
  challengeClears:string[];version: 2; completedLevels: boolean[]; tutorialCompleted: boolean; mechClass: MechClass; parts: number; runs: number; wins: number; bestScore: number;
  levels: Record<UpgradeId, number>;
  coreLevel: number; unlockedLevel: number;
  unlocked: Record<UpgradeId, boolean>; equipped: Record<UpgradeId, boolean>;
};
const STORAGE_KEY = 'toybot-breakout:garage:v1';
export const MODULE_MAX_LEVEL = 5;
export const UPGRADES: { id: UpgradeId; title: string; effect: string; costs: number[] }[] = [
  { id: 'weapon', title: '武器模块', effect: '强化武器与伤害', costs: [5,8,12,18,26] },
  { id: 'armor', title: '装甲模块', effect: '增加生命和初始装甲', costs: [4,7,10,15,22] },
  { id: 'core', title: '动力核心', effect: '提升伤害与攻击频率', costs: [6,9,13,19,28] },
];
const integer = (value: unknown, max = Number.MAX_SAFE_INTEGER) => {
  const n = Number(value); return Number.isFinite(n) ? Math.min(max, Math.max(0, Math.floor(n))) : 0;
};
export const moduleLevel = (garage: Partial<Garage>, id: UpgradeId): number => {
  const saved = garage.levels?.[id];
  if (saved !== undefined) return integer(saved, MODULE_MAX_LEVEL);
  return id === 'core' ? Math.min(2, integer(garage.coreLevel ?? Number(garage.unlocked?.core), 2)) : Number(garage.unlocked?.[id] === true);
};
export const normalizeGarage = (value: unknown): Garage => {
  const p = value && typeof value === 'object' ? value as Partial<Garage> : {};
  const levels = { weapon: moduleLevel(p,'weapon'), armor: moduleLevel(p,'armor'), core: moduleLevel(p,'core') };
  const completedLevels: boolean[] = [];
  const legacyClears = Math.min(integer(p.unlockedLevel,4),integer(p.wins,4));
  let contiguous = true;
  for (let i=0;i<5;i++) { contiguous = contiguous && (Array.isArray(p.completedLevels) ? p.completedLevels[i] === true : i < legacyClears); completedLevels.push(contiguous); }
  const unlockedLevel = Math.min(4,completedLevels.filter(Boolean).length);
  const unlocked = { weapon: levels.weapon > 0, armor: levels.armor > 0, core: levels.core > 0 };
  return { challengeClears:Array.isArray(p.challengeClears)?[...new Set(p.challengeClears.filter(x=>typeof x==='string'&&/^[0-4]:(elite|scarcity|overdrive)$/.test(x)&&completedLevels[Number(x[0])]))]:[],version: 2, completedLevels, tutorialCompleted: typeof p.tutorialCompleted === 'boolean' ? p.tutorialCompleted : integer(p.wins) > 0, mechClass: normalizeMechClass(p.mechClass), parts: integer(p.parts), runs: integer(p.runs), wins: integer(p.wins), bestScore: integer(p.bestScore), levels, coreLevel: levels.core,
    unlockedLevel, unlocked,
    equipped: { weapon: unlocked.weapon && p.equipped?.weapon !== false, armor: unlocked.armor && p.equipped?.armor !== false, core: unlocked.core && p.equipped?.core !== false } };
};
export const readGarage = (): Garage => {
  try { const saved = typeof window === 'undefined' ? null : window.localStorage.getItem(STORAGE_KEY); return normalizeGarage(saved ? JSON.parse(saved) : null); }
  catch { return normalizeGarage(null); }
};
export const saveGarage = (garage: Garage): void => {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeGarage(garage))); } catch { /* The current session remains playable if browser storage is unavailable. */ }
};
export const rewardParts = (score: number, won: boolean): number => Math.min(5, Math.max(1, Math.floor(score / 80))) + (won ? 3 : 0);
export const equippedModuleLevel = (garage: Partial<Garage>, id: UpgradeId) => garage.equipped?.[id] ? moduleLevel(garage,id) : 0;
export const garageInterval = (kind: MechClass, core: number) => ({ pulse: [4,4,3,3,3,2], heavy: [10,9,9,8,8,7], blade: [7,7,6,6,5,5] })[kind][integer(core,5)];
export const garageStats = (garage: Partial<Garage>) => {
  const kind = normalizeMechClass(garage.mechClass), spec = mechSpec(kind);
  const weapon = equippedModuleLevel(garage,'weapon'), armor = equippedModuleLevel(garage,'armor'), core = equippedModuleLevel(garage,'core');
  const damageScale = (1 + .12 * Math.max(0,weapon - 1)) * (1 + .04 * core);
  return { weapon, armor, core, damageScale, damage: Math.round((1 + Number(weapon > 0)) * spec.power) * damageScale,
    interval: garageInterval(kind,core), maxHp: 100 + armor * 10, armorPoints: armor * 2, startingBots: 1 };
};
export const upgradeCost = (garage: Partial<Garage>, id: UpgradeId): number => UPGRADES.find(u=>u.id===id)?.costs[moduleLevel(garage,id)] ?? 0;
export const previewUpgrade = (garage: Garage, id: UpgradeId): Garage => {
  const base = normalizeGarage(garage), current = moduleLevel(base,id);
  if (current >= MODULE_MAX_LEVEL) return base;
  return normalizeGarage({ ...base, levels: { ...base.levels, [id]: current + 1 }, equipped: { ...base.equipped, [id]: true } });
};
export const purchaseUpgrade = (garage: Garage, id: UpgradeId): Garage => {
  if (!UPGRADES.some(u=>u.id===id) || moduleLevel(garage,id) >= MODULE_MAX_LEVEL) return garage;
  const cost = upgradeCost(garage,id);
  if (!Number.isFinite(garage.parts) || garage.parts < cost) return garage;
  return { ...previewUpgrade(garage,id), parts: Math.floor(garage.parts) - cost };
};
export const toggleUpgrade = (garage: Garage, id: UpgradeId): Garage => {
  if (moduleLevel(garage,id) <= 0) return garage;
  return normalizeGarage({ ...garage, equipped: { ...garage.equipped, [id]: !garage.equipped[id] } });
};
export const equipAllUpgrades = (garage: Garage): Garage => normalizeGarage({ ...garage, equipped: { weapon: moduleLevel(garage,'weapon') > 0, armor: moduleLevel(garage,'armor') > 0, core: moduleLevel(garage,'core') > 0 } });

export const canEnterLevel = (garage: Partial<Garage>, index: number): boolean => Number.isInteger(index) && index >= 0 && index < 5 && index <= normalizeGarage(garage).unlockedLevel;
export const recordLevelCompletion = (garage: Garage, result: { status: string; won: boolean; bossDefeated: boolean; progress: number; levelIndex: number; protocol?:string }): Garage => {
  const base = normalizeGarage(garage);
  if (result.status !== 'result' || !result.won || !result.bossDefeated || result.progress !== 100 || !canEnterLevel(base,result.levelIndex)) return base;
  const completedLevels = [...base.completedLevels]; completedLevels[result.levelIndex] = true;
  const key=result.levelIndex+':'+result.protocol;
  const challengeClears=['elite','scarcity','overdrive'].includes(result.protocol??'')?[...base.challengeClears,key]:base.challengeClears;
  return normalizeGarage({ ...base, completedLevels,challengeClears });
};
