// Run from repository root: node --test src/games/toybot-breakout/simulation.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function load(name) {
  const file = path.resolve(__dirname, name + '.ts');
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  cache.set(file, module.exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('require', 'module', 'exports', code)((id) => id.startsWith('./') ? load(id) : require(id), module, module.exports);
  return module.exports;
}
const sim = load('simulation'), levels = load('level'), progression = load('progression');
const garage = { completedLevels: [true,true,true,true,false], tutorialCompleted: true, parts: 0, runs: 4, wins: 4, bestScore: 0, coreLevel: 0, unlockedLevel: 4, unlocked: { weapon: false, armor: false, core: false }, equipped: { weapon: false, armor: false, core: false } };
const initial = (level = 0) => ({ ...sim.createInitialState(garage, level, 0), bossRandomSeed: 42 });
const tick = s => sim.gameReducer(s, { type: 'TICK' });
function roadSpecialist(kind, levelIndex = 4, approach = 9.5) {
  const base = initial(levelIndex), spec = levels.getLevel(levelIndex);
  const index = spec.hazards.findIndex(h => h.kind === kind), h = spec.hazards[index];
  assert.ok(index >= 0, kind + ' must exist');
  return { index, state: { ...base, status: 'running', progress: h.progress - approach, lane: levels.hazardLaneAt(0,index,h.progress-approach,levelIndex), gate: spec.gateMarks.length, fireCooldown: 1000, hazardHps: spec.hazards.map((enemy,i) => i === index ? enemy.hp : -1) } };
}
function incoming(s, changes = {}) {
  return { id: 100, ticks: 1, duration: 3, target: 'boss', targetIndex: 0, damage: 20, count: 1, origins: [{ index: 0, x: 27, y: 59 }], weaponLevel: 1, lane: s.battleLane, y: 48, charged: false, pierce: 0, muzzle: true, ...changes };
}
function battle(level = 0) { const base = initial(level); return { ...base, hazardHps: base.hazardHps.map(() => -1), gate: levels.getLevel(level).gateMarks.length, status: 'battle', progress: levels.getLevel(level).encounters[0].progress, bots: 5, battleHp: 300, battleMaxHp: 300, fireCooldown: 1000, battleTime: 0, bossStep: 'recovery', bossStepTicks: 0, bossCycle: 1 }; }
// Counterplay-aware driver: early warning reaction accounts for the real .4s
// sidestep; aim at the advertised objective instead of blindly firing at shields.
function bossTactic(s) {
  if(s.dodgeTicks>0)return s.lane;
  const targets=s.threats.filter(t=>t.hp>0).sort((a,b)=>Math.abs(a.lane-s.lane)-Math.abs(b.lane-s.lane));
  let aim=targets[0]?.lane??s.battleLane;
  const danger=s.threats.filter(t=>t.hp!==0&&(t.kind==='field'||(t.kind==='lava'&&t.ticks===0)||t.damage>0&&t.ticks<=10)).map(t=>t.lane);
  danger.push(...s.enemyAttacks.filter(a=>a.phase==='flight'||a.ticks<=10).map(a=>a.lane));
  if(s.bossStep==='warning'&&sim.bossWarningTicks(s)-s.bossStepTicks<=10&&['vents','smelt','orbits','polarity','judgement','mortar','storm','crossfire'].includes(s.bossAttack))danger.push(...s.bossAttackLanes);
  if(sim.isRush(s)&&(s.bossStep==='rush'||(s.bossStep==='warning'&&s.bossStepTicks>=6)))danger.push(...s.bossAttackLanes);
  if(danger.includes(aim))aim=[0,1,2].filter(l=>!danger.includes(l)).sort((a,b)=>Math.abs(a-s.lane)-Math.abs(b-s.lane))[0]??s.lane;
  return aim;
}
test('each mech owns a captured muzzle and individual damage; lane changes leave fired shots fixed', () => {
  const s = tick({ ...initial(), status: 'running', bots: 5, weaponLevel: 2 });
  assert.equal(s.pendingShots.length, 5);
  assert.equal(new Set(s.pendingShots.map(p => JSON.stringify(p.origins[0]))).size, 5);
  assert.ok(s.pendingShots.every(p => p.damage === 3 && p.origins.length === 1));
  const moved = sim.gameReducer(s, { type: 'MOVE_LANE', lane: 2 });
  assert.deepEqual(moved.pendingShots, s.pendingShots);
  assert.ok(s.pendingShots.some(p => p.duration > s.pendingShots[0].duration));
});
test('raw growth damage has no fraction-of-max-hp cap; cross-lane shots never damage boss', () => {
  const s = battle(); s.battleHp = s.battleMaxHp = 100;
  assert.equal(tick({ ...s, pendingShots: [incoming(s, { damage: 30 })] }).battleHp, 59);
  assert.equal(tick({ ...s, pendingShots: [incoming(s, { lane: (s.battleLane + 1) % 3 })] }).battleHp, 100);
});
test('tier two pierces one further enemy in same lane and cannot hit a different lane', () => {
  const s = { ...initial(1), status: 'running', progress: 20, gate: 2, fireCooldown: 100 };
  s.pendingShots = [incoming(s, { target: 'hazard', targetIndex: 0, lane: 1, damage: 20, weaponLevel: 2, pierce: 1 })];
  let n = tick(s);
  assert.equal(n.hazardHps[0], 0);
  const continuation = n.pendingShots.find(p => !p.muzzle);
  assert.equal(continuation.targetIndex, 1);
  assert.equal(continuation.lane, 1);
  n = tick(tick(n));
  assert.equal(n.hazardHps[1], 3);
  assert.equal(n.hazardHps[2], s.hazardHps[2]);
});
test('tier three burn persists after leaving a lane and expires without retargeting', () => {
  let s = { ...initial(), status: 'running', progress: 10, gate: 1, fireCooldown: 100 };
  s.pendingShots = [incoming(s, { target: 'hazard', targetIndex: 0, lane: 1, damage: 4, weaponLevel: 3 })];
  s = tick(s); assert.equal(s.hazardHps[0], 4); assert.equal(s.burns.length, 1);
  s = sim.gameReducer(s, { type: 'MOVE_LANE', lane: 2 });
  s = tick(s); assert.equal(s.hazardHps[0], 2);
  for (let i = 0; i < 6; i++) s = tick(s);
  assert.equal(s.hazardHps[0], 0);
  assert.equal(s.hazardHps[1], levels.getLevel(0).hazards[1].hp);
});
test('tier four releases burst on fourth volley, preserving firing interval', () => {
  let s = { ...initial(), status: 'running', weaponLevel: 4 };
  const charged = [];
  for (let i = 0; i < 13; i++) { s = tick(s); if (s.fireCooldown === 4) charged.push(s.pendingShots.filter(p => p.ticks === p.duration).at(-1).charged); }
  assert.deepEqual(charged, [false, false, false, true]);
});
test('first attack has a fixed warning, one projectile, arrival damage, and a recovery window', () => {
  let s = { ...battle(), bossCycle: 0, bossStep: 'warning', bossStepTicks: 0, bossAttackLanes: [1], lane: 1, bots: 3 };
  for (let i = 0; i < 11; i++) { s = tick(s); assert.equal(s.threats.length, 0); }
  s = tick(s); assert.equal(s.bossStep, 'flight'); assert.equal(s.threats.length, 1); assert.equal(s.bots, 3);
  const launched = s;
  for (let i = 0; i < 12; i++) s = tick(s);
  assert.equal(s.bots, 3); assert.equal(s.playerHp, 86); assert.equal(s.bossStep, 'recovery');
  for (let i = 0; i < sim.BOSS_RECOVERY_TICKS - 1; i++) { s = tick(s); assert.equal(s.bossStep, 'recovery'); }
  let dodge = sim.gameReducer(launched, { type: 'MOVE_LANE', lane: 2 });
  for (let i = 0; i < 12; i++) dodge = tick(dodge);
  assert.equal(dodge.bots, 3);
  const armored = { ...initial(), bots: 3, armorLevel: 4, armorPoints: 2 };
  sim.applySquadHit(armored, 6); assert.equal(armored.playerHp, 100); assert.equal(armored.armorPoints, 0);
  armored.invulnerableTicks = 0; sim.applySquadHit(armored, 12); assert.equal(armored.playerHp, 88); assert.equal(armored.bots, 3);
});
test('late-stage shield reduces damage and dual attacks always leave a safe lane', () => {
  const s = { ...battle(2), bossStage: 2, bossStep: 'shield' };
  const protectedHp = tick({ ...s, pendingShots: [incoming(s)] }).battleHp;
  const exposedHp = tick({ ...s, bossStep: 'recovery', pendingShots: [incoming(s)] }).battleHp;
  assert.ok(protectedHp > exposedHp);
  const warning = tick({ ...battle(4), bossStage: 2, bossCycle: 1, bossStep: 'support', threats: [] });
  assert.equal(warning.bossAttackLanes.length, 2);
  assert.equal(new Set(warning.bossAttackLanes).size, 2);
});
test('temporary gates expire, pause freezes effects, and defeat cinematic finishes before result', () => {
  let s = sim.applyGateEffect(initial(), { effect: 'jam', amount: 1 });
  s = { ...s, status: 'running', weaponLevel: 3 };
  assert.equal(sim.effectiveWeapon(s), 2);
  const paused = sim.gameReducer(s, { type: 'PAUSE' }); assert.equal(tick(paused).jamTicks, 60);
  for (let i = 0; i < 60; i++) s = tick(s);
  assert.equal(s.jamTicks, 0); assert.equal(sim.effectiveWeapon(s), 3);
  const shell = { id: 1, kind: 'shell', lane: 1, ticks: 1, duration: 12, hp: -1, maxHp: 0, damage: 1, fromLane: 0 };
  s = tick({ ...battle(), bots: 1, playerHp: 1, lane: 1, threats: [shell] });
  assert.equal(s.status, 'defeat'); assert.equal(s.defeatReason, 'boss-wipe'); assert.equal(s.bots, 0);
  for (let i = 0; i < sim.BOSS_DEFEAT_TICKS - 1; i++) s = tick(s);
  assert.equal(s.status, 'defeat'); assert.equal(tick(s).status, 'result');
});
test('gates remain staggered, supply before boss is guaranteed, danger lanes are avoided', () => {
  for (let sector = 0; sector < 5; sector++) for (let repeat = 0; repeat < 100; repeat++) {
    const layout = repeat % 3, level = levels.getLevel(sector), choices = sim.createGateChoices(sector, layout);
    choices.forEach((options, i) => {
      assert.equal(options.length, 1);
      if (i && options[0].polarity === 'penalty') assert.equal(choices[i - 1][0].polarity, 'reward');
      level.hazards.forEach((h, hi) => { if (Math.abs(h.progress - level.gateMarks[i]) <= 6) assert.notEqual(options[0].lane, levels.hazardLaneAt(layout, hi, level.gateMarks[i], sector)); });
    });
    assert.equal(choices[0][0].effect, 'coreUp'); assert.equal(choices[1][0].effect, 'weaponUp');
    assert.ok(choices.slice(-2).every(options => options[0].polarity === 'reward'));
  }
});
test('five levels are selectable only after unlock; next level resets combat, local save migrates', () => {
  const locked = { ...garage, completedLevels: [false,false,false,false,false], unlockedLevel: 0, wins:0 };
  let s = sim.gameReducer(initial(), { type: 'SELECT_LEVEL', garage: locked, levelIndex: 4 });
  assert.equal(s.levelIndex, 0);
  s = sim.gameReducer({ ...s, status: 'result', won: true, bossDefeated: true, progress:100 }, { type: 'NEXT_LEVEL', garage: locked });
  assert.equal(s.levelIndex, 1); assert.equal(s.progress, 0); assert.equal(s.status, 'running');
  assert.equal(s.bots, 1); assert.equal(s.pendingShots.length, 0);
  assert.equal(progression.readGarage().unlockedLevel, 0);
});
test('all five levels and three classes complete roads and bosses by collecting rewards, aiming and dodging', () => {
  for (let seed = 1; seed <= 12; seed++) for (let levelIndex = 0; levelIndex < 5; levelIndex++) {
    let randomSeed = seed;
    const random = () => { randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0; return randomSeed / 4294967296; };
    let s = { ...initial(levelIndex), mechClass: ['pulse','heavy','blade'][(seed-1)%3], status: 'running', gateChoices: sim.createGateChoices(levelIndex, 0, random) }, ticks = 0;
    const level = levels.getLevel(levelIndex);
    while (sim.isActiveStatus(s.status)) {
      let lane = s.lane;
      if (sim.isBossArena(s)) {
        lane = s.battleLane;

        const incomingLanes = s.threats.filter(t => t.hp !== 0 && t.ticks <= 8).map(t => t.lane);
        if (sim.isRush(s) && (s.bossStep === 'rush' || (s.bossStep === 'warning' && s.bossStepTicks >= 10))) incomingLanes.push(...s.bossAttackLanes);
        if (incomingLanes.includes(lane)) lane = [0,1,2].find(l => !incomingLanes.includes(l)) ?? lane;
        lane=bossTactic(s);
      } else {
        const gate = s.gateChoices[s.gate]?.[0], mark = level.gateMarks[s.gate];
        const enemy = level.hazards.findIndex((h, i) => s.hazardHps[i] > 0 && s.progress >= h.progress - 14 && s.progress < h.progress);
        if (enemy >= 0) lane = levels.hazardLaneAt(s.layoutIndex, enemy, s.progress, levelIndex);
        const danger = level.hazards.flatMap((h, index) => s.hazardHps[index] > 0 && h.progress - s.progress < 1.5 && h.progress > s.progress ? [levels.hazardLaneAt(s.layoutIndex, index, s.progress, levelIndex)] : []);
        if (danger.includes(lane)) lane = [0,1,2].find(l => !danger.includes(l));
        if (!s.bossDefeated && s.progress >= level.encounters[0].progress - 5) lane = s.battleLane;
        if (gate && !s.gateResolved && s.progress >= mark - 2.5 && s.progress <= mark + 2) lane = gate.polarity === 'reward' ? gate.lane : (gate.lane + 1) % 3;
      }
      s = sim.gameReducer(s, { type: 'MOVE_LANE', lane }); s = tick(s); ticks++;
      assert.ok(ticks < 3500, `run must terminate: seed=${seed}, level=${levelIndex}, status=${s.status}, step=${s.bossStep}, phase=${s.bossPhaseTicks}, hp=${s.battleHp}, bots=${s.bots}, time=${s.battleTime}, cooldown=${s.fireCooldown}`);
    }
    assert.equal(s.won, true, `seed ${seed} level ${levelIndex + 1}: ${s.status} ${s.defeatReason} hp=${s.battleHp}, bots=${s.bots}`);
    assert.ok(ticks >= 450 && ticks <= 3500, `level ${levelIndex + 1}: ${ticks / 10}s`);
  }
});
test('gate art threshold and simulation share exact contact point; passing is once-only and a missed lane is not collected', () => {
  const mark = levels.getLevel(0).gateMarks[0];
  assert.equal(sim.gateGroundY(mark - 1.5, mark), sim.GATE_CONTACT_Y);
  const s = { ...initial(), status: 'running', progress: mark - 1.8, lane: 0, gateChoices: [[{ id: 'core', effect: 'coreUp', amount: 2, polarity: 'reward', lane: 0 }]], fireCooldown: 100 };
  let before = tick(s); assert.equal(before.gateResolved, false);
  const crossed = tick({ ...before, laneMoveTicks: 1 });
  assert.equal(crossed.gateCollected, true); assert.equal(crossed.bots, 3);
  assert.equal(tick(crossed).bots, 3);
  before = tick({ ...s, lane: 2 }); const missed = tick(before);
  assert.equal(missed.gateResolved, true); assert.equal(missed.gateCollected, false); assert.equal(missed.bots, 1);
});
test('emperor combines seals, judgement and crossfire without generic support summons', () => {
  let s = { ...battle(4), battleTime: 0, bossStage: 2, bossCycle: 1, battleHp: 10000, battleMaxHp: 10000, armorPoints: 1000, fireCooldown: 1000 };
  const lanes = new Set([s.battleLane]), kinds = new Set();
  for (let i = 0; i < 400; i++) { s = tick(s); s.threats.forEach(t => kinds.add(t.kind)); lanes.add(s.battleLane); }
  assert.ok(kinds.has('seal')&&kinds.has('field')&&kinds.has('shell'));assert.ok(!kinds.has('barrier')&&!kinds.has('minion'));assert.ok(lanes.size>1);
});
test('summoned blockers take real same-lane hits by stable id and intercept shots ahead of boss', () => {
  const minion = { id: 70, kind: 'minion', lane: 0, ticks: 20, duration: 42, hp: 5, maxHp: 5, damage: 1, fromLane: 0 };
  const s = { ...battle(), fireCooldown: 0, lane: 0, threats: [minion] };
  const fired = tick(s); assert.equal(fired.pendingShots[0].target, 'threat'); assert.equal(fired.pendingShots[0].targetIndex, 70);
  const hit = tick({ ...s, fireCooldown: 100, pendingShots: [incoming(s, { target: 'threat', targetIndex: 70, lane: 0, damage: 10 })] });
  assert.equal(hit.threats[0].hp, 0); assert.equal(hit.battleHp, s.battleHp); assert.equal(minion.hp, 5, 'reducer must not mutate previous entities');
  const miss = tick({ ...s, pendingShots: [incoming(s, { target: 'threat', targetIndex: 70, lane: 1, damage: 10 })] });
  assert.equal(miss.threats[0].hp, 5);
});
test('pause freezes hostile entities and boss defeat clears attacks before they can hit', () => {
  const threat = { id: 42, kind: 'shell', lane: 0, ticks: 1, duration: 12, hp: -1, maxHp: 0, damage: 1, fromLane: 0 };
  const s = { ...battle(), lane: 0, bots: 1, playerHp: 1, battleHp: 1, threats: [threat] };
  const paused = sim.gameReducer(s, { type: 'PAUSE' }); assert.deepEqual(tick(paused).threats, paused.threats);
  const victory = tick({ ...s, pendingShots: [incoming(s, { damage: 10 })] });
  assert.equal(victory.bossDefeated, true); assert.equal(victory.threats.length, 0); assert.equal(victory.bots, 1);
  const defeat = tick(s); assert.equal(defeat.status, 'defeat'); assert.equal(defeat.defeatReason, 'boss-wipe'); assert.equal(defeat.threats.length, 0);
});
test('untargeted bullets stay on the roadway and always travel forward', () => {
  for (let levelIndex = 0; levelIndex < 5; levelIndex++) {
    const s = tick({ ...initial(levelIndex), status: 'running', bots: 7 });
    for (const shot of s.pendingShots) {
      assert.equal(shot.target, null);
      assert.ok(shot.y >= sim.ROAD_HORIZON[levelIndex]);
      assert.ok(shot.y < shot.origins[0].y);
    }
  }
});
test('gate depth changes from behind the leader to in front only after crossing its ground line', () => {
  const mark = levels.getLevel(0).gateMarks[0];
  assert.ok(sim.gateGroundY(mark - 2, mark) < sim.GATE_CONTACT_Y);
  assert.ok(sim.gateGroundY(mark - 1, mark) > sim.GATE_CONTACT_Y);
  assert.equal(sim.laneXAt(0, sim.GATE_CONTACT_Y - 5), sim.LANE_CENTERS[0]);
});
test('arena entry cleans ordinary stage objects, preserves movement, and finishes the complete entrance before attacking', () => {
  const level = levels.getLevel(0), mark = level.encounters[0].progress;
  let s = { ...initial(), status: 'running', progress: mark - .1, gate: level.gateMarks.length, hazardHps: level.hazards.map(() => -1), pendingShots: [incoming(initial(), { target: null, ticks: 5 })], overloadTicks: 30 };
  s = tick(s); assert.equal(s.status, 'boss-intro'); assert.equal(s.pendingShots.length, 0); assert.equal(s.gate, level.gateMarks.length);
  const progress = s.progress, hp = s.battleHp;
  s = sim.gameReducer(s, { type: 'MOVE_LANE', lane: 2 }); assert.equal(s.lane, 2);
  for (let i = 0; i < sim.BOSS_INTRO_TICKS - 1; i++) { s = tick(s); assert.equal(s.status, 'boss-intro'); assert.equal(s.progress, progress); assert.equal(s.battleHp, hp); assert.equal(s.threats.length, 0); }
  const remaining = s.overloadTicks;
  s = tick(s); assert.equal(s.status, 'battle'); assert.equal(s.bossStep, 'warning'); assert.deepEqual(s.bossAttackLanes, [0]); assert.equal(s.bossAttack,'vents');assert.equal(s.overloadTicks, remaining);
});
test('selected tutorial cannon stays single, without roadblocks or robots mixed in', () => {
  for (let level = 0; level < 5; level++) {
    let s = { ...battle(level), bossCycle: 0, bossStage: 1, bossStep: 'warning', bossStepTicks: 0, bossAttackLanes: [1], lane: 2 };
    for (let i = 0; i < sim.BOSS_WARNING_TICKS + 12; i++) {
      s = tick(s); assert.ok(s.threats.every(t => t.kind === 'shell')); assert.ok(s.threats.length <= 1);
    }
    assert.equal(s.bossStep, 'recovery'); assert.equal(s.bots, 5);
  }
});
test('half health shifts only at a safe attack boundary, unfolds once, and returns to an output window', () => {
  let s = { ...battle(3), bossCycle: 0, bossStep: 'warning', bossStepTicks: 0, bossAttackLanes: [1], battleHp: 149 };
  for (let i = 0; i < 12; i++) { s = tick(s); assert.equal(s.status, 'battle'); }
  for (let i = 0; i < 12; i++) s = tick(s);
  assert.equal(s.bossStep, 'recovery'); s = tick(s);
  assert.equal(s.status, 'boss-shift'); assert.equal(s.bossStage, 2); assert.equal(s.battleHp, 149);
  assert.equal(s.threats.length, 0); assert.equal(s.pendingShots.length, 0);
  const hp = s.battleHp, time = s.battleTime;
  for (let i = 0; i < sim.BOSS_SHIFT_TICKS; i++) s = tick(s);
  assert.equal(s.status, 'battle'); assert.equal(s.bossStep, 'recovery'); assert.equal(s.bossStepTicks, 0); assert.equal(s.battleHp, hp); assert.equal(s.battleTime, time);
  for (let i = 0; i < 100; i++) { s = tick(s); assert.notEqual(s.status, 'boss-shift'); }
});
test('support and shells never compete for a dodge task in the same wave', () => {
  for (let level = 0; level < 5; level++) {
    let s = { ...battle(level), bossStage: 2, bossCycle: 1, bossStep: 'recovery', armorPoints: 1000, fireCooldown: 1000 };
    for (let i = 0; i < 220; i++) {
      s = tick(s);
      const active = s.threats.filter(t => t.hp !== 0);
      assert.ok(!(active.some(t => t.kind === 'shell') && active.some(t => t.kind !== 'shell')), `level ${level + 1}`);
      assert.ok(new Set(active.filter(t => t.kind !== 'shell').map(t => t.kind)).size <= 1);
      if (active.some(t => t.kind === 'shell')) assert.equal(s.bossStep, 'flight');
    }
  }
});
test('long fights intensify instead of failing on the old short timer', () => {
  let s = { ...battle(1), battleTime: sim.BOSS_ENRAGE_TICKS - 1, armorPoints: 1000, fireCooldown: 1000 };
  const hp = s.battleHp;
  s = tick(s); assert.equal(s.status, 'battle'); assert.equal(sim.bossEnrage(s), 1); assert.equal(s.battleHp, hp);
  let intensifiedSwarm = false;
  for (let i = 0; i < 300; i++) { s = tick(s); if (s.threats.some(t => t.kind === 'minion' && t.maxHp > 6)) intensifiedSwarm = true; }
  assert.equal(s.status, 'battle'); assert.ok(intensifiedSwarm);
});
test('victory animation finishes before rewards/result; subsequent ticks cannot score again', () => {
  const base = { ...battle(), battleHp: 1, bots: 2, score: 10 };
  let s = tick({ ...base, pendingShots: [incoming(base, { damage: 100 })] });
  assert.equal(s.status, 'boss-victory'); assert.equal(s.won, false); assert.equal(s.pendingShots.length, 0); assert.equal(s.burns.length, 0); assert.equal(s.threats.length, 0);
  const rewardScore = s.score;
  for (let i = 0; i < sim.BOSS_VICTORY_TICKS - 1; i++) { s = tick(s); assert.equal(s.status, 'boss-victory'); assert.equal(s.score, rewardScore); }
  s = tick(s); assert.equal(s.status, 'result'); assert.equal(s.won, true); assert.equal(s.progress, 100);
  assert.equal(s.score, rewardScore + 140); assert.deepEqual(tick(s), s);
});
test('pause and restart preserve or reset all cinematic stages correctly', () => {
  for (const status of ['boss-intro', 'boss-shift', 'boss-victory', 'defeat']) {
    const s = { ...battle(), status, bossPhaseTicks: 4, defeatTicks: 4 };
    const paused = sim.gameReducer(s, { type: 'PAUSE' }); assert.equal(paused.status, 'paused'); assert.deepEqual(tick(paused), paused);
    const resumed = sim.gameReducer(paused, { type: 'RESUME' }); assert.equal(resumed.status, status); assert.equal(resumed.bossPhaseTicks, 4);
    const reset = sim.gameReducer(paused, { type: 'RESTART', garage });
    assert.equal(reset.status, 'running'); assert.equal(reset.bossStage, 1); assert.equal(reset.bossPhaseTicks, 0); assert.equal(reset.threats.length, 0); assert.equal(reset.won, false);
  }
});

test('HP, shields, armor and invulnerability provide distinct non-stacking feedback', () => {
  const s = { ...battle(), bots: 5, shieldCharges: 1, armorPoints: 2 };
  sim.applySquadHit(s, 18); assert.equal(s.damageKind, 'shield'); assert.equal(s.playerHp, 100); assert.equal(s.shieldCharges, 0);
  const sequence = s.damageSequence; sim.applySquadHit(s, 18); assert.equal(s.damageSequence, sequence);
  s.invulnerableTicks = 0; sim.applySquadHit(s, 18); assert.equal(s.playerHp, 90); assert.equal(s.damageAbsorbed, 8); assert.equal(s.damageLoss, 10); assert.equal(s.bots, 5);
  const healed = sim.applyGateEffect(s, { effect: 'repair', amount: 2 }); assert.equal(healed.playerHp, 100);
  s.invulnerableTicks = 0; sim.applySquadHit(s, 999); assert.equal(s.playerHp, 0); assert.equal(s.bots, 0);
  const roadDeath = tick({ ...initial(), status: 'running', playerHp: 0 }); assert.equal(roadDeath.status, 'defeat'); assert.equal(roadDeath.defeatReason, 'squad-wipe');
});
test('new skill telegraphs remain locked while the player sidesteps and never fall back to ramming', () => {
  for(let level=0;level<5;level++)for(const stage of [1,2])for(const lane of [0,1,2])for(let cycle=1;cycle<=3;cycle++){
    let s=signature(level,stage,cycle,lane);assert.equal(sim.isRush(s),false);
    const locked=[...s.bossAttackLanes],warning=sim.bossWarningTicks(s);
    s=sim.gameReducer(s,{type:'MOVE_LANE',lane:(lane+1)%3});
    for(let i=0;i<warning-1;i++){s=tick(s);assert.equal(s.bossStep,'warning');assert.deepEqual(s.bossAttackLanes,locked);}
    assert.ok(new Set(locked).size<=2);assert.equal(s.damageSequence,0);
    const released=tick(s);assert.equal(released.bossStep,'flight');
  }
});
test('five bosses take 1–3 minutes with representative loadouts and telegraph-aware dodging', () => {
  const samples=[];
  for(let level=0;level<5;level++) for(const [bots,weaponLevel] of [[3,2],[5,3],[7,4]]) {
    const spec=levels.getLevel(level);
    let s=tick({...initial(level),status:'running',progress:spec.encounters[0].progress-.1,gate:spec.gateMarks.length,hazardHps:spec.hazards.map(()=>-1),bots,weaponLevel});
    const maxHp=s.battleMaxHp; let ticks=0;
    while(sim.isActiveStatus(s.status) && ticks<4000){
      let lane=s.battleLane;
      const danger=s.threats.filter(t=>t.hp!==0&&t.ticks<=8).map(t=>t.lane);
      if(sim.isRush(s)&&(s.bossStep==='rush'||(s.bossStep==='warning'&&s.bossStepTicks>=10))) danger.push(...s.bossAttackLanes);
      if(danger.includes(lane)) lane=[0,1,2].find(l=>!danger.includes(l))??lane;
      s=tick(sim.gameReducer(s,{type:'MOVE_LANE',lane:bossTactic(s)})); ticks++;
      assert.equal(s.battleMaxHp,maxHp,'boss HP must not grow during combat');
    }
    assert.equal(s.won,true); const seconds=ticks/10; samples.push(seconds);
    assert.ok(seconds>=60&&seconds<=180, 'level '+(level+1)+' bots '+bots+' W'+weaponLevel+': '+seconds+'s');
  }
  console.log('Boss balance sample seconds: '+samples.join(', '));
});

test('boss relocates between attacks, interpolates visually, and locks its lane through warning and flight', () => {
  const visited=new Set();
  for(const seed of [1,42,1000,1000000,4000000000]){
    let s={...battle(),bossRandomSeed:seed,bossStep:'recovery',bossStepTicks:0};
    const source=s, oldLane=s.battleLane, oldX=sim.bossX(s); s=tick(s); visited.add(s.battleLane);
    assert.notEqual(s.battleLane,oldLane); assert.equal(s.bossMoveTicks,sim.BOSS_MOVE_TICKS); assert.equal(sim.bossX(s),oldX);
    const movedLane=s.battleLane;
    const paused=sim.gameReducer(s,{type:'PAUSE'}); assert.deepEqual(tick(paused),paused);
    assert.deepEqual(tick(source),s,'same state must produce same random outcome');
    s=tick(s); assert.ok(Math.abs(sim.bossX(s)-oldX)>0); assert.deepEqual(sim.bossDamageLanes(s),[]);
    const hp=s.battleHp;
    s=tick({...s,pendingShots:[incoming(s,{lane:oldLane,damage:100})]}); assert.equal(s.battleHp,hp,'old lane shots cannot hit a relocating boss');
    while(s.bossMoveTicks>0)s=tick(s);
    assert.equal(sim.bossX(s),sim.laneXAt(movedLane,sim.bossY(s))); assert.deepEqual(sim.bossDamageLanes(s),[movedLane]);
    const hit=tick({...s,pendingShots:[incoming(s,{lane:movedLane,damage:20})]}); assert.ok(hit.battleHp<s.battleHp);
    s={...s,bossAttack:'cannon',bossStep:'warning',bossStepTicks:0,bossCycle:0,bossAttackLanes:[s.lane]};
    for(let i=0;i<24;i++){s=tick(s);assert.equal(s.battleLane,movedLane);}
  }
  assert.ok(visited.size>1,'different random seeds choose different lanes');
});

function signature(level, stage = 1, cycle = 1, lane = 1) {
  let s = tick({ ...battle(level), bossStage: stage, bossCycle: cycle, bossStep: 'support', lane, threats: [] });
  while (s.bossStep === 'shield') s = tick(s);
  return s;
}
function launch(s) { while(s.bossStep === 'warning') s=tick(s); return s; }
test('five bosses expose five different signature mechanics and never seal all three lanes', () => {
  assert.deepEqual([0,1,2,3,4].map(l=>signature(l).bossAttack), ['vents','eggs','pylons','orbits','seals']);
  for(let level=0;level<5;level++)for(const stage of [1,2])for(const lane of [0,1,2])for(let cycle=1;cycle<=4;cycle++){
    const s=signature(level,stage,cycle,lane);
    assert.ok(s.bossAttackLanes.length>0&&s.bossAttackLanes.length<3);
    assert.equal(new Set(s.bossAttackLanes).size,s.bossAttackLanes.length);
  }
});
test('forge lava lands after warning, lingers on ground, hurts on pulses and expires', () => {
  let s=signature(0,1,3);const lane=s.bossAttackLanes[0];s=launch(s);
  assert.equal(s.threats[0].kind,'lava');const id=s.threats[0].id;
  for(let i=0;i<17;i++){s=tick(s);assert.equal(s.playerHp,100);}
  s=tick(s);assert.equal(s.playerHp,92);assert.equal(sim.threatY(s.threats.find(t=>t.id===id)),59);assert.equal(s.bossStep,'flight');
  const hp=s.playerHp; s=sim.gameReducer(s,{type:'MOVE_LANE',lane:(lane+1)%3});
  const paused=sim.gameReducer(s,{type:'PAUSE'});assert.deepEqual(tick(paused),paused);
  for(let i=0;i<18;i++)s=tick(s);
  assert.equal(s.playerHp,hp);assert.equal(s.bossStep,'recovery');assert.ok(s.threats.every(t=>t.hp===0));
  assert.equal(signature(0,2,3).bossAttackLanes.length,2);
});
test('queen swarm can be destroyed with same-lane shots or dodged; flight waits for every drone', () => {
  const base=launch(signature(1,2,3));assert.equal(base.threats.length,2);assert.ok(base.threats.every(t=>t.kind==='minion'&&t.hp>0));
  const drone=base.threats[0];let s=tick({...base,pendingShots:[incoming(base,{target:'threat',targetIndex:drone.id,lane:drone.lane,damage:999})]});
  assert.equal(s.threats.find(t=>t.id===drone.id).hp,0);assert.equal(s.bossStep,'flight');
  const safe=[0,1,2].find(l=>!base.bossAttackLanes.includes(l));s=sim.gameReducer(s,{type:'MOVE_LANE',lane:safe});
  for(let i=0;i<32;i++)s=tick(s);assert.equal(s.playerHp,100);assert.equal(s.bossStep,'recovery');
});
test('bastion deploys shootable shields and now alternates with moving walls instead of ramming', () => {
  const s=launch(signature(2,2,3));assert.ok(s.threats.every(t=>t.kind==='barrier'&&t.hp>=22&&t.damage===22));
  assert.equal(signature(2,2,2).bossAttack,'lockdown');
  const barrier=s.threats[0];const hit=tick({...s,pendingShots:[incoming(s,{target:'threat',targetIndex:barrier.id,lane:barrier.lane,damage:999})]});assert.equal(hit.threats[0].hp,0);
});
test('oracle warns each sequential beam, changes lane in fixed order and never silently tracks the player', () => {
  let s=signature(3,1,3,0);const lanes=[];
  for(let wave=0;wave<3;wave++){
    assert.equal(s.bossStep,'warning');lanes.push(s.bossAttackLanes[0]);const locked=[...s.bossAttackLanes];
    s=sim.gameReducer(s,{type:'MOVE_LANE',lane:(locked[0]+1)%3});
    for(let i=0;i<sim.BOSS_WARNING_TICKS;i++){s=tick(s);assert.deepEqual(s.bossAttackLanes,locked);}
    assert.equal(s.threats.filter(t=>t.hp!==0)[0].kind,'beam');
    for(let i=0;i<8;i++)s=tick(s);
    assert.equal(s.playerHp,100);
  }
  assert.equal(new Set(lanes).size,3);assert.equal(s.bossStep,'recovery');
});
test('emperor crossfire advertises a safe gap, then warns again before changing it in phase two', () => {
  let s=signature(4,2,3);const first=[...s.bossAttackLanes];const safe=[0,1,2].find(l=>!first.includes(l));
  s=sim.gameReducer(s,{type:'MOVE_LANE',lane:safe});s=launch(s);assert.equal(s.threats.filter(t=>t.hp!==0).length,2);
  for(let i=0;i<12;i++)s=tick(s);assert.equal(s.playerHp,100);assert.equal(s.bossStep,'warning');assert.notDeepEqual(s.bossAttackLanes,first);assert.ok(s.bossAttackLanes.includes(safe));
  const nextSafe=[0,1,2].find(l=>!s.bossAttackLanes.includes(l));s=sim.gameReducer(s,{type:'MOVE_LANE',lane:nextSafe});s=launch(s);for(let i=0;i<12;i++)s=tick(s);
  assert.equal(s.playerHp,100);assert.equal(s.bossStep,'recovery');
});

test('every boss opens with its own mechanic instead of a shared tutorial cannon', () => {
  const attacks=[];
  for(let level=0;level<5;level++) {
    let s={...battle(level),status:'boss-intro',bossCycle:0,bossPhaseTicks:0};
    for(let i=0;i<sim.BOSS_INTRO_TICKS;i++)s=tick(s);
    attacks.push(s.bossAttack);assert.equal(s.bossStep,'warning');assert.equal(s.threats.length,0);
  }
  assert.deepEqual(attacks,['vents','eggs','pylons','orbits','seals']);
});

function roadDrone() {
  const s=initial();return tick({...s,status:'running',progress:levels.getLevel(0).hazards[0].progress-9.9,gate:2,fireCooldown:1000});
}
function supportEnemy(kind) {
  const s=battle(1),duration=kind==='minion'?32:36;
  return tick({...s,bossStep:'flight',bossSalvos:0,lane:1,threats:[{id:888,kind,lane:1,ticks:duration-6,duration,hp:100,maxHp:100,damage:10,fromLane:1}]});
}
test('road drone captures a lane, warns, fires exactly two projectiles and cannot reroll or mutate prior state', () => {
  let s=roadDrone();assert.equal(s.enemyAttacks.length,1);const attack=s.enemyAttacks[0];assert.equal(attack.kind,'drone-burst');assert.equal(attack.phase,'warning');
  for(let i=0;i<11;i++){s=tick(s);assert.equal(s.playerHp,100);}
  const previous=JSON.parse(JSON.stringify(s));s=tick(s);assert.equal(s.enemyAttacks[0].phase,'flight');assert.deepEqual(previous.enemyAttacks[0].phase,'warning');
  for(let i=0;i<8;i++)s=tick(s);assert.equal(s.playerHp,93);assert.equal(s.enemyAttacks[0].shotsRemaining,1);
  for(let i=0;i<6;i++)s=tick(s);assert.equal(s.playerHp,86);assert.equal(s.enemyAttacks.length,0);
  const used=s.enemyAttackSources.length;for(let i=0;i<5;i++)s=tick(s);assert.equal(s.enemyAttackSources.length,used);
  let dodge=roadDrone();const locked=dodge.enemyAttacks[0].lane;dodge=sim.gameReducer(dodge,{type:'MOVE_LANE',lane:(locked+1)%3});
  for(let i=0;i<26;i++)dodge=tick(dodge);assert.equal(dodge.playerHp,100);
});
test('destroying a charging drone cancels its volley; an already launched projectile persists', () => {
  const s=roadDrone();const canceled=tick({...s,hazardHps:s.hazardHps.map(()=>0)});assert.equal(canceled.enemyAttacks.length,0);
  let flight=s;for(let i=0;i<12;i++)flight=tick(flight);
  flight=tick({...flight,hazardHps:flight.hazardHps.map(()=>0)});assert.equal(flight.enemyAttacks.length,1);
  for(let i=0;i<13;i++)flight=tick(flight);assert.equal(flight.playerHp,93); assert.equal(flight.enemyAttacks.length,0,'destroyed drone cannot launch its second shot');
});
test('roadblock charges a same-lane shockwave that can be dodged or interrupted', () => {
  const s=supportEnemy('barrier');assert.equal(s.enemyAttacks[0].kind,'shockwave');assert.equal(s.bossStep,'flight');
  let hit=s;for(let i=0;i<17;i++){hit=tick(hit);assert.equal(hit.playerHp,100);}hit=tick(hit);assert.equal(hit.playerHp,88);assert.equal(hit.enemyAttacks.length,0);
  let dodge=sim.gameReducer(s,{type:'MOVE_LANE',lane:2});for(let i=0;i<18;i++)dodge=tick(dodge);assert.equal(dodge.playerHp,100);
  const destroyed=tick({...s,pendingShots:[incoming(s,{target:'threat',targetIndex:888,lane:1,damage:999})]});assert.equal(destroyed.enemyAttacks.length,0);
});
test('small robot visibly pounces along its own lane, deals one hit and leaves no second contact', () => {
  const s=supportEnemy('minion');assert.equal(s.enemyAttacks[0].kind,'pounce');let hit=s;
  for(let i=0;i<12;i++)hit=tick(hit);
  const from=sim.enemyThreatY(hit,hit.threats[0]);assert.equal(hit.enemyAttacks[0].phase,'flight');hit=tick(hit);assert.ok(sim.enemyThreatY(hit,hit.threats[0])>from);
  for(let i=0;i<5;i++)hit=tick(hit);assert.equal(hit.playerHp,86);assert.equal(hit.threats[0].hp,0);const seq=hit.damageSequence;
  for(let i=0;i<8;i++)hit=tick(hit);assert.equal(hit.playerHp,86);assert.equal(hit.damageSequence,seq);
  let dodge=sim.gameReducer(s,{type:'MOVE_LANE',lane:2});for(let i=0;i<18;i++)dodge=tick(dodge);assert.equal(dodge.playerHp,100);
});
test('extra enemy attacks freeze on pause and are cleared on arena entry, victory or lethal damage', () => {
  const s=roadDrone();const paused=sim.gameReducer(s,{type:'PAUSE'});assert.deepEqual(tick(paused),paused);
  const spec=levels.getLevel(0);const arena=tick({...s,gate:spec.gateMarks.length,progress:spec.encounters[0].progress-.1,hazardHps:s.hazardHps.map(()=>-1)});assert.equal(arena.status,'boss-intro');assert.equal(arena.enemyAttacks.length,0);
  const b=supportEnemy('barrier');const won=tick({...b,battleHp:1,pendingShots:[incoming(b,{lane:b.battleLane,damage:999})]});assert.equal(won.status,'boss-victory');assert.equal(won.enemyAttacks.length,0);
  let death=roadDrone();for(let i=0;i<12;i++)death=tick(death);death=tick({...death,playerHp:1,enemyAttacks:death.enemyAttacks.map(a=>({...a,ticks:1}))});assert.equal(death.status,'defeat');assert.equal(death.enemyAttacks.length,0);
});

test('pulse and heavy classes use different real attack cadence and per-hit damage', () => {
  for(const [mechClass,interval,power] of [['pulse',4,1],['heavy',10,3]]){
    let s={...initial(),mechClass,status:'running',bots:1,weaponLevel:2};s=tick(s);
    assert.equal(s.fireCooldown,interval);assert.equal(s.pendingShots[0].damage,3*power);assert.equal(s.pendingShots[0].attackStyle,mechClass);
    const first=s.shotSequence;for(let i=0;i<interval-1;i++)s=tick(s);assert.equal(s.shotSequence,first);s=tick(s);assert.equal(s.shotSequence,first+1);
  }
});
test('blade does not fire empty or distant shots and only resolves an in-range same-lane strike', () => {
  const base={...initial(),mechClass:'blade',status:'running',gate:2,fireCooldown:0,bots:1,hazardHps:[500,-1,-1,-1],lane:1};
  const empty=tick({...base,progress:0});assert.equal(empty.pendingShots.length,0);assert.equal(empty.fireCooldown,0);
  const distant=tick({...base,progress:14});assert.equal(distant.pendingShots.length,0);
  let close=tick({...base,progress:19});assert.equal(close.pendingShots.length,1);assert.equal(close.pendingShots[0].attackStyle,'blade');assert.equal(close.pendingShots[0].duration,3);assert.equal(close.pendingShots[0].muzzle,false);
  let escaped=sim.gameReducer(close,{type:'MOVE_LANE',lane:2});for(let i=0;i<3;i++)escaped=tick(escaped);assert.equal(escaped.hazardHps[0],500);
  for(let i=0;i<3;i++)close=tick(close);assert.equal(close.hazardHps[0],498);
});
test('blade squad attacks with every member, supports upgrades, and bosses enter its close arena', () => {
  let s={...battle(),mechClass:'blade',lane:0,battleLane:0,bossStep:'warning',bossCycle:0,bossAttackLanes:[1],fireCooldown:0,weaponLevel:2};
  assert.equal(sim.bossY(s),51);assert.equal(sim.bossY({...s,mechClass:'pulse'}),40);
  s=tick(s);assert.equal(s.pendingShots.length,5);assert.ok(s.pendingShots.every(p=>p.attackStyle==='blade'&&p.damage>6&&p.origins.length===1));
  const hp=s.battleHp;for(let i=0;i<3;i++)s=tick(s);assert.ok(s.battleHp<hp);
  const paused=sim.gameReducer(s,{type:'PAUSE'});assert.deepEqual(tick(paused),paused);
});
test('old garage saves migrate to pulse and new class choice persists across start/restart/next-level', () => {
  const before=global.window;
  try {
    let data={...garage,mechClass:'blade'};global.window={localStorage:{getItem:()=>JSON.stringify(data)}};
    assert.equal(progression.readGarage().mechClass,'blade');data={...garage,mechClass:'invalid'};assert.equal(progression.readGarage().mechClass,'pulse');data={...garage};assert.equal(progression.readGarage().mechClass,'pulse');
  } finally { if(before===undefined)delete global.window;else global.window=before; }
  const selected={...garage,mechClass:'heavy'};
  for(const type of ['START','RESTART','HOME'])assert.equal(sim.gameReducer(initial(),{type,garage:selected}).mechClass,'heavy');
  assert.equal(sim.gameReducer({...initial(),won:true,status:'result',bossDefeated:true,progress:100},{type:'NEXT_LEVEL',garage:selected}).mechClass,'heavy');
});
test('all three mech classes can beat five bosses with telegraphed dodging in 1–3 minutes', () => {
  const times=[];
  for(const mechClass of ['pulse','heavy','blade']) for(let level=0;level<5;level++){
    const spec=levels.getLevel(level);let s=tick({...initial(level),mechClass,status:'running',progress:spec.encounters[0].progress-.1,gate:spec.gateMarks.length,hazardHps:spec.hazards.map(()=>-1),bots:5,weaponLevel:3});let ticks=0;
    while(sim.isActiveStatus(s.status)&&ticks<3500){
      let lane=s.battleLane;const danger=s.threats.filter(t=>t.hp!==0&&t.ticks<=8).map(t=>t.lane);
      danger.push(...s.enemyAttacks.filter(a=>a.phase==='flight'||a.ticks<=4).map(a=>a.lane));
      if(sim.isRush(s)&&(s.bossStep==='rush'||(s.bossStep==='warning'&&s.bossStepTicks>=10)))danger.push(...s.bossAttackLanes);
      if(danger.includes(lane))lane=[0,1,2].find(l=>!danger.includes(l))??lane;
      s=tick(sim.gameReducer(s,{type:'MOVE_LANE',lane:bossTactic(s)}));ticks++;
    }
    assert.equal(s.won,true,mechClass+' level '+(level+1));assert.ok(ticks>=600&&ticks<=1800,mechClass+' level '+(level+1)+' '+ticks/10+'s');times.push(mechClass+' L'+(level+1)+':'+ticks/10);
  }
  console.log('Class boss balance '+times.join(', '));
});

test('v1 garage migration keeps parts, class, equipped choices and paid core levels without adding starting bots', () => {
  const old={...garage,parts:17,mechClass:'blade',coreLevel:2,unlocked:{weapon:true,armor:true,core:true},equipped:{weapon:true,armor:false,core:true}};
  const migrated=progression.normalizeGarage(old);
  assert.equal(migrated.version,2);assert.deepEqual(migrated.levels,{weapon:1,armor:1,core:2});assert.equal(migrated.parts,17);assert.equal(migrated.mechClass,'blade');assert.equal(migrated.equipped.armor,false);
  assert.deepEqual(progression.normalizeGarage(migrated),migrated);
  const s=sim.createInitialState(migrated);assert.equal(s.bots,1);assert.equal(s.garageCoreLevel,2);assert.equal(s.coreLevel,0);assert.equal(sim.attackIntervalFor(s),6);
});
test('all modules consume the exact tier cost, auto-equip, stop at five and refuse insufficient funds', () => {
  for(const id of ['weapon','armor','core']){
    let g=progression.normalizeGarage({...garage,parts:1000});let spent=0;
    for(let level=0;level<5;level++){
      const cost=progression.upgradeCost(g,id), before=JSON.parse(JSON.stringify(g));spent+=cost;
      const preview=progression.previewUpgrade(g,id);assert.equal(preview.parts,g.parts);assert.equal(progression.moduleLevel(preview,id),level+1);
      const next=progression.purchaseUpgrade(g,id);assert.deepEqual(g,before,'purchase must not mutate the prior save');g=next;
      assert.equal(progression.moduleLevel(g,id),level+1);assert.equal(g.parts,1000-spent);assert.equal(g.equipped[id],true);
    }
    assert.equal(progression.upgradeCost(g,id),0);assert.equal(progression.purchaseUpgrade(g,id),g);
    const broke=progression.normalizeGarage({...garage,parts:0});assert.equal(progression.purchaseUpgrade(broke,id),broke);assert.equal(progression.toggleUpgrade(broke,id),broke);
  }
});
test('every mech and every core tier starts with exactly one unit on start, restart and next level', () => {
  for(const mechClass of ['pulse','heavy','blade'])for(let core=0;core<=5;core++){
    const g=progression.normalizeGarage({...garage,mechClass,levels:{weapon:5,armor:5,core},equipped:{weapon:true,armor:true,core:true}});
    for(const type of ['START','RESTART','NEXT_LEVEL']){
      const s=sim.gameReducer({...initial(),status:'result',won:true,bossDefeated:true,progress:100},{type,garage:g});assert.equal(s.bots,1);assert.equal(s.playerHp,150);assert.equal(s.armorPoints,10);
      const recruited=sim.applyGateEffect(s,{effect:'coreUp',amount:2});assert.equal(recruited.bots,3,'in-run recruitment remains separate from permanent reactor tuning');
    }
  }
});
test('core improves actual cadence or fractional damage at every tier for all three classes', () => {
  for(const mechClass of ['pulse','heavy','blade']){
    let previousDamage=0,previousInterval=100;
    for(let core=0;core<=5;core++){
      const g=progression.normalizeGarage({...garage,mechClass,levels:{weapon:1,armor:0,core},equipped:{weapon:true,armor:false,core:true}});
      const base={...sim.createInitialState(g,0,0),status:'running',gate:6,progress:19,lane:1,fireCooldown:1000,hazardHps:[500,-1,-1,-1]};
      const shot=incoming(base,{target:'hazard',targetIndex:0,lane:1,damage:(1+base.weaponLevel)*load('mechs').mechSpec(mechClass).power*base.garageDamageScale,weaponLevel:0});
      const hit=tick({...base,pendingShots:[shot]}),damage=Number((500-hit.hazardHps[0]).toFixed(2)),interval=sim.attackIntervalFor(base);
      assert.ok(damage>previousDamage,mechClass+' core '+core+' must change actual damage');assert.ok(interval<=previousInterval);
      assert.ok(Math.abs(damage-progression.garageStats(g).damage)<.01);previousDamage=damage;previousInterval=interval;
    }
  }
});
test('module unequip retains paid levels and parts while removing its bonuses only from the next loadout', () => {
  const bought=progression.normalizeGarage({...garage,parts:100,levels:{weapon:3,armor:4,core:5},equipped:{weapon:true,armor:true,core:true}});
  const active=sim.createInitialState(bought),snapshot=JSON.parse(JSON.stringify(active));
  let off=bought;for(const id of ['weapon','armor','core'])off=progression.toggleUpgrade(off,id);
  assert.deepEqual(off.levels,bought.levels);assert.equal(off.parts,100);assert.deepEqual(progression.garageStats(off),{weapon:0,armor:0,core:0,damageScale:1,damage:1,interval:4,maxHp:100,armorPoints:0,startingBots:1});assert.deepEqual(active,snapshot);
  const on=progression.equipAllUpgrades(off);assert.deepEqual(on.levels,bought.levels);assert.deepEqual(on.equipped,bought.equipped);assert.deepEqual(progression.garageStats(on),progression.garageStats(bought));
  assert.equal(sim.createInitialState(off).bots,1);assert.equal(sim.createInitialState(on).bots,1);
});
test('garage read/write round trips levels safely and clamps corrupt or nonfinite progression values', () => {
  const before=global.window;let saved='';
  try{
    global.window={localStorage:{setItem:(key,value)=>{saved=value;},getItem:()=>saved}};
    const g=progression.normalizeGarage({...garage,parts:43,levels:{weapon:5,armor:3,core:4},equipped:{weapon:true,armor:false,core:true}});progression.saveGarage(g);assert.deepEqual(progression.readGarage(),g);
    const corrupt=progression.normalizeGarage({parts:Infinity,levels:{weapon:90,armor:-2,core:NaN},coreLevel:2});assert.equal(corrupt.parts,0);assert.deepEqual(corrupt.levels,{weapon:5,armor:0,core:0});
    saved='invalid json';assert.equal(progression.readGarage().parts,0);
  } finally { if(before===undefined)delete global.window;else global.window=before; }
});

test('each paid weapon tier increases actual enemy damage and core cadence controls the real volley timer', () => {
  for(const mechClass of ['pulse','heavy','blade']){
    let last=0;
    for(let weapon=0;weapon<=5;weapon++){
      const g=progression.normalizeGarage({...garage,mechClass,levels:{weapon,armor:0,core:0},equipped:{weapon:true,armor:false,core:false}});
      const base={...sim.createInitialState(g,0,0),status:'running',progress:19,gate:6,lane:1,fireCooldown:1000,hazardHps:[500,-1,-1,-1]};
      const raw=(1+base.weaponLevel)*load('mechs').mechSpec(mechClass).power*base.garageDamageScale;
      const n=tick({...base,pendingShots:[incoming(base,{target:'hazard',targetIndex:0,lane:1,damage:raw,weaponLevel:0})]});const damage=Number((500-n.hazardHps[0]).toFixed(2));assert.ok(damage>last);last=damage;
    }
    const upgraded=progression.normalizeGarage({...garage,mechClass,levels:{weapon:1,armor:0,core:5},equipped:{weapon:true,armor:false,core:true}});
    let s={...sim.createInitialState(upgraded,0,0),status:'running',progress:19,gate:6,lane:1,hazardHps:[10000,-1,-1,-1]};s=tick(s);const count=s.shotSequence,interval=sim.attackIntervalFor(s);assert.equal(s.fireCooldown,interval);for(let i=0;i<interval-1;i++)s=tick(s);assert.equal(s.shotSequence,count);assert.equal(tick(s).shotSequence,count+1);
  }
});

test('campaign unlocks exactly one next sector after a real completed boss victory', () => {
  let g=progression.normalizeGarage(null);
  assert.equal(g.unlockedLevel,0);assert.equal(g.tutorialCompleted,false);
  assert.equal(progression.canEnterLevel(g,1),false);
  const win=levelIndex=>({status:'result',won:true,bossDefeated:true,progress:100,levelIndex});
  assert.equal(progression.recordLevelCompletion(g,win(3)).unlockedLevel,0);
  for(let level=0;level<5;level++){
    for(const invalid of [{...win(level),won:false},{...win(level),bossDefeated:false},{...win(level),status:'boss-victory'},{...win(level),progress:99},{...win(level),progress:NaN}])assert.deepEqual(progression.recordLevelCompletion(g,invalid),g);
    g=progression.recordLevelCompletion(g,win(level));assert.equal(g.completedLevels[level],true);assert.equal(g.unlockedLevel,Math.min(4,level+1));
    assert.deepEqual(progression.recordLevelCompletion(g,win(0)),g,'replaying earlier clears must not skip a new sector');
  }
  assert.ok(g.completedLevels.every(Boolean));
});
test('locked selection, forged start and premature next-level actions cannot enter unopened sectors', () => {
  const g=progression.normalizeGarage(null),s=sim.createInitialState(g);
  assert.equal(sim.gameReducer(s,{type:'SELECT_LEVEL',levelIndex:4,garage:g}),s);
  assert.equal(sim.createInitialState(g,4).levelIndex,0);
  assert.equal(sim.gameReducer({...s,levelIndex:4},{type:'START',garage:g}).levelIndex,0);
  const invalid={...s,status:'result',won:true,progress:100,bossDefeated:false};assert.equal(sim.gameReducer(invalid,{type:'NEXT_LEVEL',garage:g}),invalid);
  const complete={...invalid,bossDefeated:true};const next=sim.gameReducer(complete,{type:'NEXT_LEVEL',garage:g});assert.equal(next.status,'running');assert.equal(next.levelIndex,1);
  const bad={...complete,levelIndex:3};assert.equal(sim.gameReducer(bad,{type:'NEXT_LEVEL',garage:g}),bad);
});
test('campaign save migration rejects development unlocks and noncontiguous clear records', () => {
  const forged=progression.normalizeGarage({unlockedLevel:4,wins:0});assert.equal(forged.unlockedLevel,0);assert.equal(forged.tutorialCompleted,false);
  const old=progression.normalizeGarage({unlockedLevel:2,wins:3,parts:17});assert.equal(old.unlockedLevel,2);assert.equal(old.tutorialCompleted,true);assert.equal(old.parts,17);
  const holes=progression.normalizeGarage({completedLevels:[true,false,true,true,true],unlockedLevel:4,wins:20});assert.deepEqual(holes.completedLevels,[true,false,false,false,false]);assert.equal(holes.unlockedLevel,1);
  const replay=progression.normalizeGarage({...old,tutorialCompleted:false});assert.equal(replay.tutorialCompleted,false);
});
const training=load('training'),trainTick=s=>training.trainingReducer(s,{type:'TICK'}),trainMove=(s,lane)=>training.trainingReducer(s,{type:'MOVE',lane}),trainNext=s=>training.trainingReducer(s,{type:'NEXT'});
function trainUntil(s,predicate,limit=200){for(let i=0;i<limit&&!predicate(s);i++)s=trainTick(s);assert.ok(predicate(s),'training objective should remain achievable');return s;}
test('training cannot skip objectives; movement and aimed automatic fire complete real tasks', () => {
  let s=training.createTrainingState();assert.equal(trainNext(s),s);s=trainMove(s,0);assert.equal(s.done,false);s=trainMove(s,2);assert.equal(s.done,true);
  s=trainNext(s);assert.equal(s.step,1);s=trainMove(s,0);for(let i=0;i<30;i++)s=trainTick(s);assert.equal(s.enemyHp,6);assert.equal(s.done,false);
  s=trainMove(s,2);s=trainUntil(s,n=>n.done);assert.equal(s.enemyHp,0);assert.equal(s.bots,1);
});
test('reward practice needs same-lane crossing and can retry a missed gate without duplicate recruits', () => {
  let s={...training.createTrainingState(),step:2,lane:2};for(let i=0;i<46;i++)s=trainTick(s);assert.equal(s.done,false);assert.equal(s.bots,1);assert.match(s.notice,/再试/);
  s=trainMove(s,0);s=trainUntil(s,n=>n.done);assert.equal(s.bots,3);for(let i=0;i<100;i++)s=trainTick(s);assert.equal(s.bots,3);
});
test('hazard training shows damage, permits retries and protects against permanent defeat', () => {
  let s={...training.createTrainingState(),step:3,lane:0,lockedLane:0};s=trainUntil(s,n=>n.damageSequence>0);assert.equal(s.health,85);assert.equal(s.done,false);
  for(let i=0;i<600;i++)s=trainTick(s);assert.ok(s.health>=1);s=trainMove(s,2);s=trainUntil(s,n=>n.done);assert.ok(s.health>=1);
});
test('boss practice locks warning lane, requires dodge plus counterattack and completes the whole tutorial', () => {
  let s=training.createTrainingState();s=trainNext(trainMove(trainMove(s,0),2));s=trainUntil(s,n=>n.done);s=trainNext(s);s=trainMove(s,0);s=trainUntil(s,n=>n.done);s=trainNext(s);s=trainMove(s,2);s=trainUntil(s,n=>n.done);s=trainNext(s);
  assert.equal(s.step,4);const locked=s.lockedLane;s=trainMove(s,(locked+1)%3);for(let i=0;i<30;i++){s=trainTick(s);assert.equal(s.lockedLane,locked);}assert.equal(s.dodged,true);assert.equal(s.health,100);
  s=trainMove(s,1);s=trainUntil(s,n=>n.done);assert.equal(s.enemyHp,0);s=trainNext(s);assert.equal(s.step,5);assert.equal(s.bots,3);
  const g=progression.normalizeGarage(null);assert.equal(progression.recordLevelCompletion(g,{status:'training',won:true,bossDefeated:true,progress:100,levelIndex:0}).unlockedLevel,0);
});
test('training pause freezes simulation and retry resets only the training state', () => {
  let s={...training.createTrainingState(),step:2,clock:20};s=training.trainingReducer(s,{type:'PAUSE'});assert.deepEqual(trainTick(s),s);assert.deepEqual(trainMove(s,0),s);assert.deepEqual(trainNext(s),s);
  assert.deepEqual(training.trainingReducer(s,{type:'RESTART'}),training.createTrainingState());
});

test('permanent tuning does not increase boss HP and visibly reduces simulated defeat time', () => {
  const times=[];
  for(const mechClass of ['pulse','heavy','blade'])for(const level of [0,4]){
    const results=[];let hp;
    for(const tuned of [false,true]){
      const g=progression.normalizeGarage({...garage,mechClass,levels:{weapon:tuned?5:0,armor:tuned?5:0,core:tuned?5:0},equipped:{weapon:tuned,armor:tuned,core:tuned}}),spec=levels.getLevel(level);
      let s=tick({...sim.createInitialState(g,level,0),bossRandomSeed:42,status:'running',progress:spec.encounters[0].progress-.1,gate:spec.gateMarks.length,hazardHps:spec.hazards.map(()=>-1),bots:5,weaponLevel:3}),ticks=0;
      if(hp===undefined)hp=s.battleMaxHp;else assert.equal(s.battleMaxHp,hp,'permanent upgrades must not strengthen this boss');
      while(sim.isActiveStatus(s.status)&&ticks<3500){let lane=s.battleLane;const danger=s.threats.filter(t=>t.hp!==0&&t.ticks<=8).map(t=>t.lane);danger.push(...s.enemyAttacks.filter(a=>a.phase==='flight'||a.ticks<=4).map(a=>a.lane));if(sim.isRush(s)&&(s.bossStep==='rush'||(s.bossStep==='warning'&&s.bossStepTicks>=10)))danger.push(...s.bossAttackLanes);if(danger.includes(lane))lane=[0,1,2].find(l=>!danger.includes(l))??lane;s=tick(sim.gameReducer(s,{type:'MOVE_LANE',lane:bossTactic(s)}));ticks++;}
      assert.equal(s.won,true);results.push(ticks/10);
    }
    assert.ok(results[1]<results[0]*.8,mechClass+' permanent tuning should be clearly faster');times.push(mechClass+' L'+(level+1)+' '+results.join(' -> '));
  }
  console.log('Permanent upgrade TTK: '+times.join(', '));
});
test('relative drag anchors make edge reversal responsive without jitter or invalid-coordinate jumps', () => {
 const interaction=load('interaction'),start={anchorX:200,lane:1,moved:false};assert.equal(interaction.advanceDrag(start,205,390),start);
 const left=interaction.advanceDrag(start,-100,390);assert.equal(left.lane,0);const reversed=interaction.advanceDrag(left,-60,390);assert.equal(reversed.lane,1);
 const right=interaction.advanceDrag(start,800,390);assert.equal(right.lane,2);assert.equal(interaction.advanceDrag(right,760,390).lane,1);
 assert.equal(interaction.advanceDrag(start,400,0),start);assert.equal(interaction.advanceDrag(start,NaN,390),start);
});
test('audio events coalesce a squad volley and distinguish weapons, armor, damage and outcomes', () => {
 const audio=load('audio'),s=battle();
 for(const mechClass of ['pulse','heavy','blade']){const n={...s,mechClass,shotSequence:11,fireCooldown:load('mechs').mechSpec(mechClass).interval};assert.deepEqual(audio.gameSoundEvents(s,n),[mechClass]);}
 assert.deepEqual(audio.gameSoundEvents(s,{...s,damageSequence:1,damageKind:'shield'}),['shield']);
 assert.deepEqual(audio.gameSoundEvents(s,{...s,damageSequence:1,damageKind:'health'}),['damage']);
 assert.deepEqual(audio.gameSoundEvents(s,{...s,status:'defeat'}),['defeat']);
 assert.deepEqual(audio.gameSoundEvents(s,{...s,status:'boss-victory'}),['victory']);
 assert.deepEqual(audio.gameSoundEvents(s,{...s,status:'paused',shotSequence:11}),[]);
 assert.deepEqual(audio.gameSoundEvents(s,{...s,runId:s.runId+1,shotSequence:11}),[]);
});
test('audio is gesture-unlocked, volume/mute aware, background-safe and disposable without browser audio', () => {
 const beforeWindow=global.window,beforeDocument=global.document;let created=0,started=0,closed=0;
 const parameter=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}});
 class FakeAudio {constructor(){created++;this.state='suspended';this.currentTime=0;this.destination={};}createGain(){return {gain:parameter(),connect(){},disconnect(){}};}createOscillator(){return {frequency:parameter(),connect(){},disconnect(){},start(){started++;},stop(){this.onended?.();}};}resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}close(){closed++;this.state='closed';return Promise.resolve();}}
 try{global.window={AudioContext:FakeAudio};global.document={hidden:false};const engine=load('audio').createGameAudio();assert.equal(created,0);engine.play('pulse');assert.equal(started,0);engine.unlock();assert.equal(created,1);engine.play('heavy');assert.equal(started,2);engine.setSettings({muted:true,volume:.5,quality:'auto'});engine.play('blade');assert.equal(started,2);engine.setSettings({muted:false,volume:.5,quality:'auto'});global.document.hidden=true;engine.play('gate');assert.equal(started,2);global.document.hidden=false;engine.suspend();engine.play('victory');assert.equal(started,2);engine.dispose();assert.equal(closed,1);engine.unlock();assert.equal(created,1);}
 finally{if(beforeWindow===undefined)delete global.window;else global.window=beforeWindow;if(beforeDocument===undefined)delete global.document;else global.document=beforeDocument;}
});
test('sound and quality settings normalize and persist independently of player progression', () => {
 const settings=load('settings'),before=global.window;let saved='';
 try{global.window={localStorage:{getItem:()=>saved,setItem:(_,value)=>{saved=value;}}};assert.equal(settings.readSettings().volume,.45);const choice={muted:true,volume:.37,quality:'low'};settings.saveSettings(choice);assert.deepEqual(settings.readSettings(),choice);assert.equal(settings.normalizeSettings({volume:100}).volume,1);assert.equal(settings.normalizeSettings({volume:NaN}).volume,.45);assert.equal(settings.resolveQuality({quality:'auto'},2,false),'low');assert.equal(settings.resolveQuality({quality:'high'},2,true),'high');}
 finally{if(before===undefined)delete global.window;else global.window=before;}
});
test('training checkpoints resume safely, save only a lesson index, and do not touch campaign records', () => {
 const before=global.window,store=new Map();
 try{global.window={localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value),removeItem:key=>store.delete(key)}};
 const g=progression.normalizeGarage({...garage,parts:17});progression.saveGarage(g);const campaign=[...store.entries()][0];
 training.saveTrainingCheckpoint({...training.createTrainingState(),step:4,health:1,clock:29,paused:true});const resumed=training.readTrainingCheckpoint();assert.equal(resumed.step,4);assert.equal(resumed.clock,0);assert.equal(resumed.health,100);assert.equal(resumed.paused,false);assert.equal(resumed.shots.length,0);assert.equal(resumed.bots,3);
 const checkpoint=JSON.parse([...store.entries()].find(([key])=>key.includes('training'))[1]);assert.deepEqual(Object.keys(checkpoint).sort(),['step','version']);
 training.clearTrainingCheckpoint();assert.equal(training.readTrainingCheckpoint().step,0);assert.equal(store.get(campaign[0]),campaign[1]);assert.equal(training.restoreTrainingCheckpoint({version:1,step:100}).step,0);
 }finally{if(before===undefined)delete global.window;else global.window=before;}
});
test('optimized art URLs resolve, transparent character sheets keep alpha, and original art is archived', () => {
 const art=load('art'),urls=[...art.MAP_ART,...Object.values(art.MECH_CLASS_ART),...Object.values(art.MECH_FRONT_ART),art.BOSS_ART,art.BOSS_INTRO_ART,art.BOSS_STAGE2_ART,art.BOSS_DEFEAT_ART,art.BOSS_RUSH_ART,art.GATE_ART,art.PLAYER_ART,art.THREAT_ART,art.UI_HANGAR_ART,art.UI_RESULT_CRESTS,art.BLADE_SLASH_ART,art.ENEMY_ART];
 for(const url of urls){assert.ok(url.includes('/optimized/'));const file=path.resolve(__dirname,'../../../public',url.slice(1));assert.ok(fs.existsSync(file),url);}
 for(const url of Object.values(art.MECH_CLASS_ART)){const b=fs.readFileSync(path.resolve(__dirname,'../../../public',url.slice(1)));assert.equal(b[25],6,'mech PNG must keep RGBA alpha');}
 assert.ok(fs.existsSync(path.join(__dirname,'art-source','ui-hangar-ai-v6.png')));
 for(const url of [...art.STORY_ART,art.STORY_COVER]){const bytes=fs.readFileSync(path.resolve(__dirname,'../../../public',url.slice(1)));assert.equal(bytes.readUInt16BE(0),0xffd8,'comic deployment images are JPEG');}
 for(let page=1;page<=4;page++)assert.ok(fs.existsSync(path.join(__dirname,'art-source',`story-comic-${page}-v11.png`)));
});

test('story chapters follow the five actual guardians and never replace playable levels',()=>{
 const story=load('story');assert.equal(story.STORY_PAGES.length,4);assert.equal(story.STORY_CHAPTERS.length,levels.LEVELS.length);
 story.STORY_CHAPTERS.forEach((chapter,index)=>assert.ok(chapter.objective.includes(levels.getLevel(index).encounters[0].label)));
});
test('story progress rejects unknown versions and corrupt page values',()=>{
 const {normalizeStoryProgress:n}=load('story');const fresh={version:1,page:0,dismissed:false,completed:false};
 for(const value of [null,[],{version:2,page:3,completed:true}])assert.deepEqual(n(value),fresh);
 for(const page of [NaN,Infinity,'2',-10])assert.equal(n({version:1,page}).page,0);
 assert.equal(n({version:1,page:99}).page,3);assert.equal(n({version:1,page:2.9}).page,2);
 assert.deepEqual(n({version:1,completed:true}),{...fresh,dismissed:true,completed:true});
});
test('comic skip, resume and completion persist separately from campaign and settings',()=>{
 const story=load('story'),settings=load('settings'),before=global.window,store=new Map();
 try{global.window={localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)}};
 progression.saveGarage(progression.normalizeGarage({...garage,parts:81}));settings.saveSettings({muted:true,volume:.3,quality:'low'});const existing=[...store.entries()];
 const bookmark={...story.readStoryProgress(),page:2};story.saveStoryProgress(bookmark);assert.deepEqual(story.readStoryProgress(),bookmark);
 story.saveStoryProgress(story.finishStory(bookmark,false));assert.deepEqual(story.readStoryProgress(),{...bookmark,dismissed:true});
 const complete=story.finishStory(story.readStoryProgress(),true);story.saveStoryProgress(complete);assert.equal(story.readStoryProgress().completed,true);assert.equal(story.finishStory(complete,false).completed,true);
 for(const [key,value] of existing)assert.equal(store.get(key),value);assert.equal(store.size,existing.length+1);
 }finally{if(before===undefined)delete global.window;else global.window=before;}
});
test('comic tolerates unavailable storage and malformed saved JSON',()=>{
 const story=load('story'),before=global.window;
 try{global.window={localStorage:{getItem:()=>'{broken',setItem:()=>{throw Error('quota');}}};assert.equal(story.readStoryProgress().page,0);assert.doesNotThrow(()=>story.saveStoryProgress(story.readStoryProgress()));
 global.window={localStorage:{getItem:()=>{throw Error('denied');}}};assert.equal(story.readStoryProgress().dismissed,false);
 }finally{if(before===undefined)delete global.window;else global.window=before;}
});

const campaign=load('campaign');
const campaignTick=s=>campaign.campaignReducer(s,{type:'TICK'});
const campaignStart=(route='signal',level=0)=>{let s=campaign.campaignReducer(campaign.createCampaign(initial(level)),{type:'START',garage});s=campaign.campaignReducer(s,{type:'STORY_NEXT'});return campaign.campaignReducer(s,{type:'STORY_ROUTE',route});};
test('chapter scenes freeze all simulation and input, survive pause, and skipping resumes without free rewards',()=>{
 let s=campaign.campaignReducer(campaign.createCampaign(initial()),{type:'START',garage});assert.equal(s.narrative.scene.kind,'briefing');assert.equal(s.progress,0);
 assert.equal(s.narrative.replay,true);assert.ok(campaign.sceneCopy(s).title.includes('维修巡查'));
 const fresh=campaign.campaignReducer(campaign.createCampaign(initial()),{type:'START',garage:progression.normalizeGarage({tutorialCompleted:true})});assert.equal(fresh.narrative.replay,false);assert.equal(campaign.sceneCopy(fresh).title,'重燃火花');
 assert.equal(campaignTick(s),s);assert.equal(campaign.campaignReducer(s,{type:'MOVE_LANE',lane:0}),s);
 s=campaign.campaignReducer(s,{type:'PAUSE'});assert.equal(s.status,'paused');assert.equal(campaignTick(s),s);assert.equal(campaign.campaignReducer(s,{type:'STORY_SKIP'}),s);
 s=campaign.campaignReducer(s,{type:'RESUME'});s=campaign.campaignReducer(s,{type:'STORY_SKIP'});assert.equal(s.narrative.scene,null);assert.equal(s.narrative.route,'signal');assert.equal(s.bots,1);assert.equal(s.shieldCharges,0);assert.ok(campaignTick(s).progress>0);
});
test('support route is a real same-lane road pickup with a contact window and once-only reward',()=>{
 for(const route of ['rescue','signal']){
  const base=campaignStart(route),lane=base.narrative.relayLane;
  const s={...base,lane,progress:22.4,fireCooldown:1000,hazardHps:base.hazardHps.map(()=>-1),gate:levels.getLevel(0).gateMarks.length};
  const before=JSON.stringify(s),collected=campaignTick(s);assert.equal(JSON.stringify(s),before,'input remains immutable');assert.equal(collected.narrative.objective,'collected');
  assert.equal(collected.bots,s.bots+Number(route==='rescue'));assert.equal(collected.shieldCharges,s.shieldCharges+Number(route==='signal'));assert.equal(campaignTick(collected).bots,collected.bots);assert.equal(campaignTick(collected).shieldCharges,collected.shieldCharges);
  let missed=campaignTick({...s,lane:(lane+1)%3});assert.equal(missed.narrative.objective,'pending');
  const late=campaignTick({...missed,lane});assert.equal(late.narrative.objective,'collected','lateral correction still works inside the contact window');
  for(let i=0;i<15;i++)missed=campaignTick(missed);assert.equal(missed.narrative.objective,'missed');assert.equal(missed.bots,s.bots);assert.equal(missed.shieldCharges,s.shieldCharges);
 }
});
test('support relays avoid nearby obstacle lanes across all chapters',()=>{
 for(let level=0;level<5;level++)for(let run=0;run<9;run++){
  const s=campaignStart('rescue',level),n=s.narrative;
  levels.getLevel(level).hazards.forEach((h,i)=>{if(Math.abs(h.progress-n.relayMark)<=5)assert.notEqual(n.relayLane,levels.hazardLaneAt(s.layoutIndex,i,n.relayMark,level));});
 }
});
test('boss conversation triggers on actual arena entry, never spends warning time, and does not repeat',()=>{
 let s=campaignStart();s={...s,progress:levels.getLevel(0).encounters[0].progress-.1,gate:levels.getLevel(0).gateMarks.length,hazardHps:s.hazardHps.map(()=>-1),fireCooldown:1000};
 s=campaignTick(s);assert.equal(s.status,'boss-intro');assert.equal(s.narrative.scene.kind,'confrontation');assert.equal(campaignTick(s),s);
 s=campaign.campaignReducer(s,{type:'STORY_NEXT'});assert.equal(s.narrative.scene.step,1);s=campaign.campaignReducer(s,{type:'STORY_NEXT'});
 for(let i=0;i<sim.BOSS_INTRO_TICKS;i++)s=campaignTick(s);assert.equal(s.status,'battle');assert.equal(s.narrative.scene,null);assert.equal(s.battleTime,0);
});
test('victory dialogue and ordered sync never create extra rewards or block next-level unlock',()=>{
 const base=campaign.createCampaign(battle());let s=campaignTick({...base,status:'boss-victory',bossDefeated:true,bossPhaseTicks:sim.BOSS_VICTORY_TICKS-1});
 assert.equal(s.status,'result');assert.equal(s.won,true);assert.equal(s.progress,100);assert.equal(s.narrative.scene.kind,'aftermath');const score=s.score;
 s=campaign.campaignReducer(s,{type:'STORY_NEXT'});assert.equal(campaign.campaignReducer(s,{type:'STORY_SYNC',index:2}),s);assert.equal(campaign.campaignReducer(s,{type:'STORY_NEXT'}),s);
 for(let i=0;i<3;i++){s=campaign.campaignReducer(s,{type:'STORY_SYNC',index:i});const duplicate=campaign.campaignReducer(s,{type:'STORY_SYNC',index:i});assert.equal(duplicate,s);}
 s=campaign.campaignReducer(s,{type:'STORY_NEXT'});assert.equal(s.narrative.scene,null);assert.equal(s.score,score);
 const next=campaign.campaignReducer(s,{type:'NEXT_LEVEL',garage});assert.equal(next.levelIndex,1);assert.equal(next.narrative.scene.kind,'briefing');assert.equal(next.narrative.objective,'inactive');
 const defeat=campaignTick({...base,status:'defeat',defeatTicks:sim.BOSS_DEFEAT_TICKS-1,bossDefeated:false});assert.equal(defeat.won,false);assert.equal(defeat.narrative.scene,null);
});
test('background lore is once per run, nonmodal, dismissible, and freezes during pause',()=>{
 let s=campaignStart();s=campaignTick({...s,progress:54.9,hazardHps:s.hazardHps.map(()=>-1),gate:levels.getLevel(0).gateMarks.length});assert.equal(s.narrative.radio.id,'sector-lore');assert.equal(s.narrative.scene,null);
 const paused=campaign.campaignReducer(s,{type:'PAUSE'});assert.equal(campaignTick(paused).narrative.radio.ticks,s.narrative.radio.ticks);
 s=campaign.campaignReducer(s,{type:'STORY_DISMISS_RADIO'});assert.equal(campaignTick(s).narrative.radio,null);
 const reset=campaign.campaignReducer(s,{type:'RESTART',garage});assert.deepEqual(reset.narrative.seen,['briefing']);
});
test('all chapter film cells stay within six frames and generated assets resolve with alpha relay',()=>{
 for(const kind of ['briefing','confrontation','aftermath'])for(const step of [0,1])for(const time of [0,900,5000,999999]){const frame=campaign.filmFrame(kind,step,time);assert.ok(frame>=0&&frame<6);assert.equal(campaign.filmFrame(kind,step,time,true),campaign.filmFrame(kind,step,0));}
 for(const url of campaign.CHAPTER_FILMS){const bytes=fs.readFileSync(path.resolve(__dirname,'../../../public',url.slice(1)));assert.equal(bytes.readUInt16BE(0),0xffd8);}
 const relay=fs.readFileSync(path.resolve(__dirname,'../../../public',campaign.RELAY_ART.slice(1)));assert.equal(relay[25],6);
});
test('interactive campaign completes all five sectors with both support routes and all chassis',()=>{
 for(const route of ['rescue','signal'])for(const mechClass of ['pulse','heavy','blade'])for(let sector=0;sector<5;sector++){
  let seed=42;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  let s=campaign.createCampaign({...initial(sector),mechClass,status:'running',gateChoices:sim.createGateChoices(sector,0,random)}),ticks=0;
  s.narrative.scene={kind:'briefing',step:0,synced:0};s=campaign.campaignReducer(s,{type:'STORY_NEXT'});s=campaign.campaignReducer(s,{type:'STORY_ROUTE',route});
  const chapter=levels.getLevel(sector),scenes=[];
  while(sim.isActiveStatus(s.status)||s.narrative.scene){
   if(s.narrative.scene){scenes.push(s.narrative.scene.kind);s=campaign.campaignReducer(s,{type:'STORY_SKIP'});continue;}
   let lane=s.lane;
   if(sim.isBossArena(s))lane=bossTactic(s);
   else{
    const gate=s.gateChoices[s.gate]?.[0],mark=chapter.gateMarks[s.gate];
    const enemy=chapter.hazards.findIndex((h,i)=>s.hazardHps[i]>0&&s.progress>=h.progress-14&&s.progress<h.progress);
    if(enemy>=0)lane=levels.hazardLaneAt(s.layoutIndex,enemy,s.progress,sector);
    const danger=chapter.hazards.flatMap((h,i)=>s.hazardHps[i]>0&&h.progress-s.progress<1.5&&h.progress>s.progress?[levels.hazardLaneAt(s.layoutIndex,i,s.progress,sector)]:[]);
    if(danger.includes(lane))lane=[0,1,2].find(l=>!danger.includes(l));
    if(s.progress>=chapter.encounters[0].progress-5)lane=s.battleLane;
    if(gate&&!s.gateResolved&&s.progress>=mark-2.5&&s.progress<=mark+2)lane=gate.polarity==='reward'?gate.lane:(gate.lane+1)%3;
    if(s.narrative.objective==='pending'&&s.progress>=22&&s.progress<26)lane=s.narrative.relayLane;
   }
   s=campaign.campaignReducer(s,{type:'MOVE_LANE',lane});s=campaignTick(s);assert.ok(++ticks<3500);
  }
  assert.equal(s.won,true,`${route} ${mechClass} sector ${sector+1}`);assert.equal(s.narrative.objective,'collected');assert.deepEqual(scenes,['confrontation','aftermath']);
 }
});

test('road encounter density grows by sector and introduces specialists gradually', () => {
  const totals = levels.LEVELS.map(l => l.hazards.length);
  assert.deepEqual(totals, [14,18,23,26,29]);
  assert.ok(totals.every((n,i) => i===0 || n>totals[i-1]));
  for(const [sector,l] of levels.LEVELS.entries()) {
    assert.equal(new Set(l.hazards.filter(h=>h.wave!==undefined).map(h=>h.wave)).size,3);
    assert.ok(l.hazards.filter(h=>h.kind==='swarm').every(h=>h.hp<=6));
    if(sector<2) assert.ok(!l.hazards.some(h=>h.kind==='bomber'));
    if(sector<3) assert.ok(!l.hazards.some(h=>h.kind==='medic'));
  }
});

test('sniper locks its warning, can be interrupted, and launched fire survives its source', () => {
  const {state,index}=roadSpecialist('sniper');let s=tick(state);
  assert.equal(s.enemyAttacks[0].kind,'sniper-shot');assert.equal(s.enemyAttacks[0].ticks,18);
  const lane=s.enemyAttacks[0].lane;
  const interrupted=tick({...s,hazardHps:s.hazardHps.map(()=>0)});assert.equal(interrupted.enemyAttacks.length,0);
  let dodge=sim.gameReducer(s,{type:'MOVE_LANE',lane:(lane+1)%3});
  for(let i=0;i<24;i++)dodge=tick(dodge);assert.equal(dodge.playerHp,100);
  for(let i=0;i<18;i++)s=tick(s);
  assert.equal(s.enemyAttacks[0].phase,'flight');
  s={...s,hazardHps:s.hazardHps.map(()=>0)};
  for(let i=0;i<6;i++)s=tick(s);
  assert.equal(s.playerHp,87);assert.equal(s.enemyAttacks.length,0);assert.equal(s.enemyAttackSources.filter(k=>k==='hazard:'+index).length,1);
});

test('bomber advertises two fixed lanes with one safe gap and cannot release after interruption', () => {
  const {state}=roadSpecialist('bomber');let s=tick(state);
  assert.equal(s.enemyAttacks.length,2);assert.ok(s.enemyAttacks.every(a=>a.kind==='bombard'&&a.phase==='warning'&&a.ticks===18));
  const lanes=s.enemyAttacks.map(a=>a.lane),safe=[0,1,2].find(l=>!lanes.includes(l));assert.notEqual(safe,undefined);
  const interrupted=tick({...s,hazardHps:s.hazardHps.map(()=>0)});assert.equal(interrupted.enemyAttacks.length,0);
  s=sim.gameReducer(s,{type:'MOVE_LANE',lane:safe});
  for(let i=0;i<30;i++)s=tick(s);
  assert.equal(s.playerHp,100);assert.equal(s.enemyAttacks.length,0);
});

test('assault swarm moves with its hitbox, deals one contact and cannot collide twice', () => {
  const {state,index}=roadSpecialist('swarm',0,4.9);let s=tick(state);
  assert.equal(s.enemyAttacks[0].kind,'charge');
  for(let i=0;i<10;i++)s=tick(s);
  const before=sim.roadEnemyY(s,index);s=tick(s);assert.ok(sim.roadEnemyY(s,index)>before);
  assert.equal(sim.targetY(s,'hazard',index),sim.roadEnemyY(s,index));
  for(let i=0;i<12;i++)s=tick(s);
  assert.equal(s.playerHp,92);assert.equal(s.hazardHps[index],-1);assert.equal(s.enemyAttacks.length,0);
});

test('repair drone heals a wounded living ally only in its lane, never resurrects or exceeds maximum', () => {
  const {state,index}=roadSpecialist('medic',3,9.5),spec=levels.getLevel(3),h=spec.hazards[index];
  const ally=spec.hazards.findIndex(e=>e.kind==='swarm'&&e.wave===h.wave);
  let s={...state,roadTicks:13,hazardHps:state.hazardHps.map((hp,i)=>i===ally?1:hp)};
  const healed=tick(s);assert.equal(healed.hazardHps[ally],3);assert.deepEqual(healed.medicPulses,[index]);assert.equal(healed.enemyAttacks.some(a=>a.sourceId===index),false);
  const dead=tick({...s,hazardHps:s.hazardHps.map((hp,i)=>i===ally?0:hp)});assert.equal(dead.hazardHps[ally],0);
  const stopped=tick({...s,hazardHps:s.hazardHps.map((hp,i)=>i===index?0:hp)});assert.equal(stopped.hazardHps[ally],1);
  const capped=tick({...s,hazardHps:s.hazardHps.map((hp,i)=>i===ally?spec.hazards[ally].hp-1:hp)});assert.equal(capped.hazardHps[ally],spec.hazards[ally].hp);
});

test('bomber destruction chains through nearby same-lane enemies, with bounded independent kill effects', () => {
  const {state,index}=roadSpecialist('bomber',4,4),spec=levels.getLevel(4),h=spec.hazards[index];
  const ally=spec.hazards.findIndex(e=>e.kind==='swarm'&&e.wave===h.wave);
  const other=spec.hazards.findIndex(e=>e.kind==='sniper'&&e.wave===h.wave);
  const s={...state,hazardHps:state.hazardHps.map((hp,i)=>i===ally?2:i===other?5:hp),pendingShots:[incoming(state,{target:'hazard',targetIndex:index,lane:state.lane,damage:999,weaponLevel:2})]};
  const snapshot=JSON.stringify(s),n=tick(s);
  assert.equal(JSON.stringify(s),snapshot);assert.equal(n.hazardHps[index],0);assert.equal(n.hazardHps[ally],0);assert.equal(n.hazardHps[other],5);
  assert.equal(n.kills,2);assert.equal(n.combo,2);assert.equal(n.killEffects.length,2);assert.equal(new Set(n.killEffects.map(e=>e.id)).size,2);
  let expired=n;for(let i=0;i<26;i++)expired=tick(expired);
  assert.equal(expired.combo,0);assert.equal(expired.killEffects.length,0);assert.equal(expired.bestCombo,2);
});

test('three kills grant a score multiplier and small capped recovery without changing gun cadence', () => {
  const {state,index}=roadSpecialist('swarm',0,4.9),lane=state.lane;
  const n=tick({...state,playerHp:99,combo:2,comboTicks:20,kills:2,fireCooldown:6,pendingShots:[incoming(state,{target:'hazard',targetIndex:index,lane,damage:99})]});
  assert.equal(n.combo,3);assert.equal(n.kills,3);assert.equal(n.playerHp,100);assert.equal(n.score,19);assert.equal(n.fireCooldown,5);
  const paused=sim.gameReducer(n,{type:'PAUSE'});assert.deepEqual(tick(paused),paused);
  const restarted=sim.gameReducer(n,{type:'RESTART',garage});assert.equal(restarted.combo,0);assert.equal(restarted.kills,0);assert.deepEqual(restarted.killEffects,[]);
});

test('mixed road pressure is bounded to two attack lanes and safely cleans up on arena entry', () => {
  for(let sector=0;sector<5;sector++)for(let layout=0;layout<3;layout++) {
    const spec=levels.getLevel(sector);let s={...sim.createInitialState(garage,sector,layout),status:'running',gate:spec.gateMarks.length,fireCooldown:10000,playerHp:10000,playerMaxHp:10000};
    let maxVisible=0;
    for(let i=0;i<450&&s.status==='running';i++) {
      s=tick(s);assert.ok(new Set(s.enemyAttacks.map(a=>a.lane)).size<=2);assert.ok(s.enemyAttacks.length<=2);
      maxVisible=Math.max(maxVisible,spec.hazards.filter((h,j)=>s.hazardHps[j]>0&&s.progress>=h.progress-14&&s.progress<h.progress).length);
    }
    assert.equal(s.status,'boss-intro');assert.deepEqual(s.enemyAttacks,[]);assert.ok(s.hazardHps.every(hp=>hp===-1));assert.ok(maxVisible<=12);
  }
});

test('enemy formation uses distinct horizontal muzzles and matched aiming positions without changing lanes', () => {
  const s={...initial(4),status:'running',progress:46},spec=levels.getLevel(4);
  const group=spec.hazards.map((h,i)=>({h,i})).filter(e=>e.h.kind==='swarm'&&e.h.wave===1);
  assert.equal(new Set(group.map(e=>[sim.roadEnemyX(s,e.i),sim.roadEnemyY(s,e.i)].join(':'))).size,group.length);
  for(const {i}of group) {
    assert.equal(sim.targetX(s,'hazard',i),sim.roadEnemyX(s,i));assert.equal(sim.targetY(s,'hazard',i),sim.roadEnemyY(s,i));
    const lane=levels.hazardLaneAt(0,i,s.progress,4);
    assert.ok(Math.abs(sim.roadEnemyX(s,i)-sim.laneXAt(lane,sim.roadEnemyY(s,i)))<=4);
    const hit=tick({...s,fireCooldown:1000,pendingShots:[incoming(s,{target:'hazard',targetIndex:i,lane,damage:1})]});
    assert.equal(hit.impactX,sim.roadEnemyX(s,i));
  }
});

test('road attacks and incoming body collisions never remove the final escape lane', () => {
  for(let sector=0;sector<5;sector++)for(let layout=0;layout<3;layout++) {
    const spec=levels.getLevel(sector);let s={...sim.createInitialState(garage,sector,layout),status:'running',gate:spec.gateMarks.length,fireCooldown:10000,playerHp:10000,playerMaxHp:10000};
    for(let i=0;i<450&&s.status==='running';i++) {
      const lanes=s.enemyAttacks.map(a=>a.lane);
      spec.hazards.forEach((h,j)=>{if(s.hazardHps[j]>0&&h.progress-s.progress<1.5&&h.progress>s.progress)lanes.push(levels.hazardLaneAt(layout,j,h.progress,sector));});
      assert.ok(new Set(lanes).size<=2,`sector ${sector} layout ${layout} progress ${s.progress}: ${lanes}`);
      s=tick(s);
    }
  }
});

test('specialist spacing converges at contact and enemy shots start at the actual unit center', () => {
  for(const kind of ['swarm','sniper','bomber','medic']) {
    const {state,index}=roadSpecialist(kind),h=levels.getLevel(4).hazards[index];
    const contact={...state,progress:h.progress-.1};assert.ok(sim.roadEnemyY(contact,index)>57);
    if(kind!=='medic') {const queued=tick({...state,progress:h.progress-(kind==='swarm'?4.9:9.5)});assert.equal(queued.enemyAttacks[0].fromX,sim.roadEnemyX(queued,index));}
  }
});

test('each boss owns three different skills and no loadout uses shared cannon or body rush', () => {
  const groups=load('bossSkills').BOSS_LOADOUTS;
  assert.equal(groups.length,5);
  for(let level=0;level<5;level++) {
    assert.equal(new Set(groups[level]).size,3);assert.ok(groups[level].every(a=>!['cannon','rush','sweep','burst'].includes(a)));
    for(let cycle=1;cycle<=3;cycle++)assert.equal(signature(level,1,cycle).bossAttack,groups[level][cycle-1]);
  }
});

test('furnace vents erupt on the ground and warn again before moving to a new lane', () => {
  let s=signature(0,1,1),locked=[...s.bossAttackLanes];s=launch(s);
  assert.equal(s.threats[0].kind,'lava');assert.equal(s.threats[0].originY,59);assert.equal(s.threats[0].duration,1);
  s={...s,lane:(locked[0]+1)%3,dodgeTicks:0};
  for(let i=0;i<12;i++)s=tick(s);
  assert.equal(s.bossStep,'warning');assert.notDeepEqual(s.bossAttackLanes,locked);assert.equal(s.bossStepTicks,0);assert.equal(s.playerHp,100);
});

test('destroying an egg prevents its hatch; a surviving egg produces a separate shootable minion', () => {
  const base=launch(signature(1,1,1)),egg=base.threats[0];
  let broken=tick({...base,pendingShots:[incoming(base,{target:'threat',targetIndex:egg.id,lane:egg.lane,damage:999})]});
  for(let i=0;i<29;i++)broken=tick(broken);
  assert.ok(!broken.threats.some(t=>t.kind==='minion'&&t.lane===egg.lane));
  let hatched=base;for(let i=0;i<30;i++)hatched=tick(hatched);
  assert.ok(hatched.threats.some(t=>t.kind==='minion'&&t.hp>0));assert.ok(hatched.threats.filter(t=>t.kind==='egg').every(t=>t.hp===0));
});

test('queen siphon heals only while its tether lives and is capped at maximum health', () => {
  let base=launch(signature(1,1,2));base={...base,battleHp:200};const source=base.threats[0];
  let healed=base;for(let i=0;i<10;i++)healed=tick(healed);assert.equal(healed.battleHp,203);
  let stopped=tick({...base,pendingShots:[incoming(base,{target:'threat',targetIndex:source.id,lane:source.lane,damage:999})]});
  for(let i=0;i<10;i++)stopped=tick(stopped);assert.equal(stopped.battleHp,200);
  let capped={...base,battleHp:299};for(let i=0;i<10;i++)capped=tick(capped);assert.equal(capped.battleHp,300);
});

test('bastion shield nodes suppress boss damage and breaking both exposes the core', () => {
  const base=launch(signature(2,1,1));assert.equal(base.threats.filter(t=>t.kind==='pylon').length,2);assert.ok(sim.bossGuarded(base));
  const blocked=tick({...base,pendingShots:[incoming(base,{lane:base.battleLane,damage:20})]});assert.equal(base.battleHp-blocked.battleHp,2);
  let clear=base;for(const node of base.threats)clear=tick({...clear,pendingShots:[incoming(clear,{target:'threat',targetIndex:node.id,lane:node.lane,damage:999})]});
  assert.equal(sim.bossGuarded(clear),false);
  const hit=tick({...clear,pendingShots:[incoming(clear,{lane:clear.battleLane,damage:20})]});assert.ok(clear.battleHp-hit.battleHp>=20);
});

test('oracle conductive core anchors both fields and destroying it shuts them down before damage', () => {
  const base=launch(signature(3,1,1)),core=base.threats.find(t=>t.kind==='orb'),fields=base.threats.filter(t=>t.kind==='field');
  assert.equal(fields.length,2);assert.ok(fields.every(t=>t.linkId===core.id&&t.lane!==core.lane));
  const hit=tick({...base,lane:fields[0].lane,threats:base.threats.map(t=>({...t,ticks:9})),pendingShots:[incoming(base,{target:'threat',targetIndex:core.id,lane:core.lane,damage:999})]});
  assert.equal(hit.playerHp,100);assert.ok(hit.threats.filter(t=>t.kind==='field').every(t=>t.hp===0));
});

test('emperor seals can be interrupted and judgement gives three separately telegraphed safe gaps', () => {
  const base=launch(signature(4,1,1)),seal=base.threats[0];
  const broken=tick({...base,pendingShots:[incoming(base,{target:'threat',targetIndex:seal.id,lane:seal.lane,damage:999})]});assert.equal(broken.threats.find(t=>t.id===seal.id).hp,0);
  let s=signature(4,1,2),gaps=[];
  for(let i=0;i<130;i++) {
    if(s.bossStep==='warning'&&s.bossStepTicks===0)gaps.push([0,1,2].find(l=>!s.bossAttackLanes.includes(l)));
    if(s.bossStep==='recovery')break;
    s=tick(sim.gameReducer(s,{type:'MOVE_LANE',lane:bossTactic(s)}));
  }
  assert.equal(gaps.length,3);assert.equal(new Set(gaps).size,3);assert.equal(s.playerHp,100);
});

test('arena sidestep has moving hitbox, preserves shot origins and does not grant blanket invulnerability', () => {
  const base={...battle(),lane:1,battleLane:1,bossStep:'warning',bossStepTicks:0,fireCooldown:0,pendingShots:[]};
  const moved=sim.gameReducer(base,{type:'MOVE_LANE',lane:2});assert.equal(moved.dodgeTicks,4);assert.equal(sim.playerLaneFor(moved),1);
  assert.equal(sim.playerFormation(moved)[0].x,50);
  const shell={id:88,kind:'shell',lane:1,ticks:1,duration:8,hp:-1,maxHp:0,damage:12,fromLane:1};
  const early=tick({...moved,threats:[shell]});assert.equal(early.playerHp,88,'early movement is still in the source lane');assert.equal(early.pendingShots.length,0);
  const middle=tick({...moved,dodgeTicks:3,threats:[shell]});assert.equal(sim.playerLaneFor(middle),2);assert.equal(middle.playerHp,100);assert.equal(middle.evadeSequence,1);
  assert.ok(sim.playerFormation(middle)[0].x>50&&sim.playerFormation(middle)[0].x<73);
  const destination=tick({...moved,dodgeTicks:3,threats:[{...shell,lane:2}]});assert.equal(destination.playerHp,88,'cannot dodge into an active attack for free');
  const spam=sim.gameReducer(moved,{type:'MOVE_LANE',lane:0});assert.equal(spam.dodgeTicks,moved.dodgeTicks);assert.equal(spam.dodgeSequence,moved.dodgeSequence);assert.equal(spam.queuedLane,0);
  let landed=moved;for(let i=0;i<4;i++)landed=tick(landed);assert.equal(landed.dodgeTicks,0);assert.equal(sim.playerFormation(landed)[0].x,73);assert.ok(landed.pendingShots.every(p=>p.origins[0].x>=60));
  const paused=sim.gameReducer(moved,{type:'PAUSE'});assert.deepEqual(tick(paused),paused);
});

test('eight-frame combat sheets retain alpha and exact frame boundaries for all three classes', () => {
  const art=load('art');
  for(const url of Object.values(art.BATTLE_ART)) {
    const file=path.resolve(__dirname,'../../../public',url.slice(1)),data=fs.readFileSync(file);
    assert.equal(data.readUInt32BE(16),1536);assert.equal(data.readUInt32BE(20),576);assert.equal(data[25],6);
    assert.equal(data.readUInt32BE(16)/8,data.readUInt32BE(20)/3);
    assert.ok(fs.existsSync(path.join(__dirname,'art-source',path.basename(file))));
  }
  for(const [url,cols,rows]of [[art.BOSS_CAST_ART,8,5],[art.BOSS_OBJECTIVE_ART,4,2]]) {
    const data=fs.readFileSync(path.resolve(__dirname,'../../../public',url.slice(1)));
    assert.equal(data.readUInt32BE(16)%cols,0);assert.equal(data.readUInt32BE(20)%rows,0);assert.equal(data[25],6);
  }
});

test('dodge sound is separate from hurt feedback and evade confirmation needs a real missed attack', () => {
  const audio=load('audio'),base=battle(),move=sim.gameReducer(base,{type:'MOVE_LANE',lane:2});
  assert.ok(audio.gameSoundEvents(base,move).includes('dodge'));assert.ok(!audio.gameSoundEvents(base,move).includes('evade'));
  const shell={id:90,kind:'shell',lane:1,ticks:1,duration:8,hp:-1,maxHp:0,damage:12,fromLane:1};
  const success=tick({...move,dodgeTicks:3,threats:[shell]});
  assert.ok(audio.gameSoundEvents(move,success).includes('evade'));assert.ok(!audio.gameSoundEvents(move,success).includes('damage'));
});

test('two-lane dodge requests are buffered into two continuous adjacent steps without resetting timers', () => {
  let s=sim.gameReducer({...battle(),lane:0},{type:'MOVE_LANE',lane:2});
  assert.equal(s.lane,1);assert.equal(s.queuedLane,2);assert.equal(s.dodgeSequence,1);
  for(let i=0;i<4;i++)s=tick(s);
  assert.equal(s.lane,2);assert.equal(s.dodgeFromLane,1);assert.equal(s.dodgeTicks,4);assert.equal(s.dodgeSequence,2);assert.equal(sim.playerFormation(s)[0].x,50);
  for(let i=0;i<4;i++)s=tick(s);
  assert.equal(s.dodgeTicks,0);assert.equal(s.queuedLane,null);assert.equal(sim.playerFormation(s)[0].x,73);
});
