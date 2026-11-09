// Run from repository root: node --test src/games/toybot-breakout/simulation.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const migrationV43=JSON.parse(fs.readFileSync(path.join(__dirname,'asset-migration-v43.json'),'utf8'));
function fixturePath(file){if(fs.existsSync(file))return file;const normalized=String(file).replaceAll('\\','/');if(normalized.includes('/optimized/')){const item=migrationV43.converted.find(m=>m.from===path.basename(file));if(item)return path.join(path.dirname(file),item.to);}if(normalized.includes('/art-source/')&&String(file).endsWith('.webp'))return String(file).replace(/\.webp$/,'.png');return file;}
const readFixture=(file,...args)=>fs.readFileSync(fixturePath(file),...args);
const fixtureExists=file=>fs.existsSync(fixturePath(file));
function imageInfo(b){
 if(b.toString('ascii',1,4)==='PNG')return {width:b.readUInt32BE(16),height:b.readUInt32BE(20),alpha:b[25]===6};
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');
 for(let i=12;i+8<b.length;){const kind=b.toString('ascii',i,i+4),size=b.readUInt32LE(i+4),at=i+8;
  if(kind==='VP8X')return {width:1+b.readUIntLE(at+4,3),height:1+b.readUIntLE(at+7,3),alpha:!!(b[at]&16)};
  if(kind==='VP8L'){assert.equal(b[at],47);const v=b.readUInt32LE(at+1);return {width:(v&16383)+1,height:((v>>>14)&16383)+1,alpha:!!(v>>>28&1)};}
  i=at+size+(size%2);
 }throw Error('Unsupported artwork container');
}

const cache = new Map();
function load(name) {
  const file = path.resolve(__dirname, name + '.ts');
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  cache.set(file, module.exports);
  const code = ts.transpileModule(readFixture(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('require', 'module', 'exports', code)((id) => id.startsWith('./') ? load(id) : require(id), module, module.exports);
  return module.exports;
}
const sim = load('simulation'), levels = load('level'), progression = load('progression');
const garage = { completedLevels: [true,true,true,true,false], tutorialCompleted: true, parts: 0, runs: 4, wins: 4, bestScore: 0, coreLevel: 0, unlockedLevel: 4, unlocked: { weapon: false, armor: false, core: false }, equipped: { weapon: false, armor: false, core: false } };
const initial = (level = 0) => ({ ...sim.createInitialState(garage, level, 0), bossRandomSeed: 42 });
const tick = s => sim.gameReducer(s, { type: 'TICK' });

test('combat reports count landed damage, preserve previous state and reject cross-lane hits',()=>{
 const s=battle();s.pendingShots=[incoming(s,{damage:10})];
 const old=JSON.stringify(s),n=tick(s);assert.ok(n.report.dealt>0);assert.equal(n.report.bossDamage,n.report.dealt);assert.equal(JSON.stringify(s),old);
 const miss=tick({...battle(),pendingShots:[incoming(s,{lane:(s.battleLane+1)%3})]});assert.equal(miss.report.dealt,0);assert.equal(miss.feedback.length,0);
});
test('reports distinguish collisions, skills and absorption without double counting invulnerability',()=>{
 const s=initial();s.status='running';s.shieldCharges=1;sim.applySquadHit(s,20,'collision');assert.equal(s.report.blocked,20);assert.equal(s.report.taken,0);
 s.invulnerableTicks=0;sim.applySquadHit(s,8,'collision');assert.equal(s.report.collisions,8);sim.applySquadHit(s,20);assert.equal(s.report.taken,8);
 s.invulnerableTicks=0;sim.applySquadHit(s,12);assert.equal(s.report.hostile,12);assert.equal(s.report.taken,20);
});
test('pulse focus grants lane-bound penetration without multiplying boss damage or shortening cadence',()=>{
 let s={...battle(),bossStepTicks:5,battleHp:10000,battleMaxHp:10000,report:{...initial().report,focus:5}};
 s=tick({...s,pendingShots:[incoming(s,{damage:2})]});assert.equal(s.report.focusReady,true);assert.equal(s.chargedVolleys,0);
 s=tick({...s,lane:s.battleLane,fireCooldown:0});assert.ok(s.pendingShots.length>0&&s.pendingShots.every(p=>p.pierce>=1&&!p.charged&&p.focused));assert.equal(s.fireCooldown,sim.attackIntervalFor(s));assert.equal(s.report.focusReady,false);
});
test('heavy basic splash affects at most two nearby same-lane enemies',()=>{
 const {level,ids,state}=eliteScene();const own=ids.slice(0,4),other=level.hazards.findIndex(h=>h.horde&&h.wave===0&&h.slot===1);
 const s={...state,mechClass:'heavy',progress:39,hazardHps:state.hazardHps.map((_,i)=>own.includes(i)||i===other?100:-1)};
 const n=tick({...s,pendingShots:[incoming(s,{target:'hazard',targetIndex:own[0],lane:s.lane,attackStyle:'heavy',damage:10})]});
 assert.equal(n.hazardHps[other],100);assert.equal(own.slice(1).filter(i=>n.hazardHps[i]<100).length,2);assert.equal(s.hazardHps[own[0]],100);
});
test('blade normal cleave captures two targets but never stretches beyond knife range',()=>{
 const {ids,state}=eliteScene();const selected=ids.slice(0,2);
 const s={...state,mechClass:'blade',progress:39,bots:1,fireCooldown:0,hazardHps:state.hazardHps.map((_,i)=>selected.includes(i)?20:-1)};
 const n=tick(s);assert.equal(n.pendingShots.length,2);assert.ok(n.pendingShots.every(p=>p.lane===s.lane&&59-p.y<=sim.attackRangeFor(s)));
 const far=tick({...s,progress:22});assert.equal(far.pendingShots.length,0);
});
test('gate equipment reveal is nonblocking and freezes with pause',()=>{
 const s=initial(),option={id:'w',polarity:'reward',title:'火力+1',effect:'weaponUp',amount:1,lane:1};
 const n=sim.applyGateEffect({...s,status:'running'},option);assert.equal(n.weaponLevel,s.weaponLevel+1);assert.equal(n.status,'running');assert.equal(n.upgradeFx.title,'火力+1');
 const paused=sim.gameReducer(n,{type:'PAUSE'});assert.equal(tick(paused),paused);assert.equal(paused.upgradeFx.ticks,12);assert.equal(s.upgradeFx,null);
});
test('wave recipes keep weak lead ranks, stronger rear ranks and a final supply gap',()=>{
 for(const l of levels.LEVELS){for(let wave=0;wave<3;wave++){const pack=l.hazards.filter(h=>h.horde&&h.wave===wave&&!h.eliteRole);assert.ok(pack.find(h=>h.slot<6).hp<=pack.at(-1).hp);}assert.ok(Math.max(...l.hazards.filter(h=>h.horde).map(h=>h.progress))<l.encounters[0].progress-10);}
});
test('later boss recovery offers a readable stationary counter window and honors overdrive',()=>{
 const s={...battle(4),bossCycle:3};assert.equal(sim.bossRecoveryTicks(s),26);assert.ok(sim.bossRecoveryTicks({...s,ops:{...s.ops,protocol:'overdrive'}})<26);
 let n=tick(s);for(let i=0;i<6;i++)n=tick(n);assert.equal(n.bossMoveTicks,0);const lane=n.battleLane;n=tick(n);assert.equal(n.battleLane,lane);assert.equal(n.bossStep,'recovery');
});
test('debrief uses actual remaining boss durability and dominant damage cause',()=>{
 const x=load('experience'),s={...battle(),battleHp:75,battleMaxHp:300,report:{...initial().report,taken:30,collisions:25,hostile:5}};
 const r=x.runDebrief(s);assert.equal(r.remaining,25);assert.match(r.cause,/碰撞/);assert.match(r.tip,/装甲/);
 const fresh=sim.gameReducer({...s,status:'result'},{type:'RESTART',garage});assert.equal(fresh.report.dealt,0);assert.equal(fresh.report.taken,0);assert.equal(fresh.feedback.length,0);
});
test('mass impacts have a bounded feedback budget and boss break fades before result',()=>{
 const s={...battle(),battleHp:10000,battleMaxHp:10000};let n=tick({...s,pendingShots:Array.from({length:30},(_,i)=>incoming(s,{id:i,damage:1}))});assert.equal(n.feedback.length,12);assert.equal(n.feedbackSequence,30);
 n=tick({...battle(),battleHp:1,pendingShots:[incoming(s,{damage:100})]});assert.equal(n.feedback.at(-1).kind,'boss');while(n.status==='boss-victory')n=tick(n);assert.equal(n.feedback.length,0);
});
test('new impact sounds require new outcomes and shake settings preserve old saves',()=>{
 const audio=load('audio'),settings=load('settings'),s=battle(),n={...s,impactSequence:1,feedbackSequence:1,feedback:[{id:1,kind:'armor',ticks:4,x:50,y:40}]};
 assert.ok(audio.gameSoundEvents(s,n).includes('armor-hit'));assert.ok(!audio.gameSoundEvents(n,n).includes('armor-hit'));
 assert.equal(settings.normalizeSettings({shake:false}).shake,false);assert.equal(settings.normalizeSettings({muted:true,volume:.5,quality:'high'}).shake,undefined);
});
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
  s.hazardHps=s.hazardHps.map((hp,i)=>i<6?hp:-1);
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
      assert.ok(options.length>=1&&options.length<=2);assert.equal(new Set(options.map(o=>o.lane)).size,options.length);
      if (i && options[0].polarity === 'penalty') assert.equal(choices[i - 1][0].polarity, 'reward');
      level.hazards.forEach((h, hi) => { if (Math.abs(h.progress - level.gateMarks[i]) <= 6) options.forEach(o=>assert.notEqual(o.lane, levels.hazardLaneAt(layout, hi, level.gateMarks[i], sector))); });
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
        const danger = [...s.enemyAttacks.map(a=>a.lane),...level.hazards.flatMap((h, index) => s.hazardHps[index] > 0 && h.progress - s.progress < 1.5 && h.progress > s.progress ? [levels.hazardLaneAt(s.layoutIndex, index, s.progress, levelIndex)] : [])];
        if (danger.includes(lane)) lane = [0,1,2].find(l => !danger.includes(l));
        if (!s.bossDefeated && s.progress >= level.encounters[0].progress - 5) lane = s.battleLane;
        if (gate && !s.gateResolved && s.progress >= mark - 2.5 && s.progress <= mark + 2) lane = gate.polarity === 'reward' ? gate.lane : (gate.lane + 1) % 3;
      }
      s = sim.gameReducer(s, { type: 'MOVE_LANE', lane }); s = tick(s); ticks++;
      assert.ok(ticks < 5000, `run must terminate: seed=${seed}, level=${levelIndex}, status=${s.status}, step=${s.bossStep}, phase=${s.bossPhaseTicks}, hp=${s.battleHp}, bots=${s.bots}, time=${s.battleTime}, cooldown=${s.fireCooldown}`);
    }
    assert.equal(s.won, true, `seed ${seed} level ${levelIndex + 1}: ${s.status} ${s.defeatReason} hp=${s.battleHp}, bots=${s.bots}`);
    assert.ok(ticks >= 1500 && ticks <= 5000, `level ${levelIndex + 1}: ${ticks / 10}s`);
  }
});
test('gate art threshold and simulation share exact contact point; passing is once-only and a missed lane is not collected', () => {
  const mark = levels.getLevel(0).gateMarks[0];
  assert.equal(sim.gateGroundY(mark - 1.5, mark), sim.GATE_CONTACT_Y);
  const s = { ...initial(), status: 'running', progress: mark - 1.5 - sim.RUN_SPEED * 1.5, lane: 0, gateChoices: [[{ id: 'core', effect: 'coreUp', amount: 2, polarity: 'reward', lane: 0 }]], fireCooldown: 100 };
  let before = tick(s); assert.equal(before.gateResolved, false);
  const crossed = tick({ ...before, laneMoveTicks: 1 });
  assert.equal(crossed.gateCollected, true); assert.equal(crossed.bots, 3);
  assert.equal(tick(crossed).bots, 3);
  before = tick({ ...s, lane: 2 }); const missed = tick(before);
  assert.equal(missed.gateResolved, true); assert.equal(missed.gateCollected, false); assert.equal(missed.bots, 1);
});
test('emperor combines seals, judgement and crossfire without generic support summons', () => {
  let s = { ...battle(4), battleTime: 0, bossStage: 2, bossCycle: 1, battleHp: 10000, battleMaxHp: 10000, armorPoints: 1000, fireCooldown: 1000 };
  const lanes = new Set([sim.bossX(s)]), kinds = new Set();
  for (let i = 0; i < 400; i++) { s = tick(s); s.threats.forEach(t => kinds.add(t.kind)); lanes.add(sim.bossX(s)); }
  assert.ok(kinds.has('seal')&&kinds.has('field')&&kinds.has('shell'));assert.ok(!kinds.has('barrier')&&!kinds.has('minion'));assert.equal(lanes.size,1);assert.equal(s.bossMoveTicks,0);
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
  let s = { ...initial(), status: 'running', progress: mark - sim.RUN_SPEED/2, gate: level.gateMarks.length, hazardHps: level.hazards.map(() => -1), pendingShots: [incoming(initial(), { target: null, ticks: 5 })], overloadTicks: 30 };
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
      assert.ok(new Set(active.filter(t=>t.kind!=='shell').map(t=>t.kind)).size<=1 || active.every(t=>t.kind==='orb'||t.kind==='field'&&active.some(core=>core.kind==='orb'&&core.id===t.linkId)),'only a linked orb and its fields may coexist');
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
test('fixed bosses retain a roughly three-minute baseline and reward stronger acquired loadouts', () => {
  const samples=[];
  for(let level=0;level<5;level++) for(const [bots,weaponLevel] of [[3,2],[5,3],[7,4]]) {
    const spec=levels.getLevel(level);
    let s=tick({...initial(level),status:'running',progress:spec.encounters[0].progress - sim.RUN_SPEED/2,gate:spec.gateMarks.length,hazardHps:spec.hazards.map(()=>-1),bots,weaponLevel});
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
    assert.ok(seconds>=(bots===3&&weaponLevel===2?130:20)&&seconds<=(bots===3&&weaponLevel===2?230:150), 'level '+(level+1)+' bots '+bots+' W'+weaponLevel+': '+seconds+'s');
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
  for(let i=0;i<32;i++){const lanes=s.enemyAttacks.map(a=>a.lane);if(lanes.includes(s.lane))s=sim.gameReducer(s,{type:'MOVE_LANE',lane:[0,1,2].find(l=>!lanes.includes(l))??s.lane});s=tick(s);}assert.equal(s.playerHp,100);assert.equal(s.bossStep,'recovery');
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
test('roadblock locks and pursues a lane that can be dodged or interrupted', () => {
  const s=supportEnemy('barrier');assert.equal(s.enemyAttacks[0].kind,'pounce');assert.equal(s.bossStep,'flight');
  let hit=s;for(let i=0;i<19;i++){hit=tick(hit);assert.equal(hit.playerHp,100);}hit=tick(hit);assert.equal(hit.playerHp,86);assert.equal(hit.enemyAttacks.length,0);
  let dodge=sim.gameReducer(s,{type:'MOVE_LANE',lane:2});for(let i=0;i<18;i++)dodge=tick(dodge);assert.equal(dodge.playerHp,100);
  const destroyed=tick({...s,pendingShots:[incoming(s,{target:'threat',targetIndex:888,lane:1,damage:999})]});assert.equal(destroyed.enemyAttacks.length,0);
});
test('small robot visibly pounces along the locked player lane, deals one hit and leaves no second contact', () => {
  const s=supportEnemy('minion');assert.equal(s.enemyAttacks[0].kind,'pounce');let hit=s;
  for(let i=0;i<12;i++)hit=tick(hit);
  const from=sim.enemyThreatY(hit,hit.threats[0]);assert.equal(hit.enemyAttacks[0].phase,'flight');hit=tick(hit);assert.ok(sim.enemyThreatY(hit,hit.threats[0])>from);
  for(let i=0;i<7;i++)hit=tick(hit);assert.equal(hit.playerHp,86);assert.equal(hit.threats[0].hp,0);const seq=hit.damageSequence;
  for(let i=0;i<8;i++)hit=tick(hit);assert.equal(hit.playerHp,86);assert.equal(hit.damageSequence,seq);
  let dodge=sim.gameReducer(s,{type:'MOVE_LANE',lane:2});for(let i=0;i<18;i++)dodge=tick(dodge);assert.equal(dodge.playerHp,100);
});
test('extra enemy attacks freeze on pause and are cleared on arena entry, victory or lethal damage', () => {
  const s=roadDrone();const paused=sim.gameReducer(s,{type:'PAUSE'});assert.deepEqual(tick(paused),paused);
  const spec=levels.getLevel(0);const arena=tick({...s,gate:spec.gateMarks.length,progress:spec.encounters[0].progress - sim.RUN_SPEED/2,hazardHps:s.hazardHps.map(()=>-1)});assert.equal(arena.status,'boss-intro');assert.equal(arena.enemyAttacks.length,0);
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
test('all three mech classes can beat five fixed-health bosses with telegraphed dodging', () => {
  const times=[];
  for(const mechClass of ['pulse','heavy','blade']) for(let level=0;level<5;level++){
    const spec=levels.getLevel(level);let s=tick({...initial(level),mechClass,status:'running',progress:spec.encounters[0].progress - sim.RUN_SPEED/2,gate:spec.gateMarks.length,hazardHps:spec.hazards.map(()=>-1),bots:5,weaponLevel:3});let ticks=0;
    while(sim.isActiveStatus(s.status)&&ticks<5000){
      let lane=s.battleLane;const danger=s.threats.filter(t=>t.hp!==0&&t.ticks<=8).map(t=>t.lane);
      danger.push(...s.enemyAttacks.filter(a=>a.phase==='flight'||a.ticks<=4).map(a=>a.lane));
      if(sim.isRush(s)&&(s.bossStep==='rush'||(s.bossStep==='warning'&&s.bossStepTicks>=10)))danger.push(...s.bossAttackLanes);
      if(danger.includes(lane))lane=[0,1,2].find(l=>!danger.includes(l))??lane;
      s=tick(sim.gameReducer(s,{type:'MOVE_LANE',lane:bossTactic(s)}));ticks++;
    }
    assert.equal(s.won,true,mechClass+' level '+(level+1));assert.ok(ticks>=200&&ticks<=1600,mechClass+' level '+(level+1)+' '+ticks/10+'s');times.push(mechClass+' L'+(level+1)+':'+ticks/10);
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
      let s=tick({...sim.createInitialState(g,level,0),bossRandomSeed:42,status:'running',progress:spec.encounters[0].progress - sim.RUN_SPEED/2,gate:spec.gateMarks.length,hazardHps:spec.hazards.map(()=>-1),bots:5,weaponLevel:3}),ticks=0;
      if(hp===undefined)hp=s.battleMaxHp;else assert.equal(s.battleMaxHp,hp,'permanent upgrades must not strengthen this boss');
      while(sim.isActiveStatus(s.status)&&ticks<5000){let lane=s.battleLane;const danger=s.threats.filter(t=>t.hp!==0&&t.ticks<=8).map(t=>t.lane);danger.push(...s.enemyAttacks.filter(a=>a.phase==='flight'||a.ticks<=4).map(a=>a.lane));if(sim.isRush(s)&&(s.bossStep==='rush'||(s.bossStep==='warning'&&s.bossStepTicks>=10)))danger.push(...s.bossAttackLanes);if(danger.includes(lane))lane=[0,1,2].find(l=>!danger.includes(l))??lane;s=tick(sim.gameReducer(s,{type:'MOVE_LANE',lane:bossTactic(s)}));ticks++;}
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
// Lightweight Web Audio contract double; real DSP is separately rendered in a browser.
function audioHarness(){
 const stats={created:0,started:0,closed:0,sources:[],contexts:[],gains:[],compressors:[],buffers:0};
 const parameter=()=>({value:0,calls:[],setValueAtTime(...v){this.calls.push(['set',...v]);},exponentialRampToValueAtTime(...v){this.calls.push(['ramp',...v]);},setTargetAtTime(...v){this.calls.push(['target',...v]);},cancelScheduledValues(...v){this.calls.push(['cancel',...v]);}});
 const node=()=>({connect(){},disconnect(){this.disconnected=true;}});
 class FakeAudio{
  constructor(options){stats.created++;stats.contexts.push(this);this.options=options;this.state='suspended';this.currentTime=0;this.sampleRate=8000;this.destination=node();}
  createGain(){const n={...node(),gain:parameter()};stats.gains.push(n);return n;}
  createDynamicsCompressor(){const n={...node(),threshold:parameter(),knee:parameter(),ratio:parameter(),attack:parameter(),release:parameter()};stats.compressors.push(n);return n;}
  createBuffer(channels,length,sampleRate){stats.buffers++;const data=new Float32Array(length);return {length,sampleRate,getChannelData:()=>data};}
  source(){const n={...node(),frequency:parameter(),start(at,offset){stats.started++;this.at=at;this.offset=offset??0;},stop(at){if(at===undefined){this.cancelled=true;this.onended?.();}else this.end=at;}};stats.sources.push(n);return n;}
  createOscillator(){return this.source();}
  createBufferSource(){return this.source();}
  createBiquadFilter(){return {...node(),frequency:parameter(),Q:parameter()};}
  createStereoPanner(){return {...node(),pan:parameter()};}
  resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}close(){stats.closed++;this.state='closed';return Promise.resolve();}
 }
 const oldWindow=global.window,oldDocument=global.document;global.window={AudioContext:FakeAudio};global.document={hidden:false};
 return {stats,restore(){if(oldWindow===undefined)delete global.window;else global.window=oldWindow;if(oldDocument===undefined)delete global.document;else global.document=oldDocument;}};
}
test('audio is gesture-unlocked, volume/mute aware, background-safe and disposable without browser audio',()=>{
 const h=audioHarness(),bank=load('soundDesign').SOUND_BANK;
 try{const engine=load('audio').createGameAudio();assert.equal(h.stats.created,0);engine.play('pulse');assert.equal(h.stats.started,0);engine.unlock();assert.equal(h.stats.created,1);assert.equal(h.stats.contexts[0].options.latencyHint,'interactive');engine.play('heavy');const count=bank.heavy.layers.length;assert.equal(h.stats.started,count);engine.setSettings({muted:true,volume:.5,quality:'auto'});engine.play('blade');assert.equal(h.stats.started,count);assert.ok(h.stats.sources.every(s=>s.cancelled));engine.setSettings({muted:false,volume:.5,quality:'auto'});global.document.hidden=true;engine.play('gate');assert.equal(h.stats.started,count);global.document.hidden=false;engine.suspend();engine.play('victory');assert.equal(h.stats.started,count);engine.dispose();assert.equal(h.stats.closed,1);engine.unlock();assert.equal(h.stats.created,1);}finally{h.restore();}
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
 for(const url of urls){assert.ok(url.includes('/optimized/'));const file=path.resolve(__dirname,'../../../public',url.slice(1));assert.ok(fixtureExists(file),url);}
 for(const url of Object.values(art.MECH_CLASS_ART)){const b=readFixture(path.resolve(__dirname,'../../../public',url.slice(1)));assert.equal(imageInfo(b).alpha,true,'mech PNG must keep RGBA alpha');}
 assert.ok(fixtureExists(path.join(__dirname,'art-source','ui-hangar-ai-v6.png')));
 for(const url of [...art.STORY_ART,art.STORY_COVER]){const bytes=readFixture(path.resolve(__dirname,'../../../public',url.slice(1)));assert.equal(bytes.readUInt16BE(0),0xffd8,'comic deployment images are JPEG');}
 for(let page=1;page<=4;page++)assert.ok(fixtureExists(path.join(__dirname,'art-source',`story-comic-${page}-v11.png`)));
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
 const fresh=campaign.campaignReducer(campaign.createCampaign(initial()),{type:'START',garage:progression.normalizeGarage({tutorialCompleted:true})});assert.equal(fresh.narrative.replay,false);assert.equal(campaign.sceneCopy(fresh).title,load('story').STORY_CHAPTERS[0].title);
 assert.equal(campaignTick(s),s);assert.equal(campaign.campaignReducer(s,{type:'MOVE_LANE',lane:0}),s);
 s=campaign.campaignReducer(s,{type:'PAUSE'});assert.equal(s.status,'paused');assert.equal(campaignTick(s),s);assert.equal(campaign.campaignReducer(s,{type:'STORY_SKIP'}),s);
 s=campaign.campaignReducer(s,{type:'RESUME'});s=campaign.campaignReducer(s,{type:'STORY_SKIP'});assert.equal(s.narrative.scene,null);assert.equal(s.narrative.route,'signal');assert.equal(s.bots,1);assert.equal(s.shieldCharges,0);assert.ok(campaignTick(s).progress>0);
});
test('support route is a real same-lane road pickup with a contact window and once-only reward',()=>{
 for(const route of ['rescue','signal']){
  const base=campaignStart(route),lane=base.narrative.relayLane;
  const s={...base,lane,progress:24-1.5-sim.RUN_SPEED/2,fireCooldown:1000,hazardHps:base.hazardHps.map(()=>-1),gate:levels.getLevel(0).gateMarks.length};
  const before=JSON.stringify(s),collected=campaignTick(s);assert.equal(JSON.stringify(s),before,'input remains immutable');assert.equal(collected.narrative.objective,'collected');
  assert.equal(collected.bots,s.bots+Number(route==='rescue'));assert.equal(collected.shieldCharges,s.shieldCharges+Number(route==='signal'));assert.equal(campaignTick(collected).bots,collected.bots);assert.equal(campaignTick(collected).shieldCharges,collected.shieldCharges);
  let missed=campaignTick({...s,lane:(lane+1)%3});assert.equal(missed.narrative.objective,'pending');
  const late=campaignTick({...missed,lane});assert.equal(late.narrative.objective,'collected','lateral correction still works inside the contact window');
  for(let i=0;i<40;i++)missed=campaignTick(missed);assert.equal(missed.narrative.objective,'missed');assert.equal(missed.bots,s.bots);assert.equal(missed.shieldCharges,s.shieldCharges);
 }
});
test('support relays avoid nearby obstacle lanes across all chapters',()=>{
 for(let level=0;level<5;level++)for(let run=0;run<9;run++){
  const s=campaignStart('rescue',level),n=s.narrative;
  levels.getLevel(level).hazards.forEach((h,i)=>{if(Math.abs(h.progress-n.relayMark)<=5)assert.notEqual(n.relayLane,levels.hazardLaneAt(s.layoutIndex,i,n.relayMark,level));});
 }
});
test('boss conversation triggers on actual arena entry, never spends warning time, and does not repeat',()=>{
 let s=campaignStart();s={...s,progress:levels.getLevel(0).encounters[0].progress - sim.RUN_SPEED/2,gate:levels.getLevel(0).gateMarks.length,hazardHps:s.hazardHps.map(()=>-1),fireCooldown:1000};
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
 let s=campaignStart();s=campaignTick({...s,progress:55-sim.RUN_SPEED/2,hazardHps:s.hazardHps.map(()=>-1),gate:levels.getLevel(0).gateMarks.length});assert.equal(s.narrative.radio.id,'sector-lore');assert.equal(s.narrative.scene,null);
 const paused=campaign.campaignReducer(s,{type:'PAUSE'});assert.equal(campaignTick(paused).narrative.radio.ticks,s.narrative.radio.ticks);
 s=campaign.campaignReducer(s,{type:'STORY_DISMISS_RADIO'});assert.equal(campaignTick(s).narrative.radio,null);
 const reset=campaign.campaignReducer(s,{type:'RESTART',garage});assert.deepEqual(reset.narrative.seen,['briefing','lore']);assert.equal(reset.narrative.scene,null);
});
test('all chapter film cells stay within six frames and generated assets resolve with alpha relay',()=>{
 for(const kind of ['briefing','confrontation','aftermath'])for(const step of [0,1])for(const time of [0,900,5000,999999]){const frame=campaign.filmFrame(kind,step,time);assert.ok(frame>=0&&frame<6);assert.equal(campaign.filmFrame(kind,step,time,true),campaign.filmFrame(kind,step,0));}
 for(const url of campaign.CHAPTER_FILMS){const bytes=readFixture(path.resolve(__dirname,'../../../public',url.slice(1)));assert.equal(bytes.readUInt16BE(0),0xffd8);}
 const relay=readFixture(path.resolve(__dirname,'../../../public',campaign.RELAY_ART.slice(1)));assert.equal(relay[25],6);
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
    const danger=[...s.enemyAttacks.map(a=>a.lane),...chapter.hazards.flatMap((h,i)=>s.hazardHps[i]>0&&h.progress-s.progress<1.5&&h.progress>s.progress?[levels.hazardLaneAt(s.layoutIndex,i,s.progress,sector)]:[])];
    if(danger.includes(lane))lane=[0,1,2].find(l=>!danger.includes(l));
    if(s.progress>=chapter.encounters[0].progress-5)lane=s.battleLane;
    if(gate&&!s.gateResolved&&s.progress>=mark-2.5&&s.progress<=mark+2)lane=gate.polarity==='reward'?gate.lane:(gate.lane+1)%3;
    if(s.narrative.objective==='pending'&&s.progress>=22&&s.progress<26)lane=s.narrative.relayLane;
   }
   s=campaign.campaignReducer(s,{type:'MOVE_LANE',lane});s=campaignTick(s);assert.ok(++ticks<5000);
  }
  assert.equal(s.won,true,`${route} ${mechClass} sector ${sector+1}`);assert.equal(s.narrative.objective,'collected');assert.deepEqual(scenes,['confrontation','aftermath']);
 }
});

test('road encounter density grows by sector and introduces specialists gradually', () => {
  const totals = levels.LEVELS.map(l => l.hazards.length);
  assert.deepEqual(totals, [119,147,176,203,230]);
  assert.ok(totals.every((n,i) => i===0 || n>totals[i-1]));
  for(const [sector,l] of levels.LEVELS.entries()) {
    assert.equal(new Set(l.hazards.filter(h=>h.wave!==undefined).map(h=>h.wave)).size,3);
    assert.ok(l.hazards.filter(h=>h.kind==='swarm').every(h=>h.hp<=7));
    assert.equal(l.hazards.filter(h=>h.elite).length,3);
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
  assert.equal(s.playerHp,100);assert.ok(s.enemyAttacks.length===1&&s.enemyAttacks[0].kind==='charge');assert.equal(s.enemyAttacks[0].lane,s.lane);
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
  let expired=n;for(let i=0;i<=sim.COMBO_WINDOW_TICKS;i++)expired=tick(expired);
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
    let maxVisible=0;const eliteSources=new Set();
    for(let i=0;i<1250&&s.status==='running';i++) {
      s=tick(s);s.enemyAttacks.filter(a=>a.source==='hazard'&&spec.hazards[a.sourceId]?.elite).forEach(a=>eliteSources.add(a.sourceId));assert.ok(new Set(s.enemyAttacks.map(a=>a.lane)).size<=2);assert.ok(s.enemyAttacks.length<=2);
      maxVisible=Math.max(maxVisible,spec.hazards.filter((h,j)=>s.hazardHps[j]>0&&s.progress>=h.progress-14&&s.progress<h.progress).length);
    }
    assert.equal(s.status,'boss-intro');assert.deepEqual(s.enemyAttacks,[]);assert.ok(s.hazardHps.every(hp=>hp===-1));assert.ok(maxVisible<=72,`visible crowd budget: ${maxVisible}`);assert.equal(eliteSources.size,3,`every surviving elite must get a safe attack opportunity: sector ${sector}, layout ${layout}`);
  }
});

test('enemy formation uses distinct horizontal muzzles and matched aiming positions without changing lanes', () => {
  const s={...initial(4),status:'running',progress:46},spec=levels.getLevel(4);
  const group=spec.hazards.map((h,i)=>({h,i})).filter(e=>e.h.kind==='swarm'&&e.h.wave===1&&load('flowV41').enemyVisibleV41(s,e.h));
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
    for(let i=0;i<1250&&s.status==='running';i++) {
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
    const contact={...state,progress:h.progress - sim.RUN_SPEED/2};assert.ok(sim.roadEnemyY(contact,index)>57);
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
    const file=path.resolve(__dirname,'../../../public',url.slice(1)),data=readFixture(file);
    assert.equal(imageInfo(data).width,1536);assert.equal(imageInfo(data).height,576);assert.equal(imageInfo(data).alpha,true);
    assert.equal(imageInfo(data).width/8,imageInfo(data).height/3);
    assert.ok(fixtureExists(path.join(__dirname,'art-source',path.basename(file))));
  }
  for(const [url,cols,rows]of [[art.BOSS_CAST_ART,8,5],[art.BOSS_OBJECTIVE_ART,4,2]]) {
    const data=readFixture(path.resolve(__dirname,'../../../public',url.slice(1)));
    assert.equal(imageInfo(data).width%cols,0);assert.equal(imageInfo(data).height%rows,0);assert.equal(imageInfo(data).alpha,true);
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

const defense=load('defenseArt');
test('shield hit and final-charge break are distinct, once-only feedback without changing damage absorption',()=>{
 const base={...initial(),status:'running',bots:3,shieldCharges:2,armorPoints:4};let s={...base};
 assert.equal(sim.applySquadHit(s,20),0);assert.equal(s.playerHp,base.playerHp);assert.equal(s.armorPoints,4);assert.equal(s.shieldCharges,1);assert.deepEqual(s.defenseFx,{kind:'shield',exhausted:false,ticks:8,id:1});
 assert.deepEqual(defense.defenseLayers(s,0).map(l=>l.art),['idle','impact']);assert.deepEqual(defense.defenseLayers(s,1).map(l=>l.art),['idle']);
 const previous={...s};sim.applySquadHit(s,50);assert.deepEqual(s,previous,'invulnerable hits do not retrigger VFX or consume charges');
 s={...s,invulnerableTicks:0};const before={...s};sim.applySquadHit(s,20);assert.equal(s.shieldCharges,0);assert.equal(s.playerHp,base.playerHp);assert.equal(s.armorPoints,4);assert.equal(s.defenseFx.exhausted,true);
 assert.deepEqual(defense.defenseLayers(s,2).map(l=>l.art),['armor','break']);assert.ok(load('audio').gameSoundEvents(before,s).includes('shield-break'));
});
test('defense sprite timing freezes in pause and expires independently of immunity',()=>{
 let s={...initial(),status:'running',shieldCharges:1,fireCooldown:1000};sim.applySquadHit(s,10);
 assert.equal(defense.defenseLayers(s,0).at(-1).frame,0);
 s=sim.gameReducer(s,{type:'PAUSE'});const frozen=s;assert.equal(tick(s),frozen);assert.equal(defense.defenseLayers(s,0).at(-1).frame,0);
 s=sim.gameReducer(s,{type:'RESUME'});for(let i=0;i<8;i++)s=tick(s);assert.equal(s.invulnerableTicks,6);for(let i=0;i<6;i++)s=tick(s);assert.equal(s.invulnerableTicks,0,'VFX does not extend immunity');assert.ok(s.defenseFx);
 s=tick(s);assert.equal(defense.defenseLayers(s,0).at(-1).frame,5);s=tick(s);assert.equal(s.defenseFx,null);assert.equal(defense.defenseLayers(s,0).some(l=>l.transient),false);
});
test('armor glow follows remaining protection, not upgrade level or weapon color',()=>{
 let s={...initial(),status:'running',armorLevel:4,armorPoints:0};assert.deepEqual(defense.defenseLayers(s,0),[]);
 s={...s,armorPoints:2};sim.applySquadHit(s,6);assert.equal(s.damageKind,'armor');assert.equal(s.armorPoints,0);assert.equal(s.defenseFx.kind,'armor');assert.equal(s.defenseFx.exhausted,true);assert.deepEqual(defense.defenseLayers(s,0).map(l=>l.art),['break']);
 s={...s,invulnerableTicks:0};sim.applySquadHit(s,6);assert.equal(s.damageKind,'health');assert.equal(s.defenseFx,null);assert.deepEqual(defense.defenseLayers(s,0),[]);
 const shield={...s,shieldCharges:1};assert.deepEqual(defense.defenseLayers({...shield,mechClass:'heavy'},0),defense.defenseLayers({...shield,mechClass:'blade'},0));assert.equal(defense.defenseLayers(shield,0,true)[0].frame,0);
});
test('stale defense impacts clear on arena entry, boss victory, restart and defeat',()=>{
 let s={...initial(),status:'running',shieldCharges:1,progress:levels.getLevel(0).encounters[0].progress - sim.RUN_SPEED/2,fireCooldown:1000};sim.applySquadHit(s,10);s=tick(s);assert.equal(s.status,'boss-intro');assert.equal(s.defenseFx,null);
 s={...battle(),battleHp:1,shieldCharges:1};sim.applySquadHit(s,10);s.pendingShots=[incoming(s,{damage:9999})];s=tick(s);assert.equal(s.status,'boss-victory');assert.equal(s.defenseFx,null);
 const reset=sim.gameReducer(s,{type:'RESTART',garage});assert.equal(reset.defenseFx,null);assert.deepEqual(defense.defenseLayers({...reset,status:'defeat',bots:0,playerHp:0},0),[]);assert.deepEqual(defense.defenseLayers({...reset,status:'running'},11),[]);
 const dead=tick({...reset,status:'running',bots:0,playerHp:0,defenseFx:{kind:'shield',exhausted:true,ticks:8,id:1}});assert.equal(dead.status,'defeat');assert.equal(dead.defenseFx,null);
});
test('four defense atlases preserve alpha and six exact square cells',()=>{
 assert.deepEqual([0,1,2,3,4,5].map(defense.defenseCell),['0% 0%','100% 0%','0% 50%','100% 50%','0% 100%','100% 100%']);
 for(const url of Object.values(defense.DEFENSE_ART)){const data=readFixture(path.resolve(__dirname,'../../../public',url.slice(1)));assert.equal(imageInfo(data).width,512);assert.equal(imageInfo(data).height,768);assert.equal(imageInfo(data).alpha,true);assert.ok(fixtureExists(path.join(__dirname,'art-source',path.basename(url))));}
});

test('core burst requires earned full energy and only one activation can consume it',()=>{
 const base={...initial(),status:'running',burstEnergy:100,jamTicks:30,fireCooldown:3};
 const before=JSON.stringify(base),s=sim.gameReducer(base,{type:'ACTIVATE_BURST'});
 assert.equal(JSON.stringify(base),before);assert.equal(s.burstEnergy,0);assert.equal(s.burstTicks,sim.BURST_TICKS);assert.equal(s.burstSequence,1);assert.equal(s.jamTicks,0);assert.equal(s.chargedVolleys,0);assert.equal(s.fireCooldown,3);
 assert.equal(sim.gameReducer(s,{type:'ACTIVATE_BURST'}),s);
 for(const status of ['home','paused','boss-intro','boss-shift','boss-victory','defeat','result']){const blocked={...base,status};assert.equal(sim.gameReducer(blocked,{type:'ACTIVATE_BURST'}),blocked);}
 for(const props of [{burstEnergy:99},{playerHp:0},{bots:0}]){const blocked={...base,...props};assert.equal(sim.gameReducer(blocked,{type:'ACTIVATE_BURST'}),blocked);}
 const campaign=load('campaign');const story=campaign.createCampaign(base);story.narrative.scene={kind:'briefing',step:0,synced:0};
 assert.equal(campaign.campaignReducer(story,{type:'ACTIVATE_BURST'}),story);
});

test('burst grants individual captured shots for all chassis without faster fire; only blade gets its deliberate parry stance',()=>{
 for(const mechClass of ['pulse','heavy','blade']){
  const base={...battle(),mechClass,lane:1,battleLane:1,bossStep:'warning',bots:3,weaponLevel:2,fireCooldown:0,burstEnergy:100};
  const normal=tick(base),activated=sim.gameReducer(base,{type:'ACTIVATE_BURST'}),powered=tick(activated);
  assert.equal(powered.fireCooldown,normal.fireCooldown);assert.equal(powered.pendingShots.length,9);assert.equal(powered.invulnerableTicks,normal.invulnerableTicks);
  assert.ok(powered.pendingShots.every(p=>p.burst&&!p.charged&&Math.abs(p.damage-normal.pendingShots[0].damage*(p.target==='boss'?load('mechs').coreSkill(mechClass).bossDamage*(p.lane===base.lane?1:.6):load('mechs').coreSkill(mechClass).damage))<.001&&p.origins.length===1));
  for(const lane of [0,1,2])assert.deepEqual(powered.pendingShots.filter(p=>p.lane===lane).map(p=>p.origins),normal.pendingShots.map(p=>p.origins));
  const moved=sim.gameReducer(powered,{type:'MOVE_LANE',lane:2});assert.deepEqual(moved.pendingShots,powered.pendingShots);
  const struck={...powered,playerHp:100,armorPoints:0,shieldCharges:0,invulnerableTicks:0};sim.applySquadHit(struck,10);assert.equal(struck.playerHp,mechClass==='blade'?100:90);if(mechClass==='blade')assert.equal(struck.tactics.parries,1);
 }
});

test('energy comes from actual kills objectives damage and successful evades, never empty shots',()=>{
 const {state,index}=roadSpecialist('swarm',0,4.9);
 const hit=tick({...state,combo:2,comboTicks:20,playerHp:80,pendingShots:[incoming(state,{target:'hazard',targetIndex:index,lane:state.lane,damage:99})]});
 assert.equal(hit.burstEnergy,20);assert.equal(hit.playerHp,84);assert.equal(hit.comboHeal,4);assert.equal(hit.comboRewardTicks,12);assert.equal(hit.comboTicks,sim.COMBO_WINDOW_TICKS);
 const capped=tick({...state,burstEnergy:98,pendingShots:[incoming(state,{target:'hazard',targetIndex:index,lane:state.lane,damage:99})]});assert.equal(capped.burstEnergy,100);
 const b={...battle(),battleHp:1000,battleMaxHp:1000},bossHit=tick({...b,pendingShots:[incoming(b,{damage:10})]});assert.ok(bossHit.burstEnergy>0&&bossHit.burstEnergy<10);
 const wrong=tick({...b,pendingShots:[incoming(b,{damage:10,lane:(b.battleLane+1)%3})]});assert.equal(wrong.burstEnergy,0);
 let empty={...initial(),status:'running',gate:99,hazardHps:initial().hazardHps.map(()=>-1)};for(let i=0;i<20;i++)empty=tick(empty);assert.equal(empty.burstEnergy,0);
 const objective={id:55,kind:'egg',lane:b.battleLane,ticks:20,duration:30,hp:2,maxHp:2,damage:0,fromLane:1};
 const broken=tick({...b,threats:[objective],pendingShots:[incoming(b,{target:'threat',targetIndex:55,damage:99})]});assert.equal(broken.burstEnergy,16);
 const moved=sim.gameReducer({...battle(),lane:1},{type:'MOVE_LANE',lane:2});
 const shell={id:88,kind:'shell',lane:1,ticks:1,duration:8,hp:-1,maxHp:0,damage:12,fromLane:1};
 const evaded=tick({...moved,dodgeTicks:3,threats:[shell,{...shell,id:89}]});assert.equal(evaded.burstEnergy,8,'one evasive window cannot farm multiple simultaneous projectiles');
});

test('burst combat timer freezes in pause and transitions and fully cleans up on restart or defeat',()=>{
 let s=sim.gameReducer({...battle(),burstEnergy:100},{type:'ACTIVATE_BURST'});
 const paused=sim.gameReducer(s,{type:'PAUSE'});assert.deepEqual(tick(paused),paused);
 const intro=tick({...s,status:'boss-intro',bossPhaseTicks:0});assert.equal(intro.burstTicks,sim.BURST_TICKS);
 s={...s,fireCooldown:1000,battleHp:1e9,battleMaxHp:1e9,playerHp:1e6,playerMaxHp:1e6};for(let i=0;i<sim.BURST_TICKS;i++)s=tick(s);assert.equal(s.burstTicks,0);
 const reset=sim.gameReducer(s,{type:'RESTART',garage});assert.equal(reset.burstTicks,0);assert.equal(reset.burstEnergy,0);assert.equal(reset.burstSequence,0);
 const dead=tick({...s,burstTicks:20,burstEnergy:70,bots:0});assert.equal(dead.status,'defeat');assert.equal(dead.burstTicks,0);assert.equal(dead.burstEnergy,0);
});

test('burst gain cannot refill itself while active and existing flights do not gain retroactive damage',()=>{
 const b={...battle(),burstEnergy:100,fireCooldown:1000};const shot=incoming(b,{damage:10});
 const active=sim.gameReducer({...b,pendingShots:[shot]},{type:'ACTIVATE_BURST'});
 assert.equal(active.pendingShots[0].damage,10);
 const hit=tick(active);assert.equal(hit.burstEnergy,0);
 const expected=tick({...b,pendingShots:[shot],burstEnergy:0});assert.equal(hit.impactDamage,expected.impactDamage);
 const audio=load('audio');assert.ok(audio.gameSoundEvents(b,active).includes('burst-pulse'));
 assert.ok(audio.gameSoundEvents({...b,burstEnergy:99},{...b,burstEnergy:100}).includes('burst-ready'));
 assert.ok(!audio.gameSoundEvents({...b,burstEnergy:100},{...b,burstEnergy:100}).includes('burst-ready'));
 const basic=roadSpecialist('swarm',0,4.9),tiny=incoming(b,{target:'hazard',targetIndex:basic.index,lane:basic.state.lane,damage:1.4,burst:true,weaponLevel:0});
 const basicHit=tick({...basic.state,pendingShots:[tiny]});assert.equal(basicHit.impactDamage,1.4,'base pulse burst must deal a real fractional bonus');
});

const burstObjective=(id,lane,y,hp=2)=>({id,kind:'egg',lane,ticks:90,duration:100,hp,maxHp:hp,damage:0,fromLane:lane,originY:y});
test('pulse core beam pierces exactly three captured same-lane targets and stops',()=>{
 let s={...battle(),mechClass:'pulse',lane:1,battleLane:0,bots:1,weaponLevel:0,fireCooldown:0,bossStep:'warning',burstEnergy:100,threats:[burstObjective(1,1,56,.4),burstObjective(2,1,51,.4),burstObjective(3,1,46,.4),burstObjective(4,1,41,9),burstObjective(5,2,54,9)]};
 s=tick(sim.gameReducer(s,{type:'ACTIVATE_BURST'}));assert.equal(s.pendingShots[0].pierce,2);s.fireCooldown=1000;
 for(let i=0;i<9;i++)s=tick(s);
 for(const id of [1,2,3])assert.ok(!s.threats.some(t=>t.id===id&&t.hp>0));
 assert.equal(s.threats.find(t=>t.id===4).hp,9);assert.equal(s.threats.find(t=>t.id===5).hp,7.4);assert.equal(s.shotSequence,5);
});
test('heavy core explosion applies real bounded same-lane area damage once',()=>{
 let s={...battle(),mechClass:'heavy',lane:1,battleLane:0,bots:1,weaponLevel:0,fireCooldown:0,bossStep:'warning',burstEnergy:100,threats:[burstObjective(1,1,56),burstObjective(2,1,53),burstObjective(3,1,43,9),burstObjective(4,2,56,9)]};
 s=tick(sim.gameReducer(s,{type:'ACTIVATE_BURST'}));const damage=s.pendingShots.find(p=>p.lane===1).damage;assert.equal(damage,6);s.fireCooldown=1000;
 const arrival=Math.max(...s.pendingShots.map(p=>p.duration));for(let i=0;i<arrival;i++)s=tick(s);
 assert.ok(!s.threats.some(t=>[1,2].includes(t.id)&&t.hp>0));assert.equal(s.threats.find(t=>t.id===3).hp,9);assert.equal(s.threats.find(t=>t.id===4).hp,3);
 assert.equal(s.coreDetonations.length,3);const frozen=sim.gameReducer(s,{type:'PAUSE'});assert.deepEqual(tick(frozen),frozen);
 const victory=tick({...s,battleHp:1,pendingShots:[incoming(s,{damage:999})]});assert.equal(victory.status,'boss-victory');assert.deepEqual(victory.coreDetonations,[]);
 for(let i=0;i<7;i++)s=tick(s);assert.equal(s.coreDetonations.length,0);
});
test('blade core sweeps three lanes with captured waves that survive sidestepping',()=>{
 const base={...battle(),mechClass:'blade',lane:1,battleLane:0,bots:2,weaponLevel:0,fireCooldown:0,bossStep:'warning',burstEnergy:100,threats:[burstObjective(1,1,48),burstObjective(2,1,47),burstObjective(3,1,46),burstObjective(4,1,45),burstObjective(5,2,48)]};
 assert.equal(tick(base).pendingShots.length,0,'ordinary blade cannot reach these targets');
 const fired=tick(sim.gameReducer(base,{type:'ACTIVATE_BURST'}));assert.equal(fired.pendingShots.length,10);assert.ok(fired.pendingShots.every(p=>p.range===14));assert.equal(new Set(fired.pendingShots.map(p=>p.lane)).size,3);
 assert.equal(new Set(fired.pendingShots.filter(p=>p.lane===1).map(p=>p.targetIndex)).size,3);
 const arrival=Math.max(...fired.pendingShots.map(p=>p.duration));let s={...fired,burstTicks:1,fireCooldown:1000};for(let i=0;i<arrival;i++)s=tick(s);
 for(const id of [1,2,3])assert.ok(!s.threats.some(t=>t.id===id&&t.hp>0));assert.equal(s.threats.find(t=>t.id===4).hp,2);assert.ok(!s.threats.some(t=>t.id===5&&t.hp>0));
 let moved=sim.gameReducer(fired,{type:'MOVE_LANE',lane:2});moved.fireCooldown=1000;for(let i=0;i<arrival;i++)moved=tick(moved);
 for(const id of [1,2,3])assert.ok(!moved.threats.some(t=>t.id===id&&t.hp>0),'released core sword waves keep their captured lane after sidestepping');assert.ok(!moved.threats.some(t=>t.id===5&&t.hp>0));
});
test('three chassis expose independent skill names mechanics and release sounds',()=>{
 const mechs=load('mechs'),audio=load('audio');
 assert.equal(new Set(['pulse','heavy','blade'].map(id=>mechs.coreSkill(id).name)).size,3);
 for(const mechClass of ['pulse','heavy','blade']){
  const s={...battle(),mechClass,burstEnergy:100},active=sim.gameReducer(s,{type:'ACTIVATE_BURST'});
  assert.ok(audio.gameSoundEvents(s,active).includes('burst-'+mechClass));assert.equal(active.fireCooldown,s.fireCooldown);assert.equal(active.invulnerableTicks,s.invulnerableTicks);
 }
});
test('each sector adds three weak horde waves and preserves final supply breathing room',()=>{
 const old=[14,18,23,26,29];
 for(const [sector,l]of levels.LEVELS.entries()){
  assert.ok(l.hazards.length>=old[sector]*3);
  const crowd=l.hazards.filter(h=>h.horde);assert.equal(crowd.length,3*(18+sector*3)+3*(12+sector*4));
  assert.ok(crowd.every(h=>(h.eliteRole?h.hp<=6:h.hp<=3)&&!h.armor&&h.progress<=80&&h.progress<l.encounters[0].progress-10));
  for(let wave=0;wave<3;wave++)assert.equal(new Set(crowd.filter(h=>h.wave===wave).map(h=>Math.floor(h.slot%6/2))).size,3);
 }
});
test('horde body contact is grouped by invulnerability and escaped fodder awards no free score',()=>{
 const spec=levels.getLevel(0),index=spec.hazards.findIndex(h=>h.horde),mark=spec.hazards[index].progress,lane=levels.hazardLaneAt(0,index,mark,0);
 const ids=spec.hazards.flatMap((h,i)=>h.horde&&h.progress===mark?[i]:[]);
 const base={...initial(),status:'running',progress:mark - sim.RUN_SPEED/2,lane,gate:spec.gateMarks.length,fireCooldown:1000,armorPoints:0,shieldCharges:0,hazardHps:spec.hazards.map((h,i)=>ids.includes(i)?h.hp:-1)};
 const struck=tick(base);assert.equal(struck.playerHp,94);assert.equal(struck.damageSequence,1);
 const escaped=tick({...base,lane:(lane+2)%3});assert.equal(escaped.playerHp,100);assert.equal(escaped.score,0);assert.ok(ids.every(i=>escaped.hazardHps[i]===-1));
});
test('player-triggered burst preserves five bosses and all chassis with real counterplay',()=>{
 const samples=[];
 for(const mechClass of ['pulse','heavy','blade'])for(let level=0;level<5;level++){
  const spec=levels.getLevel(level);let s=tick({...initial(level),mechClass,status:'running',progress:spec.encounters[0].progress - sim.RUN_SPEED/2,gate:spec.gateMarks.length,hazardHps:spec.hazards.map(()=>-1),bots:5,weaponLevel:3});let ticks=0;
  while(sim.isActiveStatus(s.status)&&ticks<2400){
   s=sim.gameReducer(s,{type:'MOVE_LANE',lane:bossTactic(s)});
   if(sim.canActivateBurst(s)&&s.bossStep==='recovery')s=sim.gameReducer(s,{type:'ACTIVATE_BURST'});
   s=tick(s);ticks++;
  }
  assert.equal(s.won,true,mechClass+' L'+(level+1));assert.ok(s.burstSequence>0);assert.ok(ticks>=200&&ticks<=1600,mechClass+' L'+(level+1)+' '+ticks/10+'s');samples.push(ticks/10);
 }
 console.log('Burst boss sample seconds: '+samples.join(', '));
});


function moduleGate(effect){return {id:effect,icon:'x',title:effect,detail:'test',effect,amount:1,polarity:'reward',lane:1};}
function eliteScene(){
 const level=levels.getLevel(4), ids=level.hazards.flatMap((h,i)=>h.horde&&h.wave===0&&h.slot%2===0?[i]:[]);
 const state={...initial(4),status:'running',progress:36,lane:levels.hazardLaneAt(0,ids[0],36,4),gate:level.gateMarks.length,fireCooldown:1000,hazardHps:level.hazards.map((h,i)=>ids.includes(i)?h.hp:-1)};
 return {level,ids,state};
}
test('run modules are gate-earned, immutable, capped with fallback score and reset on restart',()=>{
 let base=initial(),s=base;
 for(let i=0;i<4;i++)s=sim.applyGateEffect(s,moduleGate('arc'));
 assert.equal(base.modules.arc,0);assert.equal(s.modules.arc,3);assert.equal(s.score,40);
 assert.match(sim.gateEffectDetail(s,moduleGate('arc')),/同轨/);
 for(let level=0;level<5;level++)for(const rng of [()=>0,()=>.99])assert.ok(sim.createGateChoices(level,0,rng)[2][0].effect in sim.MODULES);
 const restart=sim.gameReducer(s,{type:'RESTART',garage});assert.deepEqual(restart.modules,{arc:0,burn:0,recycle:0});
});
test('arc module hits only the captured nearby same-lane target and never recursively jumps',()=>{
 const {level,ids,state}=eliteScene(),a=ids[2],b=ids[3],c=ids[5],other=level.hazards.findIndex(h=>h.horde&&h.wave===0&&h.slot===1);
 const hp=level.hazards.map((h,i)=>[a,b,c,other].includes(i)?10:-1);
 const s=tick({...state,hazardHps:hp,pendingShots:[incoming(state,{target:'hazard',targetIndex:a,lane:state.lane,damage:2,arc:1})]});
 assert.equal(s.hazardHps[a],8);assert.equal(s.hazardHps[b],9);assert.equal(s.hazardHps[c],10);assert.equal(s.hazardHps[other],10);
 assert.equal(s.coreDetonations.filter(e=>e.kind==='arc').length,1);
 const paused=sim.gameReducer(s,{type:'PAUSE'});assert.deepEqual(tick(paused),paused);
});
test('burn module works before weapon tier three, persists on ticks and ends with its target',()=>{
 const {ids,state}=eliteScene(),a=ids[2];
 let s=tick({...state,hazardHps:state.hazardHps.map((hp,i)=>i===a?20:-1),pendingShots:[incoming(state,{target:'hazard',targetIndex:a,lane:state.lane,damage:2,weaponLevel:0,burn:2})]});
 assert.equal(s.burns.length,1);const hp=s.hazardHps[a];s=tick(s);assert.ok(s.hazardHps[a]<hp);
 s={...s,hazardHps:s.hazardHps.map(()=>-1)};s=tick(s);assert.equal(s.burns.length,0);
});
test('recycle improves actual kill energy but cannot recharge an active burst',()=>{
 const {ids,state}=eliteScene(),a=ids[2];
 const shot=incoming(state,{target:'hazard',targetIndex:a,lane:state.lane,damage:10});
 const plain=tick({...state,pendingShots:[shot]}),enhanced=tick({...state,modules:{arc:0,burn:0,recycle:2},pendingShots:[shot]});
 assert.equal(enhanced.burstEnergy-plain.burstEnergy,6);
 assert.equal(tick({...state,modules:{arc:0,burn:0,recycle:3},burstTicks:20,pendingShots:[shot]}).burstEnergy,0);
});
test('energy carriers chain through nearby same-lane enemies once without hitting another lane',()=>{
 const {level,ids,state}=eliteScene(),a=ids[0],other=level.hazards.findIndex(h=>h.horde&&h.wave===0&&h.slot===1);
 const s=tick({...state,hazardHps:state.hazardHps.map((hp,i)=>ids.includes(i)?(i===a?1:3):i===other?3:-1),pendingShots:[incoming(state,{target:'hazard',targetIndex:a,lane:state.lane,damage:10})]});
 assert.equal(s.hazardHps[a],0);assert.ok(s.kills>=3);assert.equal(s.hazardHps[other],3);assert.ok(s.coreDetonations.some(e=>e.kind==='energy'));assert.ok(s.coreDetonations.length<=6);
});
test('guard protection reduces incoming hits and disappears as soon as the guard dies',()=>{
 const {level,ids,state}=eliteScene(),guard=ids.find(i=>level.hazards[i].eliteRole==='guard'),a=ids[1];
 assert.equal(sim.guardSourceFor(state,a),guard);
 const base={...state,hazardHps:state.hazardHps.map((hp,i)=>i===a?10:hp)};
 const hit=incoming(state,{target:'hazard',targetIndex:a,lane:state.lane,damage:2,burst:true});
 assert.equal(tick({...base,pendingShots:[hit]}).hazardHps[a],8.7);
 const broken=tick({...base,pendingShots:[incoming(state,{target:'hazard',targetIndex:guard,lane:state.lane,damage:100}),hit]});
 assert.equal(broken.hazardHps[a],8);assert.equal(sim.guardSourceFor(broken,a),-1);
});
test('commander buffs scheduled attacks and killing it cancels linked warnings only',()=>{
 const {level,ids,state}=eliteScene(),leader=ids.find(i=>level.hazards[i].eliteRole==='commander'),a=ids[0];
 const source={...state,progress:level.hazards[a].progress-4.9,hazardHps:state.hazardHps.map((hp,i)=>[a,leader].includes(i)?hp:-1)};
 assert.equal(sim.commanderFor(source,a),leader);
 const active=tick(source),alone=tick({...source,hazardHps:source.hazardHps.map((hp,i)=>i===leader?-1:hp)});
 assert.ok(active.enemyAttacks.length);assert.equal(active.enemyAttacks[0].damage,alone.enemyAttacks[0].damage*1.25);
 const linked={id:777,source:'hazard',sourceId:a,kind:'charge',lane:state.lane,fromLane:state.lane,fromY:45,phase:'warning',ticks:10,duration:10,damage:10,shotsRemaining:1};
 const broken=tick({...source,enemyAttacks:[linked,{...linked,id:778,phase:'flight'}],pendingShots:[incoming(state,{target:'hazard',targetIndex:leader,lane:state.lane,damage:100})]});
 assert.ok(!broken.enemyAttacks.some(a=>a.id===777));assert.ok(broken.enemyAttacks.some(a=>a.id===778));
});
test('all chassis capture module upgrades on their own shots, leaving old projectiles unchanged',()=>{
 for(const mechClass of ['pulse','heavy','blade']){
  const {ids,state}=eliteScene();const base={...state,mechClass,progress:39,fireCooldown:0,bots:3,hazardHps:state.hazardHps.map((hp,i)=>i===ids[2]?30:-1),modules:{arc:2,burn:1,recycle:0}};
  const next=tick(base);assert.equal(next.pendingShots.length,3);assert.ok(next.pendingShots.every(p=>p.arc===2&&p.burn===1));
  const upgraded=sim.applyGateEffect(next,moduleGate('arc'));assert.ok(upgraded.pendingShots.every(p=>p.arc===2));
 }
});

test('fully combined modules complete every boss with all chassis and clear remaining reaction effects',()=>{
 const samples=[];
 for(const mechClass of ['pulse','heavy','blade'])for(let level=0;level<5;level++){
  const spec=levels.getLevel(level);let s=tick({...initial(level),modules:{arc:3,burn:3,recycle:3},mechClass,status:'running',progress:spec.encounters[0].progress - sim.RUN_SPEED/2,gate:spec.gateMarks.length,hazardHps:spec.hazards.map(()=>-1),bots:5,weaponLevel:3});let ticks=0;
  while(sim.isActiveStatus(s.status)&&ticks<2400){s=sim.gameReducer(s,{type:'MOVE_LANE',lane:bossTactic(s)});if(sim.canActivateBurst(s)&&s.bossStep==='recovery')s=sim.gameReducer(s,{type:'ACTIVATE_BURST'});s=tick(s);ticks++;}
  assert.equal(s.won,true,mechClass+' L'+(level+1));assert.ok(ticks>=200&&ticks<=1600,mechClass+' L'+(level+1)+' '+ticks/10+'s');assert.equal(s.coreDetonations.length,0);samples.push(ticks/10);
 }
 console.log('Module boss sample seconds: '+samples.join(', '));
});

test('module doors resolve once at the ground contact line and only on their own lane',()=>{
 const level=levels.getLevel(0),gate=2,mark=level.gateMarks[gate],base={...initial(),status:'running',progress:mark-1.5-sim.RUN_SPEED/2,lane:1,gate,gateChoices:sim.createGateChoices(0,0,()=>0),fireCooldown:1000,hazardHps:level.hazards.map(()=>-1)};
 base.gateChoices[gate]=[moduleGate('burn')];
 const collected=tick(base);assert.equal(collected.modules.burn,1);assert.equal(tick(collected).modules.burn,1);assert.equal(base.modules.burn,0);
 assert.equal(tick({...base,lane:0}).modules.burn,0);
});


const operations=load('operations');
function quietRoad(levelIndex=0){const s=initial(levelIndex);return {...s,status:'running',fireCooldown:1000,gate:levels.getLevel(levelIndex).gateMarks.length,hazardHps:s.hazardHps.map(()=>-1)};}
test('perfect dodge requires a real late-window miss and has a cooldown rather than lane spam rewards',()=>{
 let s={...battle(),lane:0,dodgeFromLane:1,dodgeTicks:2,evadeTicks:0,threats:[{id:99,kind:'shell',lane:1,ticks:1,duration:8,hp:-1,maxHp:0,damage:12,fromLane:1}]};
 const next=tick(s);assert.equal(next.ops.perfects,1);assert.equal(next.ops.counterShots,3);assert.equal(s.ops.perfects,0);
 const again=tick({...next,evadeTicks:0,dodgeTicks:2,threats:s.threats});assert.equal(again.ops.perfects,1);
 const spam=sim.gameReducer({...battle(),lane:0},{type:'MOVE_LANE',lane:1});assert.equal(spam.ops.perfects,0);
 const paused=sim.gameReducer(next,{type:'PAUSE'});assert.deepEqual(tick(paused),paused);
});
test('each chassis captures its own real counter volley without changing base attack frequency',()=>{
 for(const mechClass of ['pulse','heavy','blade']){
  const base={...initial(),status:'running',progress:18,mechClass,bots:3,fireCooldown:0};base.ops={...base.ops,counterShots:1};
  const enhanced=tick(base),normal=tick({...base,ops:{...base.ops,counterShots:0}});
  assert.ok(enhanced.pendingShots.length>=3);assert.ok(enhanced.pendingShots.every(p=>p.counter&&p.origins.length===1));assert.equal(enhanced.ops.counterShots,0);
  assert.equal(enhanced.fireCooldown,normal.fireCooldown);assert.ok(enhanced.pendingShots[0].damage>normal.pendingShots[0].damage*1.6);
 }
});
test('fusion gates use the same displayed choice at ground contact, once, on the right lane',()=>{
 const l=levels.getLevel(0),base={...quietRoad(),gate:3,progress:l.gateMarks[3]-1.5-sim.RUN_SPEED/2,lane:1,modules:{arc:1,burn:1,recycle:0}};
 base.gateChoices=sim.createGateChoices(0,0,()=>0);base.gateChoices[3]=[{...moduleGate('arc'),effect:'weaponUp'}];
 assert.equal(sim.gateChoicesFor(base)[0].effect,'fuse');const next=tick(base);assert.equal(next.ops.fusion,'stormfire');assert.equal(next.weaponLevel,base.weaponLevel);assert.equal(sim.gateChoicesFor(next)[0].title,'雷焰反应');assert.equal(tick(next).ops.fusion,'stormfire');
 assert.equal(tick({...base,lane:0}).ops.fusion,null);assert.equal(base.ops.fusion,null);
 assert.equal(operations.eligibleFusion({arc:0,burn:1,recycle:1}),'furnace');assert.equal(operations.eligibleFusion({arc:1,burn:0,recycle:1}),'ion');
});
test('fusions produce captured equipment effects and furnace cycles only on real kills',()=>{
 const base={...quietRoad(),progress:18,fireCooldown:0,ops:{...quietRoad().ops,fusion:'ion'},modules:{arc:1,burn:0,recycle:1}};
 const next=tick(base);assert.ok(next.pendingShots.every(p=>p.fusion==='ion'&&p.pierce>=1));
 const {ids,state}=eliteScene(),a=ids[2];const killed=tick({...state,kills:5,ops:{...state.ops,fusion:'furnace'},pendingShots:[incoming(state,{target:'hazard',targetIndex:a,lane:state.lane,damage:100})]});assert.equal(killed.chargedVolleys,1);
 const empty=tick({...base,ops:{...base.ops,fusion:'furnace'},kills:5});assert.equal(empty.chargedVolleys,0);
});
test('every sector owns a real same-lane mission target, once-only rewards and persistent missed state',()=>{
 for(let level=0;level<5;level++){
  const base=quietRoad(level);base.progress=45;base.lane=base.ops.mission.lane;
  const wrong=tick({...base,pendingShots:[incoming(base,{target:'objective',targetIndex:0,lane:(base.lane+1)%3,damage:100})]});assert.equal(wrong.ops.mission.status,'pending');
  const done=tick({...base,pendingShots:[incoming(base,{target:'objective',targetIndex:0,lane:base.lane,damage:100})]});assert.equal(done.ops.mission.status,'done');assert.equal(done.ops.bonusParts,1);assert.equal(tick(done).ops.bonusParts,1);assert.equal(base.ops.mission.status,'pending');
  assert.equal(tick({...base,progress:49}).ops.mission.status,'missed');
 }
});
test('cargo risk is telegraphed, pinned to one lane, avoidable and yields no automatic reward on a miss',()=>{
 const base=quietRoad();base.progress=61-sim.RUN_SPEED/2;base.lane=base.ops.event.lane;
 let warning=tick(base);assert.equal(warning.ops.eventWarning,16);const pinned=warning.ops.eventLane;
 warning={...warning,lane:(pinned+1)%3};const safeHp=warning.playerHp;for(let i=0;i<16;i++)warning=tick(warning);assert.equal(warning.playerHp,safeHp);assert.equal(warning.ops.bonusParts,0);
 let hit=tick(base);for(let i=0;i<16;i++)hit=tick(hit);assert.equal(hit.playerHp,base.playerHp-12);
 const done=tick({...base,pendingShots:[incoming(base,{target:'event',targetIndex:0,lane:base.lane,damage:100})]});assert.equal(done.ops.event.status,'done');assert.equal(done.ops.eventWarning,0);assert.equal(done.ops.bonusParts,2);assert.equal(done.modules.arc,1);
 assert.equal(tick({...base,progress:66}).ops.event.status,'missed');
});
test('pre-boss preparation is three ground choices that resolve once and freeze during pause',()=>{
 const seed=quietRoad(),contact=operations.prepMark(seed)-1.5;
 for(let lane=0;lane<3;lane++){
  const base={...seed,progress:contact - sim.RUN_SPEED/2,lane,playerHp:30,modules:{arc:1,burn:0,recycle:0}};const next=tick(base);
  assert.equal(next.ops.prep,['repair','retune','amplify'][lane]);assert.equal(base.ops.prep,'pending');
  if(lane===0)assert.equal(next.playerHp,65);if(lane===1)assert.equal(next.modules.arc,2);if(lane===2)assert.equal(next.chargedVolleys,2);
  assert.equal(tick(next).chargedVolleys,next.chargedVolleys);assert.equal(tick(next).modules.arc,next.modules.arc);
  const paused=sim.gameReducer(base,{type:'PAUSE'});assert.deepEqual(tick(paused),paused);
 }
});
test('boss parts are distinct lane targets, interrupt attacks and permanently disable their own function',()=>{
 let base={...battle(),fireCooldown:1000};base.ops={...base.ops,parts:operations.makeBossParts(base)};
 const wrong=tick({...base,pendingShots:[incoming(base,{target:'part',targetIndex:0,lane:1,damage:100})]});assert.equal(wrong.ops.parts[0].hp,base.ops.parts[0].hp);
 const broken=tick({...base,bossStep:'warning',bossStepTicks:0,pendingShots:[incoming(base,{target:'part',targetIndex:0,lane:0,damage:1000})]});assert.equal(broken.ops.parts[0].hp,0);assert.equal(broken.ops.broken,1);assert.equal(broken.bossStep,'recovery');assert.equal(broken.bossSalvos,0);assert.equal(base.ops.parts[0].hp>0,true);
 assert.equal(tick({...broken,pendingShots:[incoming(base,{target:'part',targetIndex:0,lane:0,damage:1000})]}).ops.broken,1);
 const shield=tick({...base,threats:[{id:3,kind:'pylon',lane:1,ticks:20,duration:20,hp:5,maxHp:5,damage:1,fromLane:1}],pendingShots:[incoming(base,{target:'part',targetIndex:1,lane:sim.bossPartLane(base,1),damage:1000})]});assert.equal(sim.bossGuarded(shield),false);
 const engine={...base,ops:{...base.ops,parts:base.ops.parts.map(p=>p.kind==='engine'?{...p,hp:0}:p)}};assert.ok(operations.partBroken(engine,'engine'));
});
test('mission outcomes alter the appropriate boss setup, and storm completion removes further jams',()=>{
 for(const level of [0,2]){const base=battle(level);base.ops.mission.status='done';const parts=operations.makeBossParts(base);assert.equal(parts[level===0?0:1].hp,level===0?Math.round(parts[0].maxHp*.5):0);}
 const base=quietRoad(3);base.progress=66.1;base.ops.mission.status='done';assert.equal(tick(base).jamTicks,0);
});
test('challenge protocols require a cleared selected level and survive restart with actual modifiers',()=>{
 const cleared=progression.normalizeGarage({...garage,completedLevels:[true,false,false,false,false]});let home=sim.createInitialState(cleared,0,0);
 home=sim.gameReducer(home,{type:'SET_PROTOCOL',protocol:'elite',garage:cleared});assert.equal(home.ops.protocol,'elite');
 const run=sim.gameReducer(home,{type:'START',garage:cleared});assert.equal(run.ops.protocol,'elite');assert.equal(run.hazardHps[0],Math.ceil(levels.getLevel(0).hazards[0].hp*1.4));
 assert.equal(sim.gameReducer(run,{type:'SET_PROTOCOL',protocol:'standard',garage:cleared}),run);
 const fresh=progression.normalizeGarage(null),locked=sim.createInitialState(fresh);assert.equal(sim.gameReducer(locked,{type:'SET_PROTOCOL',protocol:'elite',garage:fresh}),locked);
 assert.equal(sim.gameReducer(home,{type:'SET_PROTOCOL',protocol:'__proto__',garage:cleared}),home);
 const repaired=sim.applyGateEffect({...run,playerHp:20,ops:{...run.ops,protocol:'scarcity'}},{...moduleGate('repair'),effect:'repair',amount:1});assert.equal(repaired.playerHp,35);
});
test('challenge medal persistence validates victory, deduplicates and preserves old garage saves',()=>{
 const base=progression.normalizeGarage(garage),won={status:'result',won:true,bossDefeated:true,progress:100,levelIndex:0,protocol:'elite'};
 const first=progression.recordLevelCompletion(base,won),second=progression.recordLevelCompletion(first,won);assert.deepEqual(second.challengeClears,['0:elite']);assert.equal(base.challengeClears.length,0);
 assert.equal(progression.recordLevelCompletion(base,{...won,won:false}).challengeClears.length,0);
 assert.equal(progression.normalizeGarage({...base,challengeClears:['0:elite','bad','4:overdrive']}).challengeClears.length,1);
 assert.deepEqual(progression.normalizeGarage(null).challengeClears,[]);
});
test('new artwork is local RGBA atlases with preserved originals and regular cell geometry',()=>{
 for(const [file,cols,rows]of [['operations-atlas-v19.webp',3,3],['fusion-atlas-v19.webp',3,2]]){
  const data=readFixture(path.resolve(__dirname,'../../../public/games/toybot-breakout/optimized',file));assert.equal(imageInfo(data).alpha,true);assert.equal(imageInfo(data).width%cols,0);assert.equal(imageInfo(data).height%rows,0);assert.ok(fixtureExists(path.join(__dirname,'art-source',file)));
 }
});

test('road dodge uses the actual missed attack without delaying drag movement or refreshing a spammed window',()=>{
 const base=quietRoad(),moved=sim.gameReducer({...base,lane:1},{type:'MOVE_LANE',lane:0});assert.equal(moved.lane,0);assert.equal(moved.ops.roadDodgeTicks,3);
 const spam=sim.gameReducer(moved,{type:'MOVE_LANE',lane:2});assert.equal(spam.ops.roadDodgeTicks,3);assert.equal(spam.ops.roadFromLane,1);
 const source=levels.getLevel(0).hazards.findIndex(h=>!h.horde),s={...moved,ops:{...moved.ops,roadDodgeTicks:2},progress:18,enemyAttacks:[{id:9,source:'hazard',sourceId:source,kind:'sniper-shot',lane:1,fromLane:1,fromY:40,phase:'flight',ticks:1,duration:8,damage:12,shotsRemaining:1}]};
 const evaded=tick(s);assert.equal(evaded.playerHp,s.playerHp);assert.equal(evaded.ops.perfects,1);assert.equal(s.ops.perfects,0);
});
test('scarcity and overdrive affect actual health changes while elite health bars use scaled maxima',()=>{
 const base=battle(),threat={id:4,kind:'shell',lane:base.lane,ticks:1,duration:8,hp:-1,maxHp:0,damage:10,fromLane:1};
 const overloaded=tick({...base,ops:{...base.ops,protocol:'overdrive'},threats:[threat]});assert.equal(overloaded.playerHp,88);
 const road=quietRoad();road.ops.protocol='elite';assert.equal(sim.hazardMaxHpFor(road,0),Math.ceil(levels.getLevel(0).hazards[0].hp*1.4));
 const contact=operations.prepMark(road)-1.5;const repaired=tick({...road,ops:{...road.ops,protocol:'scarcity'},progress:contact - sim.RUN_SPEED/2,playerHp:20,lane:0});assert.equal(repaired.playerHp,38);
});

test('fusion plus perfect counters and new parts preserve full five-sector boss counterplay',()=>{
 const samples=[];
 for(const mechClass of ['pulse','heavy','blade'])for(let level=0;level<5;level++){
  const spec=levels.getLevel(level),seed=initial(level);seed.ops.fusion=['stormfire','furnace','ion'][level%3];seed.ops.mission.status='done';
  let s=tick({...seed,modules:{arc:2,burn:2,recycle:2},mechClass,status:'running',progress:spec.encounters[0].progress - sim.RUN_SPEED/2,gate:spec.gateMarks.length,hazardHps:spec.hazards.map(()=>-1),bots:5,weaponLevel:3});let ticks=0;
  while(sim.isActiveStatus(s.status)&&ticks<2400){s=sim.gameReducer(s,{type:'MOVE_LANE',lane:bossTactic(s)});if(sim.canActivateBurst(s)&&s.bossStep==='recovery')s=sim.gameReducer(s,{type:'ACTIVATE_BURST'});s=tick(s);ticks++;}
  assert.equal(s.won,true,mechClass+' L'+(level+1));assert.ok(ticks>200&&ticks<=1600,mechClass+' L'+(level+1)+' '+ticks/10);assert.ok(s.ops.broken>=1);samples.push(ticks/10);
 }
 console.log('Operations boss sample seconds: '+samples.join(', '));
});
test('maxed preparation rewards a fallback score and new operation sounds are driven by outcomes',()=>{
 const s=quietRoad();s.progress=operations.prepMark(s)-1.5-sim.RUN_SPEED/2;s.lane=1;s.modules={arc:3,burn:3,recycle:3};const next=tick(s);assert.equal(next.score,s.score+40);
 const audio=load('audio'),base=battle();assert.ok(audio.gameSoundEvents(base,{...base,ops:{...base.ops,perfects:1}}).includes('perfect'));
 assert.ok(audio.gameSoundEvents(base,{...base,ops:{...base.ops,fusion:'ion'}}).includes('upgrade'));
});

test('defeat clears operation flashes and queued counterattacks without losing earned statistics',()=>{
 const base={...quietRoad(),bots:0};base.ops={...base.ops,perfectTicks:8,counterShots:3,eventWarning:8,perfects:4,broken:2};
 const ended=tick(base);assert.equal(ended.status,'defeat');assert.equal(ended.ops.perfectTicks,0);assert.equal(ended.ops.counterShots,0);assert.equal(ended.ops.eventWarning,0);assert.equal(ended.ops.perfects,4);assert.equal(ended.ops.broken,2);
});

test('the last blade counter keeps its acquired extended range after consuming the charge',()=>{
 const base=battle();base.mechClass='blade';base.battleLane=2;base.lane=1;base.bossStep='recovery';base.bossStepTicks=3;base.ops.counterShots=1;base.fireCooldown=0;base.threats=[{id:88,kind:'orb',lane:1,originY:48,ticks:20,duration:20,hp:30,maxHp:30,damage:0,fromLane:2}];
 const shot=tick(base);assert.ok(shot.pendingShots.length);assert.ok(shot.pendingShots.every(p=>p.counter&&p.range===11));assert.equal(shot.ops.counterShots,0);
 let s=shot;for(let i=0;i<3;i++)s=tick(s);assert.ok(s.threats.find(t=>t.id===88).hp<30);
});

test('fractional protocol damage keeps repeated health feedback readable to two decimal places',()=>{
 const s=quietRoad();for(let i=0;i<3;i++){s.invulnerableTicks=0;sim.applySquadHit(s,15.6);assert.equal(s.playerHp,Number(s.playerHp.toFixed(2)));assert.equal(s.damageLoss,15.6);}assert.equal(s.playerHp,53.2);
});


const motion=load('motion');
test('render alpha is bounded after stalls and presentation sampling never mutates combat state',()=>{
 assert.equal(motion.motionAlpha(-20),0);assert.equal(motion.motionAlpha(50),.5);assert.equal(motion.motionAlpha(10000),.999);assert.equal(motion.motionAlpha(NaN),0);
 const base={...quietRoad(),progress:32},before=JSON.stringify(base),v=motion.visualState(base,.5);assert.equal(v.progress,32+sim.RUN_SPEED*.5);assert.equal(JSON.stringify(base),before);assert.notEqual(v,base);
});
test('attack and dodge strips play once through eight frames without wrapping inside the action',()=>{
 const base={...battle(),mechClass:'heavy'},frames=[],dodges=[];
 for(let tickIndex=0;tickIndex<4;tickIndex++)for(const alpha of [0,.25,.5,.75,.99]){frames.push(motion.poseSample({...base,fireCooldown:sim.attackIntervalFor(base)-tickIndex},alpha).attackFrame);dodges.push(motion.poseSample({...base,dodgeTicks:4-tickIndex},alpha).dodgeFrame);}
 assert.equal(frames[0],0);assert.equal(frames.at(-1),7);assert.equal(dodges[0],0);assert.equal(dodges.at(-1),7);
 assert.ok(frames.every((v,i)=>i===0||v>=frames[i-1]));assert.ok(dodges.every((v,i)=>i===0||v>=dodges[i-1]));
 assert.ok(motion.poseSample({...base,fireCooldown:sim.attackIntervalFor(base)-2},0).recoil>2);
});
test('visual formation follows a continuous bounded dodge and reaches the original next-tick position',()=>{
 const base={...battle(),lane:2,dodgeFromLane:1,dodgeTicks:3},samples=[0,.25,.5,.75,1].map(a=>sim.playerFormation(motion.visualState(base,a))[0].x);
 assert.ok(samples.every((x,i)=>x>=50&&x<=73&&(i===0||x>=samples[i-1])));
 assert.equal(samples.at(-1),sim.playerFormation({...base,dodgeTicks:2})[0].x);assert.equal(base.dodgeTicks,3);
});
test('individual projectile samples keep their own origins, travel forward and approach impact on time',()=>{
 const base=battle(),shot=incoming(base,{ticks:4,duration:4,origins:[{index:2,x:61,y:70}]});const samples=[0,.25,.5,.75,.99].map(a=>motion.projectileSample(base,shot,a));
 assert.equal(samples[0].x,61);assert.equal(samples[0].y,70);assert.ok(samples.every((p,i)=>p.progress>=0&&p.progress<=1&&(i===0||p.y<samples[i-1].y)));
 const contact=motion.projectileSample(base,{...shot,ticks:1},1);assert.equal(contact.progress,1);assert.equal(contact.y,sim.targetY(motion.visualState(base,1),'boss',0));
 assert.equal(shot.ticks,4);assert.equal(shot.origins[0].x,61);
});
test('rendered projectiles do not bend into another lane after their target changes lanes',()=>{
 const base=initial(1),spec=levels.getLevel(1),index=spec.hazards.findIndex(h=>h.moving),h=spec.hazards[index],lane=(h.lane+base.layoutIndex)%3;
 const s={...base,status:'running',progress:h.progress-8+.1},shot=incoming(s,{target:'hazard',targetIndex:index,lane,ticks:1,duration:4});
 const p=motion.projectileSample(s,shot,1);assert.equal(p.x,sim.laneXAt(lane,p.y));assert.notEqual(p.x,sim.targetX(motion.visualState(s,1),'hazard',index));
});
test('moving drones blend their lane transition rather than teleporting at the lane boundary',()=>{
 const base=initial(1),spec=levels.getLevel(1),index=spec.hazards.findIndex(h=>h.moving),h=spec.hazards[index],at={...base,status:'running',progress:h.progress-8};
 const old=sim.laneXAt((h.lane+base.layoutIndex)%3,sim.roadEnemyY(at,index));assert.ok(Math.abs(motion.hazardVisualX(at,index)-old)<.00001);
 const midway={...at,progress:at.progress+sim.RUN_SPEED},end={...at,progress:at.progress+sim.RUN_SPEED*2};
 const m=motion.hazardVisualX(midway,index),finish=motion.hazardVisualX(end,index);assert.ok(m>Math.min(old,finish)&&m<Math.max(old,finish));assert.equal(finish,sim.roadEnemyX(end,index));
});
test('rush and pounce presentation advances between ticks while authoritative attack timers stay intact',()=>{
 const base=quietRoad(),index=levels.getLevel(0).hazards.findIndex(h=>h.horde);base.enemyAttacks=[{id:2,source:'hazard',sourceId:index,kind:'charge',lane:1,fromLane:1,fromY:42,phase:'flight',ticks:4,duration:6,damage:8,shotsRemaining:1}];
 const v=motion.visualState(base,.5);assert.equal(v.enemyAttacks[0].ticks,3.5);assert.equal(base.enemyAttacks[0].ticks,4);assert.ok(sim.roadEnemyY(v,index)>sim.roadEnemyY(base,index));
});
test('the frame loop respects low-quality cadence and cancels pending work on stop',()=>{
 for(const low of [false,true]){
  const queued=new Map();let sequence=0,paints=0;
  const request=cb=>{queued.set(++sequence,cb);return sequence;},cancel=id=>queued.delete(id);
  const stop=motion.startMotionLoop(request,cancel,()=>paints++,low);
  for(let i=0;i<=60;i++){const [id,cb]=queued.entries().next().value;queued.delete(id);cb(i*1000/60);}
  assert.ok(low?paints>=30&&paints<=31:paints>=60&&paints<=61);const before=paints,stale=queued.values().next().value;stop();assert.equal(queued.size,0);stale(2000);assert.equal(paints,before);assert.equal(queued.size,0);
 }
});

test('the DOM painter only changes presentation styles and keeps samples finite for a dense scene',()=>{
 const base={...quietRoad(1),progress:32,bots:3},index=levels.getLevel(1).hazards.findIndex(h=>h.moving),shot=incoming(base,{id:71,target:'hazard',targetIndex:index,lane:levels.hazardLaneAt(0,index,32,1),ticks:3,duration:4});base.pendingShots=[shot];
 const makeNode=()=>({style:{setProperty(k,v){this[k]=v;}},querySelector(){return null;}}),root=makeNode(),shotNode=makeNode(),hazardNode=makeNode(),before=JSON.stringify(base);
 for(const alpha of [0,.1,.5,.999])motion.paintMotion(root,base,alpha,[{node:shotNode,kind:'shot',id:71},{node:hazardNode,kind:'hazard',id:index}]);
 assert.equal(JSON.stringify(base),before);assert.ok(shotNode.style.transform.includes('rotate'));assert.ok(!JSON.stringify([shotNode.style,hazardNode.style,root.style]).match(/NaN|Infinity/));
 motion.paintMotion(root,base,.9,[],true);assert.equal(root.style['--motion-phase'],'0');assert.equal(root.style['--pose-recoil'],'0px');
});

test('core siege rounds have a bounded forward arc and arrive at their own captured target',()=>{
 const s={...battle(),lane:1,battleLane:1},shot=incoming(s,{burst:true,attackStyle:'heavy',origins:[{index:2,x:61,y:66}],duration:6,ticks:6});
 const samples=Array.from({length:7},(_,i)=>motion.projectileSample(s,{...shot,ticks:6-i},0));
 assert.equal(samples[0].x,61);assert.equal(samples[0].y,66);assert.equal(samples.at(-1).y,sim.targetY(s,'boss',0));
 assert.ok(samples.every((p,i)=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&(i===0||p.y<samples[i-1].y)));
 const mid=motion.projectileSample(s,{...shot,ticks:3},0),straight=motion.projectileSample(s,{...shot,burst:false,ticks:3},0);assert.ok(mid.y<straight.y);
});
test('dynamic pulse painter preserves independent emitters without drawing full-length beams',()=>{
 const s={...battle(),lane:1,battleLane:1};s.pendingShots=[incoming(s,{id:11,burst:true,attackStyle:'pulse',count:3,duration:8,ticks:8,muzzle:true,origins:[{index:1,x:44.4,y:65}]}),incoming(s,{id:12,burst:true,attackStyle:'pulse',count:3,duration:8,ticks:8,muzzle:true,origins:[{index:2,x:55.6,y:65}]})];
 const makeNode=()=>({style:{setProperty(k,v){this[k]=v;}},querySelector(){return null;}}),root=makeNode(),a=makeNode(),b=makeNode(),before=JSON.stringify(s),entries=[{node:a,kind:'core-pulse',id:11},{node:b,kind:'core-pulse',id:12}];
 motion.paintMotion(root,s,0,entries);assert.ok(Math.abs(parseFloat(a.style.left)-41.04)<1e-9);assert.ok(Math.abs(parseFloat(b.style.left)-58.96)<1e-9);assert.match(a.style.top,/calc/);assert.equal(a.style.height,undefined);const start=a.style.top;motion.paintMotion(root,s,.5,entries);assert.notEqual(a.style.top,start);assert.ok(!JSON.stringify([a.style,b.style]).match(/NaN|Infinity/));assert.equal(JSON.stringify(s),before);
});
test('core clear-through bonuses increase road power while retaining boss multipliers and firing cadence',()=>{
 const skill=load('mechs').CORE_SKILLS;assert.equal(skill.pulse.damage,1.6);assert.equal(skill.heavy.damage,2);assert.equal(skill.blade.damage,1.6);assert.equal(skill.pulse.bossDamage,1.25);assert.equal(skill.heavy.bossDamage,1.2);assert.equal(skill.blade.bossDamage,1.15);
 for(const mechClass of ['pulse','heavy','blade']){const s={...battle(),mechClass,lane:1,battleLane:1,bossStep:'warning',bots:1,fireCooldown:0,burstEnergy:100};const n=tick(sim.gameReducer(s,{type:'ACTIVATE_BURST'}));assert.equal(n.fireCooldown,sim.attackIntervalFor(s));assert.ok(n.pendingShots.every(p=>p.burst&&p.origins.length===1));}
});
test('cockpit and skill atlases have deployment dimensions and preserve RGBA originals',()=>{
 for(const [name,width,height]of [['cockpit-console-v22',1080,360],['reactor-core-v22',384,384],['core-effects-v22',1200,400]]){
  const png=readFixture(path.resolve(__dirname,'../../../public/games/toybot-breakout/optimized',name+'.png'));
  assert.equal(imageInfo(png).width,width);assert.equal(imageInfo(png).height,height);assert.equal(imageInfo(png).alpha,true);assert.ok(fixtureExists(path.join(__dirname,'art-source',name+'.png')));
 }
});

test('every core skill damages real targets in all three lanes without changing normal lane restrictions',()=>{
 for(const mechClass of ['pulse','heavy','blade']){
  const base={...battle(),mechClass,lane:1,battleLane:1,bossStep:'warning',bots:2,fireCooldown:0,burstEnergy:100,threats:[0,1,2].map(lane=>burstObjective(101+lane,lane,54,100))},before=JSON.stringify(base);
  let normal=tick(base);normal.fireCooldown=1000;for(let i=0;i<8;i++)normal=tick(normal);
  assert.equal(normal.threats.find(t=>t.lane===0).hp,100);assert.equal(normal.threats.find(t=>t.lane===2).hp,100);
  let s=tick(sim.gameReducer(base,{type:'ACTIVATE_BURST'}));assert.deepEqual([...new Set(s.pendingShots.map(p=>p.lane))],[0,1,2]);assert.ok(s.pendingShots.every(p=>p.origins[0].x>=39&&p.origins[0].x<=61));s.fireCooldown=1000;for(let i=0;i<8;i++)s=tick(s);
  assert.ok(s.threats.every(t=>t.hp<100),mechClass+' must really hit every lane');assert.equal(JSON.stringify(base),before);
 }
});
test('three-lane core volleys continue during a dodge and keep each already-fired source fixed',()=>{
 const base={...battle(),lane:1,battleLane:1,bossStep:'warning',bots:3,fireCooldown:0,burstEnergy:100};
 let s=sim.gameReducer(sim.gameReducer(base,{type:'ACTIVATE_BURST'}),{type:'MOVE_LANE',lane:2});s=tick(s);
 assert.equal(s.dodgeTicks,3);assert.equal(s.pendingShots.length,9);const origins=s.pendingShots.map(p=>p.origins),moved=sim.gameReducer(s,{type:'MOVE_LANE',lane:0});assert.deepEqual(moved.pendingShots.map(p=>p.origins),origins);
 const paused=sim.gameReducer(moved,{type:'PAUSE'});assert.equal(tick(paused),paused);
});
test('core targeting still rejects a captured target that moved out of its assigned lane',()=>{
 const base=initial(1),level=levels.getLevel(1),index=level.hazards.findIndex(h=>h.moving),h=level.hazards[index],lane=levels.hazardLaneAt(0,index,h.progress-8-.1,1);
 const s={...base,status:'running',progress:h.progress-8+.1,fireCooldown:1000,gate:99,pendingShots:[incoming(base,{burst:true,target:'hazard',targetIndex:index,lane,damage:999})]};
 const n=tick(s);assert.equal(n.hazardHps[index],s.hazardHps[index]);assert.equal(n.report.dealt,0);
});
test('sword-wave presentation deduplicates one visual per source lane and release time without dropping physics',()=>{
 const a=load('awakening'),shots=[];for(let source=0;source<3;source++)for(let lane=0;lane<3;lane++)for(let target=0;target<3;target++)shots.push(incoming(battle(),{id:shots.length,attackStyle:'blade',burst:true,lane,ticks:4,duration:5,origins:[{index:source,x:39+source*11,y:65}],targetIndex:target}));
 const original=JSON.stringify(shots),visible=a.coreVisualShots(shots);assert.equal(visible.length,9);assert.equal(shots.length,27);assert.equal(JSON.stringify(shots),original);
 assert.equal(a.coreVisualShots([...shots,...shots.map(s=>({...s,ticks:1}))]).length,18);
});
test('integrated body sheets sample running idle firing and dodge rows without state mutation',()=>{
 const a=load('awakening'),s={...battle(),burstTicks:40,bossStep:'warning'},before=JSON.stringify(s);
 assert.equal(a.awakeningPose({...s,status:'running'},.5,0).row,0);assert.equal(a.awakeningPose(s,.5,0).row,1);
 assert.equal(a.awakeningPose({...s,fireCooldown:sim.attackIntervalFor(s)},0,0).row,2);
 const dodge=[4,3,2,1].map(dodgeTicks=>a.awakeningPose({...s,dodgeTicks},.5,0));assert.ok(dodge.every(p=>p.row===3&&p.frame>=0&&p.frame<=3));assert.deepEqual(dodge.map(p=>p.frame),[0,1,2,3]);assert.equal(JSON.stringify(s),before);
});
test('whole-body awakening assets retain regular 4 by 4 RGBA geometry',()=>{
 const a=load('awakening');for(const url of Object.values(a.AWAKEN_ART)){const png=readFixture(path.resolve(__dirname,'../../../public',url.slice(1)));assert.equal(imageInfo(png).width,1024);assert.equal(imageInfo(png).height,1024);assert.equal(imageInfo(png).alpha,true);}
});
test('core beam length and angle reconstruct the real body-center to target segment at different aspect ratios',()=>{
 const s={...battle(),battleLane:2},shot=incoming(s,{burst:true,origins:[{index:1,x:39,y:65}],lane:2,count:3});
 for(const size of [{width:390,height:700},{width:320,height:480},{width:430,height:900}]){
  const p=motion.coreBeamSample(s,shot,.5,size),end=motion.projectileSample(s,{...shot,ticks:0},0,motion.visualState(s,.5)),radians=p.angle*Math.PI/180;
  assert.ok(Math.abs(p.x*size.width/100+Math.sin(radians)*p.length-end.x*size.width/100)<.00001);
  assert.ok(Math.abs(p.y*size.height/100-p.lift-Math.cos(radians)*p.length-end.y*size.height/100)<.00001);assert.ok(p.lift>0);
 }
});


const frontline=load('frontline');
function sectorElite(pattern){
 const sector=levels.LEVELS.findIndex(l=>l.hazards.some(h=>h.elite&&h.pattern===pattern));
 const l=levels.getLevel(sector),index=l.hazards.findIndex(h=>h.elite&&h.pattern===pattern),h=l.hazards[index];
 const state={...initial(sector),status:'running',progress:h.progress-13.4,fireCooldown:10000,gate:l.gateMarks.length,playerHp:100,playerMaxHp:100};
 state.hazardHps=state.hazardHps.map((hp,i)=>i===index?hp:-1);
 state.lane=levels.hazardLaneAt(0,index,state.progress,sector);
 return {state,index};
}
test('five-minute structure reaches every boss after roughly two minutes without modifying gun cadence',()=>{
 const seconds=[];
 for(let sector=0;sector<5;sector++){
  let s={...quietRoad(sector),fireCooldown:10000},ticks=0;
  const interval=sim.attackIntervalFor(s);
  while(s.status==='running'&&ticks<1300){s=tick(s);ticks++;}
  assert.equal(s.status,'boss-intro');assert.ok(ticks>=1160&&ticks<=1220);assert.equal(sim.attackIntervalFor(s),interval);seconds.push(ticks/10);
  const paused=sim.gameReducer({...s,status:'running'},{type:'PAUSE'});assert.equal(tick(paused),paused);
 }
 console.log('Road duration seconds: '+seconds.join(', '));
});
test('every sector has three named elite encounters and three extra themed swarms before preparation',()=>{
 const themes=new Set();
 for(const [sector,l]of levels.LEVELS.entries()){
  const elites=l.hazards.filter(h=>h.elite);assert.equal(elites.length,3);assert.equal(new Set(elites.map(h=>h.encounterId)).size,3);
  assert.ok(elites.every(h=>h.title&&h.pattern in frontline.ELITE_ATTACKS&&h.progress<l.encounters[0].progress-7));
  for(let stage=0;stage<3;stage++)assert.equal(l.hazards.filter(h=>h.encounterId==='surge-'+stage).length,12+sector*4);
  assert.equal(l.bossTargetSeconds,180);themes.add(frontline.frontlineStage(sector,50).theme);
  assert.equal(frontline.roadEnemyName(sector,elites[0]),elites[0].title);
 }
 assert.equal(themes.size,5);
});
test('new elite patterns have fixed readable telegraphs, interruptible charges and pause-safe cooldowns',()=>{
 for(const [pattern,profile]of Object.entries(frontline.ELITE_ATTACKS)){
  const {state,index}=sectorElite(pattern);const old=JSON.stringify(state),s=tick(state);
  assert.equal(JSON.stringify(state),old);assert.ok(s.enemyAttacks.length>0);assert.ok(s.enemyAttacks.every(a=>a.kind===pattern&&a.phase==='warning'&&a.ticks>=profile.warning));
  const pinned=s.enemyAttacks.map(a=>a.lane),moved=tick({...s,lane:(state.lane+1)%3});assert.deepEqual(moved.enemyAttacks.map(a=>a.lane),pinned);
  assert.equal(tick({...s,hazardHps:s.hazardHps.map(()=>-1)}).enemyAttacks.length,0);
  assert.equal(s.roadCooldowns[index],load('encounterV43').eliteRearmV43(profile.rearm));const paused=sim.gameReducer(s,{type:'PAUSE'});assert.equal(tick(paused),paused);
 }
});
test('mines and storm orbs become real lingering fields after travel and survive a destroyed launcher',()=>{
 for(const pattern of ['heat-mine','storm-orb']){
  const {state,index}=sectorElite(pattern),profile=frontline.ELITE_ATTACKS[pattern];let s=tick(state),lane=s.enemyAttacks[0].lane;
  for(let i=0;i<profile.warning;i++)s=tick(s);assert.equal(s.enemyAttacks[0].phase,'flight');
  s={...s,lane,hazardHps:s.hazardHps.map(()=>-1),enemyAttackSources:['hazard:'+index]};
  for(let i=0;i<profile.flight;i++)s=tick(s);assert.equal(s.enemyAttacks[0].phase,'field');assert.ok(s.playerHp<100);
  s={...s,playerHp:100,invulnerableTicks:0};let damaged=false;
  for(let i=0;i<8;i++){s=tick(s);if(s.playerHp<100){damaged=true;break;}}
  assert.ok(damaged);if(pattern==='storm-orb')assert.ok(s.jamTicks>0);
  const safe={...s,lane:(lane+1)%3,playerHp:100,invulnerableTicks:0,jamTicks:0};let n=safe;for(let i=0;i<30;i++)n=tick(n);assert.equal(n.playerHp,100);assert.equal(n.enemyAttacks.length,0);assert.equal(n.jamTicks,0);
 }
});
test('elite rail strikes only after warning and royal paired salvos advertise their delayed second lane',()=>{
 const {state}=sectorElite('siege-laser');let s=tick(state);const lane=s.enemyAttacks[0].lane;s={...s,lane};
 for(let i=0;i<24;i++)s=tick(s);assert.equal(s.playerHp,100);assert.equal(s.enemyAttacks[0].phase,'flight');
 s=tick(tick(s));assert.equal(s.playerHp,84);
 const royal=tick(sectorElite('royal-salvo').state);assert.equal(royal.enemyAttacks.length,2);assert.equal(new Set(royal.enemyAttacks.map(a=>a.lane)).size,2);assert.equal(royal.enemyAttacks[1].ticks-royal.enemyAttacks[0].ticks,5);
});
test('elite can rearm after a full attack and cooldown, and actual destruction rewards exactly once',()=>{
 const {state,index}=sectorElite('heat-mine');let s=tick(state),first=s.enemyAttackSequence;
 for(let i=0;i<66;i++)s=tick(s);assert.ok(s.enemyAttackSequence>first);assert.ok(s.enemyAttacks.length<=2);
 const before={...state,playerHp:70,burstEnergy:0};const dead=tick({...before,pendingShots:[incoming(before,{target:'hazard',targetIndex:index,lane:before.lane,damage:9999})]});
 assert.equal(dead.hazardHps[index],0);assert.equal(dead.ops.bonusParts,before.ops.bonusParts+1);assert.ok(dead.burstEnergy>=30);assert.equal(dead.playerHp,78);assert.equal(tick(dead).ops.bonusParts,dead.ops.bonusParts);
});

test('hunter fan fires three real arrivals per lane and leaves the third lane safe',()=>{
 const {state}=sectorElite('hunter-fan');let s=tick(state),profile=frontline.ELITE_ATTACKS['hunter-fan'];
 const safe=[0,1,2].find(lane=>!s.enemyAttacks.some(a=>a.lane===lane));assert.notEqual(safe,undefined);
 for(let i=0;i<profile.warning;i++)s=tick(s);assert.ok(s.enemyAttacks.every(a=>a.phase==='flight'&&a.shotsRemaining===3));
 s={...s,lane:s.enemyAttacks[0].lane};for(let i=0;i<profile.flight;i++)s=tick(s);assert.ok(s.enemyAttacks.every(a=>a.shotsRemaining===2));assert.ok(s.playerHp<100);
 s={...s,lane:safe};for(let i=0;i<12;i++)s=tick(s);assert.equal(s.enemyAttacks.length,0);
});

test('weapon upgrades and active core volleys use distinct timbres while one squad volley remains one cue',()=>{
 const audio=load('audio');for(const mechClass of ['pulse','heavy','blade']){
  const s={...battle(),mechClass},n={...s,weaponLevel:2,shotSequence:s.shotSequence+15,fireCooldown:sim.attackIntervalFor(s)};
  assert.deepEqual(audio.gameSoundEvents(s,n),[mechClass+'-up']);assert.deepEqual(audio.gameSoundEvents(s,{...n,jamTicks:20}),[mechClass]);assert.deepEqual(audio.gameSoundEvents(s,{...n,burstTicks:25}),['core-shot-'+mechClass]);
  const activated={...n,burstSequence:s.burstSequence+1,burstTicks:50};assert.deepEqual(audio.gameSoundEvents(s,activated),['burst-'+mechClass]);
 }
});
test('kill confirmation supersedes impact; actual damage and boss warnings precede ordinary fire',()=>{
 const audio=load('audio'),s=battle();
 const n={...s,shotSequence:1,fireCooldown:sim.attackIntervalFor(s),impactSequence:1,feedbackSequence:1,feedback:[{id:1,kind:'elite',ticks:5}],damageSequence:1,damageKind:'health'};
 const cues=audio.gameSoundEvents(s,n);assert.equal(cues[0],'damage');assert.ok(cues.includes('elite-break'));assert.ok(!cues.includes('destroy')&&!cues.includes('hit'));
 assert.deepEqual(audio.gameSoundEvents(s,{...n,status:'defeat'}),['defeat']);assert.deepEqual(audio.gameSoundEvents(s,{...n,status:'boss-victory'}),['victory']);
 assert.ok(audio.gameSoundEvents({...s,bossStep:'recovery'},{...s,bossStep:'warning'}).includes('boss-warning'));
 assert.deepEqual(audio.gameSoundEvents(s,{...s,damageSequence:1,damageKind:'armor'}),['armor-block']);
});
test('audio voice limits preserve critical feedback and duck gunfire, without allocating noise per shot',()=>{
 const h=audioHarness(),audio=load('audio'),design=load('soundDesign');try{
  const engine=audio.createGameAudio();engine.unlock();const ctx=h.stats.contexts[0];
  for(let i=0;i<80;i++){ctx.currentTime=i*.071;engine.play('core-shot-heavy');engine.play('heavy');}
  assert.equal(h.stats.buffers,1);assert.ok(h.stats.sources.filter(s=>!s.cancelled&&s.end>ctx.currentTime).length<=design.MAX_SOUND_VOICES);
  engine.play('damage');assert.ok(h.stats.gains.some(n=>n.gain.calls.some(c=>c[0]==='target'&&c[1]===.2)));
  const count=h.stats.started;engine.play('burst-heavy');assert.ok(h.stats.started>count);assert.ok(h.stats.sources.some(s=>s.cancelled));assert.equal(h.stats.compressors.length,2);
  engine.suspend();assert.ok(h.stats.sources.filter(s=>s.end>ctx.currentTime).every(s=>s.cancelled));engine.unlock();engine.play('heavy');assert.ok(h.stats.started>count);engine.dispose();
 }finally{h.restore();}
});
test('contact and warning families coalesce while stereo stays restrained and signal cues remain centered',()=>{
 const h=audioHarness(),audio=load('audio');try{
  const engine=audio.createGameAudio();engine.unlock();engine.play('hit');const count=h.stats.started;engine.play('armor-hit');assert.equal(h.stats.started,count);
  h.stats.contexts[0].currentTime=.06;engine.play('armor-hit');assert.ok(h.stats.started>count);
  engine.play('warning');const warned=h.stats.started;engine.play('boss-warning');assert.ok(h.stats.started>warned,'boss alerts override a recent ordinary warning');
  assert.equal(audio.soundPan('damage',{...battle(),lane:0,impactX:2}),0);assert.equal(audio.soundPan('boss-warning',battle()),0);assert.ok(audio.soundPan('pulse',{...battle(),lane:0})<0);assert.ok(audio.soundPan('hit',{...battle(),impactX:900})<=.5);engine.dispose();
 }finally{h.restore();}
});
test('sound designs have short safe envelopes and unsupported Web Audio stays silent',()=>{
 const {SOUND_BANK}=load('soundDesign');for(const spec of Object.values(SOUND_BANK))for(const layer of spec.layers){assert.ok(layer.duration>0&&layer.duration<=.8);assert.ok(layer.gain>0&&layer.gain<=.5);assert.ok(layer.from>0&&layer.to>0);}
 const old=global.window;try{global.window={};const e=load('audio').createGameAudio();assert.doesNotThrow(()=>{e.unlock();e.play('heavy');e.dispose();});}finally{if(old===undefined)delete global.window;else global.window=old;}
});

const music=load('music'),tracks=load('musicTracks');
const flushMusic=()=>new Promise(resolve=>setImmediate(resolve));
function musicBuffer(id){const duration=tracks.musicLoopEnd(tracks.musicTrack(id))+.08,sampleRate=8000,length=Math.ceil(duration*sampleRate),data=new Float32Array(length);return {duration,sampleRate,length,numberOfChannels:1,getChannelData:()=>data};}
function musicHarness(){
 const h=audioHarness(),engine=load('audio').createGameAudio();engine.unlock();const ctx=h.stats.contexts[0],requests=[];
 ctx.decodeAudioData=async data=>musicBuffer(data.id);
 const fetcher=async(url,{signal})=>{const track=tracks.MUSIC_TRACKS.find(t=>t.url===url);requests.push({id:track.id,signal});return {ok:true,status:200,arrayBuffer:async()=>({id:track.id})};};
 const player=music.createMusicPlayer(ctx,ctx.createGain(),fetcher);
 return {...h,ctx,engine,player,requests,scene:(track='road',paused=false,levelIndex=0,runId=1)=>({track,paused,levelIndex,runId,volume:1,warmBoss:true})};
}
test('music follows road and five boss scenes, blocks under story, and keeps intro through the boss phase change',()=>{
 for(let sector=0;sector<5;sector++){
  const s=initial(sector);assert.equal(music.musicSceneFor({...s,status:'running'}).track,'road');
  for(const status of ['boss-intro','battle','boss-shift'])assert.equal(music.musicSceneFor({...s,status}).track,'boss-'+sector);
  const paused=music.musicSceneFor({...s,status:'paused',resumeStatus:'battle'});assert.equal(paused.track,'boss-'+sector);assert.equal(paused.paused,true);
  assert.equal(music.musicSceneFor({...s,status:'boss-intro'},true).paused,true);
  for(const status of ['result','defeat','boss-victory'])assert.equal(music.musicSceneFor({...s,status}).track,null);
 }
});
test('every original music track exists as a compact MP3 with a valid intro and repeat region',()=>{
 let bytes=0;assert.equal(tracks.MUSIC_TRACKS.length,6);assert.equal(new Set(tracks.MUSIC_TRACKS.map(t=>t.title)).size,6);
 for(const t of tracks.MUSIC_TRACKS){const file=path.resolve(__dirname,'../../../public'+t.url),data=readFixture(file);bytes+=data.length;assert.equal(data[0],255);assert.equal(data[1]&224,224);assert.ok(data.length>100000);assert.ok(tracks.musicLoopEnd(t)>tracks.musicLoopStart(t)+20);if(t.id!=='road')assert.ok(tracks.musicLoopStart(t)>6);}
 assert.ok(bytes<3000000,'music payload should remain lightweight');
});
test('loop timing preserves the one-time entrance and accounts for raw MP3 padding without shifting gapless decoders',()=>{
 for(const track of tracks.MUSIC_TRACKS){const start=tracks.musicLoopStart(track),end=tracks.musicLoopEnd(track);assert.equal(music.musicPosition(track,end),start);assert.ok(music.musicPosition(track,end*20)>=start);assert.ok(music.musicPosition(track,end*20)<end);assert.equal(music.musicTiming(track,end).delay,0);assert.equal(music.musicTiming(track,end+.08).delay,tracks.MUSIC_ENCODER_DELAY);}
});
test('music preloads only the selected guardian, never restarts an active theme, and resumes inside its loop',async()=>{
 const h=musicHarness();try{
  h.player.setScene(h.scene());await flushMusic();assert.equal(h.player.status().track,'road');assert.equal(h.requests.length,2);assert.deepEqual(new Set(h.player.status().cached),new Set(['road','boss-0']));
  h.player.setScene(h.scene('boss-0'));await flushMusic();const count=h.stats.started,source=h.stats.sources.at(-1);assert.equal(source.loop,true);assert.ok(source.loopStart>10);assert.equal(h.player.status().track,'boss-0');
  h.player.setScene(h.scene('boss-0'));await flushMusic();assert.equal(h.stats.started,count,'battle must not replay its entrance');
  h.ctx.currentTime=67;h.player.setScene(h.scene('boss-0',true));const position=h.player.status().offset;assert.ok(position>=10&&position<50);assert.equal(h.player.status().playing,false);
  h.ctx.currentTime=150;h.player.setScene(h.scene('boss-0'));await flushMusic();assert.ok(Math.abs(h.stats.sources.at(-1).offset-position-tracks.MUSIC_ENCODER_DELAY)<.0001);
  h.player.setScene(h.scene('boss-0',false,0,2));await flushMusic();assert.equal(h.stats.sources.at(-1).offset,tracks.MUSIC_ENCODER_DELAY,'a restarted run gets its entrance again');
  h.player.setScene(h.scene(null));assert.equal(h.player.status().playing,false);
 }finally{h.player.dispose();h.engine.dispose();h.restore();}
});
test('music decoding cannot start a paused or disposed scene and changing sectors bounds the cache',async()=>{
 const h=musicHarness();try{
  h.player.setScene(h.scene());h.player.setScene(h.scene('road',true));await flushMusic();assert.equal(h.player.status().playing,false);assert.equal(h.stats.started,0);
  for(let level=0;level<5;level++){h.player.setScene(h.scene('road',false,level));await flushMusic();assert.ok(h.player.status().cached.length<=2);assert.ok(h.player.status().cached.includes('boss-'+level));}
  h.player.dispose();const started=h.stats.started;h.player.setScene(h.scene('boss-4'));await flushMusic();assert.equal(h.stats.started,started);assert.equal(h.player.status().cached.length,0);
 }finally{h.player.dispose();h.engine.dispose();h.restore();}
});
test('music fetch errors remain isolated and a pending decode is invalidated on disposal',async()=>{
 const h=musicHarness();try{
  const broken=music.createMusicPlayer(h.ctx,h.ctx.createGain(),async()=>({ok:false,status:404}));broken.setScene(h.scene());await flushMusic();assert.equal(broken.status().playing,false);assert.match(broken.status().error,/404/);broken.dispose();
  let resolveDecode;h.ctx.decodeAudioData=()=>new Promise(resolve=>{resolveDecode=resolve;});h.player.setScene(h.scene('boss-0'));await flushMusic();h.player.dispose();resolveDecode(musicBuffer('boss-0'));await flushMusic();assert.equal(h.stats.started,0);assert.deepEqual(h.player.status().cached,[]);
 }finally{h.player.dispose();h.engine.dispose();h.restore();}
});
test('music volume migrates independently of effects and critical feedback ducks the music bed',()=>{
 const settings=load('settings'),old=settings.normalizeSettings({muted:false,volume:.23,quality:'auto'});assert.equal(old.volume,.23);assert.equal(old.musicVolume,undefined);
 assert.equal(settings.normalizeSettings({...old,musicVolume:3}).musicVolume,1);assert.equal(settings.normalizeSettings({...old,musicVolume:NaN}).musicVolume,.55);
 const h=audioHarness();try{const e=load('audio').createGameAudio();e.unlock();e.setSettings({...old,musicVolume:.1});assert.ok(h.stats.gains.some(g=>g.gain.calls.some(c=>c[0]==='target'&&Math.abs(c[1]-.065)<.00001)));e.play('burst-heavy');assert.ok(h.stats.gains.some(g=>g.gain.calls.some(c=>c[0]==='target'&&c[1]===.09)));e.dispose();}finally{h.restore();}
});

test('decoded music seam repair removes discontinuity without changing the entrance or loop duration',()=>{
 const track=tracks.musicTrack('boss-0'),buffer=musicBuffer('boss-0'),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.sin(i*.17)*.7;
 const intro=data.slice(0,1000),length=buffer.length,duration=buffer.duration;music.prepareMusicBuffer(buffer,track);assert.deepEqual(data.slice(0,1000),intro);assert.equal(buffer.length,length);assert.equal(buffer.duration,duration);
 const timing=music.musicTiming(track,duration),start=timing.start*buffer.sampleRate,first=Math.floor(start),target=data[first]*(1-(start-first))+data[first+1]*(start-first),end=Math.floor(timing.end*buffer.sampleRate)-1;assert.ok(Math.abs(data[end]-target)<.00001);assert.ok(data.every(Number.isFinite));
});

const playability=load('playability');
test('fixed guardian durability depends only on sector and selected protocol, never acquired or permanent power',()=>{
 for(let level=0;level<5;level++)for(const mechClass of ['pulse','heavy','blade'])for(const bots of [1,3,11])for(const weaponLevel of [0,2,4]){
  const state={...initial(level),mechClass,bots,weaponLevel,garageDamageScale:3,garageCoreLevel:5};assert.equal(sim.bossHealthFor(state),playability.BOSS_BASE_HEALTH[level]);assert.equal(sim.bossHealthFor({...state,ops:{...state.ops,protocol:'overdrive'}}),playability.BOSS_BASE_HEALTH[level]*1.2);
 }
});
test('named elite destruction creates a short recovery beat with the same authoritative and visual world speed',()=>{
 const {state,index}=sectorElite('heat-mine');const n=tick({...state,pendingShots:[incoming(state,{target:'hazard',targetIndex:index,lane:state.lane,damage:9999})]});
 assert.equal(n.report.elites,1);assert.equal(n.breatherTicks,25);assert.ok(n.progress-state.progress<sim.RUN_SPEED/2);assert.ok(n.roadTicks>state.roadTicks);assert.equal(load('experience').encounterBeat(n.progress,n.breatherTicks).intensity,0);
 const visual=load('motion').visualState(n,.5);assert.ok(Math.abs(visual.progress-n.progress-sim.roadStepFor(n)*.5)<.000001);
 const paused=sim.gameReducer(n,{type:'PAUSE'});assert.equal(tick(paused),paused);let ended=n;for(let i=0;i<26;i++)ended=tick(ended);assert.equal(ended.breatherTicks,0);assert.equal(sim.roadStepFor(ended),sim.RUN_SPEED);
});
test('heavy primary hits break one armor layer and briefly hold a charge without resetting a live projectile',()=>{
 const level=levels.getLevel(2),index=level.hazards.findIndex(h=>h.armor===2),mark=level.hazards[index].progress;
 const state={...quietRoad(2),mechClass:'heavy',progress:mark-8,lane:levels.hazardLaneAt(0,index,mark,2)};state.hazardHps[index]=100;
 const attack={id:15,source:'hazard',sourceId:index,kind:'sniper-shot',lane:state.lane,fromLane:state.lane,fromY:44,phase:'warning',ticks:10,duration:18,damage:13,shotsRemaining:1};
 const n=tick({...state,enemyAttacks:[attack],enemyAttackSources:['hazard:'+index],pendingShots:[incoming(state,{target:'hazard',targetIndex:index,lane:state.lane,damage:10,attackStyle:'heavy'})]});
 assert.equal(state.hazardHps[index],100);assert.equal(n.hazardHps[index],92);assert.equal(sim.hazardArmorFor(n,index),1);assert.equal(n.enemyAttacks[0].ticks,10);assert.equal(n.roadImpacts[index].stun,5);
 const second=tick({...n,pendingShots:[incoming(n,{target:'hazard',targetIndex:index,lane:n.lane,damage:10,attackStyle:'heavy'})]});assert.equal(second.hazardHps[index],83);assert.ok(second.roadImpacts[index].stun<5,'repeated shells do not lock an enemy indefinitely');
 const flight=tick({...n,enemyAttacks:[{...attack,phase:'flight'}]});assert.equal(flight.enemyAttacks[0].ticks,9);assert.equal(attack.ticks,10);
});
test('pulse focus is earned in one lane and captures two penetrations on the next real volley',()=>{
 const {level,ids,state}=eliteScene(),index=ids[1],other=level.hazards.findIndex(h=>h.horde&&h.wave===0&&h.slot===1);
 const base={...state,report:{...state.report,focus:5,focusLane:state.lane}};base.hazardHps=base.hazardHps.map((_,i)=>i===index||i===other?30:-1);
 const ready=tick({...base,pendingShots:[incoming(base,{target:'hazard',targetIndex:index,lane:base.lane,damage:1})]});assert.equal(ready.report.focusReady,true);
 const shot=tick({...ready,fireCooldown:0});assert.ok(shot.pendingShots.some(p=>p.focused&&p.pierce===2));assert.equal(shot.report.focusReady,false);
 const lane=levels.hazardLaneAt(0,other,base.progress,base.levelIndex),changed=tick({...ready,pendingShots:[incoming(ready,{target:'hazard',targetIndex:other,lane,damage:1})]});assert.equal(changed.report.focusReady,false);assert.equal(changed.report.focus,1);assert.equal(changed.report.focusLane,lane);
});
test('blade counts one chain step per landed volley, then performs a captured longer three-target finisher',()=>{
 const {ids,state}=eliteScene();let s={...state,mechClass:'blade',fireCooldown:1000};s.hazardHps=s.hazardHps.map((_,i)=>ids.slice(0,4).includes(i)?100:-1);
 const hit=(s,volley)=>incoming(s,{target:'hazard',targetIndex:ids[0],lane:s.lane,damage:1,attackStyle:'blade',volleyId:volley,range:11});
 s=tick({...s,pendingShots:[hit(s,1),hit(s,1),hit(s,1)]});assert.equal(s.report.bladeCombo,1);
 s=tick({...s,pendingShots:[hit(s,2)]});s=tick({...s,pendingShots:[hit(s,3)]});assert.equal(s.report.bladeReady,true);assert.equal(sim.attackRangeFor(s),11);
 const fired=tick({...s,fireCooldown:0});const finishers=fired.pendingShots.filter(p=>p.finisher);assert.equal(finishers.length,3);assert.ok(finishers.every(p=>p.range===11&&p.lane===s.lane&&p.duration===4));assert.equal(fired.report.bladeReady,false);assert.equal(fired.report.bladeCombo,0);
 const missed=tick({...state,mechClass:'blade',pendingShots:[incoming(state,{target:'hazard',targetIndex:ids[0],lane:(state.lane+1)%3,attackStyle:'blade',damage:1})]});assert.equal(missed.report.bladeCombo,0);
});
test('visual budget preserves elite and boss confirmations without dropping any damage records',()=>{
 const feedback=Array.from({length:12},(_,i)=>({id:i,ticks:4,x:50,y:40,kind:i===0?'boss':i===1?'elite':'hit'})),old=JSON.stringify(feedback);
 const selected=playability.visibleFeedback(feedback,false);assert.equal(selected.length,4);assert.ok(selected.some(f=>f.kind==='boss')&&selected.some(f=>f.kind==='elite'));assert.equal(playability.visibleFeedback(feedback,true).length,2);assert.equal(JSON.stringify(feedback),old);
});
test('reward ledger matches actual settlement and next upgrade goals use paid levels without spending inventory',()=>{
 const s={...initial(),status:'result',score:700,won:true,ops:{...initial().ops,bonusParts:6,protocol:'overdrive'}};
 const ledger=playability.rewardLedger(s);assert.equal(ledger.total,progression.rewardParts(700,true)+6+3);assert.equal(playability.rewardLedger({...s,won:false}).total,progression.rewardParts(700,false));
 const g=progression.normalizeGarage({parts:4}),before=JSON.stringify(g),target=playability.nextUpgrade(g,s);assert.equal(target.id,'armor');assert.equal(target.missing,0);assert.equal(JSON.stringify(g),before);
 const upgraded=progression.purchaseUpgrade(g,'armor'),next=playability.nextUpgrade(upgraded,s);assert.equal(next.id,'weapon');assert.equal(next.missing,5);assert.equal(playability.nextUpgrade(progression.normalizeGarage({levels:{weapon:5,armor:5,core:5}}),s),null);
});
test('automatic mobile budget respects memory and reduced data while explicit quality remains a user choice',()=>{
 const settings=load('settings');assert.equal(settings.resolveQuality({quality:'auto'},8,false,4),'low');assert.equal(settings.resolveQuality({quality:'auto'},8,false,8,true),'low');assert.equal(settings.resolveQuality({quality:'high'},2,true,2,true),'high');assert.equal(settings.resolveQuality({quality:'auto'},8,false,8,false),'high');
 const interaction=load('interaction');assert.equal(interaction.canStartPointerGesture(null,{button:0,isPrimary:true}),true);assert.equal(interaction.canStartPointerGesture(7,{button:0,isPrimary:true}),false);assert.equal(interaction.canStartPointerGesture(null,{button:0,isPrimary:false}),false);
});
test('asset warm-up caps concurrency, deduplicates, prioritizes urgent art and retries failures',async()=>{
 const oldImage=global.Image,items=[];global.Image=class{constructor(){items.push(this);}set src(value){this.url=value;}decode(){return Promise.resolve();}};
 const loading=load('loading');try{
  const first=loading.preloadImages(['budget-a','budget-b','budget-c','budget-d'],'low'),urgent=loading.preloadImages(['budget-urgent','budget-a'],'high');assert.equal(items.length,3);
  items[0].onload();await flushMusic();assert.equal(items[3].url,'budget-urgent');items[1].onerror();await flushMusic();const retry=loading.preloadImages(['budget-b']);
  for(let rounds=0;rounds<10;rounds++){for(const item of [...items])if(item.onload)item.onload();await flushMusic();}
  assert.ok((await first).some(result=>result.status==='rejected'));assert.ok((await urgent).every(result=>result.status==='fulfilled'));assert.equal((await retry)[0].status,'fulfilled');assert.equal(items.filter(item=>item.url==='budget-a').length,1);
 }finally{if(oldImage===undefined)delete global.Image;else global.Image=oldImage;}
});

test('heavy stagger cannot extend a warning into a three-lane body trap on any sector layout',()=>{
 for(let sector=0;sector<5;sector++)for(let layout=0;layout<3;layout++){
  const spec=levels.getLevel(sector);let s={...sim.createInitialState(garage,sector,layout),status:'running',gate:spec.gateMarks.length,fireCooldown:10000,playerHp:10000,playerMaxHp:10000};
  for(let step=0;step<1250&&s.status==='running';step++){
   const lanes=s.enemyAttacks.map(a=>a.lane);spec.hazards.forEach((h,i)=>{if(s.hazardHps[i]>0&&h.progress>s.progress&&h.progress-s.progress<1.5)lanes.push(levels.hazardLaneAt(layout,i,h.progress,sector));});assert.ok(new Set(lanes).size<=2,`stagger escape: sector ${sector}, layout ${layout}, progress ${s.progress}`);
   const charging=s.enemyAttacks.find(a=>a.source==='hazard'&&a.phase==='warning'&&spec.hazards[a.sourceId]?.elite);
   if(charging&&step%10===0)s={...s,pendingShots:[incoming(s,{target:'hazard',targetIndex:charging.sourceId,lane:levels.hazardLaneAt(layout,charging.sourceId,s.progress,sector),damage:1,attackStyle:'heavy'})]};s=tick(s);
  }
 }
});
test('independent motion atlas runs sixteen frames and never runs in any boss phase',()=>{
 const art=load('visualArt'),s={...initial(),status:'running',roadTicks:0};
 const frames=new Set(Array.from({length:128},(_,i)=>art.artPose({...s,roadTicks:i/10}).frame));
 assert.equal(frames.size,16);assert.equal(art.artPose(s).row,0);
 for(const status of ['boss-intro','battle','boss-shift','boss-victory']){
  const p=art.artPose({...s,status,fireCooldown:0});assert.equal(p.row,0);assert.equal(p.sheet,'arena');
 }
 const advanced=art.artPose({...s,weaponLevel:2});assert.equal(advanced.row,4);
});
test('V28 anticipation precedes launch and recovery reaches final frame without mutating timing',()=>{
 const art=load('visualArt'),s={...battle(),mechClass:'heavy',bots:1},before=JSON.stringify(s),interval=sim.attackIntervalFor(s);
 assert.ok(art.artPose({...s,fireCooldown:1}).frame<3);
 assert.equal(art.artPose({...s,fireCooldown:interval}).frame,3);
 assert.equal(art.artPose({...s,fireCooldown:interval-3},.9).frame,6);assert.equal(art.artPose({...s,fireCooldown:interval-5},.1).frame,7);
 const dodge=art.artPose({...s,dodgeTicks:sim.DODGE_TICKS},0);assert.equal(dodge.row%3,2);assert.equal(dodge.sheet,'arena');assert.equal(dodge.frame,0);
 assert.equal(JSON.stringify(s),before);
});
test('V28 reduced motion has no procedural lean or recoil and pause preserves sampled pose',()=>{
 const art=load('visualArt'),s={...battle(),fireCooldown:sim.attackIntervalFor(battle()),dodgeTicks:2};
 const p=art.artPose(s,.5,0,true);assert.equal(p.frame,0);assert.equal(p.lean,0);assert.equal(p.recoil,0);
 assert.deepEqual(art.artPose(s,.5),art.artPose({...s,status:'paused',resumeStatus:'battle'},.5));
});
test('V28 each boss retains its unfolded phase through firing, rush and recovery',()=>{
 const art=load('visualArt');for(let sector=0;sector<5;sector++)for(const step of ['warning','flight','rush','recovery','shield']){
  const s={...battle(),levelIndex:sector,bossStep:step};const one=art.bossArtFrame({...s,bossStage:1}),two=art.bossArtFrame({...s,bossStage:2});assert.equal(two-one,4);assert.ok(two>=4&&two<=7);
 }
});
test('V28 material animations separate armor shards and destruction and stay inside their atlas',()=>{
 const art=load('visualArt');assert.equal(art.materialSample('hit',4).row,0);assert.equal(art.materialSample('armor',4).row,2);assert.equal(art.materialSample('boss',12).row,3);
 for(const kind of ['hit','armor','heavy','elite','boss'])for(let t=0;t<13;t+=.2){const p=art.materialSample(kind,t,.5);assert.ok(p.frame>=0&&p.frame<=7);assert.ok(p.age>=0&&p.age<1);}
});
test('V28 salvage receipts converge on the squad and never award currency',()=>{
 const art=load('visualArt'),s=initial(),before=JSON.stringify(s);let last=Infinity;
 for(let t=7;t>=0;t-=.1){const p=art.salvageSample(32,45,t,60);const distance=Math.abs(60-p.x);assert.ok(distance<=last+1e-8);last=distance;assert.ok(p.opacity>=0&&p.opacity<=1);}
 const end=art.salvageSample(32,45,0,60);assert.equal(end.x,60);assert.equal(end.y,59);assert.equal(JSON.stringify(s),before);
});
test('V28 production atlases are normalized RGBA PNGs with no missing frame cells',()=>{
 const names=[['mech-pulse-motion',1024,1024],['mech-heavy-motion',1024,1024],['mech-blade-motion',1024,1024],['boss-evolution',1536,960],['material',1024,512],['props',1024,512],['mech-portraits',1536,576]];
 for(const [name,w,h] of names){const png=readFixture(path.resolve(__dirname,'../../../public/games/toybot-breakout/optimized',name+'-v28.png'));assert.ok(imageInfo(png).width>0);assert.equal(imageInfo(png).width,w);assert.equal(imageInfo(png).height,h);assert.equal(imageInfo(png).alpha,true,'RGBA alpha required');}
});

test('V28 portrait combinations reflect all equipped modules independently',()=>{const art=load('visualArt');for(const kind of ['pulse','heavy','blade']){const seen=new Set();for(let mask=0;mask<8;mask++)seen.add(art.equipmentCell(kind,Boolean(mask&1),Boolean(mask&2),Boolean(mask&4)));assert.equal(seen.size,8);}assert.equal(art.motionTier(1,0,0),4);});
test('reference camera preserves ordered ground depth while separating the boss body anchor',()=>{
 const cam=load('referenceCamera');let last=-Infinity;for(let y=30;y<=80;y+=.1){const n=cam.worldScreenY(y);assert.ok(n>last);last=n;}
 assert.equal(cam.worldScreenY(59),68);assert.ok(cam.bossScreenY(40)<26);assert.ok(cam.worldScreenY(65.5)>77&&cam.worldScreenY(65.5)<79);
});
test('camera bullets start at each projected member, retain captured movement and end on their own target',()=>{
 const cam=load('referenceCamera'),s={...battle(),bots:3,lane:1,battleLane:1};
 for(const member of sim.formationFor(3,1)){
  const shot=incoming(s,{count:3,origins:[member],target:'boss',ticks:4,duration:4});
  const p=cam.cameraFlight(motion.projectileSample(s,shot,0),shot);assert.ok(Math.abs(p.x-cam.squadScreenX(member.x,sim.LANE_CENTERS[1],3))<1e-8);assert.equal(p.y,cam.worldScreenY(member.y));
  const moved={...shot,origins:[{...member,x:member.x-3}]};assert.equal(cam.projectedMuzzleX(moved),cam.projectedMuzzleX(shot)-3);
  const end=cam.cameraFlight(motion.projectileSample(s,{...shot,ticks:0},0),shot);assert.equal(end.x,sim.targetX(s,'boss',0));assert.equal(end.y,cam.bossScreenY(sim.targetY(s,'boss',0)));
 }
});
test('reference camera projects a held gate and its actual threshold through the same ground mapping',()=>{
 const cam=load('referenceCamera'),s=quietRoad(0),mark=levels.getLevel(0).gateMarks[0],option=s.gateChoices[0][0];s.gate=0;s.progress=mark-4;
 const node={style:{setProperty(){}},querySelector(){return null;}},root={style:{setProperty(){}}};motion.paintMotion(root,s,0,[{node,kind:'gate',id:0}],true);
 assert.equal(node.style.top,cam.worldScreenY(sim.gateGroundY(s.progress,mark))+'%');assert.equal(node.style.left,sim.laneXAt(option.lane,sim.gateGroundY(s.progress,mark)-5)+'%');
});
test('projected boss contact retains a captured body anchor after relocation and does not alter state',()=>{
 const cam=load('referenceCamera'),s=battle(),before=JSON.stringify(s),node={dataset:{worldY:'40',worldBoss:'true'},style:{}},root={style:{setProperty(){}}};
 motion.paintMotion(root,s,.5,[{node,kind:'world-decor',id:0}]);assert.equal(node.style.top,cam.bossScreenY(40)+'%');assert.equal(JSON.stringify(s),before);
});
test('reference art contains real RGBA atlases, compact gameplay backgrounds and no missing variants',()=>{
 for(const [name,w,h]of [['boss-furnace',1024,512],['gate',1024,512],['cockpit',1536,512],['logo',512,190],['mech-portraits',1536,576],['mech-pulse-motion',1024,1024],['mech-heavy-motion',1024,1024],['mech-blade-motion',1024,1024]]){
  const png=readFixture(path.resolve(__dirname,'../../../public/games/toybot-breakout/optimized',name+'-v29.png'));assert.equal(imageInfo(png).width,w);assert.equal(imageInfo(png).height,h);assert.equal(imageInfo(png).alpha,true);
 }
 for(let i=1;i<=5;i++){const jpg=readFixture(path.resolve(__dirname,'../../../public/games/toybot-breakout/optimized/map-'+i+'-v29.jpg'));assert.equal(jpg[0],255);assert.equal(jpg[1],216);assert.ok(jpg.length<350000);}
});

test('reference core activation retains the chunky upgraded body and eight-frame action family',()=>{const art=load('visualArt');for(const mechClass of ['pulse','heavy','blade']){const s={...initial(),status:'running',mechClass,burstTicks:50,weaponLevel:0};assert.equal(art.artPose(s).row,4);assert.equal(art.artPose({...s,status:'battle',fireCooldown:0}).row,3);assert.equal(art.artPose({...s,status:'battle',fireCooldown:0}).sheet,'arena');}});

test('untargeted reference tracers remain visible between volleys without changing cadence or dealing damage',()=>{let s={...quietRoad(0),mechClass:'pulse',bots:1,fireCooldown:0,gate:levels.getLevel(0).gateMarks.length};s.hazardHps=s.hazardHps.map(()=>-1);s=tick(s);assert.ok(s.pendingShots.length&&s.pendingShots.every(p=>!p.target&&p.duration>sim.attackIntervalFor(s)),JSON.stringify({shots:s.pendingShots,status:s.status,fire:s.fireCooldown,mech:s.mechClass}));assert.equal(s.fireCooldown,sim.attackIntervalFor(s));for(let i=1;i<16;i++)s=tick(s);assert.equal(s.report.dealt,0);assert.equal(s.report.shots,Math.ceil(16/sim.attackIntervalFor(s)));assert.ok(s.hazardHps.every(h=>h===-1));});
test('each mech uses an independent motion module with class-correct attack phases',()=>{
 const {MECH_ANIMATIONS,sampleMechMotion:sample}=load('animationModules');assert.notEqual(MECH_ANIMATIONS.pulse,MECH_ANIMATIONS.heavy);assert.notEqual(MECH_ANIMATIONS.heavy,MECH_ANIMATIONS.blade);
 const values={};for(const mechClass of ['pulse','heavy','blade']){const s={...battle(),mechClass};values[mechClass]=sample({...s,fireCooldown:sim.attackIntervalFor(s)-2},.5);assert.equal(values[mechClass].classId,mechClass);}
 assert.equal(values.pulse.action,'pulse-ready');assert.equal(values.heavy.action,'heavy-cannon');assert.equal(values.blade.action,'blade-cut');assert.equal(values.blade.sheet,'blade');assert.ok(values.blade.clipFrame>=4&&values.blade.clipFrame<=8);assert.ok(values.heavy.recoil>values.pulse.recoil);
});
test('ranged run aim keeps the stride continuous across all fire cooldowns',()=>{
 const sample=load('animationModules').sampleMechMotion;
 for(const mechClass of ['pulse','heavy']){const s={...quietRoad(0),mechClass,roadTicks:17};const frames=[];for(let fireCooldown=0;fireCooldown<=sim.attackIntervalFor(s);fireCooldown++){const p=sample({...s,fireCooldown},.45,1);assert.equal(p.row%4,0);frames.push(p.frame);}assert.equal(new Set(frames).size,1);}
});
test('blade contact follows melee flight and its longer finisher rather than gun recoil',()=>{
 const sample=load('animationModules').sampleMechMotion,s={...battle(),mechClass:'blade'};s.pendingShots=[incoming(s,{attackStyle:'blade',duration:4,ticks:2,finisher:true})];
 const before=sample({...s,fireCooldown:sim.attackIntervalFor(s)-3},.5);assert.equal(before.action,'blade-cut');assert.ok(before.clipFrame>=4&&before.clipFrame<8);assert.equal(before.sheet,'blade');
 const after=sample({...s,fireCooldown:sim.attackIntervalFor(s)-4},.2);assert.ok(after.clipFrame>=8);assert.equal(after.action,'blade-cut');
});
test('independent animation modules remain presentation-only and freeze for reduced motion',()=>{
 const sample=load('animationModules').sampleMechMotion;
 for(const mechClass of ['pulse','heavy','blade']){const s={...battle(),mechClass,dodgeTicks:3},before=JSON.stringify(s);for(const alpha of [0,.2,.5,.9]){const p=sample(s,alpha);assert.ok(p.frame>=0&&p.frame<8);assert.equal(p.row%3,2);assert.equal(p.sheet,'arena');}const stopped=sample(s,.5,0,true);assert.equal(stopped.frame,0);assert.equal(stopped.recoil,0);assert.equal(JSON.stringify(s),before);}
});
test('independent sprite atlases preserve transparency and calibrated action cells',()=>{
 const meta=JSON.parse(readFixture(path.resolve(__dirname,'motion-registration-v30.json'),'utf8').replace(/^\uFEFF/,''));const hashes=new Set();
 for(const m of meta){assert.equal(m.frames,64);assert.equal(m.measuredFrames,64);assert.ok(m.transparentFraction>.6);assert.ok(m.interpolatedFrames<=1);assert.ok(m.maxCoreXErrorPx<=5);const png=readFixture(path.resolve(__dirname,'../../../public/games/toybot-breakout/optimized/mech-'+m.class+'-motion-v30.png'));assert.equal(imageInfo(png).width,1024);assert.equal(imageInfo(png).height,1024);assert.equal(imageInfo(png).alpha,true);hashes.add(require('node:crypto').createHash('sha256').update(png).digest('hex'));}assert.equal(hashes.size,3);
});

test('all independent running cycles contain sixteen stable cells per equipment tier',()=>{const art=load('visualArt'),meta=JSON.parse(readFixture(path.resolve(__dirname,'run-registration-v30.json'),'utf8').replace(/^\uFEFF/,''));for(const m of meta){const s={...quietRoad(0),mechClass:m.class,fireCooldown:0};const poses=Array.from({length:200},(_,i)=>art.artPose({...s,roadTicks:i/10}));assert.equal(new Set(poses.map(p=>p.frame)).size,16);assert.ok(poses.every(p=>p.sheet==='run'));assert.equal(m.strideFrames,16);assert.ok(m.maxCoreXErrorPx<=1);const png=readFixture(path.resolve(__dirname,'../../../public/games/toybot-breakout/optimized/mech-'+m.class+'-run-v30.png'));assert.equal(imageInfo(png).width,1024);assert.equal(imageInfo(png).height,512);assert.equal(imageInfo(png).alpha,true);}});

test('five guardians own different animation assets and charge/move/attack/hit profiles',()=>{
 const art=load('hostileMotionV31');assert.equal(new Set(art.BOSS_MOTION_V31).size,5);assert.equal(new Set(art.BOSS_MOTION_PROFILES.map(p=>p.id)).size,5);
 for(let levelIndex=0;levelIndex<5;levelIndex++){
  const s={...battle(),levelIndex,bossStage:1,bossStep:'warning',bossStepTicks:0};assert.equal(art.bossMotionV31(s).row,1);
  const end=art.bossMotionV31({...s,bossStepTicks:sim.bossWarningTicks(s)-.01});assert.equal(end.frame,7);
  const attack={...s,bossStep:'flight',battleTime:100,bossFiredTick:100};assert.equal(art.bossMotionV31(attack).action,'attack');assert.equal(art.bossMotionV31(attack).frame,0);
  const hit={...s,bossStep:'recovery',bossMoveTicks:0,hostileReactions:{'boss:0':{ticks:4,cooldown:12}}};assert.equal(art.bossMotionV31(hit).row,3);assert.equal(art.bossMotionV31({...hit,bossStage:2}).row,7);
  const move=art.bossMotionV31({...s,bossStep:'recovery',bossMoveTicks:3});assert.equal(move.action,'relocate');assert.equal(move.row,0);
 }
});
test('boss attack follows real salvo timestamp and never loops while a hazard lingers',()=>{
 const art=load('hostileMotionV31'),s={...battle(),bossStep:'flight',bossFiredTick:100,battleTime:100};
 assert.equal(art.bossMotionV31(s).action,'attack');assert.equal(art.bossMotionV31({...s,battleTime:120}).action,'ready');assert.equal(art.bossMotionV31({...s,battleTime:120,bossFiredTick:120}).frame,0);
 const rush={...s,bossStep:'rush',bossStepTicks:sim.RUSH_CONTACT_TICK-4};assert.equal(art.bossMotionV31(rush).action,'rush-move');assert.equal(art.bossMotionV31({...rush,bossStepTicks:sim.RUSH_CONTACT_TICK}).action,'rush-impact');
});
test('five small enemy types have independent eight-frame movement and attack strips',()=>{
 const art=load('hostileMotionV31');assert.equal(new Set(Object.values(art.ENEMY_MOTION_V31)).size,7);
 for(const kind of ['drone','swarm','sniper','bomber','medic']){
  const levelIndex=levels.LEVELS.findIndex(l=>l.hazards.some(h=>h.kind===kind)),index=levels.getLevel(levelIndex).hazards.findIndex(h=>h.kind===kind);assert.ok(index>=0);const s={...quietRoad(levelIndex),enemyAttacks:[],hostileReactions:{}};
  const frames=Array.from({length:160},(_,i)=>art.enemyMotionV31({...s,roadTicks:i/10},index));assert.equal(new Set(frames.map(p=>p.frame)).size,8);assert.ok(frames.every(p=>p.kind===kind));
  const a={source:'hazard',sourceId:index,phase:'warning',duration:18,ticks:18};assert.equal(art.enemyMotionV31({...s,enemyAttacks:[a]},index).row,1);
  assert.equal(art.enemyMotionV31({...s,enemyAttacks:[{...a,phase:'flight',duration:12,ticks:12}]},index).row,2);
  assert.equal(art.enemyMotionV31({...s,hostileReactions:{['hazard:'+index]:{ticks:3,cooldown:10}}},index).row,3);
 }
});
test('hit clips preserve telegraphs and single-source reactions do not leak to another enemy',()=>{
 const art=load('hostileMotionV31'),s={...quietRoad(0),hostileReactions:{'hazard:0':{ticks:6,cooldown:14}}};assert.equal(art.enemyMotionV31(s,0).action,'hit');assert.notEqual(art.enemyMotionV31(s,1).action,'hit');
 const a={source:'hazard',sourceId:0,phase:'warning',duration:12,ticks:6};const p=art.enemyMotionV31({...s,enemyAttacks:[a]},0,.5);assert.equal(p.action,'charge');assert.ok(p.flash>0);
 const boss={...battle(),bossStep:'warning',hostileReactions:{'boss:0':{ticks:3,cooldown:11}}};assert.equal(art.bossMotionV31(boss).action,'charge');
});
test('boss-spawned robots sample their own source id and no longer use projectile frames',()=>{
 const art=load('hostileMotionV31'),s={...battle(),threats:[{id:70,kind:'minion',hp:10},{id:71,kind:'barrier',hp:10}],hostileReactions:{'threat:70':{ticks:4,cooldown:12}}};
 assert.equal(art.enemyMotionV31(s,70,0,false,'threat').kind,'minion');assert.equal(art.enemyMotionV31(s,70,0,false,'threat').action,'hit');assert.equal(art.enemyMotionV31(s,71,0,false,'threat').kind,'barrier');assert.equal(art.enemyMotionV31(s,71,0,false,'threat').action,'move');
});
test('medic repair animation requires a real healing event rather than free-running fake pulses',()=>{
 const art=load('hostileMotionV31'),levelIndex=levels.LEVELS.findIndex(l=>l.hazards.some(h=>h.kind==='medic')),index=levels.getLevel(levelIndex).hazards.findIndex(h=>h.kind==='medic'),s={...quietRoad(levelIndex),roadTicks:28};assert.equal(art.enemyMotionV31(s,index).action,'move');assert.equal(art.enemyMotionV31({...s,hostileReactions:{['repair:'+index]:{ticks:6,cooldown:6}}},index).action,'repair-pulse');
});
test('real damage starts a bounded flinch, sustained hits cannot restart it on every bullet',()=>{
 const s={...battle(),bossStep:'support',fireCooldown:10000};s.pendingShots=[incoming(s,{damage:1})];const before=JSON.stringify(s),first=tick(s);assert.equal(first.hostileReactions['boss:0'].ticks,6);assert.equal(JSON.stringify(s),before);
 first.pendingShots=[incoming(first,{damage:1})];const second=tick(first);assert.equal(second.hostileReactions['boss:0'].ticks,5);assert.ok(second.report.dealt>first.report.dealt);assert.equal(first.hostileReactions['boss:0'].ticks,6);
});
test('reaction timers pause, expire, and cannot change combat damage or target selection',()=>{
 const base={...quietRoad(0),hostileReactions:{'hazard:0':{ticks:6,cooldown:14}}},paused={...base,status:'paused',resumeStatus:'running'};assert.equal(tick(paused).hostileReactions['hazard:0'].ticks,6);
 let a=base,b={...base,hostileReactions:{}};for(let i=0;i<16;i++){a=tick(a);b=tick(b);}assert.deepEqual(a.hostileReactions,{});assert.deepEqual(a.hazardHps,b.hazardHps);assert.equal(a.playerHp,b.playerHp);assert.deepEqual(a.report,b.report);
});
test('hostile motion samplers are pure and reduced motion freezes frame and procedural motion',()=>{
 const art=load('hostileMotionV31'),s={...battle(),bossStep:'recovery',bossMoveTicks:3,hostileReactions:{'boss:0':{ticks:5,cooldown:13}}},before=JSON.stringify(s);const p=art.bossMotionV31(s,.7,true);assert.equal(p.frame,0);assert.equal(p.bob,0);assert.equal(p.lean,0);assert.equal(p.flash,0);assert.equal(JSON.stringify(s),before);assert.deepEqual(art.bossMotionV31(s,.3),art.bossMotionV31({...s,status:'paused',resumeStatus:'battle'},.3));
});
test('twelve hostile atlases are transparent independent normalized resources with all action rows',()=>{
 const meta=JSON.parse(readFixture(path.resolve(__dirname,'hostile-registration-v31.json'),'utf8').replace(/^\uFEFF/,''));assert.equal(meta.length,12);const hashes=new Set();for(const m of meta){assert.equal(m.frames,m.group==='boss'?64:32);assert.ok(m.transparentFraction>.45);assert.ok(m.maxRegistrationShiftPx<=m.cellSize/16);const png=readFixture(m.group==='boss'?path.resolve(__dirname,'art-source/boss-'+m.id+'-atlas-v31.png'):path.resolve(__dirname,'../../../public/games/toybot-breakout/optimized/enemy-'+m.id+'-motion-v31.png'));if(m.group==='boss'){const runtime=readFixture(path.resolve(__dirname,'../../../public/games/toybot-breakout/optimized/boss-'+m.id+'-motion-v31.webp'));assert.equal(runtime.toString('ascii',0,4),'RIFF');assert.equal(runtime.toString('ascii',8,12),'WEBP');assert.ok(runtime.length<png.length/2);}assert.equal(imageInfo(png).width,m.cellSize*8);assert.equal(imageInfo(png).height,m.rows*m.cellSize);assert.equal(imageInfo(png).alpha,true);hashes.add(require('node:crypto').createHash('sha256').update(png).digest('hex'));}assert.equal(hashes.size,12);
});


test('guardian defeat keeps the same armor phase and single-body flinch family',()=>{const art=load('hostileMotionV31');for(let levelIndex=0;levelIndex<5;levelIndex++){const s={...battle(),levelIndex,status:'boss-victory',bossStage:2,bossPhaseTicks:9};const p=art.bossMotionV31(s);assert.equal(p.action,'destroyed');assert.equal(p.row,7);assert.ok(p.frame<=7);assert.ok(p.lean>0);}});

test('ground roadblock settles once and the biped summon never samples drone or bee actions',()=>{const art=load('hostileMotionV31'),s={...battle(),enemyAttacks:[],threats:[{id:70,kind:'barrier',duration:36,ticks:36,hp:10},{id:71,kind:'minion',duration:32,ticks:32,hp:10}]};const start=art.enemyMotionV31(s,70,0,false,'threat');assert.equal(start.frame,0);const settled={...s,threats:s.threats.map(t=>({...t,ticks:t.duration-20}))};assert.equal(art.enemyMotionV31(settled,70,0,false,'threat').frame,7);assert.equal(art.enemyMotionV31(settled,70,.9,false,'threat').frame,7);const walker=art.enemyMotionV31(s,71,0,false,'threat');assert.equal(walker.profile,'minion-biped-pounce');assert.notEqual(art.ENEMY_MOTION_V31.minion,art.ENEMY_MOTION_V31.swarm);assert.notEqual(art.ENEMY_MOTION_V31.barrier,art.ENEMY_MOTION_V31.drone);});
test('boss armor phase changes once at the unfold beat and never blends two body layers',()=>{const art=load('hostileMotionV31');for(let levelIndex=0;levelIndex<5;levelIndex++){const s={...battle(),levelIndex,status:'boss-shift',bossStage:2,bossPhaseTicks:4};assert.equal(art.bossMotionV31(s).row,0);assert.equal(art.bossMotionV31({...s,bossPhaseTicks:5}).row,4);assert.equal(art.bossMotionV31({...s,bossPhaseTicks:9}).row,4);}});

test('travelling pulse presentation preserves each captured flight without changing physics',()=>{
 const art=load('awakening'),s=battle(),shots=[];for(let volley=0;volley<4;volley++)for(let index=0;index<3;index++)for(let lane=0;lane<3;lane++)shots.push(incoming(s,{id:shots.length+1,burst:true,attackStyle:'pulse',lane,ticks:volley+1,origins:[{index,x:40+index*10,y:59}]}));
 const before=JSON.stringify(shots),visual=art.coreVisualShots(shots);assert.equal(visual.length,36);assert.ok(visual.every(p=>shots.includes(p)));assert.equal(JSON.stringify(shots),before);const normal=incoming(s,{id:99,burst:false});assert.ok(art.coreVisualShots([...shots,normal]).includes(normal));
});
test('skill status reports actual output since activation without awarding damage or kills',()=>{
 const read=load('skillPresentationV32').skillReadout,s={...battle(),burstEnergy:100,report:{...battle().report,dealt:120},kills:8},before=JSON.stringify(s),active=sim.gameReducer(s,{type:'ACTIVATE_BURST'});assert.equal(JSON.stringify(s),before);assert.deepEqual(active.burstStart,{damage:120,kills:8});assert.equal(read(active).damage,0);assert.equal(read(active).kills,0);
 const progressed={...active,burstTicks:31,report:{...active.report,dealt:167.4},kills:11};const p=read(progressed);assert.equal(p.damage,47);assert.equal(p.kills,3);assert.equal(p.remaining,3.1);assert.equal(p.fill,31/50);assert.equal(progressed.report.dealt,167.4);assert.equal(read({...progressed,burstTicks:0}).active,false);
});
test('skill countdown freezes in pause and missing historical baseline never shows total-run damage',()=>{
 const read=load('skillPresentationV32').skillReadout,s={...battle(),burstTicks:42,burstStart:undefined,report:{...battle().report,dealt:9999}};assert.equal(read(s).damage,0);assert.deepEqual(read(s),read({...s,status:'paused',resumeStatus:'battle'}));assert.equal(read({...s,status:'result'}).active,false);
});
test('nearby skill explosions merge into bounded local feedback without modifying effect records',()=>{
 const pick=load('skillPresentationV32').readableCoreImpacts,effects=[{id:1,x:50,y:48,ticks:2},{id:2,x:50.2,y:48,ticks:6},{id:3,x:25,y:42,ticks:4},{id:4,x:75,y:45,ticks:5},{id:5,x:60,y:60,ticks:5}],before=JSON.stringify(effects);const visible=pick(effects);assert.equal(visible.length,3);assert.equal(JSON.stringify(effects),before);const merged=pick(effects.slice(0,2));assert.equal(merged.length,1);assert.equal(merged[0].id,2);
});
test('pulse core channel stays braced and sword core contact follows the travelling wave',()=>{
 const art=load('animationModules').sampleMechMotion,s={...battle(),burstTicks:40,mechClass:'pulse',fireCooldown:sim.attackIntervalFor({...battle(),mechClass:'pulse'})};assert.equal(art(s).action,'pulse-channel');assert.equal(art(s,.9).recoil,0);
 const blade={...battle(),mechClass:'blade',burstTicks:40};blade.pendingShots=[incoming(blade,{burst:true,attackStyle:'blade',duration:5,ticks:1})];const interval=sim.attackIntervalFor(blade);assert.ok(art({...blade,fireCooldown:interval-4},.5).clipFrame<8);assert.ok(art({...blade,fireCooldown:interval-5},.2).clipFrame>=8);assert.equal(art({...blade,fireCooldown:interval-6},.1).clipFrame,15);
});

test('animated pulse position follows the captured projectile rather than drawing a full path',()=>{
 const fx=load('pulseVfxV33'),motion=load('motion'),camera=load('referenceCamera'),s=battle(),shot=incoming(s,{burst:true,attackStyle:'pulse',duration:8,ticks:8,count:3,origins:[{index:1,x:44.4,y:65.5}],muzzle:true}),size={width:390,height:700},before=JSON.stringify(shot);
 const at=(ticks,alpha=0)=>{const p={...shot,ticks};return fx.pulseFlightV33(motion.projectileSample(s,p,alpha),p,alpha,size);};const start=at(8),middle=at(4,.2),end=at(0);
 assert.equal(start.x,camera.projectedMuzzleX(shot));assert.equal(start.lift,camera.actorPixels(3,390)/4);assert.equal(end.lift,0);assert.ok(middle.progress>start.progress&&end.progress>middle.progress);assert.ok(middle.y<start.y);assert.ok(start.frame!==middle.frame);assert.equal(JSON.stringify(shot),before);
});
test('muzzle animation is once per actual emitter and never attached to a piercing contact',()=>{
 const fx=load('pulseVfxV33'),s=battle(),shots=[];for(let index=0;index<3;index++)for(let lane=0;lane<3;lane++)shots.push(incoming(s,{id:shots.length+1,burst:true,attackStyle:'pulse',muzzle:true,lane,duration:5,ticks:5,origins:[{index,x:40+index*10,y:59}]}));const before=JSON.stringify(shots);assert.equal(fx.pulseMuzzlesV33(shots).length,3);assert.equal(fx.pulseMuzzlesV33(shots.map(p=>({...p,muzzle:false}))).length,0);assert.equal(fx.pulseMuzzlesV33(shots.map(p=>({...p,ticks:3}))).length,0);assert.equal(JSON.stringify(shots),before);
});
test('pulse impacts play through eight frames and reduced motion does not cycle texture',()=>{
 const fx=load('pulseVfxV33'),frames=Array.from({length:8},(_,i)=>fx.pulseImpactV33(4-i/2,4,0).frame);assert.deepEqual(frames,[0,1,2,3,4,5,6,7]);assert.equal(fx.pulseImpactV33(0,4,0).opacity,0);assert.equal(fx.pulseImpactV33(3,4,.9,true).frame,3);
});
test('new pulse impact artwork is tagged by actual skill damage, not by a visual flight pass',()=>{
 const s={...battle(),mechClass:'pulse',burstTicks:40,fireCooldown:1000};s.pendingShots=[incoming(s,{burst:true,attackStyle:'pulse',damage:1})];const n=tick(s);assert.ok(n.report.dealt>s.report.dealt);assert.ok(n.feedback.some(f=>f.pulseCore));const miss={...s,pendingShots:[incoming(s,{burst:true,attackStyle:'pulse',damage:1,lane:(s.battleLane+1)%3})]};assert.equal(tick(miss).feedback.length,0);const normal={...s,burstTicks:0};assert.ok(tick(normal).feedback.every(f=>!f.pulseCore));
});
test('pulse skill atlas contains twenty-four transparent compact animation cells',()=>{const m=JSON.parse(readFixture(path.resolve(__dirname,'pulse-vfx-v33.json'),'utf8'));assert.equal(m.frames,24);assert.ok(m.transparentFraction>.6);const png=readFixture(path.resolve(__dirname,'../../../public/games/toybot-breakout/optimized/pulse-vfx-v33.webp'));assert.equal(imageInfo(png).width,1024);assert.equal(imageInfo(png).height,384);assert.equal(imageInfo(png).alpha,true);assert.ok(png.length<500000);});

test('signature skills have distinct resources and only the actual lead emitter receives the main crest',()=>{const fx=load('signatureV34'),s=battle(),shot=incoming(s,{burst:true,origins:[{index:0,x:50,y:59}]});assert.equal(new Set(Object.values(fx.CORE_FX_V34)).size,3);assert.ok(fx.signatureShotV34(shot));assert.ok(!fx.signatureShotV34({...shot,origins:[{index:1,x:44,y:65}]}));assert.ok(!fx.signatureShotV34({...shot,splashDone:true}));assert.ok(!fx.signatureShotV34({...shot,burst:false}));});
test('launch effects are once per real emitter for pulse cannon and sword, never a splash event',()=>{const fx=load('signatureV34'),s=battle();for(const attackStyle of ['pulse','heavy','blade']){const shots=[];for(let index=0;index<3;index++)for(let lane=0;lane<3;lane++)shots.push(incoming(s,{id:shots.length+1,burst:true,attackStyle,muzzle:attackStyle!=='blade',duration:5,ticks:5,lane,origins:[{index,x:40+index*10,y:59}]}));const before=JSON.stringify(shots);assert.equal(fx.coreMuzzlesV34(shots).length,3);assert.equal(fx.coreMuzzlesV34(shots.map(p=>({...p,splashDone:true}))).length,0);assert.equal(JSON.stringify(shots),before);}});
test('swordstorm begins at its own body center even though it has no gun muzzle',()=>{const fx=load('signatureV34'),s={...battle(),mechClass:'blade'},shot=incoming(s,{burst:true,attackStyle:'blade',muzzle:false,count:3,duration:5,ticks:5,origins:[{index:1,x:44.4,y:65}]}),before=JSON.stringify(shot),logical=motion.projectileSample(s,shot,0),p=fx.coreFlightV34(logical,shot,0,{width:390,height:700});assert.ok(Math.abs(p.x-41.04)<1e-9);assert.ok(p.lift>0);assert.ok(p.scale<1&&p.scale>.7);assert.equal(JSON.stringify(shot),before);const quiet=fx.coreFlightV34(logical,shot,.5,{width:390,height:700},true);assert.equal(quiet.frame,0);assert.equal(quiet.spin,0);});
test('overlapping skill impacts merge before budget selection and preserve critical destruction receipts',()=>{const fx=load('signatureV34'),records=[{id:1,x:50,y:40,ticks:5,kind:'boss',coreStyle:'heavy'},{id:2,x:50,y:40,ticks:4,kind:'heavy',coreStyle:'heavy'},{id:3,x:25,y:48,ticks:3,kind:'hit',coreStyle:'pulse'},{id:4,x:25,y:48,ticks:4,kind:'hit',coreStyle:'pulse'},{id:5,x:75,y:48,ticks:3,kind:'hit'}],before=JSON.stringify(records),out=fx.signatureFeedbackV34(records);assert.deepEqual(out.map(f=>f.id),[1,4,5]);assert.equal(JSON.stringify(records),before);});
test('each core class tags its own real impact style and a cross-lane miss creates no impact art',()=>{for(const mechClass of ['pulse','heavy','blade']){const s={...battle(),mechClass,burstTicks:40,fireCooldown:1000};s.pendingShots=[incoming(s,{burst:true,attackStyle:mechClass,damage:1})];const n=tick(s);assert.ok(n.feedback.some(f=>f.coreStyle===mechClass));const miss={...s,pendingShots:[incoming(s,{burst:true,attackStyle:mechClass,lane:(s.battleLane+1)%3,damage:1})]};assert.equal(tick(miss).feedback.length,0);}});
test('three signature atlases contain seventy-two transparent high-detail animation cells',()=>{const metadata=JSON.parse(readFixture(path.resolve(__dirname,'core-vfx-v34.json'),'utf8'));assert.equal(metadata.length,3);const hashes=new Set();for(const m of metadata){assert.equal(m.frames,24);assert.ok(m.transparentFraction>.45);const png=readFixture(path.resolve(__dirname,'../../../public/games/toybot-breakout/optimized/core-'+m.kind+'-v34.png'));assert.equal(imageInfo(png).width,1536);assert.equal(imageInfo(png).height,576);assert.equal(imageInfo(png).alpha,true);assert.ok(png.length<1500000);hashes.add(require('node:crypto').createHash('sha256').update(png).digest('hex'));}assert.equal(hashes.size,3);});

test('blade strike traverses sixteen exclusive poses without changing combat state',()=>{
 const {bladeStrikeV35}=load('bladeMotionV35'),{motionContext}=load('animationTypes');
 const s={...battle(),mechClass:'blade'},old=JSON.stringify(s),frames=[];
 for(let elapsed=-1.7;elapsed<4.6;elapsed+=.025){const cooldown=elapsed<0?-elapsed:7-elapsed;const c=motionContext({...s,fireCooldown:cooldown},0,0,false);frames.push(bladeStrikeV35(c,1.7,3).clipFrame);}
 assert.equal(new Set(frames).size,16);assert.equal(JSON.stringify(s),old);
 for(let i=1;i<frames.length;i++)assert.ok(frames[i]>=frames[i-1]&&frames[i]-frames[i-1]<=1);
 const frozen=bladeStrikeV35(motionContext({...s,fireCooldown:5},.9,0,true),1.7,3);assert.equal(frozen.clipFrame,0);assert.equal(frozen.recoil,0);
});
test('blade slash art is a transparent separate sixteen-frame clip for each equipment tier',()=>{
 const m=JSON.parse(readFixture(path.resolve(__dirname,'blade-motion-v35.json'),'utf8'));assert.equal(m.framesPerTier,16);assert.equal(m.frames,32);assert.ok(m.transparentFraction>.5);
 const png=readFixture(path.resolve(__dirname,'../../../public/games/toybot-breakout/optimized/mech-blade-attack-v35.webp'));assert.equal(imageInfo(png).width,1024);assert.equal(imageInfo(png).height,512);assert.equal(imageInfo(png).alpha,true);
});

test('boss arena guards are planted independent of every road stride and paused status',()=>{
 const sample=load('animationModules').sampleMechMotion;
 for(const mechClass of ['pulse','heavy','blade'])for(const status of ['boss-intro','battle','boss-shift','boss-victory']){
  const s={...battle(),mechClass,status,fireCooldown:0},old=JSON.stringify(s);
  for(const roadTicks of [0,1,13,173]){const p=sample({...s,roadTicks},.5);assert.equal(p.sheet,'arena');assert.equal(p.frame,0);assert.equal(p.row%3,0);assert.equal(p.recoil,0);}
  assert.deepEqual(sample(s,.2),sample({...s,status:'paused',resumeStatus:status},.2));assert.equal(JSON.stringify(s),old);
 }
});
test('mounted parts follow boss body translation instead of staying on roadway',()=>{
 const base={...battle(),battleLane:1,bossMoveTicks:0};
 for(const battleLane of [0,1,2]){const moved={...base,battleLane};for(let i=0;i<3;i++){
  assert.ok(Math.abs(sim.targetX(moved,'part',i)-sim.bossX(moved))<=25);assert.equal(sim.targetY(moved,'part',i)-sim.bossY(moved),[0,0,3][i]);assert.equal(sim.bossPartLane(moved,i),Math.max(0,Math.min(2,battleLane+i-1)));
 }}
 const camera=load('referenceCamera'),shot=incoming(base,{target:'part',targetIndex:1});const p=camera.cameraFlight({x:50,y:sim.targetY(base,'part',1),angle:0,progress:1},shot);assert.equal(p.y,camera.bossScreenY(sim.targetY(base,'part',1)));
});
test('final colossus can be hit in all three lanes and receives each impact at its corresponding body region',()=>{
 const base={...battle(4),fireCooldown:1000,bossMoveTicks:0},xs=[];
 assert.deepEqual(sim.bossDamageLanes(base),[0,1,2]);assert.equal(sim.bossX({...base,battleLane:0}),50);assert.equal(sim.bossX({...base,battleLane:2}),50);
 for(const lane of [0,1,2]){const n=tick({...base,pendingShots:[incoming(base,{lane,damage:10})]});assert.ok(n.battleHp<base.battleHp);xs.push(n.feedback.at(-1).x);}
 assert.ok(xs[0]<xs[1]&&xs[1]<xs[2]);
 const ordinary={...battle(0),battleLane:1};assert.deepEqual(sim.bossDamageLanes(ordinary),[1]);assert.equal(tick({...ordinary,pendingShots:[incoming(ordinary,{lane:0})]}).report.dealt,0);
});
test('grounded arena atlases provide distinct stance fire and dodge rows with real transparency',()=>{
 const meta=JSON.parse(readFixture(path.resolve(__dirname,'arena-v36.json'),'utf8'));assert.equal(meta.length,4);
 for(const m of meta){assert.ok(m.transparentFraction>.45);assert.equal(m.columns,8);assert.equal(m.frames,m.kind==='emperor'?32:48);assert.ok(m.bytes<1800000);}
 const modules=load('arenaMotionV36');assert.equal(new Set(Object.values(modules.ARENA_ART_V36)).size,3);assert.ok(load('referenceCamera').bossPixels({...battle(),levelIndex:4})>load('referenceCamera').bossPixels(battle()));
});

test('summon locks player lane, remains destructible through telegraph and cannot retarget a dodging player',()=>{
 const base={...battle(1),lane:2,bossStep:'flight',bossSalvos:0,threats:[{id:999,kind:'minion',lane:0,fromLane:0,ticks:26,duration:32,hp:20,maxHp:20,damage:14}]},old=JSON.stringify(base);
 let s=tick(base);assert.equal(s.enemyAttacks[0].lane,2);assert.equal(s.enemyAttacks[0].phase,'warning');assert.equal(JSON.stringify(base),old);
 const destroyed=tick({...s,pendingShots:[incoming(s,{target:'threat',targetIndex:999,lane:0,damage:99})]});assert.equal(destroyed.threats[0].hp,0);assert.equal(destroyed.enemyAttacks.length,0);
 const paused=sim.gameReducer(s,{type:'PAUSE'});assert.deepEqual(tick(paused),paused);
 s=sim.gameReducer(s,{type:'MOVE_LANE',lane:1});for(let i=0;i<12;i++)s=tick(s);assert.equal(s.enemyAttacks[0].phase,'flight');assert.equal(s.enemyAttacks[0].lane,2);
 const start=sim.enemyThreatX(s,s.threats[0]);for(let i=0;i<4;i++)s=tick(s);assert.ok(sim.enemyThreatX(s,s.threats[0])>start);assert.ok(sim.enemyThreatY(s,s.threats[0])>43);
 for(let i=0;i<4;i++)s=tick(s);assert.equal(s.playerHp,100);assert.equal(s.threats[0].hp,0);const seq=s.damageSequence;for(let i=0;i<5;i++)s=tick(s);assert.equal(s.damageSequence,seq);
});
test('a crossing summon uses its current lane for a real intercept and dies before body impact',()=>{
 let s={...battle(1),lane:2,bossStep:'flight',bossSalvos:0,threats:[{id:999,kind:'minion',lane:0,fromLane:0,ticks:26,duration:32,hp:20,maxHp:20,damage:14}]};s=tick(s);for(let i=0;i<16;i++)s=tick(s);
 const lane=sim.enemyThreatLane(s,s.threats[0]);assert.equal(lane,1);
 const wrong=tick({...s,pendingShots:[incoming(s,{target:'threat',targetIndex:999,lane:0,damage:99})]});assert.equal(wrong.threats[0].hp,20);
 const killed=tick({...s,pendingShots:[incoming(s,{target:'threat',targetIndex:999,lane,damage:99})]});assert.equal(killed.threats[0].hp,0);assert.equal(killed.playerHp,100);
});
test('ordinary road swarm locks another lane and moves its body and collision together',()=>{
 const {state,index}=roadSpecialist('swarm',0,4.9),own=sim.roadEnemyLane(state,index);let s=tick({...state,lane:(own+2)%3});const target=(own+2)%3;assert.equal(s.enemyAttacks[0].lane,target);
 for(let i=0;i<10;i++)s=tick(s);assert.equal(s.enemyAttacks[0].phase,'flight');const x=sim.roadEnemyX(s,index);for(let i=0;i<4;i++)s=tick(s);assert.notEqual(sim.roadEnemyX(s,index),x);assert.equal(s.enemyAttacks[0].lane,target);
 const lane=sim.roadEnemyLane(s,index),killed=tick({...s,pendingShots:[incoming(s,{target:'hazard',targetIndex:index,lane,damage:999})]});assert.ok(killed.hazardHps[index]<=0);assert.equal(killed.enemyAttacks.length,0);
});
test('surviving stationary boss node warns before leaving its original lane rather than expiring into invisible damage',()=>{
 const base={...battle(3),lane:2,bossStep:'flight',bossSalvos:0,threats:[{id:456,kind:'pylon',lane:0,fromLane:0,ticks:12,duration:30,hp:20,maxHp:20,damage:10}]};const s=tick(base);assert.equal(s.enemyAttacks[0].kind,'pounce');assert.equal(s.enemyAttacks[0].lane,2);assert.equal(s.threats[0].ticks,12);assert.equal(s.playerHp,100);
});
test('road texture follows distance and predictive movement while pause boss battle and reduced motion stop scrolling',()=>{
 const {roadOffsetV37:offset}=load('roadMotionV37'),s={...initial(),status:'running',progress:30},step=sim.roadStepFor(s,true);
 assert.ok(offset(s,.9,step)>offset(s,0,step));assert.equal(offset({...s,status:'paused',resumeStatus:'running'},.9,step),offset(s,0,step));assert.equal(offset({...s,status:'battle'},.9,step),offset({...s,status:'battle'},0,step));assert.equal(offset(s,.9,step,true),0);
 const art=load('roadMotionV37');assert.equal(art.ROAD_TILES_V37.length,5);for(const url of art.ROAD_TILES_V37)assert.ok(fs.statSync(path.resolve(__dirname,'../../../public'+url)).size<100000);
});

test('homecoming part release dialogue is local to combat, nonmodal, once-only and never grants rewards',()=>{
 const base=campaign.createCampaign(battle());base.ops.broken=1;base.narrative.radio=null;
 const s=campaignTick(base);assert.equal(s.narrative.radio.id,'part-release');assert.equal(s.narrative.scene,null);assert.equal(s.score,base.score);assert.equal(s.bots,base.bots);assert.equal(s.narrative.seen.includes('part-release'),true);
 const dismissed=campaign.campaignReducer(s,{type:'STORY_DISMISS_RADIO'});assert.equal(campaignTick(dismissed).narrative.radio,null);
 const busy=campaignTick({...base,narrative:{...base.narrative,radio:{id:'urgent',text:'预警',ticks:10}}});assert.equal(busy.narrative.radio.id,'urgent');assert.equal(base.narrative.seen.length,0);
});
test('part damage animation owns its break timestamp and an old scar cannot replay when another part breaks',()=>{
 const fx=load('partDamageV38'),base={...battle(),battleTime:20};base.ops.parts=operations.makeBossParts(base);const before=JSON.stringify(base);
 const hit=tick({...base,pendingShots:[incoming(base,{target:'part',targetIndex:0,lane:sim.bossPartLane(base,0),damage:999})]});const p=hit.ops.parts[0];assert.equal(p.hp,0);assert.equal(p.brokenAt,20);assert.equal(JSON.stringify(base),before);
 assert.equal(fx.partDamageV38(p,20,0,0).phase,'sparks');assert.equal(fx.partDamageV38(p,24,0,0).phase,'smoke');assert.equal(fx.partDamageV38(p,32,0,0).phase,'settled');
 assert.equal(fx.partDamageV38(p,40,.8,0).phase,'settled');assert.equal(fx.partDamageV38({...p,brokenAt:40},40,.8,1).phase,'sparks');assert.equal(fx.partDamageV38(p,20,.8,0,true).phase,'settled');assert.equal(fx.partDamageV38({...p,brokenAt:undefined},20,.8,0).phase,'settled');
});
test('homecoming comic and five chapter films deploy original raster artwork with transparent local damage',()=>{
 const m=JSON.parse(readFixture(path.resolve(__dirname,'story-art-v38.json'),'utf8')),art=load('art');assert.equal(m.filter(x=>x.kind==='comic').length,4);assert.equal(m.filter(x=>x.kind==='chapter'&&x.frames===6).length,5);assert.ok(m.find(x=>x.kind==='damage').transparentFraction>.7);
 for(const url of [...art.STORY_ART,...campaign.CHAPTER_FILMS]){const bytes=readFixture(path.resolve(__dirname,'../../../public'+url));assert.equal(bytes.readUInt16BE(0),0xffd8);assert.ok(bytes.length<350000);}
 assert.ok(campaign.CHAPTER_FILM_RATIOS.every(x=>x===1));assert.equal(new Set(load('story').STORY_CHAPTERS.map(c=>c.permission)).size,5);
});

const sorties=load('sortiesV39');
test('collected and missed gates leave the scene on the resolution tick while their one-time effect remains applied',()=>{
 const level=levels.getLevel(0),mark=level.gateMarks[0],base={...initial(),status:'running',progress:mark-1.5-sim.RUN_SPEED/2,fireCooldown:1000,hazardHps:level.hazards.map(()=>-1),gate:0,lane:1};base.gateChoices[0]=[{id:'clearance',title:'火力+1',effect:'weaponUp',amount:1,polarity:'reward',lane:1}];
 assert.equal(sorties.gateVisibleV39(base,mark),true);const hit=tick(base);assert.equal(hit.gateCollected,true);assert.equal(sorties.gateVisibleV39(hit,mark),false);const weapon=hit.weaponLevel;assert.ok(weapon>base.weaponLevel);assert.equal(tick(hit).weaponLevel,weapon);
 const miss=tick({...base,lane:2});assert.equal(miss.gateCollected,false);assert.equal(sorties.gateVisibleV39(miss,mark),false);assert.equal(miss.weaponLevel,base.weaponLevel);
 assert.equal(sorties.gateVisibleV39({...base,status:'paused',resumeStatus:'running'},mark),true);assert.equal(sorties.gateVisibleV39({...hit,status:'paused',resumeStatus:'running'},mark),false);
});
test('ten short missions have two sequential objectives in each unlocked district and tolerate corrupt old saves',()=>{
 const g=progression.normalizeGarage({tutorialCompleted:true});assert.equal(sorties.SORTIES_V39.length+levels.LEVELS.length,15);assert.equal(sorties.canEnterSortieV39(g,'0:0'),true);assert.equal(sorties.canEnterSortieV39(g,'0:1'),false);assert.equal(sorties.canEnterSortieV39(g,'1:0'),false);
 const corrupt=progression.normalizeGarage({...g,sortieClears:['0:1','0:1','../x','4:0']});assert.deepEqual(corrupt.sortieClears,[]);assert.equal(sorties.canEnterSortieV39(g,'missing'),false);
});
test('short mission completion awards once per ledger without granting a main story clear or free next district',()=>{
 const g=progression.normalizeGarage({tutorialCompleted:true});let s=sim.gameReducer(initial(),{type:'START_SORTIE',key:'0:0',garage:g});assert.equal(s.bots,1);assert.equal(s.progress,12);assert.equal(s.sortie.key,'0:0');assert.equal(s.bossDefeated,false);
 const old=JSON.stringify(s);const paused=sim.gameReducer(s,{type:'PAUSE'});assert.deepEqual(tick(paused),paused);assert.equal(JSON.stringify(s),old);
 s=tick({...s,progress:s.sortie.end-sim.RUN_SPEED/2,kills:s.sortie.target,fireCooldown:1000,hazardHps:s.hazardHps.map(()=>-1)});assert.equal(s.status,'result');assert.equal(s.won,true);assert.equal(s.pendingShots.length,0);assert.equal(s.enemyAttacks.length,0);assert.equal(sorties.runProgressV39(s),100);
 const updated=sorties.recordSortieV39(g,s);assert.deepEqual(updated.sortieClears,['0:0']);assert.deepEqual(sorties.recordSortieV39(updated,s).sortieClears,['0:0']);assert.equal(sorties.canEnterSortieV39(updated,'0:1'),true);assert.equal(updated.unlockedLevel,0);assert.ok(updated.completedLevels.every(x=>!x));assert.equal(playability.rewardLedger(s).total<=4,true);assert.equal(sim.gameReducer(s,{type:'NEXT_LEVEL',garage:updated}),s);
 const replay=sim.gameReducer(s,{type:'RESTART',garage:updated});assert.equal(replay.sortie.key,s.sortie.key);assert.equal(replay.progress,12);assert.equal(replay.kills,0);assert.equal(replay.sortie.firstClear,false);
 const failed=tick({...replay,progress:replay.sortie.end-sim.RUN_SPEED/2,kills:0,fireCooldown:1000,hazardHps:replay.hazardHps.map(()=>-1)});assert.equal(failed.won,false);assert.deepEqual(sorties.recordSortieV39(g,failed).sortieClears,[]);
});
test('short mission wrapper skips boss story scenes and restart keeps its own objective',()=>{
 const g=progression.normalizeGarage({tutorialCompleted:true}),base=campaign.createCampaign(initial());const started=campaign.campaignReducer(base,{type:'START_SORTIE',key:'0:0',garage:g});assert.equal(started.narrative.scene,null);assert.equal(started.narrative.radio.id,'sortie-brief');assert.equal(started.narrative.objective,'inactive');
 const won={...started,status:'result',won:true,progress:43,kills:20,bossDefeated:false};const restart=campaign.campaignReducer(won,{type:'RESTART',garage:g});assert.equal(restart.sortie.key,'0:0');assert.equal(restart.narrative.scene,null);
});
test('all ten short mission recipes can be finished with an ordinary acquired squad across all three mech classes',()=>{
 const samples=[];for(const spec of sorties.SORTIES_V39)for(const mechClass of ['pulse','heavy','blade']){
  const g=progression.normalizeGarage({tutorialCompleted:true,completedLevels:[true,true,true,true,true],sortieClears:sorties.SORTIES_V39.filter(x=>x.slot===0).map(x=>x.key),mechClass});let s=sim.gameReducer({...initial(spec.level),status:'home'},{type:'START_SORTIE',key:spec.key,garage:g});
  s={...s,bots:3,weaponLevel:2,playerHp:1000,playerMaxHp:1000};let count=0;
  while(sim.isActiveStatus(s.status)&&count++<1400){const l=levels.getLevel(s.levelIndex),live=l.hazards.flatMap((h,i)=>s.hazardHps[i]>0&&s.progress>=h.progress-14&&s.progress<h.progress?[i]:[]);const targets=live.sort((a,b)=>Number(!!l.hazards[b].elite)-Number(!!l.hazards[a].elite)||l.hazards[a].progress-l.hazards[b].progress);let lane=targets.length?sim.roadEnemyLane(s,targets[0]):s.lane;const gate=s.gateChoices[s.gate]?.[0];if(gate&&!s.gateResolved&&gate.polarity==='reward'&&Math.abs(l.gateMarks[s.gate]-s.progress)<2)lane=gate.lane;s=sim.gameReducer(s,{type:'MOVE_LANE',lane});if(sim.canActivateBurst(s))s=sim.gameReducer(s,{type:'ACTIVATE_BURST'});s=tick(s);}
  assert.equal(s.status,'result',spec.key+' '+mechClass);assert.equal(s.won,true,spec.key+' '+mechClass+' count '+sorties.sortieCountV39(s));assert.equal(s.bossDefeated,false);assert.ok(count<1400);samples.push(spec.key+' '+mechClass+':'+(count/10).toFixed(1));
 }console.log('Short mission balance seconds: '+samples.join(', '));
});

// V40: deliberate supply decisions, tactical reactions and optional replay trials.
const tactics40=load('tacticsV40');
test('V40 all maps offer at least one real two-way choice with a third open lane',()=>{
 for(let sector=0;sector<5;sector++)for(let layout=0;layout<3;layout++){
  const rows=sim.createGateChoices(sector,layout,()=>.2);assert.ok(rows.some(r=>r.length===2));
  for(const row of rows){assert.ok(row.length<3);assert.equal(new Set(row.map(o=>o.lane)).size,row.length);}
  assert.ok(rows.flat().some(o=>o.effect==='riskyWeapon'));
 }
});
test('V40 choice contact selects the actual occupied lane once and removes the whole fork',()=>{
 const base=initial(),gate=4,mark=levels.getLevel(0).gateMarks[gate];const row=[{id:'heal',title:'维修+30',effect:'fieldRepair',amount:1,lane:0,polarity:'reward'},{id:'risk',title:'火力+2',effect:'riskyWeapon',amount:2,lane:2,polarity:'reward'}];
 const s={...base,status:'running',progress:mark-1.51,gate,lane:2,playerHp:40,fireCooldown:1000,hazardHps:base.hazardHps.map(()=>-1),gateChoices:base.gateChoices.map((r,i)=>i===gate?row:r)};
 const old=JSON.stringify(s),n=tick(s);assert.equal(JSON.stringify(s),old);assert.equal(n.gateCollected,true);assert.equal(n.weaponLevel,2);assert.equal(n.playerHp,40);assert.equal(n.gateChoices[gate][0].id,'risk');assert.equal(load('sortiesV39').gateVisibleV39(n,mark),false);
 assert.equal(tick(n).weaponLevel,2);
 const missed=tick({...s,lane:1});assert.equal(missed.gateCollected,false);assert.equal(missed.weaponLevel,0);assert.equal(load('sortiesV39').gateVisibleV39(missed,mark),false);
});
test('V40 repair restores health only while risk upgrades at most six future enemies immutably',()=>{
 const base={...initial(2),status:'running',progress:61,playerHp:20,bots:1};
 const heal=sim.applyGateEffect(base,{effect:'fieldRepair',title:'维修',amount:1,polarity:'reward'});assert.equal(heal.playerHp,50);assert.equal(heal.bots,1);
 const risk=sim.applyGateEffect(base,{effect:'riskyWeapon',title:'火力',amount:2,polarity:'reward'});assert.equal(base.weaponLevel,0);assert.equal(base.tactics.riskIds.length,0);assert.equal(risk.weaponLevel,2);assert.ok(risk.tactics.riskIds.length>0&&risk.tactics.riskIds.length<=6);
 for(const i of risk.tactics.riskIds){assert.equal(risk.hazardHps[i],base.hazardHps[i]*1.5);assert.ok(sim.hazardMaxHpFor(risk,i)>=risk.hazardHps[i]);assert.ok(levels.getLevel(2).hazards[i].progress>67);}
 assert.equal(sim.applyGateEffect({...base,weaponLevel:4},{effect:'riskyWeapon',title:'火力',polarity:'reward'}).weaponLevel,4);
});
test('V40 chain kill statistics record real secondary kills and never duplicate dead targets',()=>{
 const {ids,state}=eliteScene(),a=ids[0];const s={...state,hazardHps:state.hazardHps.map((_,i)=>ids.includes(i)?1:-1),pendingShots:[incoming(state,{target:'hazard',targetIndex:a,lane:state.lane,damage:100})]};
 const n=tick(s);assert.ok(n.tactics.chainKills>0);assert.equal(n.tactics.chainKills,n.kills-1);const more=tick({...n,pendingShots:[incoming(n,{target:'hazard',targetIndex:a,lane:state.lane,damage:100})]});assert.equal(more.tactics.chainKills,n.tactics.chainKills);
});
test('V40 destroying a guard fractures its visible linked allies and interrupts warning attacks',()=>{
 const {level,ids,state}=eliteScene(),guard=ids.find(i=>level.hazards[i].eliteRole==='guard'),ally=ids.find(i=>i!==guard&&Math.abs(level.hazards[i].progress-level.hazards[guard].progress)<=4);
 const s={...state,fireCooldown:1000,enemyAttacks:[{id:901,source:'hazard',sourceId:ally,kind:'drone-burst',lane:state.lane,fromLane:state.lane,fromY:45,phase:'warning',ticks:20,duration:20,damage:10,shotsRemaining:1}],pendingShots:[incoming(state,{target:'hazard',targetIndex:guard,lane:state.lane,damage:100})]};
 const n=tick(s);assert.equal(n.tactics.guardBreaks,1);assert.ok(n.roadImpacts[ally].fracture>0);assert.ok(!n.enemyAttacks.some(a=>a.id===901));assert.equal(s.roadImpacts[ally],undefined);
});
test('V40 a clean completed boss attack opens a bounded window; blocked or damaging hits do not',()=>{
 const s={...battle(),bossStep:'rush',bossStepTicks:sim.RUSH_DURATION_TICKS-1,bossRushHit:true,bossAttack:'rush',bossAttackLanes:[0],damageSequence:3};s.tactics={...s.tactics,cycleDamage:3};
 const n=tick(s);assert.equal(n.bossStep,'recovery');assert.equal(n.tactics.windows,1);assert.ok(n.tactics.windowTicks>0);assert.equal(tick(n).tactics.windows,1);
 assert.equal(tick({...s,damageSequence:4}).tactics.windows,0);
 const paused=sim.gameReducer(n,{type:'PAUSE'});assert.equal(tick(paused),paused);assert.equal(n.tactics.windowTicks,paused.tactics.windowTicks);
});
test('V40 window damage is stronger but never bypasses guard pylons or wrong-lane checks',()=>{
 const s={...battle(),battleHp:1000,battleMaxHp:1000,bossStepTicks:5};
 const shot=incoming(s,{damage:20,lane:s.battleLane});const plain=tick({...s,pendingShots:[shot]});const n=tick({...s,tactics:{...s.tactics,windowTicks:15},pendingShots:[shot]});assert.ok(n.report.bossDamage>plain.report.bossDamage);
 const miss=tick({...s,tactics:{...s.tactics,windowTicks:15},pendingShots:[{...shot,lane:(s.battleLane+1)%3}]});assert.equal(miss.report.bossDamage,0);
});
test('V40 pulse clears airborne bullets across all lanes, preserving warnings and ground fields',()=>{
 const base={...battle(),mechClass:'pulse',burstEnergy:100,enemyAttacks:[{id:1,kind:'sniper-shot',phase:'flight',lane:0},{id:2,kind:'bombard',phase:'flight',lane:2},{id:3,kind:'sniper-shot',phase:'warning',lane:1},{id:4,kind:'heat-mine',phase:'field',lane:2}],threats:[{id:5,kind:'shell',hp:-1},{id:6,kind:'beam',hp:-1},{id:7,kind:'minion',hp:10}]};
 const old=JSON.stringify(base),s=sim.gameReducer(base,{type:'ACTIVATE_BURST'});assert.equal(JSON.stringify(base),old);assert.deepEqual(s.enemyAttacks.map(a=>a.id),[3,4]);assert.deepEqual(s.threats.map(a=>a.id),[6,7]);assert.equal(s.tactics.skillCleared,3);assert.equal(sim.gameReducer(s,{type:'ACTIVATE_BURST'}),s);
});
test('V40 heavy burst suppresses road targets and doubles landed boss part damage',()=>{
 const {state,ids}=eliteScene(),s={...state,mechClass:'heavy',burstEnergy:100};const active=sim.gameReducer(s,{type:'ACTIVATE_BURST'});assert.ok(active.roadImpacts[ids[0]].fracture>0);assert.ok(active.tactics.skillBreaks>0);assert.equal(s.roadImpacts[ids[0]],undefined);
 const b={...battle(),mechClass:'heavy'};b.ops.parts=[{kind:'shield',hp:100,maxHp:100,lane:b.battleLane,name:'护盾'}];const shot=incoming(b,{target:'part',targetIndex:0,lane:b.battleLane,damage:10,attackStyle:'heavy'});
 const normal=tick({...b,pendingShots:[shot]}),burst=tick({...b,burstTicks:20,pendingShots:[{...shot,burst:true}]});assert.equal(100-normal.ops.parts[0].hp,10);assert.equal(100-burst.ops.parts[0].hp,20);
});
test('V40 blade parry is temporary, reflects once and never blocks physical collisions',()=>{
 let b=sim.gameReducer({...battle(),mechClass:'blade',burstEnergy:100},{type:'ACTIVATE_BURST'});const hp=b.playerHp;sim.applySquadHit(b,20);assert.equal(b.playerHp,hp);assert.equal(b.tactics.parries,1);sim.applySquadHit(b,20);assert.equal(b.tactics.parries,1);const n=tick(b);assert.ok(n.report.bossDamage>0);assert.equal(n.tactics.reflection,0);assert.equal(tick(n).tactics.reflection,0);
 const collision=sim.gameReducer({...battle(),mechClass:'blade',burstEnergy:100,armorPoints:0},{type:'ACTIVATE_BURST'});sim.applySquadHit(collision,10,'collision');assert.equal(collision.playerHp,90);assert.equal(collision.tactics.collisions,1);assert.equal(collision.tactics.parries,0);
 const ended={...b,invulnerableTicks:0,tactics:{...b.tactics,parryTicks:0}};sim.applySquadHit(ended,10);assert.equal(ended.playerHp,hp-10);
});
test('V40 optional trials require prior main clear, cannot stack protocols and enforce designated chassis',()=>{
 const locked=progression.normalizeGarage({tutorialCompleted:true}),all=progression.normalizeGarage({...garage,completedLevels:[true,true,true,true,true]});
 let s=sim.createInitialState(locked);assert.equal(sim.gameReducer(s,{type:'SET_TRIAL',trial:'clean',garage:locked}),s);
 s=sim.gameReducer(s,{type:'SET_TRIAL',trial:'clean',garage:all});assert.equal(s.tactics.trial,'clean');s=sim.gameReducer(s,{type:'SET_PROTOCOL',protocol:'elite',garage:all});assert.equal(s.tactics.trial,null);
 s=sim.gameReducer(s,{type:'SET_TRIAL',trial:'signature',garage:all});assert.equal(s.ops.protocol,'standard');const wrong={...all,mechClass:'blade'};assert.equal(sim.gameReducer(s,{type:'START',garage:wrong}),s);
 const fresh=sim.gameReducer(s,{type:'START',garage:all});assert.equal(fresh.tactics.trial,'signature');assert.equal(fresh.tactics.firstTrial,true);assert.equal(fresh.bots,1);
 const retry=sim.gameReducer({...fresh,status:'result',tactics:{...fresh.tactics,elapsed:999,collisions:4}},{type:'RESTART',garage:all});assert.equal(retry.tactics.elapsed,0);assert.equal(retry.tactics.collisions,0);assert.equal(retry.tactics.trial,'signature');
});
test('V40 zero-collision includes shield absorption; timers freeze with pause and story',()=>{
 const s={...initial(),status:'running',shieldCharges:1};sim.applySquadHit(s,10,'collision');assert.equal(s.report.collisions,0);assert.equal(s.tactics.collisions,1);
 const n=tick(s);assert.equal(n.tactics.elapsed,1);const paused=sim.gameReducer(n,{type:'PAUSE'});assert.equal(tick(paused).tactics.elapsed,1);
 const c=load('campaign'),story=c.createCampaign(n);story.narrative.scene={kind:'briefing',step:0,synced:0};assert.equal(c.campaignReducer(story,{type:'TICK'}).tactics.elapsed,1);
});
test('V40 trial success requires a real full main win and pays first-clear parts only once',()=>{
 const g=progression.normalizeGarage({...garage,completedLevels:[true,true,true,true,true]}),s={...battle(),status:'result',won:true,bossDefeated:true,progress:100,tactics:{...battle().tactics,trial:'clean',firstTrial:true,elapsed:2000}};
 assert.equal(tactics40.trialPassedV40(s),true);assert.equal(load('playability').rewardLedger(s).trial,2);const saved=tactics40.recordTrialV40(g,s);assert.ok(saved.trialClears.includes('0:clean'));assert.equal(saved.trialBadge,'0:clean');assert.equal(saved.parts,g.parts);
 const retry=sim.gameReducer({...s,status:'home'},{type:'START',garage:saved});assert.equal(retry.tactics.firstTrial,false);assert.equal(tactics40.trialBonusV40({...s,tactics:retry.tactics}),0);
 for(const bad of [{won:false},{bossDefeated:false},{progress:99},{playerHp:0},{status:'battle'},{sortie:load('sortiesV39').SORTIES_V39[0]}])assert.equal(tactics40.trialPassedV40({...s,...bad}),false);
 assert.equal(tactics40.trialPassedV40({...s,tactics:{...s.tactics,collisions:1}}),false);
 assert.equal(tactics40.trialPassedV40({...s,tactics:{...s.tactics,trial:'speed',elapsed:3000}}),true);assert.equal(tactics40.trialPassedV40({...s,tactics:{...s.tactics,trial:'speed',elapsed:3001}}),false);
 assert.equal(tactics40.trialPassedV40({...s,mechClass:'heavy',tactics:{...s.tactics,trial:'signature'}}),false);
});
test('V40 trial saves reject unknown or locked badges and round-trip old garages',()=>{
 const g=progression.normalizeGarage({completedLevels:[true,false,false,false,false],trialClears:['0:clean','0:clean','4:speed','0:unknown',42],trialBadge:'4:speed'});assert.deepEqual(g.trialClears,['0:clean']);assert.equal(g.trialBadge,undefined);assert.deepEqual(progression.normalizeGarage(JSON.parse(JSON.stringify(g))),g);
});

test('V40 road parries retaliate against a visible same-lane enemy and cannot bank damage for the boss',()=>{
 const {state,index}=roadSpecialist('swarm',0,4.9);let s=sim.gameReducer({...state,mechClass:'blade',burstEnergy:100,fireCooldown:1000},{type:'ACTIVATE_BURST'});const hp=s.hazardHps[index];sim.applySquadHit(s,10);const n=tick(s);assert.ok(n.hazardHps[index]<hp);assert.equal(n.tactics.reflection,0);
 const empty=tick({...s,hazardHps:s.hazardHps.map(()=>-1)});assert.equal(empty.tactics.reflection,0);assert.equal(empty.report.dealt,0);
});
test('V40 per-cast utility counters reset without erasing run totals or modifying old state',()=>{
 const base={...battle(),mechClass:'pulse',burstEnergy:100,tactics:{...battle().tactics,castCleared:5,skillCleared:5}};const n=sim.gameReducer(base,{type:'ACTIVATE_BURST'});assert.equal(n.tactics.castCleared,0);assert.equal(n.tactics.skillCleared,5);assert.equal(base.tactics.castCleared,5);
});

test('V40 risk max health composes elite rounding and invulnerability does not hide a trial collision',()=>{
 const base={...initial(2),status:'running',progress:15};base.ops.protocol='elite';base.hazardHps=base.hazardHps.map(hp=>Math.ceil(hp*1.4));const n=sim.applyGateEffect(base,{effect:'riskyWeapon',title:'火力',polarity:'reward'});for(const i of n.tactics.riskIds)assert.ok(n.hazardHps[i]<=sim.hazardMaxHpFor(n,i));
 const s={...initial(),invulnerableTicks:5};sim.applySquadHit(s,10,'collision');assert.equal(s.playerHp,100);assert.equal(s.tactics.collisions,1);
});

// V41: paced encounters, useful locked supplies and readable combat decisions.
const flow41=load('flowV41');
test('V41 rear horde ranks appear in staggered batches, never take invisible hits and share their aim coordinates',()=>{
 const level=levels.getLevel(0),rear=level.hazards.findIndex(h=>h.horde&&h.wave===0&&h.slot===12),h=level.hazards[rear];
 const s={...initial(),status:'running',progress:h.progress-12,fireCooldown:1000,hazardHps:initial().hazardHps.map((_,i)=>i===rear?3:-1)};
 assert.equal(flow41.enemyLeadV41(h),10);assert.equal(flow41.enemyVisibleV41(s,h),false);
 const miss=tick({...s,pendingShots:[incoming(s,{target:'hazard',targetIndex:rear,lane:sim.roadEnemyLane(s,rear),damage:10})]});assert.equal(miss.hazardHps[rear],3);assert.equal(miss.report.dealt,0);
 const visible={...s,progress:h.progress-9};assert.equal(flow41.enemyVisibleV41(visible,h),true);assert.ok(sim.roadEnemyY(visible,rear)>=sim.ROAD_HORIZON[0]+3&&sim.roadEnemyY(visible,rear)<48);assert.equal(sim.targetY(visible,'hazard',rear),sim.roadEnemyY(visible,rear));
});
test('V41 pressure changes between build surge and recover and real chains give one bounded breather per stage',()=>{
 for(const [progress,phase]of [[10,'scout'],[20,'build'],[35,'surge'],[46,'build'],[55,'surge'],[64,'build'],[75,'surge'],[90,'recover']])assert.equal(flow41.pressureV41({...initial(),progress}),phase);
 const {ids,state}=eliteScene(),a=ids[0];const s={...state,hazardHps:state.hazardHps.map((_,i)=>ids.includes(i)?1:-1),pendingShots:[incoming(state,{target:'hazard',targetIndex:a,lane:state.lane,damage:100})]};
 const n=tick(s);assert.ok(n.tactics.chainKills>=3);assert.ok(n.breatherTicks>0);assert.deepEqual(n.flow.relievedStages,[0]);assert.equal(s.flow.relievedStages.length,0);assert.equal(tick(sim.gameReducer(n,{type:'PAUSE'})).breatherTicks,n.breatherTicks);
});
test('V41 capped or emergency supplies become useful without erasing penalties or producing duplicate alternatives',()=>{
 const o=(effect,lane=0)=>({id:effect,polarity:'reward',effect,title:effect,icon:'x',amount:1,lane});
 const s={...initial(),weaponLevel:4,shieldCharges:0,playerHp:100};let rows=flow41.usefulGatesV41(s,[o('fieldRepair'),o('weaponUp',2)]);assert.equal(new Set(rows.map(o=>o.effect)).size,2);assert.ok(rows.every(o=>!['fieldRepair','weaponUp'].includes(o.effect)));assert.deepEqual(rows.map(o=>o.lane),[0,2]);
 rows=flow41.usefulGatesV41({...s,playerHp:20},[o('scoreUp')]);assert.equal(rows[0].effect,'fieldRepair');
 const penalty={...o('weaponDown'),polarity:'penalty'};assert.equal(flow41.usefulGatesV41(s,[penalty])[0],penalty);
 assert.equal(flow41.usefulGatesV41({...s,bots:1},[o('repair')])[0].effect,'repair','full health still benefits from squad recruitment');
});
test('V41 visible supply options lock before contact and cannot flip when health or equipment changes',()=>{
 const base=initial(),level=levels.getLevel(0),s={...base,status:'running',gate:1,progress:4,weaponLevel:4,fireCooldown:1000,hazardHps:base.hazardHps.map(()=>-1)};
 const n=tick(s);assert.equal(n.flow.preparedGate,1);assert.ok(n.gateChoices[1].every(o=>!['weaponUp','riskyWeapon'].includes(o.effect)));const choices=JSON.stringify(n.gateChoices[1]);const changed=tick({...n,weaponLevel:0,playerHp:10});assert.equal(JSON.stringify(changed.gateChoices[1]),choices);assert.equal(n.gateResolved,false);
 const collect={...changed,progress:level.gateMarks[1]-1.51,lane:changed.gateChoices[1][0].lane};const result=tick(collect);assert.equal(result.gateCollected,true);assert.equal(result.flow.log.filter(x=>x.source==='补给门').length,1);assert.equal(tick(result).flow.log.filter(x=>x.source==='补给门').length,1);
});
test('V41 movement protects an existing combo once per real kill and empty lane spam never farms it',()=>{
 const s={...initial(),status:'running',combo:5,comboTicks:3};s.flow.moveGuard=true;
 const old=JSON.stringify(s),n=sim.gameReducer(s,{type:'MOVE_LANE',lane:2});assert.equal(JSON.stringify(s),old);assert.equal(n.combo,5);assert.equal(n.comboTicks,12);assert.equal(n.flow.moveGuard,false);
 const again=sim.gameReducer({...n,comboTicks:2},{type:'MOVE_LANE',lane:0});assert.equal(again.comboTicks,2);assert.equal(again.kills,s.kills);assert.equal(again.score,s.score);assert.equal(again.burstEnergy,s.burstEnergy);
 const empty=sim.gameReducer({...s,combo:0,comboTicks:0},{type:'MOVE_LANE',lane:2});assert.equal(empty.combo,0);assert.equal(empty.comboTicks,0);
});
test('V41 successful dodge and parry preserve combo with a cooldown and never increment its kill count',()=>{
 const base={...battle(),lane:0,dodgeFromLane:1,dodgeTicks:2,combo:7,comboTicks:3,threats:[{id:99,kind:'shell',lane:1,ticks:1,duration:8,hp:-1,maxHp:0,damage:12,fromLane:1}]};
 const n=tick(base);assert.equal(n.combo,7);assert.equal(n.comboTicks,35);assert.equal(n.flow.defenseSaves,1);assert.equal(n.kills,0);assert.equal(n.score,base.score+5);
 const again=tick({...n,comboTicks:3,evadeTicks:0,dodgeTicks:2,threats:base.threats});assert.equal(again.flow.defenseSaves,1);assert.equal(again.comboTicks,2);
 const parry={...battle(),combo:4,comboTicks:2};parry.tactics.parryTicks=10;sim.applySquadHit(parry,10);assert.equal(parry.comboTicks,35);assert.equal(parry.flow.defenseSaves,1);
});
test('V41 new specialist gets one isolated extended telegraph; learned attacks keep normal timing',()=>{
 const {state,index}=roadSpecialist('sniper');const fresh={...state,flow:flow41.newFlowV41()};const n=tick(fresh);const warning=n.enemyAttacks.find(a=>a.sourceId===index);assert.ok(warning);assert.equal(warning.duration,26);assert.equal(warning.damage,13*.8);assert.ok(n.flow.lessons.includes('sniper-shot'));assert.equal(n.flow.lastLesson,'sniper-shot');assert.equal(fresh.flow.lessons.length,0);
 const experienced=tick({...state,flow:flow41.newFlowV41(flow41.LESSON_KEYS_V41)});assert.equal(experienced.enemyAttacks.find(a=>a.sourceId===index).duration,18);assert.equal(experienced.flow.introTicks,0);
 const paused=sim.gameReducer(n,{type:'PAUSE'});assert.equal(tick(paused).flow.introTicks,n.flow.introTicks);
});
test('V41 lesson saves migrate veterans, preserve explicit new progress and filter unknown keys',()=>{
 assert.equal(progression.normalizeGarage({wins:2}).enemyLessons.length,flow41.LESSON_KEYS_V41.length);
 assert.deepEqual(progression.normalizeGarage({wins:2,enemyLessons:[]}).enemyLessons,[]);
 assert.deepEqual(progression.normalizeGarage({enemyLessons:['charge','charge','bad',42]}).enemyLessons,['charge']);assert.deepEqual(progression.normalizeGarage({}).enemyLessons,[]);
});
test('V41 exact drag thresholds terminate, sensitivity scales movement and reversal works at road edges',()=>{
 const input=load('interaction'),start={anchorX:100,lane:1,moved:false},threshold=390*.1725*.5;
 assert.equal(input.advanceDrag(start,100+threshold,390).lane,2);
 assert.equal(input.advanceDrag(start,128,390,.75).lane,1);assert.equal(input.advanceDrag(start,128,390,1.35).lane,2);
 const edge=input.advanceDrag(start,600,390),reverse=input.advanceDrag(edge,550,390);assert.equal(edge.lane,2);assert.ok(reverse.lane<2);
 assert.equal(input.advanceDrag({...start,lane:0},100+threshold*2+.01,390).lane,2);
 assert.deepEqual(input.advanceDrag(start,130,390,NaN),input.advanceDrag(start,130,390));
});
test('V41 sensitivity persists independently and old settings keep their original serialized shape',()=>{
 const settings=load('settings');assert.equal(settings.normalizeSettings({}).dragSensitivity,undefined);assert.equal(settings.normalizeSettings({dragSensitivity:99}).dragSensitivity,1.6);assert.equal(settings.normalizeSettings({dragSensitivity:NaN}).dragSensitivity,1);
 const before=global.window;let saved='';try{global.window={localStorage:{getItem:()=>saved,setItem:(_,v)=>saved=v}};settings.saveSettings({muted:true,quality:'auto',volume:.5,dragSensitivity:1.35});assert.equal(settings.readSettings().dragSensitivity,1.35);}finally{global.window=before;}
});
test('V41 damage contributions count real direct, burn, chain and burst hits without adding extra damage',()=>{
 const s={...battle(),battleHp:1000,battleMaxHp:1000,pendingShots:[incoming(battle(),{damage:10})]};const normal=tick(s);assert.equal(normal.flow.contribution.direct,normal.report.dealt);
 const b=tick({...s,burstTicks:20,pendingShots:[{...s.pendingShots[0],burst:true}]});assert.equal(b.flow.contribution.burst,b.report.dealt);assert.equal(b.flow.contribution.direct,0);
 const burn=tick({...s,pendingShots:[],burns:[{target:'boss',index:0,lane:s.battleLane,damage:5,ticks:5}]});assert.equal(burn.flow.contribution.burn,burn.report.dealt);assert.ok(burn.flow.contribution.burn>0);
 const {ids,state}=eliteScene(),a=ids[0],chain=tick({...state,hazardHps:state.hazardHps.map((_,i)=>ids.includes(i)?1:-1),pendingShots:[incoming(state,{target:'hazard',targetIndex:a,lane:state.lane,damage:100})]});assert.ok(chain.flow.contribution.chain>0);assert.ok(Math.abs(Object.values(chain.flow.contribution).reduce((a,b)=>a+b,0)-chain.report.dealt)<.01);
 assert.equal(s.flow.contribution.direct,0);assert.ok(flow41.strongestContributionV41(normal).damage>0);
});
test('V41 recent damage provides a matching practical retry hint without attributing shield absorption to lost health',()=>{
 const s={...battle(),armorPoints:0,shieldCharges:0};sim.applySquadHit(s,20,'hostile','siege-laser');assert.match(s.flow.lastHit.label,/重轨/);assert.match(load('experience').runDebrief(s).tip,/提前换轨/);
 const old=s.flow.lastHit;s.invulnerableTicks=0;s.shieldCharges=1;sim.applySquadHit(s,10,'hostile','bombard');assert.equal(s.flow.lastHit,old);
 assert.notEqual(flow41.damageAdviceV41('boss',0).tip,flow41.damageAdviceV41('boss',4).tip);
 const retry=sim.gameReducer({...s,status:'result'},{type:'RESTART',garage});assert.equal(retry.flow.lastHit,null);assert.equal(retry.flow.defenseSaves,0);assert.equal(retry.flow.log.length,0);
});

test('V41 emergency repair stays visible instead of being consumed by an optional fusion offer',()=>{
 const s={...initial(),status:'running',gate:4,playerHp:20,modules:{arc:1,burn:1,recycle:0}};const repair={id:'emergency',effect:'fieldRepair',title:'维修+30',amount:1,lane:1,polarity:'reward'};s.gateChoices=s.gateChoices.map((row,i)=>i===4?[repair]:row);assert.equal(sim.gateChoicesFor(s)[0].effect,'fieldRepair');assert.equal(sim.gateChoicesFor({...s,playerHp:100})[0].effect,'fuse');
});
test('V41 build history is bounded and cloned; extra contribution excludes ordinary direct damage',()=>{
 const s=initial();for(let i=0;i<40;i++)flow41.recordUpgradeV41(s,'补给门','强化'+i);assert.equal(s.flow.log.length,28);const copy=flow41.copyFlowV41(s.flow);copy.log.push({time:0,source:'测试',title:'测试'});copy.contribution.direct=99;assert.equal(s.flow.log.length,28);assert.equal(s.flow.contribution.direct,0);s.flow.contribution.direct=100;s.flow.contribution.arc=35;assert.equal(flow41.strongestContributionV41(s,true).name,'电弧跳击');
});

test('V41 supplies also freeze fusion eligibility, so collecting a module cannot swap a visible door',()=>{
 const base=initial(),s={...base,status:'running',gate:4,progress:52,modules:{arc:1,burn:0,recycle:0},fireCooldown:1000,hazardHps:base.hazardHps.map(()=>-1)};s.gateChoices=s.gateChoices.map((row,i)=>i===4?[{id:'fixed',effect:'weaponUp',title:'火力+1',polarity:'reward',lane:0,amount:1}]:row);
 const locked=tick(s),changed={...locked,modules:{arc:1,burn:1,recycle:0}};assert.equal(sim.gateChoicesFor(changed)[0].effect,'weaponUp');assert.equal(JSON.stringify(sim.gateChoicesFor(changed)),JSON.stringify(sim.gateChoicesFor(locked)));
 const ready=tick({...s,modules:{arc:1,burn:1,recycle:0}});assert.equal(sim.gateChoicesFor(ready)[0].effect,'fuse');
});

test('V42 heavy rounds retain a fixed local blast when a teammate destroys their target, never retargeting another lane',()=>{
 const {state,ids,level}=eliteScene(),a=ids[1],b=ids[2],other=level.hazards.findIndex(h=>h.horde&&h.wave===0&&h.slot===1);
 const s={...state,mechClass:'heavy',fireCooldown:1000,hazardHps:state.hazardHps.map((_,i)=>i===a?1:i===b||i===other?30:-1),pendingShots:[incoming(state,{id:901,target:'hazard',targetIndex:a,lane:state.lane,damage:5,attackStyle:'pulse'}),incoming(state,{id:902,target:'hazard',targetIndex:a,lane:state.lane,damage:10,attackStyle:'heavy',ticks:3,duration:3})]};
 const n=tick(s),round=n.pendingShots.find(p=>p.id===902);assert.equal(round.target,null);assert.ok(round.blastAnchor);const old=JSON.stringify(n),anchor={...round.blastAnchor};const later=tick(tick(n));assert.equal(JSON.stringify(n),old);assert.ok(later.hazardHps[b]<n.hazardHps[b]);assert.equal(later.hazardHps[other],30);assert.ok(later.coreDetonations.some(e=>e.id===902&&e.x===anchor.x&&e.y===anchor.y));
 const empty={...state,mechClass:'heavy',hazardHps:state.hazardHps.map(()=>-1),pendingShots:[incoming(state,{target:null,attackStyle:'heavy',damage:100})]};assert.equal(tick(empty).report.dealt,0);
});

const safety42=load('safetyV42');
test('V42 temporal safety rejects a third-lane trap and permits staggered windows with a reachable escape',()=>{
 const s={...battle(),lane:1};assert.equal(safety42.hasEscapeV42(s,[{lane:0,from:0,to:50},{lane:1,from:0,to:50},{lane:2,from:0,to:50}]),false);
 assert.equal(safety42.hasEscapeV42(s,[{lane:1,from:15,to:25},{lane:2,from:15,to:25}]),true);
 assert.equal(safety42.hasEscapeV42({...s,lane:0},[{lane:0,from:1,to:10},{lane:1,from:1,to:10}]),false,'four-tick dodge cannot teleport across two lanes');
 const proposal={id:900,source:'threat',sourceId:900,kind:'pounce',lane:2,fromLane:2,fromY:45,phase:'warning',ticks:12,duration:12,damage:10,shotsRemaining:1};
 const fields={...s,lane:2,threats:[0,1].map(lane=>({id:lane,kind:'field',hp:-1,maxHp:0,lane,damage:5,ticks:40,duration:40,fromLane:1}))};assert.equal(safety42.safeToQueueV42(fields,[proposal]),false);assert.equal(fields.enemyAttacks.length,0);
});
test('V42 a blocked boss minion waits visibly rather than expiring into an untelegraphed body hit',()=>{
 const b={...battle(),lane:2,bossStep:'flight',bossSalvos:0,threats:[{id:99,kind:'minion',lane:0,fromLane:0,hp:20,maxHp:20,ticks:20,duration:32,damage:10},...[0,1].map(lane=>({id:100+lane,kind:'field',hp:-1,maxHp:0,lane,damage:5,ticks:40,duration:40,fromLane:1}))]};
 const n=tick(b);assert.equal(n.enemyAttacks.length,0);assert.equal(n.threats.find(t=>t.id===99).ticks,20);assert.equal(n.playerHp,b.playerHp);
});

const polish42=load('polishV42');
test('V42 effect merging keeps critical breaks readable without modifying real hit records',()=>{
 const f=[{id:1,x:50,y:45,ticks:4,kind:'hit'},{id:2,x:50.2,y:45,ticks:4,kind:'armor',armorBreak:true},{id:3,x:50,y:45,ticks:8,kind:'elite',destroyed:true},{id:4,x:30,y:45,ticks:4,kind:'heavy'},{id:5,x:70,y:45,ticks:4,kind:'hit'}],before=JSON.stringify(f),merged=polish42.readableFeedbackV42(f,false);assert.ok(merged.some(x=>x.id===3));assert.ok(!merged.some(x=>x.id===1));assert.ok(polish42.readableFeedbackV42(f,true).length<=2);assert.equal(JSON.stringify(f),before);assert.equal(polish42.strongFeedbackV42(f[3]),false);assert.equal(polish42.strongFeedbackV42(f[2]),true);
});
test('V42 contextual skill hints match each actual utility and do not recommend clearing beams or fields',()=>{
 const base={...battle(),burstEnergy:100,mechClass:'pulse',threats:[0,1].map(lane=>({id:lane,kind:'shell',hp:-1,lane,ticks:5,duration:12,damage:12,fromLane:1}))};assert.match(polish42.skillOpportunityV42(base),/净化/);assert.equal(polish42.skillOpportunityV42({...base,threats:base.threats.map(t=>({...t,kind:'beam'}))}),null);
 const heavy={...base,mechClass:'heavy'};heavy.ops.parts=[{kind:'shield',hp:10,maxHp:10,lane:1,name:'护盾'}];assert.match(polish42.skillOpportunityV42(heavy),/破拆/);
 const blade={...base,mechClass:'blade',lane:1};assert.match(polish42.skillOpportunityV42(blade),/格挡/);assert.equal(polish42.skillOpportunityV42({...blade,burstEnergy:99}),null);
});
test('V42 resume countdown freezes hostile world and shooting while accepting deliberate repositioning',()=>{
 const base={...battle(),burstEnergy:100,threats:[{id:999,kind:'shell',hp:-1,maxHp:0,lane:1,fromLane:1,ticks:1,duration:10,damage:20}]};let s=sim.gameReducer(sim.gameReducer(base,{type:'PAUSE'}),{type:'RESUME'});assert.equal(s.finish.resumeTicks,8);assert.equal(sim.canActivateBurst(s),false);s=sim.gameReducer(s,{type:'MOVE_LANE',lane:2});for(let i=0;i<8;i++)s=tick(s);assert.equal(s.lane,2);assert.equal(s.dodgeTicks,0);assert.equal(s.threats[0].ticks,1);assert.equal(s.battleTime,base.battleTime);assert.equal(s.playerHp,base.playerHp);assert.equal(s.flow.contribution.direct,0);assert.equal(s.finish.resumeTicks,0);const n=tick(s);assert.equal(n.threats[0].hp,0);assert.equal(n.playerHp,base.playerHp);assert.equal(n.battleTime,base.battleTime+1);
});
test('V42 fast retry preserves the support choice and skips only already seen story scenes',()=>{
 const c=load('campaign'),s=c.createCampaign({...initial(),status:'result',won:false});s.narrative.seen=['briefing','confrontation','lore'];s.narrative.route='rescue';const n=c.campaignReducer(s,{type:'RESTART',garage});assert.equal(n.status,'running');assert.equal(n.narrative.scene,null);assert.equal(n.narrative.route,'rescue');assert.equal(n.narrative.objective,'pending');assert.ok(n.narrative.seen.includes('confrontation'));assert.equal(n.playerHp,n.playerMaxHp);assert.equal(n.flow.lastHit,null);
 const first=c.campaignReducer(c.createCampaign(initial()),{type:'START',garage});assert.equal(first.narrative.scene.kind,'briefing');
});
test('V42 defeat skipping cannot affect live combat and skill receipts use only real burst direct damage',()=>{
 const s=battle();assert.equal(sim.gameReducer(s,{type:'SKIP_DEFEAT'}),s);const early={...s,status:'defeat',defeatTicks:5};assert.equal(sim.gameReducer(early,{type:'SKIP_DEFEAT'}),early);assert.equal(sim.gameReducer({...early,defeatTicks:6},{type:'SKIP_DEFEAT'}).status,'result');
 const end={...s,burstTicks:1,burstSequence:1,burstStart:{damage:0,kills:0},finish:{...s.finish,baselineDamage:10},flow:{...s.flow,contribution:{...s.flow.contribution,burst:35,direct:100}}};const n=tick(end);assert.equal(n.finish.receipt.damage,25);assert.equal(n.finish.receipt.ticks,24);const frozen=sim.gameReducer(n,{type:'PAUSE'});assert.equal(tick(frozen).finish.receipt.ticks,24);
});

test('V42 simultaneous teammate kills still trigger the captured heavy splash exactly once',()=>{
 const {state,ids}=eliteScene(),a=ids[1],b=ids[2];const s={...state,mechClass:'heavy',hazardHps:state.hazardHps.map((_,i)=>i===a?1:i===b?30:-1),pendingShots:[incoming(state,{id:201,target:'hazard',targetIndex:a,lane:state.lane,damage:10,attackStyle:'pulse'}),incoming(state,{id:202,target:'hazard',targetIndex:a,lane:state.lane,damage:10,attackStyle:'heavy'})]};const n=tick(s);assert.ok(n.hazardHps[b]<30);assert.equal(n.coreDetonations.filter(e=>e.id===202).length,1);assert.equal(tick(n).hazardHps[b],n.hazardHps[b]);
});

test('V42 destroy receipts include summoned units and never turn an ordinary surviving hit into a break',()=>{
 const s={...battle(),lane:1,threats:[{id:900,kind:'minion',lane:1,fromLane:1,hp:2,maxHp:2,ticks:25,duration:32,damage:10}],pendingShots:[incoming(battle(),{target:'threat',targetIndex:900,lane:1,damage:10,attackStyle:'pulse'})]};const n=tick(s);assert.ok(n.feedback.some(f=>f.destroyed));const alive=tick({...s,threats:s.threats.map(t=>({...t,hp:50,maxHp:50}))});assert.ok(alive.feedback.every(f=>!f.destroyed));
});


test('V43 cold entry defers guardian music until late-road warmup',async()=>{
 const h=musicHarness();try{
  h.player.setScene({...h.scene(),warmBoss:false});await flushMusic();assert.deepEqual(h.requests.map(r=>r.id),['road']);
  const count=h.stats.started;h.player.setScene({...h.scene(),warmBoss:true});await flushMusic();assert.deepEqual(h.requests.map(r=>r.id),['road','boss-0']);assert.equal(h.stats.started,count);
  assert.equal(music.musicSceneFor({...initial(),status:'home'}).warmBoss,false);assert.equal(music.musicSceneFor({...initial(),status:'running',progress:65}).warmBoss,true);
 }finally{h.player.dispose();h.engine.dispose();h.restore();}
});
test('V43 higher enemy cadence preserves telegraphs, first recovery and each guardian identity',()=>{
 const v=load('encounterV43'),skills=load('bossSkills');
 for(let level=0;level<5;level++){
  const s={...battle(level),bossCycle:0};assert.equal(v.recoveryScaleV43(1,0),1);
  assert.ok(sim.bossRecoveryTicks({...s,bossCycle:2,bossStage:2})<sim.bossRecoveryTicks({...s,bossCycle:2,bossStage:1}));
  assert.ok(sim.bossRecoveryTicks({...s,bossCycle:2,bossStage:2})>=17);
  const one=Array.from({length:6},(_,i)=>v.bossMoveV43(level,1,i+1)),two=Array.from({length:6},(_,i)=>v.bossMoveV43(level,2,i+1));assert.notDeepEqual(one,two);
  assert.ok(two.every(k=>skills.BOSS_LOADOUTS[level].includes(k)));assert.ok(two.every((k,i)=>k!==two[(i+5)%6]));
  assert.equal(sim.bossWarningTicks({...s,bossAttack:skills.BOSS_LOADOUTS[level][0]}),20);
 }
 for(const profile of Object.values(load('frontline').ELITE_ATTACKS))assert.ok(v.eliteRearmV43(profile.rearm)<profile.rearm);
});
test('V43 asset phases leave boss and battle sheets out of home entry and warm only the active encounter',()=>{
 const v=load('encounterV43');assert.deepEqual(v.assetStageV43('home',0,false,false),{home:true,workshop:false,story:false,road:false,combat:false,boss:false,result:false});
 assert.equal(v.assetStageV43('running',64,false,false).boss,false);assert.equal(v.assetStageV43('running',65,false,false).boss,true);assert.equal(v.assetStageV43('battle',0,false,false).boss,true);
 assert.equal(v.crowdV43({...initial(),enemyAttacks:Array(5).fill({}),pendingShots:[]}),true);
});
test('V43 lossless migration keeps every runtime counterpart and removes only enumerated unused assets',()=>{
 const root=path.resolve(__dirname,'../../../public/games/toybot-breakout/optimized');assert.equal(migrationV43.converted.length,76);
 for(const row of migrationV43.converted){assert.equal(fs.existsSync(path.join(root,row.from)),false);const buffer=fs.readFileSync(path.join(root,row.to));assert.ok(imageInfo(buffer).width>0);assert.equal(buffer.length,row.after);assert.ok(row.after<row.before);}
 for(const row of migrationV43.deletedUnused)assert.equal(fs.existsSync(path.join(root,row.file)),false);
 assert.ok(migrationV43.savedBytes>24*1048576);
});
