import { newReport, type CombatReport, type CombatFeedback } from './experience';
import { createOperations, copyOperations, fieldVisible, fieldY, makeBossParts, partBroken, eligibleFusion, FUSIONS, PROTOCOLS, prepMark, type Operations, type Protocol, type Fusion } from './operations';
import { coreSkill, mechSpec, normalizeMechClass, type MechClass } from './mechs';
import { BOSS_LOADOUTS, SPECIAL_LABELS, type BossSpecial } from './bossSkills';
import { bossLaneAt, getLevel, hazardLaneAt, LEVELS, type EnemyKind } from './level';
import { garageStats, garageInterval, normalizeGarage, canEnterLevel, recordLevelCompletion, type Garage } from './progression';
export const LANE_CENTERS = [27, 50, 73];
export const STEP_MS = 100;
// Stop empty shots on the distant roadway rather than shooting through sky/buildings.
export const ROAD_HORIZON = [43, 37, 32, 32, 27];
export const freeShotEnd = (levelIndex: number) => ROAD_HORIZON[levelIndex] + 3;
export const RUN_SPEED = .22;
export const BOSS_DEFEAT_TICKS = 18;
export const BOSS_INTRO_TICKS = 10;
export const BOSS_SHIFT_TICKS = 10;
export const BOSS_VICTORY_TICKS = 16;
export const BOSS_WARNING_TICKS = 12;
export const BOSS_RECOVERY_TICKS = 18;
export const BOSS_ENRAGE_TICKS = 900;
export const PLAYER_MAX_HP = 100;
export const DODGE_TICKS = 4;
export const DEFENSE_VFX_TICKS = 8;
export const BOSS_MOVE_TICKS = 5;
export const RUSH_WARNING_TICKS = 16;
export const RUSH_CONTACT_TICK = 10;
export const RUSH_DURATION_TICKS = 21;
export type GameStatus = 'home' | 'running' | 'paused' | 'boss-intro' | 'battle' | 'boss-shift' | 'boss-victory' | 'defeat' | 'result';
type ActiveStatus = Exclude<GameStatus, 'home' | 'paused' | 'result'>;
type BossStep = 'warning' | 'flight' | 'rush' | 'recovery' | 'support' | 'shield';
export type BossAttack = BossSpecial | 'cannon' | 'burst' | 'rush' | 'sweep' | 'mortar' | 'swarm' | 'bunker' | 'storm' | 'crossfire';
export const isActiveStatus = (status: GameStatus): status is ActiveStatus => status !== 'home' && status !== 'paused' && status !== 'result';
export const canMove = (status: GameStatus) => status === 'running' || status === 'battle' || status === 'boss-intro' || status === 'boss-shift';
export const canShoot = (status: GameStatus) => status === 'running' || status === 'battle';
export type RunModule = 'arc' | 'burn' | 'recycle';
export const MODULES: Record<RunModule,{name:string;icon:string;detail:string}> = {arc:{name:'电弧',icon:'ϟ',detail:'命中后跳击同轨附近杂兵'},burn:{name:'燃烧',icon:'♨',detail:'命中附加持续燃烧'},recycle:{name:'回能',icon:'↻',detail:'击破获得额外核心能量'}};
export type GateEffect = 'fuse' | 'arc' | 'burn' | 'recycle' | 'weaponUp' | 'armorUp' | 'coreUp' | 'repair' | 'shieldUp' | 'scoreUp' | 'botsDown' | 'weaponDown' | 'armorDown' | 'coreDown' | 'scoreDown' | 'charge' | 'overload' | 'jam';
export type GateOption = { id: string; polarity: 'reward' | 'penalty'; icon: string; title: string; detail: string; effect: GateEffect; amount: number; lane: number };
export type ShotOrigin = { index: number; x: number; y: number };
type Target = 'hazard' | 'boss' | 'threat' | 'objective' | 'event' | 'part';
export type BossThreat = { id: number; kind: 'shell' | 'barrier' | 'minion' | 'lava' | 'beam' | 'egg' | 'tether' | 'pylon' | 'wall' | 'orb' | 'seal' | 'field'; linkId?: number; lingerTicks?: number; lane: number; ticks: number; duration: number; hp: number; maxHp: number; damage: number; fromLane: number; originY?: number };
export type PendingShot = {focused?:boolean;fusion?:Fusion|null;counter?:boolean; arc?:number; burn?:number; range?:number; splashDone?:boolean; burst?: boolean; attackStyle?: MechClass; id: number; ticks: number; duration: number; target: Target | null; targetIndex: number; damage: number; count: number; origins: ShotOrigin[]; weaponLevel: number; lane: number; y: number; charged: boolean; pierce: number; muzzle: boolean };
export type EnemyAttack = { id: number; source: 'hazard' | 'threat'; sourceId: number; kind: 'drone-burst' | 'shockwave' | 'pounce' | 'sniper-shot' | 'bombard' | 'charge'; lane: number; fromLane: number; fromY: number; fromX?: number; phase: 'warning' | 'flight'; ticks: number; duration: number; damage: number; shotsRemaining: number };
export type KillEffect = { id: number; kind: EnemyKind; lane: number; x: number; y: number; ticks: number; combo: number };
type Burn = { target: Target; index: number; lane: number; ticks: number; damage: number };
export type GameState = {
  report:CombatReport; feedback:CombatFeedback[]; feedbackSequence:number; upgradeFx:{id:number;ticks:number;title:string;positive:boolean}|null;
  ops:Operations;
  modules: Record<RunModule,number>;
  mechClass: MechClass;
  garageDamageScale: number; garageCoreLevel: number; garageArmorLevel: number;
  status: GameStatus; resumeStatus: ActiveStatus | null; levelIndex: number; layoutIndex: number; runId: number;
  progress: number; bots: number; lane: number; laneMoveTicks: number; score: number;
  dodgeTicks: number; dodgeFromLane: number; dodgeDirection: number; dodgeSequence: number; evadeSequence: number; evadeTicks: number; queuedLane: number | null;
  playerHp: number; playerMaxHp: number; invulnerableTicks: number;
  defenseFx: { kind:'shield'|'armor'; exhausted:boolean; ticks:number; id:number } | null;
  gate: number; gateResolved: boolean; gateCollected: boolean; gateChoices: GateOption[][];
  weaponLevel: number; armorLevel: number; coreLevel: number; armorPoints: number; shieldCharges: number;
  charge: number; chargedVolleys: number; overloadTicks: number; jamTicks: number; visitedZones: number[];
  hazard: number; hazardHp: number; hazardMaxHp: number; hazardHps: number[];
  encounter: number; battleTime: number; battleHp: number; battleMaxHp: number; battleLane: number;
  bossAttackLanes: number[]; bossDefeated: boolean;
  bossStage: 1 | 2; bossCycle: number; bossStep: BossStep; bossStepTicks: number; bossPhaseTicks: number;
  bossSalvos: number; bossSalvoDelay: number; bossFiredTick: number;
  bossAttack: BossAttack; bossRushHit: boolean; bossWave: number;
  bossMoveFromLane: number; bossMoveTicks: number; bossRandomSeed: number;
  threats: BossThreat[]; threatSequence: number;
  enemyAttacks: EnemyAttack[]; enemyAttackSources: string[]; enemyAttackSequence: number;
  defeatReason: 'boss-wipe' | 'squad-wipe' | null; defeatTicks: number;
  fireCooldown: number; shotSequence: number; pendingShots: PendingShot[]; burns: Burn[];
  impactSequence: number; impactDamage: number; impactWeaponLevel: number; impactTarget: Target | null; impactLane: number; impactY: number; impactX: number;
  damageSequence: number; damageLoss: number; damageLane: number; toast: string; won: boolean;
  damageKind: 'health' | 'shield' | 'armor' | 'squad'; damageAbsorbed: number;
  kills: number; combo: number; bestCombo: number; comboTicks: number; killSequence: number; killEffects: KillEffect[];
  burstEnergy: number; burstTicks: number; burstSequence: number; comboHeal: number; comboRewardTicks: number;
  coreDetonations: {kind?:'arc'|'energy';id:number;x:number;y:number;ticks:number}[];
  roadTicks: number; medicPulses: number[];
};
export type Action = { type: 'TICK' | 'PAUSE' | 'RESUME' | 'CLEAR_TOAST' | 'ACTIVATE_BURST' } | { type: 'MOVE_LANE'; lane: number }
  | { type: 'START' | 'RESTART' | 'HOME' | 'NEXT_LEVEL'; garage: Garage }
  | {type:'SET_PROTOCOL';protocol:Protocol;garage:Garage}
  | { type: 'SELECT_LEVEL'; levelIndex: number; garage: Garage };
const reward = (id: string, icon: string, title: string, effect: GateEffect, amount = 1): GateOption => ({ id, icon, title, effect, amount, lane: 1, polarity: 'reward', detail: title });
const penalty = (id: string, icon: string, title: string, effect: GateEffect, amount = 1): GateOption => ({ ...reward(id, icon, title, effect, amount), polarity: 'penalty' });
const WEAPON = reward('weapon', '⚡', '火力+1', 'weaponUp');
export const COMBO_WINDOW_TICKS = 35;
export const BURST_MAX_ENERGY = 100;
export const BURST_TICKS = 50;
export const canActivateBurst = (s: GameState) => canShoot(s.status) && s.bots > 0 && s.playerHp > 0 && s.burstEnergy >= BURST_MAX_ENERGY && s.burstTicks === 0;
const gainBurstEnergy = (s: GameState, amount: number) => {
  if(canShoot(s.status) && s.burstTicks === 0)s.burstEnergy = Math.min(BURST_MAX_ENERGY, Number((s.burstEnergy + amount).toFixed(2)));
};
const CORE = reward('core', '✦', '机甲+2', 'coreUp', 2);
const REPAIR = reward('repair', '✚', '维修+2', 'repair', 2);
const MODULE_REWARDS = (Object.keys(MODULES) as RunModule[]).map(key=>reward(key,MODULES[key].icon,MODULES[key].name+'+1',key));
const REWARDS = [...MODULE_REWARDS, WEAPON, CORE, REPAIR, reward('armor', '⬡', '装甲+1', 'armorUp'), reward('shield', '◈', '护盾+1', 'shieldUp'), reward('charge', '✹', '充能', 'charge'), reward('overload', '↟', '过载', 'overload'), reward('score', '★', '积分+60', 'scoreUp', 60)];
const PENALTIES = [penalty('lose', '−1', '机甲−1', 'botsDown'), penalty('jam', '⌁', '干扰', 'jam'), penalty('weapon-down', '⚡↓', '火力−1', 'weaponDown'), penalty('armor-down', '⬡↓', '装甲−1', 'armorDown')];
export const createGateChoices = (levelIndex: number, layoutIndex: number, random = Math.random): GateOption[][] => {
  const level = getLevel(levelIndex);
  let previousPenalty = false;
  return level.gateMarks.map((mark, index) => {
    const finalSupply = index >= level.gateMarks.length - 2;
    const isReward = index < 2 || finalSupply || previousPenalty || random() < .67;
    const pool = index === 0 ? [CORE] : index === 1 ? [WEAPON] : finalSupply
      ? (index === level.gateMarks.length - 1 ? [WEAPON, REPAIR] : [WEAPON])
      : index === 2 ? MODULE_REWARDS : isReward ? REWARDS : PENALTIES;
    previousPenalty = index !== 2 && !isReward;
    const forbidden = level.hazards.flatMap((h, i) => Math.abs(h.progress - mark) <= 6 ? [hazardLaneAt(layoutIndex, i, mark, levelIndex)] : []);
    const lanes = [0, 1, 2].filter(lane => !forbidden.includes(lane));
    const lane = lanes[Math.floor(random() * lanes.length)] ?? 1;
    return [{ ...pool[Math.floor(random() * pool.length)], lane }];
  });
};
export const gateChoicesFor = (s:GameState):GateOption[] => {
 const options=s.gateChoices[s.gate]??[],fusion=eligibleFusion(s.modules);
 return !s.gateResolved&&s.gate>=3&&!s.ops.fusion&&fusion&&options[0]?.polarity==='reward'?[{...options[0],id:'fusion-'+fusion,effect:'fuse',title:FUSIONS[fusion].name,icon:'✧',detail:FUSIONS[fusion].detail}]:options;
};
export const volleyCountFor = (bots: number) => Math.max(0, Math.min(11, bots));
export const hazardMaxHpFor=(s:GameState,index:number)=>Math.ceil((getLevel(s.levelIndex).hazards[index]?.hp??0)*(s.ops.protocol==='elite'?1.4:1));
export const effectiveWeapon = (state: GameState) => Math.max(0, state.weaponLevel - Number(state.jamTicks > 0));
export const formationFor = (bots: number, lane: number): ShotOrigin[] => {
  const count = volleyCountFor(bots), columns = count <= 1 ? 1 : count <= 4 ? 2 : 3;
  const rows = 1 + Math.ceil((count - 1) / columns), spacing = Math.min(6.5, 18 / Math.max(1, rows - 1));
  return Array.from({ length: count }, (_, index) => {
    const row = index === 0 ? 0 : 1 + Math.floor((index - 1) / columns), start = 1 + (row - 1) * columns;
    const size = index === 0 ? 1 : Math.min(columns, count - start), column = index === 0 ? 0 : index - start;
    return { index, x: LANE_CENTERS[lane] + (column - (size - 1) / 2) * (columns === 3 ? 7.5 : 11.2), y: 59 + row * spacing };
  });
};
export const playerLaneFor = (s: GameState) => s.dodgeTicks > DODGE_TICKS / 2 ? s.dodgeFromLane : s.lane;
const sidestep = (s: GameState, targetLane: number): GameState => {
  const direction=Math.sign(targetLane-s.lane),lane=s.lane+direction;
  return {...s,report:{...s.report,focus:0},lane,laneMoveTicks:1,dodgeFromLane:s.lane,dodgeDirection:direction,dodgeTicks:DODGE_TICKS,dodgeSequence:s.dodgeSequence+1,queuedLane:lane===targetLane?null:targetLane};
};
export const playerFormation = (s: GameState): ShotOrigin[] => {
  const progress = 1 - s.dodgeTicks / DODGE_TICKS;
  const eased = progress * progress * (3 - 2 * progress);
  const offset = s.dodgeTicks > 0 ? (LANE_CENTERS[s.dodgeFromLane] - LANE_CENTERS[s.lane]) * (1 - eased) : 0;
  return formationFor(s.bots, s.lane).map(o => ({ ...o, x: o.x + offset }));
};
export const bossGuarded = (s: GameState) => !partBroken(s,'shield')&&s.threats.some(t => t.hp > 0 && (t.kind === 'pylon' || t.kind === 'seal'));
const hitPlayerLane = (s: GameState, lane: number, damage: number) => {
  if (playerLaneFor(s) === lane) applySquadHit(s, damage*(s.ops.protocol==='overdrive'&&isBossArena(s)?1.2:1)*(s.ops.mission.status==='done'&&s.levelIndex===3&&isBossArena(s)?.85:1));
  else if ((s.dodgeTicks > 0 && lane === s.dodgeFromLane)||(s.ops.roadDodgeTicks>0&&lane===s.ops.roadFromLane)) { if(s.evadeTicks===0){gainBurstEnergy(s,8);if(s.ops.perfectCooldown===0&&(s.status==='running'?s.ops.roadDodgeTicks<=1:s.dodgeTicks<=2)){s.ops.perfectTicks=8;s.ops.perfectCooldown=30;s.ops.perfects++;s.ops.counterShots=s.mechClass==='pulse'?3:1;if(s.ops.fusion==='ion')gainBurstEnergy(s,10);}}s.evadeSequence++; s.evadeTicks = 6; }
};
export const isBossArena = (state: GameState) => {
  const status = state.status === 'paused' ? state.resumeStatus : state.status;
  return status === 'boss-intro' || status === 'battle' || status === 'boss-shift' || status === 'boss-victory' || (status === 'defeat' && state.defeatReason === 'boss-wipe')
    || (status === 'result' && (state.bossDefeated || state.defeatReason === 'boss-wipe'));
};
export const bossPhase = (state: GameState): 'shield' | 'weak' | 'warning' | 'attack' => {
  const status = state.status === 'paused' ? state.resumeStatus : state.status;
  if (status === 'boss-intro' || status === 'boss-shift') return 'shield';
  return state.bossStep === 'warning' ? 'warning' : state.bossStep === 'flight' || state.bossStep === 'rush' ? 'attack' : state.bossStep === 'shield' ? 'shield' : 'weak';
};
export const bossEnrage = (s: GameState) => s.battleTime < BOSS_ENRAGE_TICKS ? 0 : Math.min(3, 1 + Math.floor((s.battleTime - BOSS_ENRAGE_TICKS) / 450));
export const isRush = (s: GameState) => s.bossAttack === 'rush' || s.bossAttack === 'sweep';
export const bossRecoveryTicks=(s:GameState)=>Math.round((s.bossCycle===0?BOSS_RECOVERY_TICKS:Math.max(s.bossAttack in SPECIAL_LABELS?24:BOSS_RECOVERY_TICKS,24+s.levelIndex*2))*(s.ops.protocol==='overdrive'?.8:1));
export const bossDamageLanes = (s: GameState) => s.bossMoveTicks > 0 ? [] : s.bossStep === 'rush'
  ? (s.bossStepTicks >= 4 && s.bossStepTicks <= 16 ? s.bossAttackLanes : []) : [s.battleLane];
export const attackRangeFor = (s:GameState) => s.mechClass==='blade'?Math.max(s.burstTicks>0?coreSkill(s.mechClass).range:mechSpec(s.mechClass).range,s.ops.counterShots>0?11:0):mechSpec(s.mechClass).range;
export const attackIntervalFor = (s: GameState) => garageInterval(s.mechClass, s.garageCoreLevel);
// Permanent tuning changes player power, never boss durability at the same run tier.
export const bossHealthFor = (s: GameState) => {
  const dps = Math.max(1, s.bots) * (1 + s.weaponLevel) * (10 / mechSpec(s.mechClass).interval) * mechSpec(s.mechClass).power * (s.weaponLevel >= 4 ? 1.5 : 1);
  const nominal = 22.5 + s.levelIndex * 7.5;
  // The emperor spends more time on objectives and repositioning; reserve part
  // of the encounter budget for those tasks instead of stacking extra HP on top.
  const durability=s.levelIndex===0?1.08:s.levelIndex===4?.82:1;
  return Math.max(160, Math.round(nominal * getLevel(s.levelIndex).bossTargetSeconds * .76 * durability * Math.pow(dps / nominal, .8) / 10) * 10);
};
export const hazardY = (progress: number, mark: number) => 39 + Math.max(0, Math.min(1, (progress - mark + 14) / 14)) * 19;
export const bossRestY = (state: GameState) => state.mechClass === 'blade' ? 51 : 40;
export const bossY = (state: GameState) => state.bossStep === 'rush' && isBossArena(state) ? bossRestY(state) + (59 - bossRestY(state)) * rushProgress(state) : isBossArena(state) ? bossRestY(state)
  : 36 + Math.max(0, Math.min(1, (state.progress - getLevel(state.levelIndex).encounters[0].progress + 5) / 5)) * 4;
export const laneXAt = (lane: number, y: number) => 50 + (lane - 1) * Math.max(7, Math.min(34, (y - 25) / 34 * 23));
export const rushProgress = (s: GameState) => s.bossStep !== 'rush' ? 0 : s.bossStepTicks <= 10
  ? 1 - Math.pow(1 - s.bossStepTicks / 10, 3) : s.bossStepTicks <= 13 ? 1 : Math.max(0, 1 - (s.bossStepTicks - 13) / 8);
export const bossX = (s: GameState) => {
  const start = laneXAt(s.battleLane, bossRestY(s));
  if (s.bossMoveTicks > 0 && isBossArena(s)) {
    const progress = 1 - s.bossMoveTicks / BOSS_MOVE_TICKS;
    const eased = progress * progress * (3 - 2 * progress);
    return laneXAt(s.bossMoveFromLane, bossY(s)) + (laneXAt(s.battleLane, bossY(s)) - laneXAt(s.bossMoveFromLane, bossY(s))) * eased;
  }
  if (s.bossStep !== 'rush' || !isBossArena(s)) return laneXAt(s.battleLane, bossY(s));
  const target = s.bossAttackLanes.reduce((sum, lane) => sum + LANE_CENTERS[lane], 0) / Math.max(1, s.bossAttackLanes.length);
  return start + (target - start) * rushProgress(s);
};
export const threatY = (threat: BossThreat) => ['egg','tether','pylon','orb','seal'].includes(threat.kind) ? threat.originY ?? 45 : threat.kind === 'field' || threat.kind === 'beam' || (threat.kind === 'lava' && threat.ticks === 0) ? 59 : (threat.originY ?? 43) + (59 - (threat.originY ?? 43)) * (1 - threat.ticks / threat.duration);
export const bossFiring = (s: GameState) => (s.status === 'battle' || (s.status === 'paused' && s.resumeStatus === 'battle')) && s.battleTime - s.bossFiredTick <= 2;
const spawnThreat = (s: GameState, kind: BossThreat['kind'], lane: number, duration: number) => {
  const hp = kind === 'shell' || kind === 'lava' || kind === 'beam' ? -1 : (kind === 'barrier' ? 6 + s.levelIndex * 3 : 4 + s.levelIndex * 2) + bossEnrage(s) * 2;
  s.threats.push({ id: ++s.threatSequence, kind, lane, duration, ticks: duration, lingerTicks: kind === 'lava' ? 18 : undefined, hp, maxHp: Math.max(0, hp), damage: kind === 'lava' ? 8 : kind === 'beam' ? 22 : kind === 'shell' ? 12 + getLevel(s.levelIndex).bossDamage * 2 + bossEnrage(s) * 2 : kind === 'barrier' ? 14 : 10, fromLane: s.battleLane, originY: bossY(s) + 3 });
  s.bossFiredTick = s.battleTime;
};
export const gateGroundY = (progress: number, mark: number) => 43 + Math.max(0, Math.min(1, (progress - mark + 12) / 14)) * 28;
export const GATE_CONTACT_Y = 64;
export const gateEffectDetail = (_state: GameState, option: GateOption) => option.effect==='fuse' ? '融合装备 · '+(eligibleFusion(_state.modules)?FUSIONS[eligibleFusion(_state.modules)!].detail:'收集两类模块') : option.effect in MODULES ? MODULES[option.effect as RunModule].detail+' · 最高3级' : option.effect === 'charge' ? '下一轮齐射强化'
  : option.effect === 'overload' ? '8秒伤害提升50%' : option.effect === 'jam' ? '6秒武器降一级，结束后恢复' : option.detail;
export const createInitialState = (garage: Garage, levelIndex = 0, layoutIndex = Math.floor(Math.random() * 3)): GameState => {
  levelIndex = canEnterLevel(garage,levelIndex) ? levelIndex : normalizeGarage(garage).unlockedLevel;
  const level = getLevel(levelIndex);
  const bonuses = garageStats(garage);
  const armorLevel = Number(bonuses.armor > 0);
  return {
    report:newReport(),feedback:[],feedbackSequence:0,upgradeFx:null, ops:createOperations(levelIndex,layoutIndex), modules:{arc:0,burn:0,recycle:0}, mechClass: normalizeMechClass(garage.mechClass), garageDamageScale: bonuses.damageScale, garageCoreLevel: bonuses.core, garageArmorLevel: bonuses.armor, status: 'home', resumeStatus: null, levelIndex, layoutIndex, runId: 0, progress: 0, bots: 1, lane: 1, laneMoveTicks: 0, score: 0,
    dodgeTicks: 0, dodgeFromLane: 1, dodgeDirection: 1, dodgeSequence: 0, evadeSequence: 0, evadeTicks: 0, queuedLane: null,
    playerHp: bonuses.maxHp, playerMaxHp: bonuses.maxHp, invulnerableTicks: 0, defenseFx:null,
    gate: 0, gateResolved: false, gateCollected: false, gateChoices: createGateChoices(levelIndex, layoutIndex), weaponLevel: Number(bonuses.weapon > 0), armorLevel, armorPoints: bonuses.armorPoints, coreLevel: 0,
    shieldCharges: 0, charge: 0, chargedVolleys: 0, overloadTicks: 0, jamTicks: 0, visitedZones: [],
    hazard: 0, hazardHp: level.hazards[0].hp, hazardMaxHp: level.hazards[0].hp, hazardHps: level.hazards.map(h => h.hp),
    encounter: 0, battleTime: 0, battleHp: 0, battleMaxHp: 0, battleLane: bossLaneAt(layoutIndex, 0, levelIndex), bossAttackLanes: [], bossDefeated: false, threats: [], threatSequence: 0, enemyAttacks: [], enemyAttackSources: [], enemyAttackSequence: 0,
    bossStage: 1, bossCycle: 0, bossStep: 'warning', bossStepTicks: 0, bossPhaseTicks: 0, bossSalvos: 0, bossSalvoDelay: 0, bossFiredTick: -999,
    bossAttack: 'cannon', bossRushHit: false, bossWave: 0,
    bossMoveFromLane: bossLaneAt(layoutIndex, 0, levelIndex), bossMoveTicks: 0, bossRandomSeed: Math.floor(Math.random() * 4294967296) >>> 0,
    defeatReason: null, defeatTicks: 0, fireCooldown: 0, shotSequence: 0, pendingShots: [], burns: [],
    impactSequence: 0, impactDamage: 0, impactWeaponLevel: 0, impactTarget: null, impactLane: 1, impactY: 48, impactX: 50,
    damageSequence: 0, damageLoss: 0, damageLane: 1, toast: '', won: false,
    damageKind: 'health', damageAbsorbed: 0,
    kills: 0, combo: 0, bestCombo: 0, comboTicks: 0, killSequence: 0, killEffects: [], roadTicks: 0, medicPulses: [],
    burstEnergy: 0, burstTicks: 0, burstSequence: 0, comboHeal: 0, comboRewardTicks: 0, coreDetonations:[],
  };
};
export const applyGateEffect = (state: GameState, option: GateOption): GameState => {
  const next = { ...state, ops:copyOperations(state.ops), modules:{...state.modules} };
  switch (option.effect) {
    case 'fuse': { const fusion=eligibleFusion(next.modules);if(fusion&&!next.ops.fusion)next.ops.fusion=fusion;break; }
    case 'arc': case 'burn': case 'recycle': if(next.modules[option.effect]<3)next.modules[option.effect]++;else next.score+=40; break;
    case 'weaponUp': next.weaponLevel = Math.min(4, next.weaponLevel + option.amount); break;
    case 'armorUp': next.armorLevel = Math.min(4, next.armorLevel + option.amount); next.armorPoints = Math.min(8 + Math.max(0, next.garageArmorLevel - 1) * 2, next.armorPoints + 2); break;
    case 'coreUp': next.coreLevel = Math.min(4, next.coreLevel + 1); next.bots = Math.min(11, next.bots + option.amount); break;
    case 'repair': if (next.bots >= 11) next.score += 30; else next.bots = Math.min(11, next.bots + option.amount); next.armorPoints = next.armorLevel * 2 + Math.max(0, next.garageArmorLevel - 1) * 2; next.playerHp = Math.min(next.playerMaxHp, next.playerHp + (next.ops.protocol==='scarcity'?15:30)); break;
    case 'shieldUp': next.shieldCharges = Math.min(3, next.shieldCharges + option.amount); break;
    case 'scoreUp': next.score += option.amount; break;
    case 'charge': next.chargedVolleys = Math.min(3, next.chargedVolleys + 1); break;
    case 'overload': next.overloadTicks = 80; break;
    case 'jam': next.jamTicks = 60; break;
    case 'botsDown': next.bots = Math.max(0, next.bots - option.amount); break;
    case 'weaponDown': next.weaponLevel = Math.max(0, next.weaponLevel - 1); break;
    case 'armorDown': next.armorLevel = Math.max(0, next.armorLevel - 1); next.armorPoints = Math.min(next.armorPoints, next.armorLevel * 2 + Math.max(0, next.garageArmorLevel - 1) * 2); break;
    case 'coreDown': next.coreLevel = Math.max(0, next.coreLevel - 1); next.bots = Math.max(0, next.bots - option.amount); break;
    case 'scoreDown': next.score = Math.max(0, next.score - option.amount); break;
  }
  next.upgradeFx={id:(state.upgradeFx?.id??0)+1,ticks:12,title:option.title,positive:option.polarity==='reward'};
  if (next.bots < state.bots) { next.damageSequence++; next.damageLoss = state.bots - next.bots; next.damageLane = state.lane; next.damageKind = 'squad'; next.damageAbsorbed = 0; }
  return next;
};
export const applySquadHit = (state: GameState, damage: number, source:'collision'|'hostile'='hostile'): number => {
  if (damage <= 0 || state.invulnerableTicks > 0 || state.playerHp <= 0) return 0;
  state.damageSequence++; state.damageLane = playerLaneFor(state); state.invulnerableTicks = 6;
  if (state.shieldCharges > 0) { state.shieldCharges--; state.report.blocked+=damage; state.damageLoss = 0; state.damageAbsorbed = damage; state.damageKind = 'shield'; state.defenseFx={kind:'shield',exhausted:state.shieldCharges===0,ticks:DEFENSE_VFX_TICKS,id:state.damageSequence}; return 0; }
  const absorbed = Math.min(state.armorPoints * 4, damage); state.armorPoints -= Math.ceil(absorbed / 4);
  state.defenseFx=absorbed>0?{kind:'armor',exhausted:state.armorPoints===0,ticks:DEFENSE_VFX_TICKS,id:state.damageSequence}:null;
  const loss = Number(Math.min(state.playerHp, damage - absorbed).toFixed(2)); state.playerHp = Number((state.playerHp - loss).toFixed(2));
  state.report.taken+=loss;state.report.blocked+=absorbed;if(source==='collision')state.report.collisions+=loss;else state.report.hostile+=loss;
  state.damageLoss = loss; state.damageAbsorbed = absorbed; state.damageKind = loss > 0 ? 'health' : 'armor';
  if (state.playerHp <= 0) state.bots = 0;
  return loss;
};
const syncHazard = (s: GameState) => {
  const level = getLevel(s.levelIndex), index = s.hazardHps.findIndex(hp => hp > 0);
  s.hazard = index < 0 ? level.hazards.length : index;
  s.hazardHp = s.hazardHps[s.hazard] ?? 0; s.hazardMaxHp = hazardMaxHpFor(s,s.hazard);
};
const fail = (s: GameState, reason: GameState['defeatReason']): GameState => ({ ...s, feedback:[],upgradeFx:null,status: 'defeat',ops:{...s.ops,perfectTicks:0,counterShots:0,eventWarning:0,breakTicks:0}, playerHp: 0, bots: 0, defeatReason: reason ?? 'squad-wipe', defeatTicks: 0, won: false, defenseFx:null, burstTicks:0, burstEnergy:0, comboRewardTicks:0, coreDetonations:[], pendingShots: [], burns: [], threats: [], enemyAttacks: [], killEffects: [] });
const targetLane = (s: GameState, target: Target, index: number) => target === 'part' ? s.ops.parts[index]?.lane??-1 : target === 'objective' ? s.ops.mission.lane : target === 'event' ? s.ops.event.lane : target === 'boss' ? s.battleLane : target === 'threat' ? s.threats.find(t => t.id === index)?.lane ?? -1 : hazardLaneAt(s.layoutIndex, index, s.progress, s.levelIndex);
export const roadEnemyY = (s: GameState, index: number) => {
  const dash = s.enemyAttacks.find(a => a.source === 'hazard' && a.sourceId === index && a.kind === 'charge' && a.phase === 'flight');
  const h = getLevel(s.levelIndex).hazards[index];
  const offset = h.horde ? 0 : h.kind === 'swarm' ? Math.floor((h.slot ?? 0) / 2) * 3 : h.kind === 'sniper' ? 2 : h.kind === 'bomber' ? 4 : h.kind === 'medic' ? 7 : 0;
  const y = hazardY(s.progress, h.progress) - offset * Math.min(1, Math.max(0, (h.progress - s.progress) / 6));
  return dash ? dash.fromY + (59 - dash.fromY) * (1 - dash.ticks / dash.duration) : h.kind ? Math.max(ROAD_HORIZON[s.levelIndex] + 3, y) : y;
};
export const roadEnemyX = (s: GameState, index: number) => {
  const h = getLevel(s.levelIndex).hazards[index], offset = h.horde ? (Math.floor((h.slot??0)%6/2)-1)*3.2 : h.kind === 'swarm' ? ((h.slot ?? 0) % 2 ? 3.8 : -3.8) : h.kind === 'bomber' ? -2 : h.kind === 'medic' ? 2 : 0;
  return laneXAt(targetLane(s, 'hazard', index), roadEnemyY(s, index)) + offset*(h.horde?Math.max(.55,Math.min(1,(roadEnemyY(s,index)-25)/34)):1);
};
export const targetY = (s: GameState, target: Target, index: number) => target === 'part' ? bossY(s)+4 : target==='objective'?fieldY(s,s.ops.mission):target==='event'?fieldY(s,s.ops.event):target === 'boss' ? bossY(s) : target === 'threat' ? enemyThreatY(s, s.threats.find(t => t.id === index) ?? { ticks: 0, duration: 1 } as BossThreat) : roadEnemyY(s, index);
export const targetX = (s: GameState, target: Target, index: number) => target === 'hazard' ? roadEnemyX(s, index) : laneXAt(targetLane(s, target, index), targetY(s, target, index));
const targetAlive = (s: GameState, target: Target, index: number) => target === 'part' ? s.status==='battle'&&(s.ops.parts[index]?.hp??0)>0 : target==='objective'?fieldVisible(s,s.ops.mission):target==='event'?fieldVisible(s,s.ops.event):target === 'boss' ? s.encounter === index && s.battleHp > 0 : target === 'threat' ? (s.threats.find(t => t.id === index)?.hp ?? 0) > 0 : (s.hazardHps[index] ?? 0) > 0;
const laneMatches = (s: GameState, target: Target, index: number, lane: number) => target === 'boss' ? bossDamageLanes(s).includes(lane) : targetLane(s, target, index) === lane;
const targetsInLane = (s: GameState, lane: number) => {
  const level = getLevel(s.levelIndex);
  const targets: { target: Target; index: number; y: number; progress: number }[] = [];
  if (s.status === 'running') level.hazards.forEach((h, index) => {
    if (s.hazardHps[index] > 0 && s.progress >= h.progress - 14 && s.progress < h.progress && targetLane(s, 'hazard', index) === lane)
      targets.push({ target: 'hazard', index, y: roadEnemyY(s, index), progress: 200 - roadEnemyY(s, index) });
  });
  for(const [target,object]of [['objective',s.ops.mission],['event',s.ops.event]] as const)if(fieldVisible(s,object)&&object.lane===lane)targets.push({target,index:0,y:fieldY(s,object),progress:200-fieldY(s,object)});
  if(s.status==='battle')s.ops.parts.forEach((part,index)=>{if(part.hp>0&&part.lane===lane)targets.push({target:'part',index,y:bossY(s)+4,progress:196-bossY(s)});});
  s.threats.forEach(threat => {
    if (threat.hp > 0 && threat.lane === lane) targets.push({ target: 'threat', index: threat.id, y: enemyThreatY(s, threat), progress: 200 - enemyThreatY(s, threat) });
  });
  const boss = level.encounters[s.encounter];
  if (boss && s.status === 'battle' && s.battleHp > 0 && bossDamageLanes(s).includes(lane))
    targets.push({ target: 'boss', index: s.encounter, y: bossY(s), progress: 200 - bossY(s) });
  return targets.filter(t => s.mechClass !== 'blade' || 59 - t.y <= attackRangeFor(s)).sort((a, b) => a.progress - b.progress);
};
export const eliteRoleName = (role?:string) => ({energy:'能量载体',guard:'护卫',commander:'指挥机'}[role??'']??'');
export const guardSourceFor = (s:GameState,index:number) => {
  const level=getLevel(s.levelIndex),h=level.hazards[index];
  if(!h||h.eliteRole==='guard')return -1;
  return level.hazards.findIndex((guard,i)=>i!==index&&guard.eliteRole==='guard'&&s.hazardHps[i]>0&&s.progress>=guard.progress-14&&s.progress<guard.progress&&guard.progress>=h.progress&&guard.progress-h.progress<=4&&targetLane(s,'hazard',i)===targetLane(s,'hazard',index));
};
export const commanderFor = (s:GameState,index:number) => {
  const level=getLevel(s.levelIndex),h=level.hazards[index];
  return level.hazards.findIndex((leader,i)=>i!==index&&leader.eliteRole==='commander'&&s.hazardHps[i]>0&&s.progress>=leader.progress-14&&s.progress<leader.progress&&Math.abs(leader.progress-h.progress)<=4&&targetLane(s,'hazard',i)===targetLane(s,'hazard',index));
};
const recordImpact=(s:GameState,damage:number,target:Target,index:number,tier:number)=>{
 s.report.dealt+=damage;if(target==='boss')s.report.bossDamage+=damage;
 const h=target==='hazard'?getLevel(s.levelIndex).hazards[index]:null;
 const killed=target==='hazard'?s.hazardHps[index]===0:target==='boss'?s.battleHp===0:target==='part'?s.ops.parts[index]?.hp===0:false;
 const kind:CombatFeedback['kind']=killed&&target==='boss'?'boss':killed&&(h?.eliteRole||target==='part')?'elite':h?.armor?'armor':s.mechClass==='heavy'||tier>=4?'heavy':'hit';
 s.feedback=[...s.feedback,{id:++s.feedbackSequence,x:targetX(s,target,index),y:targetY(s,target,index),ticks:kind==='boss'?12:kind==='elite'?8:4,kind}].slice(-12);
 if(s.mechClass==='pulse'){s.report.focus++;if(s.report.focus>=6){s.report.focus=0;s.report.focusReady=true;}}
};
const damageTarget = (s: GameState, target: Target, index: number, raw: number, tier: number, lane: number, precise = false): number => {
  if (!targetAlive(s, target, index) || !laneMatches(s, target, index, lane)) return 0;
  const level = getLevel(s.levelIndex);
  if(target==='objective'||target==='event'||target==='part'){
    const object=target==='part'?s.ops.parts[index]:target==='objective'?s.ops.mission:s.ops.event;
    const damage=Math.min(object.hp,Math.max(1,raw));object.hp=Number((object.hp-damage).toFixed(2));
    recordImpact(s,damage,target,index,tier);s.impactSequence++;s.impactDamage=damage;s.impactTarget=target;s.impactLane=lane;s.impactY=targetY(s,target,index);s.impactX=targetX(s,target,index);s.impactWeaponLevel=tier;
    if(object.hp===0){
      if(target==='part'){
        s.ops.broken++;s.ops.breakTicks=18;s.score+=45;gainBurstEnergy(s,12);
        s.threats=s.threats.filter(t=>s.ops.parts[index].kind==='cannon'?!['shell','beam','lava'].includes(t.kind):s.ops.parts[index].kind==='shield'?!['pylon','seal','wall'].includes(t.kind):t.kind!=='minion');
        s.enemyAttacks=[];s.bossSalvos=0;s.bossStep='recovery';s.bossStepTicks=0;s.bossAttackLanes=[];
      }else{
        const field=target==='objective'?s.ops.mission:s.ops.event;field.status='done';s.score+=target==='objective'?100:75;s.ops.bonusParts+=target==='objective'?1:2;
        if(target==='objective'){if(s.levelIndex===1)s.bots=Math.min(11,s.bots+1);if(s.levelIndex===3)s.jamTicks=0;if(s.levelIndex===4)gainBurstEnergy(s,25);}
        else {const key=(['arc','burn','recycle'] as const).find(k=>s.modules[k]===0)??'recycle';s.modules={...s.modules,[key]:Math.min(3,s.modules[key]+1)};s.ops.eventWarning=0;}
      }
    }
    return damage;
  }
  const armor = target === 'hazard' ? level.hazards[index].armor ?? 0 : 0;
  const multiplier = target === 'boss' ? (bossGuarded(s) ? .12 : s.status !== 'battle' || bossPhase(s) === 'shield' ? .25 : bossPhase(s) === 'weak' ? (s.ops.breakTicks>0?1.5:1.35) : 1) : 1;
  const threat = target === 'threat' ? s.threats.find(t => t.id === index) : undefined;
  const hp = target === 'hazard' ? s.hazardHps[index] : threat ? threat.hp : s.battleHp;
  // Preserve fractional burst bonuses: the starter pulse must not round 1.4 back to 1.
  const scaled=raw * multiplier * (target==='hazard'&&guardSourceFor(s,index)>=0?.65:1) / s.garageDamageScale;
  const damage = Math.min(hp, Number(Math.max(1, (precise?scaled:Math.round(scaled)) * s.garageDamageScale - armor).toFixed(2)));
  if (target === 'hazard') s.hazardHps[index] = Number((hp - damage).toFixed(2)); else if (threat) threat.hp = Number((hp - damage).toFixed(2)); else s.battleHp = Number((hp - damage).toFixed(2));
  recordImpact(s,damage,target,index,tier);s.impactSequence++; s.impactDamage = damage; s.impactWeaponLevel = tier; s.impactTarget = target; s.impactLane = lane; s.impactY = targetY(s, target, index); s.impactX = targetX(s, target, index);
  if (target === 'hazard' && s.hazardHps[index] === 0) {
    const h = level.hazards[index], kind = h.kind ?? 'drone';
    s.kills++; if(s.ops.fusion==='furnace'&&s.kills%6===0)s.chargedVolleys=Math.min(3,s.chargedVolleys+1);s.combo = s.comboTicks > 0 ? s.combo + 1 : 1; s.comboTicks = COMBO_WINDOW_TICKS; s.bestCombo = Math.max(s.bestCombo, s.combo);
    gainBurstEnergy(s, 12 + s.modules.recycle*3 + (s.combo % 3 === 0 ? 8 : 0));
    const points = kind === 'swarm' ? 15 : kind === 'medic' ? 60 : kind === 'drone' ? 45 : 55;
    s.score += Math.round(points * (1 + Math.min(3, Math.floor(s.combo / 3)) * .25));
    if (s.combo % 3 === 0) { s.comboHeal = Math.min(4, s.playerMaxHp - s.playerHp); s.playerHp += s.comboHeal; s.comboRewardTicks = 12; }
    s.killEffects = [...s.killEffects, { id: ++s.killSequence, kind, lane, x: roadEnemyX(s, index), y: roadEnemyY(s, index), ticks: 7, combo: s.combo }].slice(-20);
    // The target is already dead before this cascade. Explosions only affect
    // nearby targets in its own lane, so chains cannot jump across the road.
    if(h.eliteRole==='energy'){
      gainBurstEnergy(s,15);
      s.coreDetonations=[...s.coreDetonations,{kind:'energy' as const,id:++s.shotSequence,x:roadEnemyX(s,index),y:roadEnemyY(s,index),ticks:6}].slice(-6);
      level.hazards.flatMap((other,i)=>i!==index&&s.hazardHps[i]>0&&s.progress>=other.progress-14&&s.progress<other.progress&&Math.abs(other.progress-h.progress)<=4&&targetLane(s,'hazard',i)===lane?[i]:[]).slice(0,6).forEach(i=>damageTarget(s,'hazard',i,4+s.levelIndex,tier,lane,true));
    }
    if(h.eliteRole==='commander')s.enemyAttacks=s.enemyAttacks.filter(a=>a.source!=='hazard'||a.phase!=='warning'||!(level.hazards[a.sourceId]?.wave===h.wave&&targetLane(s,'hazard',a.sourceId)===lane));
    if (kind === 'bomber') level.hazards.forEach((other, i) => {
      if (i !== index && s.hazardHps[i] > 0 && s.progress >= other.progress - 14 && s.progress < other.progress && Math.abs(other.progress - h.progress) <= 6 && targetLane(s, 'hazard', i) === lane)
        damageTarget(s, 'hazard', i, 6 + tier * 2, tier, lane);
    });
  }
  if (target === 'boss') gainBurstEnergy(s, damage / Math.max(1, s.battleMaxHp) * 160);
  if (threat && threat.hp === 0) { s.score += threat.kind === 'minion' ? 20 : 15; s.playerHp = Math.min(s.playerMaxHp, s.playerHp + 2); gainBurstEnergy(s, 16); }
  if (target === 'boss' && s.battleHp === 0) {
    s.score += level.encounters[index].reward; s.bossDefeated = true; s.status = 'boss-victory'; s.bossPhaseTicks = 0;
    s.dodgeTicks=0;s.queuedLane=null;s.defenseFx=null;s.burstTicks=0;s.coreDetonations=[];
    s.bossAttackLanes = []; s.threats = []; s.enemyAttacks = []; s.pendingShots = []; s.burns = []; s.bossSalvos = 0;
  }
  return damage;
};
const flightTicks = (originY: number, destinationY: number) => Math.max(2, Math.min(8, Math.ceil(Math.abs(originY - destinationY) / 7)));

export const bossAttackLabel = (s: GameState) => ({ ...SPECIAL_LABELS, cannon: '轨道炮击', burst: '蜂刺连射', rush: s.levelIndex === 2 ? '盾阵冲撞' : '重锤突袭', sweep: '帝皇横扫', mortar: '熔岩封路', swarm: '蜂群出击', bunker: '重盾封锁', storm: '风暴巡航', crossfire: '星核交叉炮' })[s.bossAttack];
export const bossWarningTicks = (s: GameState) => s.bossAttack in SPECIAL_LABELS ? (s.bossAttack === 'judgement' || s.bossAttack === 'polarity' ? 16 : 20) : isRush(s) ? RUSH_WARNING_TICKS : s.bossAttack === 'mortar' || s.bossAttack === 'bunker' ? 16 : BOSS_WARNING_TICKS;
const sequentialAttack = (s: GameState) => ['storm','crossfire','vents','polarity','judgement'].includes(s.bossAttack);
const sequenceLength = (s: GameState) => s.bossAttack === 'judgement' ? 2 : s.bossAttack === 'vents' || s.bossAttack === 'polarity' ? (s.bossStage === 2 ? 2 : 1) : s.bossAttack === 'storm' ? (s.bossStage === 2 ? 3 : 2) : (s.bossStage === 2 ? 1 : 0);
const beginWarning = (s: GameState) => {
  s.bossStep = 'warning'; s.bossStepTicks = 0; s.bossRushHit = false; s.bossWave = 0;
  const pattern = BOSS_LOADOUTS[s.levelIndex];
  s.bossAttack = pattern[Math.max(0, s.bossCycle - 1) % pattern.length];
  if(partBroken(s,'engine')&&isRush(s))s.bossAttack='cannon';
  if (s.bossAttack === 'orbits') s.bossAttackLanes = [0,1,2].filter(lane => lane !== s.battleLane);
  else if (s.bossAttack === 'hive-link') s.bossAttackLanes = [s.battleLane];
  else if (s.bossAttack === 'vents' || s.bossAttack === 'polarity') s.bossAttackLanes = [s.bossCycle % 3];
  else if (['eggs','pylons','lockdown','seals'].includes(s.bossAttack)) s.bossAttackLanes = [s.lane, (s.lane + 1) % 3];
  else if (s.bossAttack === 'crossfire' || s.bossAttack === 'judgement') s.bossAttackLanes = [0,1,2].filter(lane => lane !== s.bossCycle % 3);
  else if ((s.bossAttack === 'swarm' || s.bossAttack === 'bunker' || s.bossAttack === 'mortar' || s.bossAttack === 'smelt') && s.bossStage === 2) s.bossAttackLanes = [s.lane, (s.lane + 1) % 3];
  else s.bossAttackLanes = [s.lane];
};
const prepareNextWarning = (s: GameState) => {
  if (s.bossStage === 2 && (s.levelIndex === 2 || (s.levelIndex === 4 && s.bossCycle % 2 === 0))) {
    s.bossStep = 'shield'; s.bossStepTicks = 0;
  } else beginWarning(s);
};
const spawnObjective = (s: GameState, kind: BossThreat['kind'], lane: number, duration: number, hp: number, damage = 0, linkId?: number) => {
  const t: BossThreat = { id: ++s.threatSequence, kind, lane, duration, ticks: duration, hp, maxHp: Math.max(0,hp), damage, fromLane: s.battleLane, originY: s.mechClass === 'blade' ? 53 : 45, linkId };
  s.threats.push(t); return t;
};
const fireBossSalvo = (s: GameState) => {
  if(partBroken(s,'cannon')&&['cannon','burst','mortar','crossfire'].includes(s.bossAttack)&&s.bossCycle%2===0){s.bossFiredTick=s.battleTime;return;}
  if (s.bossAttack in SPECIAL_LABELS) {
    const lanes = s.bossAttackLanes, hp = 5 + s.levelIndex;
    switch (s.bossAttack) {
      case 'vents': case 'smelt':
        lanes.forEach(lane => { spawnThreat(s,'lava',lane,1); const t=s.threats[s.threats.length-1];t.originY=59;t.lingerTicks=s.bossAttack==='smelt'?30:12; }); break;
      case 'eggs': lanes.forEach(lane=>spawnObjective(s,'egg',lane,30,hp)); break;
      case 'hive-link': spawnObjective(s,'tether',lanes[0],40,hp+2); break;
      case 'pylons': lanes.forEach(lane=>spawnObjective(s,'pylon',lane,42,hp+3,18)); break;
      case 'lockdown': lanes.forEach(lane=>spawnObjective(s,'wall',lane,34,hp+4,20)); break;
      case 'orbits': {
        const core=spawnObjective(s,'orb',s.battleLane,48,hp+4);
        lanes.forEach(lane=>spawnObjective(s,'field',lane,48,-1,8,core.id)); break;
      }
      case 'polarity': case 'judgement': lanes.forEach(lane=>spawnObjective(s,'field',lane,16,-1,s.bossAttack==='judgement'?12:8)); break;
      case 'seals': lanes.forEach(lane=>spawnObjective(s,'seal',lane,38,hp+4,20)); break;
    }
    s.bossFiredTick=s.battleTime; return;
  }
  const duration = Math.max(8, 12 - bossEnrage(s));
  const kind: BossThreat['kind'] = s.bossAttack === 'mortar' ? 'lava' : s.bossAttack === 'swarm' ? 'minion' : s.bossAttack === 'bunker' ? 'barrier' : s.bossAttack === 'storm' ? 'beam' : 'shell';
  s.bossAttackLanes.forEach(lane => {
    spawnThreat(s, kind, lane, kind === 'lava' ? 18 : kind === 'beam' ? 8 : kind === 'minion' ? 32 : kind === 'barrier' ? 36 : duration);
    if (kind === 'barrier') { const t = s.threats[s.threats.length - 1]; t.hp += 10; t.maxHp = t.hp; t.damage = 22; }
  });
};
const relocateBoss = (s: GameState) => {
  // Store randomness in reducer state so pauses/replays never reroll a move.
  s.bossRandomSeed = (Math.imul(s.bossRandomSeed, 1664525) + 1013904223) >>> 0;
  s.bossMoveFromLane = s.battleLane;
  const alternatives = [0, 1, 2].filter(lane => lane !== s.battleLane);
  s.battleLane = alternatives[s.bossRandomSeed < 2147483648 ? 0 : 1];
  s.bossMoveTicks = BOSS_MOVE_TICKS;
};
const sourceAlive = (s: GameState, a: EnemyAttack) => a.source === 'hazard' ? (s.hazardHps[a.sourceId] ?? 0) > 0 : (s.threats.find(t => t.id === a.sourceId)?.hp ?? 0) > 0;
const queueEnemyAttack = (s: GameState, source: EnemyAttack['source'], sourceId: number, kind: EnemyAttack['kind'], lane: number, fromLane: number, fromY: number, lanes = [lane]) => {
  const key = source + ':' + sourceId; if (s.enemyAttackSources.includes(key)) return;
  s.enemyAttackSources.push(key);
  const warning = kind === 'sniper-shot' || kind === 'bombard' ? 18 : kind === 'charge' ? 10 : 12;
  const damage = kind === 'sniper-shot' ? 13 : kind === 'bombard' ? 12 : kind === 'charge' ? 8 : kind === 'drone-burst' ? 7 : kind === 'shockwave' ? 12 : 14;
  lanes.forEach(targetLane => s.enemyAttacks.push({ id: ++s.enemyAttackSequence, source, sourceId, kind, lane: targetLane, fromLane, fromY, fromX: source === 'hazard' ? roadEnemyX(s, sourceId) : laneXAt(fromLane, fromY), phase: 'warning', ticks: warning, duration: warning, damage:damage*(source==='hazard'&&commanderFor(s,sourceId)>=0?1.25:1), shotsRemaining: kind === 'drone-burst' ? 2 : 1 }));
};
const advanceEnemyAttacks = (s: GameState) => {
  s.enemyAttacks = s.enemyAttacks.filter(a => {
    if (!sourceAlive(s, a) && (a.phase === 'warning' || !['drone-burst', 'sniper-shot', 'bombard'].includes(a.kind))) return false;
    if (--a.ticks > 0) return true;
    if (a.phase === 'warning') {
      if (a.source === 'hazard') { a.fromY = roadEnemyY(s, a.sourceId); a.fromLane = hazardLaneAt(s.layoutIndex, a.sourceId, s.progress, s.levelIndex); a.fromX = roadEnemyX(s, a.sourceId); }
      else { const t = s.threats.find(t => t.id === a.sourceId); if (t) { a.fromY = threatY(t); a.fromLane = t.lane; a.fromX = laneXAt(t.lane, a.fromY); } }
      a.phase = 'flight'; a.duration = a.kind === 'bombard' ? 12 : a.kind === 'drone-burst' ? 8 : 6; a.ticks = a.duration; return true; }
    hitPlayerLane(s, a.lane, a.damage);
    if (a.kind === 'pounce') { const bot = s.threats.find(t => t.id === a.sourceId); if (bot) bot.hp = 0; }
    if (a.kind === 'charge') s.hazardHps[a.sourceId] = -1;
    if (--a.shotsRemaining > 0 && sourceAlive(s, a)) {
      if (a.source === 'hazard') { a.fromY = roadEnemyY(s, a.sourceId); a.fromLane = hazardLaneAt(s.layoutIndex, a.sourceId, s.progress, s.levelIndex); a.fromX = roadEnemyX(s, a.sourceId); }
      a.ticks = a.duration = 6; return true;
    }
    return false;
  });
};
export const enemyThreatY = (s: GameState, threat: BossThreat) => {
  const dash = s.enemyAttacks.find(a => a.source === 'threat' && a.sourceId === threat.id && a.kind === 'pounce' && a.phase === 'flight');
  return dash ? dash.fromY + (59 - dash.fromY) * (1 - dash.ticks / dash.duration) : threatY(threat);
};
const advanceRoadEnemies = (s: GameState) => {
  const level = getLevel(s.levelIndex); s.roadTicks++; s.medicPulses = [];
  const visible = level.hazards.flatMap((h, i) => s.hazardHps[i] > 0 && s.progress >= h.progress - 14 && s.progress < h.progress ? [i] : []);
  if (s.roadTicks % 14 === 0) visible.filter(i => level.hazards[i].kind === 'medic').forEach(i => {
    const lane = targetLane(s, 'hazard', i), mark = level.hazards[i].progress;
    const ally = visible.filter(j => j !== i && targetLane(s, 'hazard', j) === lane && Math.abs(level.hazards[j].progress - mark) <= 6 && s.hazardHps[j] < hazardMaxHpFor(s,j))
      .sort((a, b) => s.hazardHps[a] / level.hazards[a].hp - s.hazardHps[b] / level.hazards[b].hp)[0];
    if (ally !== undefined) { s.hazardHps[ally] = Math.min(hazardMaxHpFor(s,ally), s.hazardHps[ally] + 2); s.medicPulses.push(i); }
  });
  // Limit road pressure to two lanes, including imminent body collisions. Each
  // source attacks once; queueing never retargets a warning already on screen.
  const busy = new Set(s.enemyAttacks.map(a => a.lane));
  // A salvo lasts at most three seconds. Reserve space for bodies that can
  // arrive during that same window, including a patrol's impending lane shift.
  visible.filter(i => level.hazards[i].progress - s.progress < 7).forEach(i => busy.add(hazardLaneAt(s.layoutIndex, i, level.hazards[i].progress, s.levelIndex)));
  const gate = s.gateChoices[s.gate]?.[0], mark = level.gateMarks[s.gate];
  const protectedLane = gate?.polarity === 'reward' && !s.gateResolved && Math.abs(mark - s.progress) < 7 ? gate.lane : -1;
  if (s.enemyAttacks.length >= 2) return;
  // Keep the original patrol priority; later specialists fill gaps between salvos.
  for (const i of visible) {
    const h = level.hazards[i], kind = h.kind ?? 'drone';
    const until = h.progress - s.progress;
    if (kind === 'medic' || s.enemyAttackSources.includes('hazard:' + i) || until > (kind === 'swarm' ? 5 : 10) || until <= 4) continue;
    const ownLane = targetLane(s, 'hazard', i);
    const attack: EnemyAttack['kind'] = kind === 'swarm' ? 'charge' : kind === 'sniper' ? 'sniper-shot' : kind === 'bomber' ? 'bombard' : 'drone-burst';
    const lanes = kind === 'bomber' ? [ownLane, (ownLane + 1) % 3] : [kind === 'swarm' ? ownLane : s.lane];
    if (lanes.includes(protectedLane) || new Set([...busy, ...lanes]).size > 2 || s.enemyAttacks.length + lanes.length > 2) continue;
    queueEnemyAttack(s, 'hazard', i, attack, lanes[0], ownLane, roadEnemyY(s, i), lanes);
    break;
  }
};
const advanceBoss = (s: GameState): GameState => {
  s.battleTime++;
  advanceEnemyAttacks(s);
  for (const threat of [...s.threats]) {
    if (threat.hp === 0) continue;
    if (['egg','tether','pylon','orb','seal','field'].includes(threat.kind)) {
      if (threat.kind === 'field' && threat.linkId && !s.threats.some(t=>t.id===threat.linkId&&t.hp>0)) { threat.hp=0; continue; }
      threat.ticks=Math.max(0,threat.ticks-1);
      if(threat.kind==='tether'&&threat.ticks>0&&threat.ticks%10===0) s.battleHp=Math.min(s.battleMaxHp,s.battleHp+3);
      if(threat.kind==='field'&&threat.ticks%8===0) hitPlayerLane(s,threat.lane,threat.damage);
      if(threat.ticks===0){
        if(threat.kind==='egg'){spawnThreat(s,'minion',threat.lane,32);s.threats[s.threats.length-1].originY=threat.originY;}
        else if(threat.damage>0&&threat.kind!=='field') hitPlayerLane(s,threat.lane,threat.damage);
        threat.hp=0;
      }
      continue;
    }
    if (threat.hp > 0 && (threat.kind === 'barrier' || threat.kind === 'minion') && threat.duration - threat.ticks >= 6) {
      queueEnemyAttack(s, 'threat', threat.id, threat.kind === 'barrier' ? 'shockwave' : 'pounce', threat.lane, threat.lane, threatY(threat));
    }
    threat.ticks = Math.max(0, threat.ticks - 1);
    if (threat.ticks === 0) {
      if (threat.kind === 'lava' && (threat.lingerTicks ?? 0) > 0) {
        if ((threat.lingerTicks ?? 0) % 6 === 0) hitPlayerLane(s,threat.lane,threat.damage);
        threat.lingerTicks = (threat.lingerTicks ?? 0) - 1; if (threat.lingerTicks === 0) threat.hp = 0;
        continue;
      }
      if (threat.lane !== playerLaneFor(s)) s.score += 5;
      hitPlayerLane(s,threat.lane,threat.damage);
      threat.hp = 0;
    }
  }
  if (s.bots <= 0 || s.playerHp <= 0) return fail(s, 'boss-wipe');
  s.bossStepTicks++;
  switch (s.bossStep) {
    case 'warning':
      if (s.bossStepTicks >= bossWarningTicks(s)) {
        if (isRush(s)) { s.bossStep = 'rush'; s.bossStepTicks = 0; s.bossSalvos = 0; break; }
        fireBossSalvo(s);
        const count = s.bossCycle === 0 ? 1 : s.bossAttack === 'burst' ? (s.bossStage === 2 ? 3 : 2) : 1;
        s.bossSalvos = count - 1; s.bossSalvoDelay = 6;
        s.bossStep = 'flight'; s.bossStepTicks = 0;
      }
      break;
    case 'flight':
      if (s.bossSalvos > 0 && --s.bossSalvoDelay <= 0) {
        fireBossSalvo(s); s.bossSalvos--; s.bossSalvoDelay = 6;
      }
      if (s.bossSalvos === 0 && !s.threats.some(t => t.hp !== 0) && s.enemyAttacks.length === 0) {
        if (sequentialAttack(s) && s.bossWave < sequenceLength(s)) {
          s.bossWave++;
          if (['storm','vents','polarity'].includes(s.bossAttack)) s.bossAttackLanes = [(s.bossAttackLanes[0] + (s.bossCycle % 2 ? 1 : 2)) % 3];
          else s.bossAttackLanes = [0,1,2].filter(lane => lane !== (s.bossCycle + s.bossWave) % 3);
          s.bossStep = 'warning'; s.bossStepTicks = 0; break;
        }
        s.bossStep = 'recovery'; s.bossStepTicks = 0; s.bossAttackLanes = [];
      }
      break;
    case 'rush':
      if (!s.bossRushHit && s.bossStepTicks >= RUSH_CONTACT_TICK) {
        s.bossRushHit = true;
        for(const lane of s.bossAttackLanes) hitPlayerLane(s,lane,26+s.levelIndex*2+(s.bossAttack==='sweep'?6:0)+bossEnrage(s)*2);
        if (s.playerHp <= 0) return fail(s, 'boss-wipe');
      }
      if (s.bossStepTicks >= RUSH_DURATION_TICKS) { s.bossStep = 'recovery'; s.bossStepTicks = 0; s.bossAttackLanes = []; }
      break;
    case 'recovery':
      if (s.bossStepTicks === 1) relocateBoss(s);
      // Shift only after the current attack has finished. The transition never
      // hides a live projectile or deals damage during the equipment animation.
      if (s.bossStage === 1 && s.battleHp <= s.battleMaxHp / 2) {
        s.bossStage = 2; s.status = 'boss-shift'; s.bossPhaseTicks = 0;
        s.threats = []; s.enemyAttacks = []; s.pendingShots = []; s.burns = []; s.bossAttackLanes = [];
      } else if (s.bossStepTicks >= bossRecoveryTicks(s)) {
        s.bossCycle++;
        prepareNextWarning(s);
      }
      break;
    case 'support':
      if (!s.threats.some(t => t.kind !== 'shell' && t.hp > 0) && s.enemyAttacks.length === 0) prepareNextWarning(s);
      break;
    case 'shield':
      if (s.bossStepTicks >= 10) beginWarning(s);
      break;
  }
  return s;
};
const advanceOperations=(s:GameState,previousProgress:number)=>{
  for(const object of [s.ops.mission,s.ops.event])if(object.status==='pending'&&s.progress>=object.mark)object.status='missed';
  const event=s.ops.event;
  if(fieldVisible(s,event)&&!s.ops.eventFired&&s.progress>=event.mark-5){s.ops.eventFired=true;s.ops.eventWarning=16;s.ops.eventLane=event.lane;}
  else if(s.ops.eventWarning>0&&--s.ops.eventWarning===0&&event.status==='pending')hitPlayerLane(s,s.ops.eventLane,12);
  const contact=prepMark(s)-1.5;
  if(s.ops.prep==='pending'&&previousProgress<contact&&s.progress>=contact){
    s.ops.prep=(['repair','retune','amplify'] as const)[s.lane];
    if(s.ops.prep==='repair')s.playerHp=Math.min(s.playerMaxHp,s.playerHp+(s.ops.protocol==='scarcity'?18:35));
    if(s.ops.prep==='retune'){const strongest=(Object.keys(s.modules) as RunModule[]).sort((a,b)=>s.modules[b]-s.modules[a])[0];if(s.modules[strongest]>=3)s.score+=40;else s.modules={...s.modules,[strongest]:s.modules[strongest]+1};}
    if(s.ops.prep==='amplify'){s.chargedVolleys=Math.min(3,s.chargedVolleys+2);gainBurstEnergy(s,20);}
  }
};
const enterArena = (s: GameState) => {
  s.status = 'boss-intro'; s.battleTime = 0; s.bossPhaseTicks = 0; s.bossMoveTicks = 0;
  s.dodgeTicks=0;s.queuedLane=null;s.defenseFx=null;s.ops.perfectTicks=0;
  s.battleMaxHp = bossHealthFor(s); s.battleHp = s.battleMaxHp;s.ops.parts=makeBossParts(s);s.ops.broken=s.ops.parts.filter(p=>p.hp===0).length;
  s.hazardHps = s.hazardHps.map(() => -1); s.gate = getLevel(s.levelIndex).gateMarks.length;
  s.feedback=[];s.upgradeFx=null;s.killEffects = []; s.coreDetonations=[]; s.combo = 0; s.comboTicks = 0; s.medicPulses = [];
  s.gateResolved = false; s.gateCollected = false; s.enemyAttackSources = []; s.pendingShots = []; s.burns = []; s.threats = []; s.enemyAttacks = []; s.bossAttackLanes = [];
};

export function gameReducer(state: GameState, action: Action): GameState {
  if(action.type==='ACTIVATE_BURST')return canActivateBurst(state)?{...state,burstEnergy:0,burstTicks:BURST_TICKS,burstSequence:state.burstSequence+1,jamTicks:0}:state;
  if (action.type === 'MOVE_LANE') {
    if (!canMove(state.status)) return state;
    const lane = Math.max(0, Math.min(2, Math.round(action.lane)));
    if(isBossArena(state)&&state.dodgeTicks>0){
      const queuedLane=lane===state.lane?null:lane;
      return queuedLane===state.queuedLane?state:{...state,queuedLane};
    }
    if(lane===state.lane)return state;
    if(isBossArena(state)) {
      // One side-step at a time; repeated pointer/key events cannot extend or
      // refresh an evasive window. A two-lane command buffers its second step.
      return sidestep(state,lane);
    }
    return {...state,report:{...state.report,focus:0},lane,laneMoveTicks:1,ops:{...state.ops,...(state.ops.roadDodgeTicks===0?{roadDodgeTicks:3,roadFromLane:state.lane}:{})}};
  }
  if (action.type === 'PAUSE') return isActiveStatus(state.status) ? { ...state, status: 'paused', resumeStatus: state.status } : state;
  if (action.type === 'RESUME') return state.status === 'paused' ? { ...state, status: state.resumeStatus ?? 'running', resumeStatus: null } : state;
  if (action.type === 'CLEAR_TOAST') return { ...state, toast: '' };
  if(action.type==='SET_PROTOCOL'){return state.status==='home'&&Object.prototype.hasOwnProperty.call(PROTOCOLS,action.protocol)&&(action.protocol==='standard'||normalizeGarage(action.garage).completedLevels[state.levelIndex])?{...state,ops:{...state.ops,protocol:action.protocol}}:state;}
  if ('garage' in action) {
    let campaign = normalizeGarage(action.garage);
    let levelIndex = canEnterLevel(campaign,state.levelIndex) ? state.levelIndex : campaign.unlockedLevel;
    if (action.type === 'SELECT_LEVEL') {
      if (state.status !== 'home' || !canEnterLevel(campaign,action.levelIndex)) return state;
      levelIndex = action.levelIndex;
    }
    if (action.type === 'NEXT_LEVEL') {
      if (state.status !== 'result' || !state.won || !state.bossDefeated || state.progress !== 100 || !canEnterLevel(campaign,state.levelIndex) || state.levelIndex >= LEVELS.length - 1) return state;
      campaign = recordLevelCompletion(campaign,state); levelIndex = state.levelIndex + 1;
      if (!canEnterLevel(campaign,levelIndex)) return state;
    }
    const fresh = createInitialState(campaign, levelIndex);
    if(action.type!=='SELECT_LEVEL'&&action.type!=='NEXT_LEVEL'&&campaign.completedLevels[levelIndex]){fresh.ops.protocol=state.ops.protocol;if(fresh.ops.protocol==='elite'){fresh.hazardHps=fresh.hazardHps.map(hp=>Math.ceil(hp*1.4));fresh.hazardMaxHp=fresh.hazardHps[0];}}
    return { ...fresh, runId: state.runId + 1, status: action.type === 'HOME' || action.type === 'SELECT_LEVEL' ? 'home' : 'running' };
  }
  if (state.status === 'boss-victory') {
    const bossPhaseTicks = state.bossPhaseTicks + 1;
    return bossPhaseTicks < BOSS_VICTORY_TICKS ? { ...state,feedback:state.feedback.filter(e=>e.ticks>1).map(e=>({...e,ticks:e.ticks-1})),upgradeFx:null, bossPhaseTicks }
      : { ...state, feedback:[],upgradeFx:null,bossPhaseTicks, status: 'result', progress: 100, won: true, score: state.score + state.bots * 20 + 100 };
  }
  if (state.status === 'defeat') {
    const defeatTicks = state.defeatTicks + 1;
    return { ...state, defeatTicks, status: defeatTicks >= BOSS_DEFEAT_TICKS ? 'result' : 'defeat' };
  }
  if (!canMove(state.status)) return state;
  if (state.bots <= 0 || state.playerHp <= 0) return fail(state, isBossArena(state) ? 'boss-wipe' : null);
  const level = getLevel(state.levelIndex);
  const s: GameState = { ...state,report:{...state.report},feedback:state.feedback.filter(e=>e.ticks>1).map(e=>({...e,ticks:e.ticks-1})),upgradeFx:state.upgradeFx&&state.upgradeFx.ticks>1?{...state.upgradeFx,ticks:state.upgradeFx.ticks-1}:null,ops:copyOperations(state.ops), coreDetonations:state.coreDetonations.filter(e=>e.ticks>1).map(e=>({...e,ticks:e.ticks-1})), burstTicks:Math.max(0,state.burstTicks-Number(canShoot(state.status))), comboRewardTicks:Math.max(0,state.comboRewardTicks-1), defenseFx:state.defenseFx&&state.defenseFx.ticks>1?{...state.defenseFx,ticks:state.defenseFx.ticks-1}:null, killEffects: state.killEffects.filter(e => e.ticks > 1).map(e => ({ ...e, ticks: e.ticks - 1 })), comboTicks: Math.max(0, state.comboTicks - 1), medicPulses: [], pendingShots: [], hazardHps: [...state.hazardHps], threats: state.threats.map(t => ({ ...t })), enemyAttacks: state.enemyAttacks.map(a => ({ ...a })), enemyAttackSources: [...state.enemyAttackSources], burns: [], visitedZones: [...state.visitedZones], bossAttackLanes: [...state.bossAttackLanes], laneMoveTicks: Math.max(0, state.laneMoveTicks - 1), bossMoveTicks: Math.max(0, state.bossMoveTicks - Number(canShoot(state.status))), invulnerableTicks: Math.max(0, state.invulnerableTicks - Number(canShoot(state.status))), overloadTicks: Math.max(0, state.overloadTicks - Number(canShoot(state.status))), jamTicks: Math.max(0, state.jamTicks - Number(canShoot(state.status))) };
  if(canShoot(state.status)){s.ops.roadDodgeTicks=Math.max(0,s.ops.roadDodgeTicks-1);s.ops.perfectCooldown=Math.max(0,s.ops.perfectCooldown-1);s.ops.perfectTicks=Math.max(0,s.ops.perfectTicks-1);s.ops.breakTicks=Math.max(0,s.ops.breakTicks-1);}
  if (s.comboTicks === 0) s.combo = 0;
  s.dodgeTicks=Math.max(0,state.dodgeTicks-1);s.evadeTicks=Math.max(0,state.evadeTicks-1);
  if(state.dodgeTicks===1&&s.queuedLane!==null&&s.queuedLane!==s.lane)Object.assign(s,sidestep(s,s.queuedLane));
  for (const burn of state.burns) {
    if (!targetAlive(s, burn.target, burn.index) || !laneMatches(s, burn.target, burn.index, burn.lane)) continue;
    if (burn.ticks % 5 === 0) damageTarget(s, burn.target, burn.index, burn.damage, 3, burn.lane);
    if (s.status === 'boss-victory') return s;
    if (burn.ticks > 1 && targetAlive(s, burn.target, burn.index)) s.burns.push({ ...burn, ticks: burn.ticks - 1 });
  }
  for (const shot of state.pendingShots) {
    if (shot.ticks > 1) { s.pendingShots.push({ ...shot, ticks: shot.ticks - 1 }); continue; }
    if (!shot.target) continue;
    if (shot.attackStyle === 'blade' && !shot.burst && (s.lane !== shot.lane || 59 - targetY(s, shot.target, shot.targetIndex) > (shot.range??mechSpec('blade').range))) continue;
    const hit = damageTarget(s, shot.target, shot.targetIndex, shot.damage, shot.weaponLevel, shot.lane, shot.burst === true);
    if (s.status === 'boss-victory') return s;
    if(hit>0&&shot.attackStyle==='heavy'&&!shot.splashDone){
      const y=targetY(s,shot.target,shot.targetIndex);
      s.coreDetonations=[...s.coreDetonations,{id:shot.id,x:targetX(s,shot.target,shot.targetIndex),y,ticks:6}].slice(-6);
      const nearby=targetsInLane(s,shot.lane).filter(t=>!(t.target===shot.target&&t.index===shot.targetIndex)&&Math.abs(t.y-y)<=(shot.burst?coreSkill('heavy').splash:4)).slice(0,shot.burst?4:2);
      for(const other of nearby){damageTarget(s,other.target,other.index,shot.damage*(shot.burst?.5:.3)*(other.target==='boss'?coreSkill('heavy').bossDamage/coreSkill('heavy').damage:1),shot.weaponLevel,shot.lane,true);if(s.battleHp===0&&s.bossDefeated)return s;}
    }
    if (hit > 0 && (shot.weaponLevel === 3 || (shot.burn??0)>0) && targetAlive(s, shot.target, shot.targetIndex)) {
      const existing = s.burns.find(b => b.target === shot.target && b.index === shot.targetIndex);
      if (existing) { existing.ticks = 20; existing.damage = Math.max(existing.damage, Math.max(1,Math.ceil(shot.damage * Math.max(shot.weaponLevel===3?.4:0,Math.min(shot.target==='boss'?.3:1,.15*(shot.burn??0)*(shot.fusion==='stormfire'?1.25:1)))))); }
      else s.burns.push({ target: shot.target, index: shot.targetIndex, lane: shot.lane, ticks: 20, damage: Math.max(1,Math.ceil(shot.damage * Math.max(shot.weaponLevel===3?.4:0,Math.min(shot.target==='boss'?.3:1,.15*(shot.burn??0)*(shot.fusion==='stormfire'?1.25:1))))) });
    }
    if(hit>0&&(shot.arc??0)>0&&!shot.splashDone){
      const y=targetY(s,shot.target,shot.targetIndex);
      const allies=targetsInLane(s,shot.lane).filter(t=>t.target!=='boss'&&!(t.target===shot.target&&t.index===shot.targetIndex)&&Math.abs(t.y-y)<=6).slice(0,(shot.arc??0)+(shot.fusion==='stormfire'?1:0));
      for(const other of allies){s.coreDetonations=[...s.coreDetonations,{kind:'arc' as const,id:++s.shotSequence,x:targetX(s,other.target,other.index),y:other.y,ticks:6}].slice(-6);damageTarget(s,other.target,other.index,shot.damage*.35,shot.weaponLevel,shot.lane,true);if(s.battleHp===0&&s.bossDefeated)return s;}
    }
    // A piercing bolt can continue after another bolt destroyed its first target,
    // but never after that target has moved to a different lane.
    if (shot.pierce > 0 && laneMatches(s, shot.target, shot.targetIndex, shot.lane)) {
      const originalProgress = 200 - targetY(s, shot.target, shot.targetIndex);
      const further = targetsInLane(s, shot.lane).find(t => t.progress > originalProgress);
      if (further) {
        const fromY = targetY(s, shot.target, shot.targetIndex), duration = flightTicks(fromY, further.y);
        s.pendingShots.push({ ...shot, id: ++s.shotSequence, ticks: duration, duration, target: further.target, targetIndex: further.index, origins: shot.origins.map(o => ({ ...o, x: laneXAt(shot.lane, fromY), y: fromY })), y: further.y, damage: Math.max(1, Math.round(shot.damage * .65)), pierce: shot.pierce-1, splashDone:true, muzzle: false });
      }
    }
  }
  // Remove finished targets before any collisions or new shots are processed.
  s.pendingShots = s.pendingShots.map(shot => {
    if (!shot.target || targetAlive(s, shot.target, shot.targetIndex) || shot.pierce > 0) return shot;
    // Keep the remaining visual flight after a teammate destroys the target;
    // the bolt becomes harmless and never acquires a new target by itself.
    return { ...shot, y: targetY(s, shot.target, shot.targetIndex), target: null };
  });
  if (s.status === 'boss-intro' || s.status === 'boss-shift') {
    s.bossPhaseTicks++;
    const intro = s.status === 'boss-intro';
    if (s.bossPhaseTicks >= (intro ? BOSS_INTRO_TICKS : BOSS_SHIFT_TICKS)) {
      s.status = 'battle';
      if (intro) beginWarning(s); else { s.bossStep = 'recovery'; s.bossStepTicks = 0; }
    }
  } else if (s.status === 'battle') {
    const advanced = advanceBoss(s);
    if (advanced !== s) return advanced;
  } else if (s.status === 'running') {
    advanceEnemyAttacks(s);
    if (s.playerHp <= 0) return fail(s, null);
    s.progress = Math.min(100, s.progress + RUN_SPEED);
    advanceOperations(s,state.progress);
    level.zones.forEach((zone, index) => {
      if (!(s.levelIndex===3&&s.ops.mission.status==='done')&&s.progress >= zone.from && s.progress <= zone.to && !s.visitedZones.includes(index)) {
        s.visitedZones.push(index); s.jamTicks = Math.max(s.jamTicks, Math.ceil((zone.to - s.progress) / RUN_SPEED));
      }
    });
    const mark = level.gateMarks[s.gate];
    if (mark !== undefined) {
      if (!s.gateResolved && gateGroundY(s.progress, mark) >= GATE_CONTACT_Y) {
        const option = gateChoicesFor(s)[0];s.gateResolved = true;
        s.gateChoices=s.gateChoices.map((row,i)=>i===s.gate?[option]:row);
        s.gateCollected = option.lane === s.lane;
        if (s.gateCollected) Object.assign(s, applyGateEffect(s, option));
      }
      if (s.gateResolved && s.progress >= mark + 2) { s.gate++; s.gateResolved = false; s.gateCollected = false; }
    }
    if (s.bots <= 0) return fail(s, null);
    level.hazards.forEach((h, index) => {
      if (s.hazardHps[index] <= 0 || s.progress < h.progress) return;
      if (s.lane === hazardLaneAt(s.layoutIndex, index, s.progress, s.levelIndex)) applySquadHit(s, h.horde ? 6 : h.armor ? 20 : 14,'collision');
      else if(!h.horde) s.score += 25;
      s.hazardHps[index] = -1;
    });
    if (s.bots <= 0) return fail(s, null);
    advanceRoadEnemies(s);
    const boss = level.encounters[s.encounter];
    if (boss && s.progress >= boss.progress) { s.progress = boss.progress; enterArena(s); }
    if (s.progress >= 100) { s.status = 'result'; s.won = s.bots > 0 && s.bossDefeated; s.score += s.won ? s.bots * 20 + 100 : 0; s.pendingShots = []; s.burns = []; s.threats = []; s.enemyAttacks = []; }
  }
  syncHazard(s);
  if (!canShoot(s.status)) return s;
  if (s.fireCooldown > 1) { s.fireCooldown--; return s; }
  if(s.dodgeTicks>0)return s;
  const spec = mechSpec(s.mechClass);
  const skill=coreSkill(s.mechClass),choices=targetsInLane(s,s.lane);
  const target = choices[0];
  if (s.mechClass === 'blade' && !target) { s.fireCooldown = 0; return s; }
  s.fireCooldown = attackIntervalFor(s);
  const tier = effectiveWeapon(s);
  if (tier >= 4) s.charge++;
  const charged = s.chargedVolleys > 0 || (tier >= 4 && s.charge >= 4);
  if (charged) { if (s.chargedVolleys > 0) s.chargedVolleys--; s.charge = 0; }
  const counterRange=attackRangeFor(s);const counter=s.ops.counterShots>0;if(counter)s.ops.counterShots--;
  const focused=s.mechClass==='pulse'&&s.report.focusReady;if(focused)s.report.focusReady=false;
  const origins = playerFormation(s);s.report.shots+=origins.length;
  for (const origin of origins) {
    const targets=s.burstTicks>0&&s.mechClass==='blade'?choices.slice(0,skill.cleave):s.mechClass==='blade'?choices.slice(0,2).filter((t,i)=>i===0||counter||t.target==='hazard'||t.target==='threat'):[target];
    for(const aim of targets){
      const y=aim?.y??freeShotEnd(s.levelIndex),duration=s.mechClass==='blade'?(s.burstTicks>0?5:3):flightTicks(origin.y,y)+(s.burstTicks>0&&s.mechClass==='heavy'?2:0);
      s.pendingShots.push({id:++s.shotSequence,ticks:duration,duration,target:aim?.target??null,targetIndex:aim?.index??-1,
        focused,fusion:s.ops.fusion,counter,arc:s.modules.arc,burn:s.modules.burn,burst:s.burstTicks>0,range:counterRange,attackStyle:s.mechClass,damage:(counter?1.7:1)*(1+tier)*spec.power*s.garageDamageScale*(charged?3:1)*(s.overloadTicks>0?1.5:1)*(s.burstTicks>0?(aim?.target==='boss'?skill.bossDamage:skill.damage):1),count:origins.length,origins:[origin],weaponLevel:tier,lane:s.lane,y,charged,pierce:Math.max(focused?1:0,tier===2?1:0,s.burstTicks>0?skill.pierce:0,s.ops.fusion==='ion'?1:0),muzzle:s.mechClass!=='blade'});
    }
  }
  return s;
}
