import { CREW_LIST_V45 } from './crewV45';
import { CareerV44, ResultGradeV44, PilotFeedbackV44 } from './ReplayUIV44';
import { recordMasteryV44, coatingUnlockedV44, type CoatingV44 } from './replayV44';
import './finishV44.css';
import { assetStageV43, crowdV43 } from './encounterV43';
import { strongFeedbackV42 } from './polishV42';
import { enemyVisibleV41 } from './flowV41';
import { BuildLogV41, BuildReportV41, LessonCueV41 } from './FlowUIV41';
import { normalizeGarage } from './progression';
import { TrialPickerV40, TacticalHudV40, TacticalResultV40, TrialBadgeV40 } from './TacticalUIV40';
import { recordTrialV40, SECTOR_MECHS } from './tacticsV40';
import { SortieSelectorV39, SortieHudV39 } from './SortieSelectorV39';
import { findSortieV39, recordSortieV39, runProgressV39, sortieCountV39, sortieGoalV39, gateVisibleV39 } from './sortiesV39';
import './sortiesV39.css';
import { PART_DAMAGE_V38 } from './partDamageV38';
import { RoadWorldV37 } from './RoadWorldV37';
import { ROAD_TILES_V37 } from './roadMotionV37';
import './roadWorldV37.css';
import { ARENA_ART_V36, EMPEROR_ART_V36 } from './arenaMotionV36';
import { BossMountedParts } from './OperationsLayer';
import './arenaV36.css';
import { BLADE_ATTACK_V35 } from './bladeMotionV35';
import { CORE_FX_V34, coreMuzzlesV34, signatureShotV34 } from './signatureV34';
import './signatureV34.css';
import './pulseVfxV33.css';
import { readableCoreImpacts } from './skillPresentationV32';
import './skillClarityV32.css';
import { BOSS_MOTION_V31, ENEMY_MOTION_V31 } from './hostileMotionV31';
import './hostileV31.css';
import { REFERENCE_LOGO, FURNACE_ART, bossPixels } from './referenceCamera';
import './referenceV29.css';
import { ArtDetails, BattleWear } from './ArtDetails';
import { RUN_ART, MOTION_ART, MATERIAL_ART, PROP_ART, PORTRAIT_ART, equipmentCell, motionTier, atlasCell } from './visualArt';
import './artV28.css';
import { ELITE_ATTACKS, roadEnemyName, frontlineStage, type ElitePattern } from './frontline';
import { coreVisualShots } from './awakening';
import { Cockpit, CoreBurstScreen, COCKPIT_ART, CORE_EFFECT_ART } from './Cockpit';
import { ExperienceLayer, RunAnalysis } from './ExperienceLayer';
import { useSceneMotion } from './useSceneMotion';
import OperationsLayer, { OperationsHud, ChallengePicker, FusionSprite, OperationSprite } from './OperationsLayer';
import { ART_V19, FUSION_ART_V19 } from './operations';
import PlayerSettingsPanel from './PlayerSettingsPanel';
import StoryDialog from './StoryDialog';
import CampaignStory, { StoryRadio, StoryRelay, StoryMission } from './CampaignStory';
import DefenseVfx from './DefenseVfx';
import MenuIcon from './MenuIcon';
import { DEFENSE_ART } from './defenseArt';
import { campaignReducer, createCampaign, CHAPTER_FILMS, RELAY_ART, type CampaignState } from './campaign';
import { readStoryProgress, saveStoryProgress, finishStory, STORY_CHAPTERS } from './story';
import { readSettings, saveSettings, resolveQuality } from './settings';
import { RunGoals } from './RunGoals';
import { rewardLedger, nextUpgrade } from './playability';
import { musicSceneFor } from './music';
import { createGameAudio, gameSoundEvents, soundPan } from './audio';
import { advanceDrag, canStartPointerGesture } from './interaction';
import { preloadImages, retainImagePreloads } from './loading';
import { clearTrainingCheckpoint } from './training';
import Tutorial from './Tutorial';
import { MECH_CLASSES, coreSkill, mechSpec, type MechClass } from './mechs';
import './interface.css';
import './mechs.css';
import './polish.css';
import './enemies.css';
import './bossCombat.css';
import './menus.css';
import './combatFeel.css';
import './operations.css';
import './motion.css';
import './experience.css';
import './cockpit.css';
import './awakening.css';
import './frontline.css';
import { hazardMaxHpFor, gateChoicesFor, guardSourceFor, commanderFor, eliteRoleName, COMBO_WINDOW_TICKS } from './simulation';
import { OBJECTIVE_NAMES, SPECIAL_LABELS } from './bossSkills';
import React, { useEffect, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MAP_ART, BOSS_ART, BOSS_DEFEAT_ART, GATE_ART, THREAT_ART, UI_HANGAR_ART, UI_RESULT_CRESTS, UI_MENU_ART, UI_MENU_ICONS, BLADE_SLASH_ART, BOSS_OBJECTIVE_ART } from './art';
import { hazardArmorFor } from './simulation';
import { getLevel, LEVELS, hazardLaneAt } from './level';
import { createInitialState, bossHealthFor, effectiveWeapon, bossPhase, bossY, gateEffectDetail, LANE_CENTERS, STEP_MS, RUN_SPEED, laneXAt, targetY, gateGroundY, GATE_CONTACT_Y, isActiveStatus, canMove, canShoot, isBossArena, bossEnrage, bossX, rushProgress, isRush, attackIntervalFor, bossAttackLabel, enemyThreatX, enemyThreatY, playerFormation, bossGuarded, roadEnemyY, roadEnemyX, targetX as targetWorldX } from './simulation';
import { purchaseUpgrade, readGarage, saveGarage, toggleUpgrade, upgradeCost, UPGRADES, moduleLevel, garageStats, previewUpgrade, equipAllUpgrades, MODULE_MAX_LEVEL, canEnterLevel, recordLevelCompletion, type Garage, type UpgradeId } from './progression';

import './playability.css';
import './clarityV43.css';

const depthForPulse=(shot:import('./simulation').PendingShot)=>Math.round((shot.origins[0].y+(shot.y-shot.origins[0].y)*(1-shot.ticks/shot.duration)+6)*10)+3;
function ProjectileArt({ level, heavy = false }: { level: number; heavy?: boolean }) {
  if (heavy) level = Math.max(1, level);
  if (level <= 0) return <span className="toybot-reference-bolt" aria-hidden="true"/>;
  return <span className="toybot-projectile-ai" style={{ backgroundPositionY: ((Math.min(4, level) - 1) * 100 / 3) + '%' }} aria-hidden="true" />;
}

function Robot({ awakened=false, index, small = false, enemy = false, firing = false, weaponPhase = 0, bossArt = BOSS_ART, weaponLevel = 0, armorLevel = 0, coreLevel = 0, mechClass = 'pulse', motionFrame = 0, attacking = false, combat = false, dodging = false, dodgeDirection = -1, bossColumns = 4 }: { awakened?:boolean; combat?: boolean; dodging?: boolean; dodgeDirection?: number; bossColumns?: number; mechClass?: MechClass; motionFrame?: number; attacking?: boolean; index: number; small?: boolean; enemy?: boolean; firing?: boolean; weaponPhase?: number; bossArt?: string; weaponLevel?: number; armorLevel?: number; coreLevel?: number }) {
  if (enemy&&bossArt===FURNACE_ART) return <div className="robot-boss-sprite" style={{backgroundImage:`url(${FURNACE_ART})`,backgroundSize:'400% 200%',backgroundPosition:atlasCell(weaponPhase%4,Math.floor(weaponPhase/4),4,2)}} aria-hidden="true"/>;
  if (enemy) return <div className="robot-boss-sprite" style={{ backgroundImage: `url(${bossArt})`, backgroundSize:(bossColumns*100)+'% 500%', backgroundPosition: (weaponPhase * 100 / (bossColumns-1)) + '% ' + (index * 25) + '%' }} aria-hidden="true" />;

  const tier=awakened?4:motionTier(weaponLevel,armorLevel,coreLevel),row=tier+(combat?(dodging?3:attacking?2:1):0);
  return <div className={`robot-player-art toybot-v28-mech class-${mechClass}${awakened?' is-reference-awakened':''}${small?' robot-small':''}${firing?' is-firing':''}`} style={{'--art-mirror':combat&&dodging&&dodgeDirection<0?-1:1} as React.CSSProperties} aria-hidden="true">
    <span className="toybot-v28-footdust"/>
    <span className="toybot-v28-body" style={{backgroundImage:`url(${MOTION_ART[mechClass]})`,backgroundPosition:atlasCell(motionFrame,row)}}/>

  </div>;
}

function MechShowcase({ weapon, armor, core, className = '', mechClass }: { mechClass: MechClass; weapon: boolean; armor: boolean; core: boolean; className?: string }) {
  return <div className={`toybot-mech-showcase class-${mechClass}${weapon?' has-weapon':''}${armor?' has-armor':''}${core?' has-core':''} ${className}`} aria-hidden="true"><span className="toybot-v28-portrait" style={{backgroundImage:`url(${PORTRAIT_ART})`,backgroundPosition:equipmentCell(mechClass,weapon,armor,core)}}/></div>;
}

function GarageWorkshop({ career,garage, onUnlock, onToggle, onBack, onSelectMech, onEquipAll,recommended }: { career?:React.ReactNode;recommended?:UpgradeId; onEquipAll: () => void; onSelectMech: (id: MechClass) => void; garage: Garage; onUnlock: (id: UpgradeId) => void; onToggle: (id: UpgradeId) => void; onBack: () => void }) {
  const stats = garageStats(garage);
  const equippedCount = UPGRADES.filter(u => garage.equipped[u.id]).length;
  const formatDamage = (n: number) => Number(n.toFixed(2)).toString();
  return <div className="toybot-workshop garage-v2" role="region" aria-label="机库改装">
    <div className="toybot-workshop-top"><button type="button" className="toybot-workshop-back" onClick={onBack}>‹ 返回首页</button><span className="toybot-workshop-parts" aria-live="polite">◈ {garage.parts} 零件</span></div>
    <div className="toybot-workshop-title"><small>LOADOUT / ENGINEERING</small><h2 id="toybot-workshop-title">机库改装</h2><p>零件升级 · 三种机型通用 · 固定单机甲开局</p></div>
    <div className="toybot-mech-picker" role="group" aria-label="选择出击机型">{MECH_CLASSES.map(m => <button key={m.id} type="button" aria-pressed={garage.mechClass === m.id} onClick={() => onSelectMech(m.id)}><small>{m.role}</small><strong>{m.name}</strong><span>{garageStats({ ...garage, mechClass: m.id }).interval / 10}秒 / {m.id === 'blade' ? '刀' : '发'}</span><em className="toybot-core-skill-label">{coreSkill(m.id).name}</em></button>)}</div>
    <div className="toybot-workshop-preview"><MechShowcase mechClass={garage.mechClass} weapon={stats.weapon > 0} armor={stats.armor > 0} core={stats.core > 0} className="toybot-workshop-mech" /><div className="toybot-workshop-loadout" aria-live="polite">{mechSpec(garage.mechClass).name} · 已装配 {equippedCount}/3 · 开局 1 台<span>武器 Lv.{stats.weapon} · 装甲 Lv.{stats.armor} · 动力核心 Lv.{stats.core}</span></div></div>
    <div className="toybot-garage-performance" aria-label="当前出击属性"><div><small>基础伤害</small><b>{formatDamage(stats.damage)}</b></div><div><small>攻击间隔</small><b>{stats.interval / 10}<em>秒</em></b></div><div><small>核心生命</small><b>{stats.maxHp}</b></div><div><small>初始装甲</small><b>{stats.armorPoints}</b></div></div>
    <p className="toybot-garage-gain">永久改装：伤害 +{Math.round((stats.damage / Math.round(mechSpec(garage.mechClass).power) - 1)*100)}% · 攻击间隔缩短 {Math.round((1-stats.interval/mechSpec(garage.mechClass).interval)*100)}%</p>
    <div className="toybot-workshop-section-label"><span>强化模块</span><button type="button" className="toybot-equip-all" onClick={onEquipAll} disabled={!UPGRADES.some(u => moduleLevel(garage,u.id) > 0 && !garage.equipped[u.id])}>一键装配</button></div>
    <div className="toybot-workshop-list">{UPGRADES.map(upgrade => {
      const level = moduleLevel(garage,upgrade.id), equipped = garage.equipped[upgrade.id], maxed = level >= MODULE_MAX_LEVEL;
      const cost = upgradeCost(garage,upgrade.id), affordable = garage.parts >= cost;
      const next = garageStats(previewUpgrade(garage,upgrade.id));
      const change = upgrade.id === 'armor' ? '生命 ' + stats.maxHp + ' → ' + next.maxHp + ' · 装甲 ' + stats.armorPoints + ' → ' + next.armorPoints : upgrade.id === 'weapon' ? '伤害 ' + formatDamage(stats.damage) + ' → ' + formatDamage(next.damage) : '伤害 ' + formatDamage(stats.damage) + ' → ' + formatDamage(next.damage) + ' · 间隔 ' + stats.interval / 10 + ' → ' + next.interval / 10 + '秒';
      return <div key={upgrade.id} className={'toybot-workshop-item item-' + upgrade.id + (equipped ? ' is-equipped' : '')+(recommended===upgrade.id?' is-recommended':'')}>
        <span className="toybot-workshop-icon" aria-hidden="true">{upgrade.id === 'weapon' && garage.mechClass === 'blade' ? <span className="toybot-blade-upgrade-icon" style={{ backgroundImage: 'url(' + BLADE_SLASH_ART + ')' }} /> : <OperationSprite cell={upgrade.id==='weapon'?1:upgrade.id==='armor'?2:0}/>}</span>
        <span className="toybot-workshop-copy"><em>{equipped ? '已装配' : level ? '已拥有 · 未装配' : '尚未研发'} / Lv.{level}/{MODULE_MAX_LEVEL}</em><strong>{upgrade.title}{recommended===upgrade.id&&<small className="garage-goal-badge">下一目标</small>}</strong><span className="toybot-module-levels" aria-hidden="true">{Array.from({length:MODULE_MAX_LEVEL},(_,i)=><i key={i} className={i<level?'filled':''}/>)}</span><small>{maxed ? upgrade.effect + ' · 已满级' : change}</small></span>
        <span className="toybot-workshop-actions">{maxed ? <span className="toybot-module-maxed">已满级</span> : <button type="button" className="toybot-workshop-action" disabled={!affordable} onClick={() => onUnlock(upgrade.id)} aria-label={upgrade.title + ' 升级至' + (level + 1) + '级，' + change + '，消耗' + cost + '零件'}><b>{level ? '升级' : '研发'} ◈{cost}</b>{!affordable && <small>还差 {cost-garage.parts}</small>}</button>}{level > 0 && <button type="button" className="toybot-workshop-action equip" aria-pressed={equipped} onClick={() => onToggle(upgrade.id)}>{equipped ? '卸下' : '装配'}</button>}</span>
      </div>;
    })}</div>
    {career}<p className="toybot-garage-note">升级后自动装配；卸下保留等级。改装在下一次出击生效，队友通过局内奖励招募。</p>
    <button type="button" className="toybot-primary toybot-workshop-done" onClick={onBack}>完成改装，准备出击 <span aria-hidden="true">›</span></button>
  </div>;
}

const ToybotBreakout: React.FC<{previewGarage?:Garage;previewFrozen?:boolean;previewState?:import('./simulation').GameState & {narrative?:CampaignState['narrative']}}> = ({previewState,previewFrozen=false,previewGarage}) => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(()=>previewState?{...readSettings(),quality:'high' as const,muted:true}:readSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const audio = useRef<ReturnType<typeof createGameAudio> | null>(null);
  const audioSettings = useRef(settings);
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const device=navigator as Navigator&{deviceMemory?:number;connection?:{saveData?:boolean}};
  const quality = resolveQuality(settings, navigator.hardwareConcurrency || 4, reducedMotion,device.deviceMemory??0,device.connection?.saveData??false);
  const [garage, setGarage] = useState<Garage>(()=>previewState&&previewGarage?normalizeGarage(previewGarage):readGarage());
  const [sortieChoice,setSortieChoice]=useState<string|null>(null);
  const [storyProgress,setStoryProgress]=useState(readStoryProgress);
  const [storyView,setStoryView]=useState<'comic'|'world'|null>(null);
  const storyWasOpen=useRef(storyView!==null);
  const [trainingMode, setTrainingMode] = useState<'first' | 'replay' | null>(null);
  const [garageOpen, setGarageOpen] = useState(false);
  const [earnedParts, setEarnedParts] = useState(0);
  const [garageGoal,setGarageGoal]=useState<UpgradeId|undefined>();
  const awardedRunId = useRef<number | null>(null);
  const initialState = useRef<CampaignState | null>(null);
  if (initialState.current === null) {initialState.current = createCampaign(previewState??createInitialState(garage));if(previewState)initialState.current.narrative=previewState.narrative??{...initialState.current.narrative,seen:['briefing','confrontation','aftermath','lore']};}
  const [game, dispatch] = useReducer(campaignReducer, initialState.current);
  const LEVEL = getLevel(game.levelIndex);
  const previousGame = useRef(game);
  const previousModules = useRef(UPGRADES.reduce((sum,u)=>sum+moduleLevel(garage,u.id),0));
  const sceneRef=useRef<HTMLDivElement>(null);
  useSceneMotion(sceneRef,game,(canShoot(game.status)||game.status==='boss-intro'||game.status==='boss-shift')&&!game.narrative.scene&&!previewFrozen&&game.finish.resumeTicks===0,quality==='low',reducedMotion);
  const dragStart = useRef<{
    pointerId: number;
    startX: number;
    startLane: number;
    currentLane: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    if (!isActiveStatus(game.status)||previewState&&previewFrozen) return undefined;
    const timer = window.setInterval(() => dispatch({ type: 'TICK' }), STEP_MS);
    return () => window.clearInterval(timer);
  }, [game.status,previewState,previewFrozen]);

  useEffect(() => {
    if (!game.toast) return undefined;
    const timer = window.setTimeout(() => dispatch({ type: 'CLEAR_TOAST' }), 2100);
    return () => window.clearTimeout(timer);
  }, [game.toast]);

  const campaignBlocking=!!game.narrative.scene;
  const lessonKey=game.flow.lessons.join('|');
  useEffect(()=>{
    if(previewState||!lessonKey)return;
    setGarage(current=>{
      const merged=[...new Set([...(current.enemyLessons??[]),...lessonKey.split('|')])];
      return merged.length===(current.enemyLessons??[]).length?current:normalizeGarage({...current,enemyLessons:merged});
    });
  },[lessonKey,previewState]);
  useEffect(()=>{dragStart.current=null;},[game.status,settings.dragSensitivity,campaignBlocking]);
  const resultReward=game.status==='result'?rewardLedger(game).total:0;
  useEffect(() => {
    if (previewState || game.status !== 'result' || awardedRunId.current === game.runId) return;
    awardedRunId.current = game.runId;
    const earned = resultReward;
    setEarnedParts(earned);
    setGarage((current) => {
      const updated = {
        ...recordTrialV40(recordSortieV39(recordLevelCompletion(current, { status:game.status, won:game.won, bossDefeated:game.bossDefeated, progress:game.progress, levelIndex:game.levelIndex,protocol:game.ops.protocol }),game),game),
        parts: current.parts + earned,
        runs: current.runs + 1,
        wins: current.wins + Number(game.won),
        bestScore: Math.max(current.bestScore, game.score),
      };
      return normalizeGarage(recordMasteryV44(updated,game));
    });
  }, [game.status, game.runId, game.score, game.won, game.levelIndex, game.bossDefeated, game.progress,game.ops.bonusParts,game.ops.protocol,resultReward,previewState,game]);

  useEffect(() => {if(!previewState)saveGarage(garage);}, [garage,previewState]);
  useEffect(()=>{if(!previewState)saveStoryProgress(storyProgress);},[storyProgress,previewState]);
  useEffect(()=>{
    if(storyWasOpen.current&&!storyView&&game.status==='home')document.querySelector<HTMLButtonElement>('.toybot-home-story-open')?.focus({preventScroll:true});
    storyWasOpen.current=storyView!==null;
  },[storyView,game.status]);
  useEffect(() => {
    const engine = createGameAudio(); audio.current = engine; engine.setSettings(audioSettings.current);
    return () => { engine.dispose(); if (audio.current === engine) audio.current = null; };
  }, []);
  useEffect(() => { audioSettings.current=settings; audio.current?.setSettings(settings); if(!previewState)saveSettings(settings); }, [settings,previewState]);
  const {track:musicId,paused:musicPaused,runId:musicRunId,levelIndex:musicLevel,volume:musicSceneVolume,warmBoss:musicWarmBoss}=musicSceneFor(game,!!game.narrative.scene);
  useEffect(() => { audio.current?.setMusic({track:musicId,paused:musicPaused,runId:musicRunId,levelIndex:musicLevel,volume:musicSceneVolume,warmBoss:musicWarmBoss}); }, [musicId,musicPaused,musicRunId,musicLevel,musicSceneVolume,musicWarmBoss]);
  useEffect(() => { for (const cue of gameSoundEvents(previousGame.current,game)) audio.current?.play(cue,soundPan(cue,game)); previousGame.current=game; }, [game]);
  useEffect(() => { const count=UPGRADES.reduce((sum,u)=>sum+moduleLevel(garage,u.id),0); if(count>previousModules.current)audio.current?.play('upgrade'); previousModules.current=count; },[garage]);
  useEffect(() => {
    const suspend = () => { dragStart.current=null; audio.current?.suspend(); if(isActiveStatus(game.status))dispatch({type:'PAUSE'}); };
    const visibility = () => { if(document.hidden)suspend(); };
    document.addEventListener('visibilitychange',visibility); window.addEventListener('blur',suspend); window.addEventListener('pagehide',suspend);
    return()=>{document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',suspend);window.removeEventListener('pagehide',suspend);};
  },[game.status]);
  const loadStage=assetStageV43(game.status,game.progress,garageOpen,!!storyView||!!game.narrative.scene);
  useEffect(retainImagePreloads,[]);
  useEffect(()=>{void preloadImages([REFERENCE_LOGO,PORTRAIT_ART],'high');},[]);
  useEffect(()=>{if(!loadStage.home)return;const timer=window.setTimeout(()=>{void preloadImages([MAP_ART[game.levelIndex],RUN_ART[game.mechClass]],'low');},800);return()=>window.clearTimeout(timer);},[loadStage.home,game.levelIndex,game.mechClass]);
  useEffect(()=>{if(loadStage.workshop)void preloadImages([UI_MENU_ICONS,ART_V19,FUSION_ART_V19],'low');},[loadStage.workshop]);
  useEffect(()=>{if(loadStage.story)void preloadImages([CHAPTER_FILMS[game.levelIndex],RELAY_ART,...CREW_LIST_V45.map(p=>p.art)]);},[loadStage.story,game.levelIndex]);
  useEffect(()=>{if(loadStage.combat)void preloadImages([ROAD_TILES_V37[game.levelIndex],RUN_ART[game.mechClass],MOTION_ART[game.mechClass],MATERIAL_ART,PROP_ART,COCKPIT_ART,...Object.values(DEFENSE_ART),CORE_FX_V34[game.mechClass]],'high');},[loadStage.combat,game.mechClass,game.levelIndex]);
  useEffect(()=>{if(loadStage.road)void preloadImages(Object.values(ENEMY_MOTION_V31));},[loadStage.road]);
  useEffect(()=>{if(loadStage.boss)void preloadImages([PART_DAMAGE_V38,ARENA_ART_V36[game.mechClass],...(game.mechClass==='blade'?[BLADE_ATTACK_V35]:[]),...(game.levelIndex===4?[EMPEROR_ART_V36]:[]),BOSS_MOTION_V31[game.levelIndex],BOSS_DEFEAT_ART,THREAT_ART,BOSS_OBJECTIVE_ART],'high');},[loadStage.boss,game.levelIndex,game.mechClass]);
  useEffect(()=>{if(loadStage.result)void preloadImages([UI_MENU_ART.victory,UI_MENU_ART.medal],'low');},[loadStage.result]);
  const openSettings=()=>{ if(isActiveStatus(game.status))dispatch({type:'PAUSE'}); setSettingsOpen(true); };

  const [coatingPreview,setCoatingPreview]=useState<CoatingV44|null>(null);
  const applyCoating=(id:CoatingV44)=>{setGarage(current=>coatingUnlockedV44(current.mastery??{},id)?normalizeGarage({...current,coating:id}):current);setCoatingPreview(null);};
  const unlock = (id: UpgradeId) => {setGarageGoal(undefined);setGarage((current) => purchaseUpgrade(current, id));};
  const toggleEquip = (id: UpgradeId) => setGarage((current) => toggleUpgrade(current, id));

  const restart = () => {
    setEarnedParts(0);
    dispatch({ type: 'RESTART', garage });
  };
  const start = () => {
    if (!garage.tutorialCompleted) { setTrainingMode('first'); return; }
    setCoatingPreview(null);setEarnedParts(0);
    if(sortieChoice&&findSortieV39(sortieChoice)?.level===game.levelIndex)dispatch({type:'START_SORTIE',key:sortieChoice,garage});else dispatch({ type: 'START', garage });
  };
  const goHome = () => {
    if(previewState)return;
    setEarnedParts(0);
    setGarageOpen(false);
    dispatch({ type: 'HOME', garage });
  };
  const openGarage = () => {
    // Review mode keeps every purchase and reward isolated from saved progress.
    const loadout=previewState&&game.status==='result'?{...garage,parts:garage.parts+resultReward}:garage;
    setGarageGoal(nextUpgrade(loadout,game)?.id);
    if(previewState&&game.status==='result')setGarage(loadout);
    if (game.status === 'result') dispatch({ type: 'HOME', garage:loadout });
    setGarageOpen(true);
  };

  const selectedSortie=sortieChoice&&findSortieV39(sortieChoice)?.level===game.levelIndex?findSortieV39(sortieChoice):undefined;
  const displayProgress=runProgressV39(game);
  const visibleBots = Math.min(game.bots, 11);
  const formationColumns = visibleBots <= 1 ? 1 : visibleBots <= 4 ? 2 : 3;
  const robotPositions = playerFormation(game);
  const nextGateProgress = LEVEL.gateMarks[game.gate];
  const gateApproach = nextGateProgress === undefined ? 0 : Math.max(0, Math.min(1, (game.progress - nextGateProgress + 12) / 14));
  const showRewardGates = gateVisibleV39(game,nextGateProgress);
  const gateOptions = gateChoicesFor(game);
  const visibleHazards = (game.status === 'running' || (game.status === 'paused' && game.resumeStatus === 'running')) ? LEVEL.hazards.flatMap((h, index) =>
    game.hazardHps[index] > 0 && enemyVisibleV41(game,h)
      ? [{ ...h,armor:hazardArmorFor(game,index), index, lane: hazardLaneAt(game.layoutIndex, index, game.progress, game.levelIndex), x: roadEnemyX(game, index), y: roadEnemyY(game, index), hp: game.hazardHps[index] }] : []) : [];
  const encounterProgress = LEVEL.encounters[game.encounter]?.progress;
  const bossTop = bossY(game);
  const arena = isBossArena(game);
  const displayStatus = game.status === 'paused' ? game.resumeStatus : game.status;
  const bossScale = arena ? 1.12 * (1 + rushProgress(game) * .25) : .95;
  const rushVisual = displayStatus === 'battle' && isRush(game) && (game.bossStep === 'warning' || game.bossStep === 'rush');
  const showEncounter = !game.sortie&&(displayStatus === 'running' || displayStatus === 'boss-victory' || (!game.bossDefeated && encounterProgress !== undefined && game.progress >= encounterProgress - 5));
  const encounterLabel = LEVEL.encounters[game.encounter]?.label ?? '轨道维修站';
  const activeWeapon = effectiveWeapon(game);
  const comboFeedback=[game.comboHeal>0?`维修 +${game.comboHeal}`:'',game.burstTicks===0?'能量加成':''].filter(Boolean).join(' · ')||'连击达成';
  const attackInterval = attackIntervalFor(game);
  const visualCore = Math.max(game.coreLevel, Math.min(4, game.garageCoreLevel));
  const attackActive = canShoot(displayStatus ?? 'home') && game.fireCooldown > attackInterval - 4;
  const motionFrame = Math.floor((game.progress / RUN_SPEED + game.battleTime) / 2) % 4;
  const bossHudMax=arena?game.battleMaxHp:bossHealthFor(game),bossHudHp=arena?game.battleHp:bossHudMax;
  const phase = bossPhase(game);
  const enrage = bossEnrage(game);
  const gateY = nextGateProgress === undefined ? 43 : gateGroundY(game.progress, nextGateProgress);
  const weaponPhase = !canShoot(displayStatus ?? 'home') ? 0
    : game.mechClass !== 'pulse' ? Math.min(3, Math.max(0, attackInterval - game.fireCooldown)) : game.fireCooldown === attackInterval ? 2 : game.fireCooldown === attackInterval - 1 ? 3 : game.fireCooldown === 1 ? 1 : 0;
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (campaignBlocking||!canMove(game.status)||!canStartPointerGesture(dragStart.current?.pointerId??null,event)) return;
    dragStart.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startLane: game.lane,
      currentLane: game.lane,
      moved: false,
    };
    try{event.currentTarget.setPointerCapture(event.pointerId);}catch{dragStart.current=null;}
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag=dragStart.current;if(!drag||drag.pointerId!==event.pointerId||campaignBlocking||!canMove(game.status))return;
    const next=advanceDrag({anchorX:drag.startX,lane:drag.currentLane,moved:drag.moved},event.clientX,event.currentTarget.getBoundingClientRect().width,settings.dragSensitivity??1);
    drag.startX=next.anchorX;drag.moved=next.moved;if(next.lane!==drag.currentLane){drag.currentLane=next.lane;dispatch({type:'MOVE_LANE',lane:next.lane});}
  };
  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStart.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.moved && !campaignBlocking && canMove(game.status)) {
      const bounds=event.currentTarget.getBoundingClientRect(); const position=(event.clientX-bounds.left)/bounds.width;
      dispatch({type:'MOVE_LANE',lane:position<.385?0:position>.615?2:1});
    }
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    dragStart.current = null;
  };
  const handlePointerCancel = () => { dragStart.current = null; };

  const handleSceneKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if(event.code==='Space'){event.preventDefault();if(!event.repeat)dispatch({type:'ACTIVATE_BURST'});return;}
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    dispatch({ type: 'MOVE_LANE', lane: (game.queuedLane??game.lane) + (event.key === 'ArrowLeft' ? -1 : 1) });
  };

  return (
    <main className={'toybot-page quality-' + quality} onPointerDownCapture={() => audio.current?.unlock()} onKeyDownCapture={() => audio.current?.unlock()}>
      <style>{`
        .toybot-page{min-height:100svh;display:flex;justify-content:center;align-items:center;padding:18px;background:radial-gradient(ellipse at 50% 0%,#d8ad67 0,#415c70 42%,#101c2e 100%);font-family:ui-rounded,'Trebuchet MS',system-ui,sans-serif;color:#e6f0ec}
        .toybot-shell{position:relative;width:min(100%,430px);height:min(850px,calc(100svh - 36px));min-height:620px;overflow:hidden;border:5px solid #d7e1db;border-radius:32px;background:#142c3d;box-shadow:0 24px 70px #071321b8;isolation:isolate}
        .toybot-top{position:absolute;z-index:4;inset:0 0 auto;padding:18px 18px 0;display:flex;justify-content:space-between;align-items:center;pointer-events:none}
        .toybot-top>*{pointer-events:auto}
        .toybot-brand{font-size:12px;font-weight:1000;letter-spacing:.14em;color:#e5f1e9;text-shadow:0 2px 5px #15334d}
        .toybot-back,.toybot-pause{min-height:40px;border:0;border-radius:999px;background:#e5eee7;color:#203b4d;font-weight:900;box-shadow:0 3px 0 #7894a0;padding:9px 13px;cursor:pointer;touch-action:manipulation}
        .toybot-pause:disabled{opacity:.58;cursor:default}
        .toybot-back{position:absolute;left:16px;top:56px;font-size:12px}
        .toybot-stats{position:absolute;z-index:4;top:55px;left:50%;transform:translateX(-50%);display:flex;gap:9px;width:max-content}
        .toybot-pill{min-width:82px;text-align:center;background:#e7eee6;border:2px solid #fff;border-radius:16px;padding:7px 11px;box-shadow:0 4px 0 #7894a0}
        .toybot-pill small{display:block;font-size:9px;letter-spacing:.12em;font-weight:900;color:#71888b}
        .toybot-pill b{font-size:19px;line-height:1.05;color:#294c5d}
        .toybot-scene{position:absolute;inset:0;overflow:hidden;background:linear-gradient(#9fc9d2 0%,#5d7e83 34%,#263e4c 100%);touch-action:none;user-select:none;cursor:grab}
        .toybot-scene:active{cursor:grabbing}
        .toybot-sun{position:absolute;width:90px;height:90px;right:11%;top:16%;border-radius:50%;background:#ffe29a;box-shadow:0 0 0 14px #ffe69035,0 0 38px #ffe7a066}
        .toybot-cloud{position:absolute;width:76px;height:20px;border-radius:30px;background:#e1efeb;opacity:.68;top:27%;left:7%;box-shadow:19px -9px 0 -2px #e1efeb,36px 0 0 -4px #e1efeb;animation:toybot-float 7s ease-in-out infinite alternate}
        .toybot-cloud.c2{top:37%;left:auto;right:5%;transform:scale(.72);animation-delay:-3s}
        .toybot-hills{position:absolute;inset:39% -12% auto;height:27%;background:radial-gradient(ellipse at 19% 100%,#497b78 0 30%,transparent 31%),radial-gradient(ellipse at 76% 100%,#3e6870 0 32%,transparent 33%)}
        .toybot-road{position:absolute;left:9%;right:9%;top:32%;bottom:-12%;clip-path:polygon(31% 0,69% 0,100% 100%,0 100%);background:linear-gradient(90deg,#1a3445 0 4%,#f1c86a 4% 5.5%,#516777 5.5% 94.5%,#f1c86a 94.5% 96%,#192f40 96%);box-shadow:inset 0 0 0 5px #c8dfd8}
        .toybot-road:before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(180deg,transparent 0 49px,#e5efcf 50px 56px,transparent 57px 107px);opacity:.45;animation:toybot-road 1.3s linear infinite}
        .toybot-road:after{content:'';position:absolute;inset:0;background-image:repeating-linear-gradient(180deg,#c3e8d8 0 22px,transparent 22px 48px),repeating-linear-gradient(180deg,#c3e8d8 0 22px,transparent 22px 48px);background-size:2px 48px,2px 48px;background-position:33.333% 0,66.666% 24px;background-repeat:repeat-y;opacity:.7}
        .toybot-factory{position:absolute;top:31%;width:20%;height:11%;border:4px solid #73919a;border-radius:10px 10px 4px 4px;background:linear-gradient(90deg,#29485c,#9b704f);box-shadow:0 7px 0 #263f50}
        .toybot-factory:before{content:'';position:absolute;left:12%;top:-23%;width:23%;height:25%;border-radius:5px 5px 0 0;background:#ef8660;box-shadow:22px -7px 0 -4px #81d6cb,46px 1px 0 -2px #f2bb62}
        .toybot-factory.left{left:2%;transform:scale(.82)}.toybot-factory.right{right:1%;transform:scale(.9)}
        .toybot-lane{position:absolute;inset:0;z-index:1}
        .toybot-selected-lane{position:absolute;top:64%;bottom:16%;width:13%;border:0;background:transparent;box-shadow:none;transform:translateX(-50%);transition:left .08s linear;pointer-events:none}
        .toybot-gate-hint{position:absolute;z-index:4;top:25%;left:50%;transform:translateX(-50%);width:max-content;max-width:88%;padding:6px 10px;border:1px solid #b9e7f188;border-radius:8px;background:#101c29e8;color:#e8f8ff;font-size:10px;font-weight:900;text-align:center;box-shadow:0 3px 12px #02071099;pointer-events:none}
        .toybot-gate-door{position:absolute;z-index:4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;width:clamp(37px,11.8%,50px);height:78px;padding:4px 2px;transform:translate(-50%,-50%) scale(var(--gate-scale,.8));transform-origin:center bottom;border-radius:15px 15px 5px 5px;background:linear-gradient(180deg,#142633ee,#101923e8 78%,#070d14);text-align:center;box-shadow:0 0 14px currentColor,inset 0 0 16px currentColor;transition:top .1s linear,filter .12s,transform .12s,opacity .16s;pointer-events:none}
        .toybot-gate-door:before{content:'';position:absolute;inset:-5px -4px 0;border:2px solid currentColor;border-bottom:0;border-radius:18px 18px 0 0;box-shadow:inset 0 10px 12px currentColor;opacity:.9}
        .toybot-gate-door.reward{color:#8cefff;border-color:#8cefff}
        .toybot-gate-door.penalty{color:#ff8b79;border-color:#ff8b79}
        .toybot-gate-door.active-lane{filter:brightness(1.35);box-shadow:0 0 22px currentColor,inset 0 0 18px currentColor}
        .toybot-gate-door.resolved{opacity:.55;filter:brightness(1.2)}
        .toybot-gate-door small,.toybot-gate-door strong,.toybot-gate-door b{position:relative;z-index:1;display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-shadow:0 0 6px currentColor}
        .toybot-gate-door small{font-size:6px;line-height:1.1;font-weight:1000;letter-spacing:.06em}
        .toybot-gate-door small:last-child{display:-webkit-box;white-space:normal;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-height:1.05}
        .toybot-gate-door b{font-size:14px;line-height:1.1;color:#fff}
        .toybot-gate-door strong{font-size:7px;line-height:1.2;font-weight:1000}
        .robot{display:block;width:100%;height:auto}
        .robot-small{width:31px;flex:0 0 auto}
        .toybot-scene.formation-1{--squad-size:52px}
        .toybot-scene.formation-2{--squad-size:clamp(34px,10vw,44px)}
        .toybot-scene.formation-3{--squad-size:clamp(24px,7.4vw,32px)}
        .toybot-robot{position:absolute;width:var(--squad-size,44px);transform:translate(-50%,-50%);filter:drop-shadow(0 5px 3px #234c3b44);transition:left .09s ease-out,top .16s ease-out}
        .toybot-robot.lead{z-index:2;animation:toybot-bob .65s ease-in-out infinite alternate}
        .toybot-obstacle{position:absolute;z-index:2;left:50%;width:66px;transform:translate(-50%,-50%) scale(var(--boss-scale,1));transform-origin:center;filter:drop-shadow(0 7px 3px #1026378c);animation:toybot-bob .8s ease-in-out infinite alternate;transition:top .1s linear}
        .toybot-obstacle.boss{width:118px}
        .toybot-obstacle .robot-art{display:block;width:100%;height:auto;filter:drop-shadow(0 0 10px #ff705f80)}
        .robot-enemy{filter:drop-shadow(0 0 10px #ff705f80)}
        .toybot-hazard{position:absolute;z-index:3;transform:translate(-50%,-50%) scale(var(--hazard-scale,1));transform-origin:center;display:flex;flex-direction:column;align-items:center;gap:3px;filter:drop-shadow(0 4px 3px #754f394c);animation:toybot-hazard-alert .55s ease-in-out infinite alternate;transition:left .1s linear,top .1s linear}
        .toybot-hazard-icon{display:grid;place-items:center;width:46px;height:46px;border:4px solid #fff8e8;border-radius:15px;background:linear-gradient(145deg,#ffb34e,#ed674e);font-size:25px;box-shadow:0 4px 0 #b95045}
        .toybot-hazard-art{display:block;width:64px;height:64px;object-fit:contain;filter:drop-shadow(0 0 8px #ff9b45)}
        .toybot-hazard small{padding:3px 7px;border-radius:99px;background:#9c403c;color:#fff;font-size:9px;font-weight:1000;white-space:nowrap}
        .toybot-beam{position:absolute;z-index:2;left:49%;top:56%;width:2%;height:21%;border-radius:99px;background:linear-gradient(180deg,#fff8bd,#4df2d6aa,transparent);box-shadow:0 0 16px #76ffe2;transform-origin:top;animation:toybot-zap .32s ease-in-out infinite alternate}
        .toybot-shot{position:absolute;z-index:3;top:59%;left:var(--shot-lane-center);width:11px;height:20px;border:2px solid #eaffc3;border-radius:99px;background:linear-gradient(#fff,#63f3d1 55%,#20a9ff);box-shadow:0 0 13px #72ffe0;transform:translate(calc(-50% + var(--shot-offset, 0px)),-50%);pointer-events:none;animation:toybot-shot .48s cubic-bezier(.2,.65,.35,1) var(--shot-delay,0s) both}
        .toybot-shot:before{content:'';position:absolute;z-index:-1;left:20%;right:20%;top:68%;height:24px;border-radius:100%;background:linear-gradient(180deg,#cfffffbb,#48dfff66,transparent);filter:blur(2px)}
        .toybot-shot.weapon-powered{width:15px;height:28px;border-width:2px;background:linear-gradient(#fff,#c9ffff 25%,#55eaff 62%,#1688e9);box-shadow:0 0 18px #72efff,0 0 5px #fff;animation-duration:.44s}
        .toybot-shot.weapon-heavy{width:19px;height:34px;border-color:#fff;background:linear-gradient(#fff,#fff 18%,#a5fbff 40%,#328dff);box-shadow:0 0 24px #52eaff,0 0 8px #fff;animation-duration:.40s}
        .toybot-shot.weapon-overdrive{filter:saturate(1.45);box-shadow:0 0 30px #52eaff,0 0 12px #fff;animation-duration:.37s}
        .toybot-shot.weapon-ultimate{width:23px;height:40px;border-color:#fff;background:linear-gradient(#fff,#fff 20%,#b7ffff 45%,#866bff);box-shadow:0 0 30px #65efff,0 0 12px #bda8ff;animation-duration:.34s}
        .toybot-hazard-hp{width:48px;height:5px;border-radius:99px;background:#552e38;overflow:hidden;box-shadow:0 1px 3px #493a3480}
        .toybot-hazard-hp span{display:block;height:100%;background:linear-gradient(90deg,#ffe47a,#ff635a);transition:width .12s linear}
        .toybot-battle-banner{position:absolute;z-index:4;top:31%;left:50%;transform:translateX(-50%);width:min(74%,285px);padding:10px 14px 12px;border:2px solid #fff;border-radius:17px;background:#275b66e8;color:#fff;text-align:center;box-shadow:0 5px 0 #214b50}
        .toybot-battle-banner strong{display:block;font-size:14px;letter-spacing:.04em}
        .toybot-battle-banner small{display:block;margin-top:3px;color:#d4f4e1;font-size:10px;font-weight:800}
        .toybot-battle-meter{height:7px;margin-top:8px;border-radius:99px;background:#ffffff55;overflow:hidden}
        .toybot-battle-meter span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#ff806b,#ffe17a);transition:width .1s linear}
        .toybot-road-label{position:absolute;z-index:2;top:43%;left:50%;transform:translateX(-50%);font-size:10px;font-weight:1000;letter-spacing:.12em;color:#fff9df;text-shadow:0 2px 3px #557b6c;white-space:nowrap}
        .toybot-approach-banner{position:absolute;z-index:4;top:25%;left:50%;transform:translateX(-50%);width:min(74%,285px);padding:7px 11px 9px;border:1px solid #d9faff;border-radius:13px;background:#173b4de8;color:#fff;text-align:center;box-shadow:0 3px 0 #15313d}
        .toybot-approach-banner strong{display:block;font-size:12px}
        .toybot-approach-banner small{display:block;margin-top:2px;color:#d4f4e1;font-size:9px;font-weight:800}
        .toybot-approach-meter{height:5px;margin-top:6px;border-radius:99px;background:#ffffff55;overflow:hidden}
        .toybot-approach-meter span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#ff806b,#ffe17a);transition:width .1s linear}
        .toybot-meter{position:absolute;z-index:4;left:20px;right:20px;top:111px;height:9px;border-radius:10px;background:#ffffffa8;box-shadow:0 2px 0 #78a896;overflow:hidden}
        .toybot-meter>span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#37c9b4,#74da78);transition:width .12s linear}
        .toybot-bottom{position:absolute;z-index:4;left:16px;right:16px;bottom:16px;text-align:center}
        .toybot-toast{min-height:29px;color:#fffdf0;font-size:13px;font-weight:1000;text-shadow:0 2px 4px #315e54;margin-bottom:5px}
        .toybot-toast:not(:empty){animation:toybot-toast-in .22s ease-out both}
        .toybot-squad-card{display:flex;align-items:center;justify-content:space-between;padding:11px 15px;border:3px solid #fff;border-radius:19px;background:#fff8e8;box-shadow:0 5px 0 #aac9bd;text-align:left}
        .toybot-squad-card small{display:block;font-size:9px;letter-spacing:.13em;color:#70888a;font-weight:1000}
        .toybot-squad-card strong{font-size:27px;color:#294c5d;line-height:1.1}
        .toybot-count-pop{display:inline-block;animation:toybot-count-pop .3s ease-out both}
        .toybot-squad-avatars{display:flex;align-items:center}
        .toybot-lane-controls{display:flex;gap:4px;align-items:center;margin-left:auto;margin-right:7px;padding:3px;border:1px solid #d5e2cf;border-radius:12px;background:#f0f4e8}
        .toybot-lane-controls button{width:25px;height:25px;padding:0;border:0;border-radius:8px;background:transparent;color:#71888a;font-size:10px;font-weight:1000;cursor:pointer;touch-action:manipulation}
        .toybot-lane-controls button[aria-pressed="true"]{background:#34bca8;color:#fff;box-shadow:0 2px 0 #248d83}
        .toybot-lane-controls button:focus-visible{outline:2px solid #315363;outline-offset:2px}
        .toybot-squad-avatars .robot-small{width:27px;margin-left:-7px}
        .toybot-squad-avatars .robot-small:first-child{margin-left:0}
        .toybot-footer{margin-top:9px;font-size:10px;color:#fffdf0;font-weight:900;text-shadow:0 1px 3px #456e5e}
        .toybot-choice{position:absolute;z-index:6;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:24px;background:#193c4585;backdrop-filter:blur(4px);text-align:center}
        .toybot-choice h2{margin:0 0 7px;color:white;font-size:25px;text-shadow:0 3px #315562}
        .toybot-choice p{margin:0 0 20px;color:#f7f2d9;font-size:13px;font-weight:800}
        .toybot-gates{display:flex;gap:12px;width:min(100%,340px)}
        .toybot-gate{flex:1;min-height:135px;border:4px solid #fff;border-radius:22px;color:#fff;cursor:pointer;touch-action:manipulation;box-shadow:0 7px 0 #234e59;transition:transform .12s,filter .12s}
        .toybot-gate:hover{transform:translateY(-4px);filter:brightness(1.08)}
        .toybot-gate:active{transform:translateY(2px);box-shadow:0 3px 0 #234e59}
        .toybot-gate:focus-visible,.toybot-primary:focus-visible,.toybot-pause:focus-visible,.toybot-back:focus-visible{outline:3px solid #fff;outline-offset:3px}
        .toybot-gate small{display:block;font-size:11px;font-weight:1000;letter-spacing:.1em}
        .toybot-gate strong{display:block;font-size:40px;line-height:1.25}
        .toybot-gate.good{background:linear-gradient(150deg,#21bca7,#138a91)}
        .toybot-gate.risky{background:linear-gradient(150deg,#ffb946,#ec785b)}
        .toybot-overlay{position:absolute;z-index:7;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:26px;background:#173b49c9;backdrop-filter:blur(6px);text-align:center;color:#fff}
        .toybot-result-icon{font-size:72px;line-height:1;filter:drop-shadow(0 6px 0 #244b56)}
        .toybot-result-mech{display:block;width:92px;height:116px;margin:-15px auto -2px;object-fit:contain;filter:drop-shadow(0 5px 8px #0008)}
        .toybot-overlay h2{font-size:32px;margin:15px 0 5px}
        .toybot-overlay p{font-size:14px;color:#d9f0dc;margin:4px 0}
        .toybot-result-score{font-size:48px;font-weight:1000;color:#ffe17a;margin:13px 0}
        .toybot-primary{border:0;border-radius:15px;padding:13px 24px;margin-top:15px;background:#ffe17a;color:#38535a;font-weight:1000;font-size:15px;cursor:pointer;box-shadow:0 5px 0 #c59244}
        .toybot-primary:active{transform:translateY(3px);box-shadow:0 2px 0 #c59244}
        .toybot-paused{z-index:8}
        /* Cold cinematic mech battlefield */
        .toybot-page{background:radial-gradient(ellipse at 50% 8%,#465e70 0,#1c2a39 48%,#090f19 100%);font-family:Inter,'Arial Narrow',system-ui,sans-serif;color:#e8f4fa}
        .toybot-shell{border:1px solid #90aab766;border-radius:22px;background:#0c1521;box-shadow:0 28px 90px #030812e8,0 0 0 4px #152638}
        .toybot-scene{background:#172633}
        .toybot-scene img{pointer-events:none;user-select:none;-webkit-user-drag:none}
        .toybot-scene-background{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:fill;object-position:center;pointer-events:none}
        .toybot-scene:before{content:'';position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,#12243b18 0%,transparent 35%,#06111b0d 78%,#06111b4d 100%)}
        .toybot-track-guides{position:absolute;z-index:1;inset:34% 0 0;pointer-events:none;overflow:hidden;opacity:0;mask-image:linear-gradient(180deg,transparent,#000 20%)}
        .toybot-scene.is-moving .toybot-track-guides{opacity:.45}
        .toybot-track-guides:before,.toybot-track-guides:after{content:'';position:absolute;top:0;height:115%;width:3px;border-radius:4px;background:repeating-linear-gradient(180deg,#e5ffffcc 0 22px,#71dcf488 22px 33px,transparent 33px 78px);box-shadow:0 0 7px #87e8ff88;transform-origin:top center}
        .toybot-track-guides:before{left:39%;transform:rotate(9deg)}
        .toybot-track-guides:after{left:61%;transform:rotate(-9deg)}
        .toybot-scene.is-moving .toybot-track-guides:before,.toybot-scene.is-moving .toybot-track-guides:after{animation:toybot-road-rush .55s linear infinite}
        .toybot-road-flow{position:absolute;z-index:1;inset:39% 8% 0;pointer-events:none;opacity:0;clip-path:polygon(34% 0,66% 0,100% 100%,0 100%);background:repeating-linear-gradient(180deg,transparent 0 78px,#d7f6ff3d 80px 82px,transparent 84px 138px)}
        .toybot-scene.is-moving .toybot-road-flow{opacity:.5;animation:toybot-road-flow .7s linear infinite}
        .toybot-selected-lane{top:45%;bottom:12%;width:21%;border:0;background:linear-gradient(90deg,transparent,#72e4ff0c 50%,transparent);box-shadow:none}
        .toybot-sun,.toybot-cloud,.toybot-hills,.toybot-factory,.toybot-road{display:none}
        .toybot-sun{width:52px;height:52px;right:13%;top:18%;background:#dbe6e9;opacity:.72;box-shadow:0 0 28px #eaf7ff66}
        .toybot-cloud{width:125px;height:28px;top:24%;left:4%;background:#c2ccd0;opacity:.22;filter:blur(7px);box-shadow:32px -10px 0 1px #d6dfe1,65px 2px 0 0 #cad4d7}
        .toybot-cloud.c2{top:33%;right:0;left:auto;opacity:.18;transform:scale(1.2);filter:blur(9px)}
        .toybot-hills{inset:28% -3% auto;height:26%;background:linear-gradient(90deg,transparent 0 3%,#202e3a 3% 9%,transparent 9% 12%,#293844 12% 17%,transparent 17% 19%,#1b2b39 19% 26%,transparent 26% 28%,#334450 28% 34%,transparent 34% 37%,#1a2936 37% 44%,transparent 44% 48%,#293a47 48% 57%,transparent 57% 60%,#1b2a37 60% 68%,transparent 68% 72%,#354550 72% 78%,transparent 78% 82%,#1c2c39 82% 90%,transparent 90% 93%,#2d3c48 93% 100%);opacity:.9}
        .toybot-hills:after{content:'';position:absolute;inset:9% 0 0;background:repeating-linear-gradient(90deg,transparent 0 3.5%,#9cb8c122 3.6% 3.8%,transparent 4% 6.5%);mask-image:linear-gradient(180deg,transparent,#000 45%)}
        .toybot-road{top:35%;background:linear-gradient(90deg,#111c26 0 4%,#8ba7ad 4% 4.6%,#28343e 4.6% 95.4%,#8ba7ad 95.4% 96%,#101b25 96%),repeating-linear-gradient(180deg,#50606a 0 2px,#293640 2px 5px)}
        .toybot-road:before{background:repeating-linear-gradient(180deg,transparent 0 49px,#dae6e6 50px 55px,transparent 56px 107px);opacity:.25;animation:none}
        .toybot-scene.is-moving .toybot-road:before{animation:toybot-road 1.3s linear infinite}
        .toybot-road:after{background-image:repeating-linear-gradient(180deg,#83a4b1 0 18px,transparent 18px 47px),repeating-linear-gradient(180deg,#83a4b1 0 18px,transparent 18px 47px);opacity:.48}
        .toybot-gate-door{width:clamp(42px,12%,53px);height:61px;gap:0;border-radius:11px 11px 4px 4px;box-shadow:0 3px 10px #06131b77,inset 0 0 7px currentColor}
        .toybot-gate-door small{font-size:8px}
        .toybot-gate-door b{font-size:17px}
        .toybot-gate-door strong{font-size:9px}
        .toybot-factory{border:2px solid #82959e;border-radius:2px;background:linear-gradient(90deg,#1b2b38,#576570 45%,#243440);box-shadow:0 8px 0 #111e29,0 0 22px #b6d8e122}
        .toybot-factory:before{background:#e89c69;box-shadow:22px -7px 0 -4px #99d6df,46px 1px 0 -2px #c5d5dd}
        .toybot-robot{filter:drop-shadow(0 7px 6px #020710aa)}
        .toybot-robot.lead{animation:none}
        .robot-player-art{position:relative;width:100%;aspect-ratio:3/4;filter:drop-shadow(0 6px 7px #000b);transition:transform .12s ease-out}
        .robot-player-art:before{content:'';position:absolute;z-index:0;left:18%;right:18%;bottom:7%;height:8%;border-radius:50%;background:#08192788;filter:blur(4px)}
        .robot-run-sprite{position:absolute;z-index:1;inset:0;background:url('/games/toybot-breakout/optimized/player-run-single-v1.webp') 0 0/400% 100% no-repeat}
        .mech-a1 .robot-run-sprite,.mech-a2 .robot-run-sprite,.mech-a3 .robot-run-sprite,.mech-a4 .robot-run-sprite{background-image:url('/games/toybot-breakout/optimized/player-run-armor-v1.webp')}
        .toybot-scene.is-moving .toybot-robot{animation:toybot-run-bob .64s linear infinite}
        .toybot-scene.is-moving .toybot-robot:not(.lead){animation-delay:-.16s}
        .toybot-scene.is-moving .robot-run-sprite{animation:toybot-run-frames .64s steps(4,end) infinite}
        .toybot-scene.is-moving .toybot-robot:not(.lead) .robot-run-sprite{animation-delay:-.16s}
        .toybot-scene.is-battle .toybot-robot{animation:toybot-battle-ready 1.15s ease-in-out infinite alternate}
        .robot-player-art.is-firing{transform:translateY(1px) rotate(-1.5deg)}
        .robot-weapon-ai{position:absolute;z-index:3;left:54%;top:9%;width:64%;aspect-ratio:1;background-image:url('/games/toybot-breakout/optimized/weapon-cannon-ai-atlas-v1.webp');background-size:400% 400%;background-repeat:no-repeat;pointer-events:none;filter:drop-shadow(0 2px 2px #07172599)}
        .robot-fire-spark{position:absolute;z-index:3;left:34%;top:31%;width:32%;height:33%;background:url('/games/toybot-breakout/optimized/muzzle-flash.png?v=1') center/contain no-repeat;filter:drop-shadow(0 0 8px #8df7ff);pointer-events:none;animation:toybot-arm-flash .2s ease-out both}
        .robot-boss-sprite{display:block;width:100%;aspect-ratio:256/292;background:url('/games/toybot-breakout/optimized/boss-motion-sheet.webp?v=1') 0 0/300% 100% no-repeat;filter:drop-shadow(0 0 8px #69e9ff66)}
        .toybot-drone-sprite{display:block;width:64px;aspect-ratio:128/115;background:url('/games/toybot-breakout/optimized/drone-motion-sheet.png?v=1') 0 0/300% 100% no-repeat;filter:drop-shadow(0 0 7px #5ce8ff66)}
        .toybot-scene.is-moving .toybot-drone-sprite{animation:toybot-enemy-frames .9s steps(3,end) infinite}
        .toybot-hazard{animation:toybot-drone-hover .9s ease-in-out infinite alternate}
        .robot-armor-plate{position:absolute;z-index:1;top:29%;width:18%;height:19%;background:linear-gradient(140deg,#f6ffff,#7eabb9 62%,#304a5c);border:1px solid #d6f9ff;clip-path:polygon(0 0,100% 15%,82% 100%,10% 78%);filter:drop-shadow(0 0 4px #b4ecfa);pointer-events:none}
        .robot-armor-plate.left{left:13%;transform:rotate(-18deg)}.robot-armor-plate.right{right:13%;transform:scaleX(-1) rotate(-18deg)}
        .mech-a3 .robot-armor-plate,.mech-a4 .robot-armor-plate{height:26%;width:23%;background:linear-gradient(140deg,#fff,#b9eafa 55%,#47627a)}
        .robot-core-aura{position:absolute;z-index:2;left:50%;top:36%;width:23%;aspect-ratio:1;border:2px solid #efffff;border-radius:50%;transform:translateX(-50%);box-shadow:0 0 12px 5px #59eeffbb;animation:toybot-core-pulse .75s ease-in-out infinite alternate;pointer-events:none}
        .mech-c2 .robot-core-aura,.mech-c3 .robot-core-aura,.mech-c4 .robot-core-aura{box-shadow:0 0 18px 8px #78efffd9}
        .robot-core-wings{position:absolute;z-index:0;left:-20%;right:-20%;top:5%;height:50%;pointer-events:none}
        .robot-core-wings:before,.robot-core-wings:after{content:'';position:absolute;top:0;width:24%;height:100%;background:linear-gradient(115deg,#153859,#7af2ff 48%,#14334e 60%,#a5faff);clip-path:polygon(32% 0,100% 18%,70% 100%,16% 75%,0 30%);filter:drop-shadow(0 0 6px #5feaff)}
        .robot-core-wings:before{left:0;transform:rotate(-9deg)}
        .robot-core-wings:after{right:0;transform:scaleX(-1) rotate(-9deg)}
        .robot-enemy{filter:drop-shadow(0 0 14px #ff554b99) saturate(1.12)}
        .toybot-obstacle{filter:drop-shadow(0 12px 8px #020710cc)}
        .toybot-obstacle.fighting{filter:drop-shadow(0 0 18px #50dbf5)}
        .toybot-obstacle.victorious{z-index:5;animation:toybot-boss-victory .55s ease-in-out 2 alternate;filter:drop-shadow(0 0 22px #ff695d)}
        .toybot-scene.is-defeat.boss-wipe .toybot-robot{animation:toybot-mech-collapse 1.05s ease-out both}
        .toybot-defeat-scene{position:absolute;z-index:9;inset:0;overflow:hidden;pointer-events:none;background:radial-gradient(ellipse at var(--defeat-lane) 58%,#ff625b66,transparent 44%),linear-gradient(180deg,#08111b00 26%,#3a0d1b77 100%);animation:toybot-defeat-shade 1.8s ease-out both}
        .toybot-defeat-beam{position:absolute;left:var(--defeat-lane);top:49%;height:23%;width:10px;transform:translateX(-50%);transform-origin:top;background:linear-gradient(90deg,#ff544800,#fff8d4 45%,#ff544800);box-shadow:0 0 16px 8px #ff534ecc,0 0 40px 14px #ed334b88;animation:toybot-defeat-beam .85s ease-out both}
        .toybot-defeat-impact{position:absolute;left:var(--defeat-lane);top:61%;width:138px;aspect-ratio:1;transform:translate(-50%,-50%);background:url('/games/toybot-breakout/optimized/plasma-impact.png?v=2') center/contain no-repeat;filter:hue-rotate(135deg) saturate(1.8) drop-shadow(0 0 20px #ff514e);animation:toybot-defeat-impact 1.2s ease-out both}
        .toybot-defeat-wreck{position:absolute;left:var(--defeat-lane);top:60%;width:var(--squad-size,44px);transform:translate(-50%,-50%);animation:toybot-mech-collapse 1.15s ease-out both}
        .toybot-defeat-caption{position:absolute;top:27%;left:50%;width:min(82%,320px);padding:12px 14px;border:1px solid #ff9a888c;border-radius:12px;background:#1c1b2add;color:#ffe6df;text-align:center;box-shadow:0 0 24px #ff4b4266,inset 0 0 20px #6d252444;text-shadow:0 2px 5px #180b12;transform:translateX(-50%);animation:toybot-defeat-caption 1.8s ease-out both}
        .toybot-defeat-caption strong{display:block;font-size:21px;letter-spacing:.08em}
        .toybot-defeat-caption small{display:block;margin-top:5px;font-size:11px;color:#ffd3c9}
        .toybot-result-boss{display:block;width:78px;height:88px;margin:0 auto;object-fit:contain;filter:drop-shadow(0 0 12px #ff675a);animation:toybot-result-boss .8s ease-out both}
        .toybot-top,.toybot-brand{text-shadow:0 2px 8px #07101ccc}
        .toybot-back,.toybot-pause{background:#172735e8;border:1px solid #b3cbd755;color:#e8f4fa;box-shadow:0 3px 0 #09121b}
        .toybot-pill{background:#101d29e8;border:1px solid #a9c4d066;border-radius:10px;box-shadow:0 3px 0 #070d14;padding:7px 10px}
        .toybot-pill small{color:#9bb1bc}
        .toybot-pill b{color:#eefaff}
        .toybot-meter{height:6px;background:#dbe8ed44;box-shadow:0 1px 5px #0009}
        .toybot-meter>span{background:linear-gradient(90deg,#56d7ec,#e2fbff)}
        .toybot-battle-banner{border:1px solid #b7d9e866;border-radius:10px;background:#0d1a27e8;box-shadow:0 6px 22px #02071088}
        .toybot-battle-banner small{color:#a8dfea}
        .toybot-battle-meter span{background:linear-gradient(90deg,#f44e58,#ffc77c)}
        .toybot-hazard-icon{border:2px solid #e4eff0;background:linear-gradient(145deg,#657784,#232f3b);border-radius:8px;box-shadow:0 4px 0 #151f29;color:#c5edf6}
        .toybot-hazard small{background:#2a3944;color:#ffd9ce}
        .toybot-hazard{transition:left .18s ease-in-out,top .1s linear}
        .toybot-hazard.will-move small{color:#b9f8ff;border:1px solid #7ceaff}
        .toybot-shot{width:18px;height:32px;border:0;background:url('/games/toybot-breakout/optimized/plasma-bolt.png?v=2') center/contain no-repeat;box-shadow:none;filter:drop-shadow(0 0 6px #65efff)}
        .toybot-shot.is-swarm{width:13px;height:25px}
        .toybot-shot:before{display:none}
        .toybot-shot.weapon-powered,.toybot-shot.weapon-heavy,.toybot-shot.weapon-ultimate{border:0;background:url('/games/toybot-breakout/optimized/plasma-bolt.png?v=2') center/contain no-repeat}
        .toybot-shot,.toybot-shot.weapon-powered,.toybot-shot.weapon-heavy,.toybot-shot.weapon-overdrive,.toybot-shot.weapon-ultimate{animation:none;transition:top .1s linear}
        .toybot-shot.weapon-powered{filter:drop-shadow(0 0 9px #8ffaff) saturate(1.35)}
        .toybot-shot.weapon-heavy{filter:drop-shadow(0 0 12px #53dfff) saturate(1.8);scale:1.18}
        .toybot-shot.weapon-overdrive{filter:drop-shadow(0 0 16px #708dff) hue-rotate(30deg) saturate(1.9);scale:1.3}
        .toybot-shot.weapon-ultimate{filter:drop-shadow(0 0 18px #b49bff) hue-rotate(62deg) saturate(2);scale:1.42}
        .toybot-shot:after{content:'';position:absolute;left:37%;top:71%;width:26%;height:14px;border-radius:100%;background:linear-gradient(#b8ffff99,transparent);filter:blur(2px)}
        .toybot-shot{--bolt-color:#63eaff;--bolt-edge:#c3ffff;transition:top .1s linear,left .1s linear}
        .toybot-shot.weapon-powered,.toybot-shot.weapon-heavy,.toybot-shot.weapon-overdrive,.toybot-shot.weapon-ultimate{width:18px;height:32px;background:none;scale:1;filter:drop-shadow(0 0 5px var(--bolt-color))}
        .toybot-shot.weapon-heavy{--bolt-color:#5f9dff;--bolt-edge:#e3faff}
        .toybot-shot.weapon-overdrive{--bolt-color:#aa83ff;--bolt-edge:#f2dcff}
        .toybot-shot.weapon-ultimate{--bolt-color:#ffbd65;--bolt-edge:#fff5cf}
        .toybot-shot[class*="weapon-"]:after{left:43%;width:14%;height:20px;background:linear-gradient(var(--bolt-color),transparent)}
        .toybot-shot.weapon-powered,.toybot-shot.weapon-heavy,.toybot-shot.weapon-overdrive,.toybot-shot.weapon-ultimate{width:32px;height:44px;background:none;border:0;box-shadow:none;scale:1;filter:drop-shadow(0 0 2px var(--bolt-color))}
        .toybot-shot.is-swarm[class*="weapon-"]{width:26px;height:36px}
        .toybot-shot[class*="weapon-"]:after{display:none}
        .toybot-projectile-ai{display:block;width:100%;height:100%;background:url('/games/toybot-breakout/optimized/projectile-ai-atlas-v1.webp') 0 0/400% 400% no-repeat;animation:toybot-ai-projectile-frames .4s steps(4,end) infinite}
        @keyframes toybot-ai-projectile-frames{to{background-position-x:133.333333%}}
        @media(prefers-reduced-motion:reduce){.toybot-projectile-ai{animation:none}}
        .toybot-muzzle-event{position:absolute;z-index:5;top:calc(59% - var(--squad-size,44px) / 4);left:var(--shot-lane-center);pointer-events:none}
        .toybot-muzzle-flash{position:absolute;top:-17px;width:26px;height:34px;background:url('/games/toybot-breakout/optimized/muzzle-flash.png?v=1') center/contain no-repeat;filter:drop-shadow(0 0 9px #aafaff);opacity:0;animation:toybot-muzzle .34s ease-out both}
        .toybot-muzzle-flash.center{left:-13px}
        .toybot-muzzle-flash:after{content:'';position:absolute;left:50%;top:-25px;width:4px;height:36px;border-radius:50%;background:linear-gradient(180deg,transparent,#ccffff,#55eaff);box-shadow:0 0 9px #79ecff;transform:translateX(-50%)}
        .toybot-beam{background:linear-gradient(180deg,#efffff,#5eeaffaa,transparent);box-shadow:0 0 18px #57eaff}
        .toybot-bottom{bottom:13px}
        .toybot-toast{text-shadow:0 2px 6px #020710}
        .toybot-squad-card{padding:9px 12px;border:1px solid #9ab7c566;border-radius:12px;background:#101d29ec;box-shadow:0 4px 0 #060c13;color:#e9f4f8}
        .toybot-squad-card small{color:#9db3bd}
        .toybot-squad-card strong{color:#f2fbff}
        .toybot-lane-controls{border:1px solid #7b95a366;border-radius:8px;background:#142431}
        .toybot-lane-controls button{color:#b8cbd2}
        .toybot-lane-controls button[aria-pressed="true"]{background:#39b8ce;color:#06151e;box-shadow:0 2px 0 #1a8297}
        .toybot-footer{color:#d0dce0;text-shadow:0 2px 5px #020710}
        .toybot-choice{background:#08121dcc;backdrop-filter:blur(9px)}
        .toybot-choice h2{font-size:24px;letter-spacing:.04em;text-shadow:0 2px 9px #000}
        .toybot-choice p{color:#c1d5dc}
        .toybot-gates{gap:8px;width:min(100%,390px)}
        .toybot-gate{min-width:0;min-height:148px;padding:9px 5px;border:1px solid #b8d6df77;border-radius:12px;background:#142431;box-shadow:0 5px 0 #060c13,0 8px 22px #02071088}
        .toybot-gate small{font-size:9px;line-height:1.35;letter-spacing:.02em;color:#c6dbe0}
        .toybot-gate strong{height:48px;margin:8px 0;font-size:35px;line-height:1.3;color:#d7f8fb;text-shadow:0 0 15px #54d8ec88}
        .toybot-gate.good{background:linear-gradient(155deg,#183847,#10212c)}
        .toybot-gate.armor{background:linear-gradient(155deg,#303d4a,#17232f)}
        .toybot-gate.core{background:linear-gradient(155deg,#303247,#191c2a)}
        .toybot-gate.armor strong{color:#d6e2e8;text-shadow:0 0 14px #d6e2e866}
        .toybot-gate.core strong{color:#c8b8ff;text-shadow:0 0 14px #a99aff99}
        .toybot-hit-damage{position:absolute;z-index:6;left:50%;top:-16px;transform:translateX(-50%);color:#d6fbff;font-size:17px;font-weight:1000;text-shadow:0 0 7px #39d9ff,0 2px 3px #07131b;white-space:nowrap;pointer-events:none;animation:toybot-hit-pop .62s ease-out both}
        .toybot-equipment-tag{position:absolute;z-index:3;left:50%;top:-23px;transform:translateX(-50%);display:flex;gap:4px;width:max-content;pointer-events:none}
        .toybot-equipment-tag span{padding:2px 4px;border:1px solid #c9e6f288;border-radius:5px;background:#101c2bdc;color:#e7f8ff;font-size:8px;font-weight:1000;line-height:1;box-shadow:0 2px 5px #02071188}
        .toybot-equipment-tag .weapon-tag{border-color:#64e5f0;color:#a9faff}
        .toybot-equipment-tag .armor-tag{border-color:#d9e6ec;color:#edf5f7}
        .toybot-equipment-tag .core-tag{border-color:#bdaaff;color:#d6c8ff}
        .toybot-impact-flash{position:absolute;z-index:2;inset:-6px;border:2px solid #adf9ff;border-radius:18px;background:radial-gradient(circle,#fff9 0 8%,#78efff55 24%,transparent 68%);box-shadow:0 0 16px #62e7ff;pointer-events:none;animation:toybot-hit-flash .28s ease-out both}
        .toybot-impact-event{position:absolute;z-index:7;width:1px;height:1px;pointer-events:none}
        .toybot-impact-burst{position:absolute;left:0;top:0;width:58px;height:58px;background:url('/games/toybot-breakout/optimized/plasma-impact.png?v=2') center/contain no-repeat;filter:drop-shadow(0 0 8px #74efff);opacity:0;transform:translate(-50%,-50%) scale(.35);animation:toybot-impact-burst .55s ease-out both}
        .toybot-impact-event.power-1 .toybot-impact-burst,.toybot-impact-event.power-2 .toybot-impact-burst{width:70px;height:70px;filter:drop-shadow(0 0 14px #72efff)}
        .toybot-impact-event.power-3 .toybot-impact-burst,.toybot-impact-event.power-4 .toybot-impact-burst{width:84px;height:84px;filter:drop-shadow(0 0 19px #947dff) hue-rotate(48deg)}
        .toybot-impact-event .toybot-hit-damage{top:-17px}
        .toybot-boss-strike-lane{position:absolute;z-index:1;top:45%;width:17%;height:28%;transform:translateX(-50%);border:2px solid #ff8d7d;border-radius:11px;background:linear-gradient(180deg,#ff676711,#ff454877);box-shadow:0 0 17px #ff6b6b99,inset 0 0 18px #ff5d5d88;pointer-events:none;animation:toybot-strike-warning .3s ease-in-out infinite alternate}
        .toybot-boss-strike-lane.striking{background:#fff1a999;box-shadow:0 0 28px 9px #ff7f70;animation:none}
        .toybot-squad-hit{position:absolute;z-index:7;top:57%;transform:translateX(-50%);color:#ffb3a7;font-size:17px;font-weight:1000;text-shadow:0 0 8px #ff3e46,0 2px 3px #000;pointer-events:none;animation:toybot-hit-pop .8s ease-out both}
        .toybot-overlay{background:#08131ddf;backdrop-filter:blur(9px)}
        .toybot-primary{background:#bcecf2;color:#10232b;box-shadow:0 5px 0 #438a9b}
        .toybot-result-score{color:#c8f5fa}
        .toybot-overlay.toybot-result{justify-content:flex-start;overflow-y:auto;padding:22px 16px 26px;gap:3px}
        .toybot-result .toybot-result-icon{height:86px;font-size:58px}
        .toybot-result .toybot-result-mech{width:76px;height:91px;margin:0 auto}
        .toybot-result .toybot-result-score{font-size:34px;margin:2px 0}
        .toybot-result h2{font-size:26px;margin:5px 0}
        .toybot-result p{font-size:12px;line-height:1.35}
        .toybot-mech-showcase{position:relative;flex:none;aspect-ratio:1;width:200px;filter:drop-shadow(0 10px 12px #061321b8)}
        .toybot-mech-showcase img{position:relative;z-index:1;display:block;width:100%;height:100%;object-fit:contain;pointer-events:none}
        .toybot-mech-showcase>span{position:absolute;display:none;pointer-events:none}
        .toybot-mech-showcase.has-core .toybot-mech-core-wing{display:block;z-index:0;top:6%;width:36%;height:51%;border:3px solid #b4fbff;background:linear-gradient(140deg,#1a5479,#6beeff 48%,#142c50 55%,#aafaff);clip-path:polygon(0 0,88% 32%,100% 100%,55% 74%,20% 40%);filter:drop-shadow(0 0 12px #47eeff)}
        .toybot-mech-core-wing.left{left:-8%;transform:rotate(-17deg)}
        .toybot-mech-core-wing.right{right:-8%;transform:scaleX(-1) rotate(-17deg)}
        .toybot-mech-showcase.has-core .toybot-mech-core-light{display:block;z-index:2;left:49%;top:33%;width:10%;aspect-ratio:1;border:2px solid white;border-radius:50%;background:#bdfaffb8;box-shadow:0 0 14px 6px #4ce9ffcc}
        .toybot-mech-showcase.has-core.has-armor .toybot-mech-core-light{left:53%;top:28%;width:9%}
        .toybot-workshop{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;min-height:100%;padding:16px 18px 18px;color:#eafcff}
        .toybot-workshop-top{display:flex;justify-content:space-between;align-items:center;width:100%;max-width:360px}
        .toybot-workshop-back{border:0;background:transparent;color:#d5f6fc;font-size:12px;font-weight:900;cursor:pointer}
        .toybot-workshop-parts{padding:6px 10px;border:1px solid #7edcebaa;border-radius:20px;background:#102a3cdb;color:#e2fbff;font-size:12px;font-weight:900}
        .toybot-workshop-title{margin:8px 0 0}
        .toybot-workshop-title small{color:#8deaf6;font-size:9px;font-weight:900;letter-spacing:.22em}
        .toybot-workshop-title h2{margin:3px 0;font-size:28px;letter-spacing:.09em}
        .toybot-workshop-title p{margin:0;color:#cae3e9;font-size:11px}
        .toybot-workshop-preview{display:flex;flex:1;flex-direction:column;align-items:center;justify-content:flex-end;min-height:185px;width:100%;max-width:360px}
        .toybot-workshop-mech{width:clamp(145px,43%,215px);max-height:235px}
        .toybot-workshop-loadout{width:100%;margin:4px 0 8px;padding:6px 9px;border:1px solid #8bdbe877;border-radius:9px;background:#0b2235cc;color:#c8f2f8;font-size:11px;font-weight:900}
        .toybot-workshop-loadout span{display:block;margin-top:2px;color:#fff;font-size:10px;font-weight:600}
        .toybot-workshop-list{display:grid;gap:6px;width:100%;max-width:360px}
        .toybot-workshop-item{display:flex;align-items:center;gap:9px;width:100%;min-height:64px;padding:6px 9px;border:1px solid #6ca7b5a6;border-radius:10px;background:#0b1e30eb;color:#e8f7fb;text-align:left}
        .toybot-workshop-item.is-equipped{border-color:#a0f3f6;background:#143a46ee;box-shadow:inset 3px 0 #82f6ff}
        .toybot-workshop-icon{display:grid;place-items:center;flex:none;width:49px;height:49px;overflow:hidden;border:1px solid #70cfe1;border-radius:9px;background:radial-gradient(circle,#3a7384,#173444 70%)}
        .toybot-workshop-icon img{display:block;width:100%;height:100%;object-fit:contain;pointer-events:none}
        .toybot-workshop-copy{display:flex;flex:1;flex-direction:column;min-width:0;gap:2px}
        .toybot-workshop-copy strong{font-size:12px}.toybot-workshop-copy small{color:#b1d3dc;font-size:10px}
        .toybot-workshop-actions{display:flex;flex:none;flex-direction:column;gap:4px;min-width:58px}
        .toybot-workshop-action{min-width:58px;padding:6px 7px;border:0;border-radius:6px;background:#a8f0f5;color:#0a2b38;font-size:10px;font-weight:1000;text-align:center;cursor:pointer}
        .toybot-workshop-action.equip{background:#315963;color:#e5fbff}
        .toybot-workshop-action:disabled{background:#45616c;color:#e1ebef;cursor:default}
        .toybot-workshop .toybot-workshop-done{display:flex;justify-content:space-between;align-items:center;width:100%;max-width:360px;margin-top:11px;padding:11px 13px;border-radius:9px;font-size:13px}
        .toybot-workshop-done span{font-size:23px;line-height:12px}
        .toybot-workshop-back:focus-visible,.toybot-workshop-action:focus-visible,.toybot-home-garage:focus-visible{outline:2px solid #baf5ff;outline-offset:2px}
        .toybot-result-garage{margin:4px 0 1px;padding:8px 13px;border:1px solid #7edcebaa;border-radius:8px;background:#193b4f;color:#d5faff;font-weight:900;cursor:pointer}
        .toybot-result .toybot-primary{margin-top:10px}
        .toybot-overlay.toybot-home{display:block;overflow-y:auto;padding:0;background:#0a1728;backdrop-filter:none;text-align:center}
        .toybot-home-backdrop{position:absolute;inset:0;z-index:0;width:100%;height:100%;object-fit:cover;object-position:center;pointer-events:none}
        .toybot-home:before{content:'';position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,#081525d9 0%,#08152582 16%,transparent 31%,#06111b33 53%,#06111be6 69%,#06111bf5 100%);pointer-events:none}
        .toybot-home-content{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;min-height:100%;width:100%}
        .toybot-home-heading{width:100%;padding:27px 14px 0}
        .toybot-home-kicker{color:#91e7f6;font-size:10px;font-weight:900;letter-spacing:.28em}
        .toybot-home h1{margin:9px 0 3px;font-size:35px;line-height:1.05;letter-spacing:.08em;color:#f2fcff;text-shadow:0 0 23px #54dfff88,0 4px 11px #010811}
        .toybot-home .toybot-home-subtitle{margin:6px auto 0;color:#d4eaf0;font-size:11px;font-weight:800;letter-spacing:.04em;text-shadow:0 2px 6px #06101c}
        .toybot-home-hero{position:relative;display:flex;flex:1;align-items:flex-end;justify-content:center;width:100%;min-height:270px;padding-bottom:4px}
        .toybot-home-mech{width:clamp(165px,49%,207px);max-height:275px;filter:drop-shadow(0 11px 11px #071321e6) drop-shadow(0 0 13px #7befff88);animation:toybot-home-hover 2.5s ease-in-out infinite alternate}
        .toybot-home-equipped{position:absolute;right:4%;bottom:25%;display:flex;flex-direction:column;align-items:flex-end;gap:4px}
        .toybot-home-equipped span{padding:3px 5px;border:1px solid #91f2ff99;border-radius:5px;background:#102636db;color:#d9fbff;font-size:8px;font-weight:900}
        .toybot-home-dashboard{display:flex;flex-direction:column;align-items:center;gap:9px;width:100%;padding:13px 16px 20px;border-top:1px solid #9defff6e;border-radius:19px 19px 0 0;background:linear-gradient(180deg,#0b2034d9,#07131ff2 28%,#07111bed);box-shadow:0 -13px 25px #06152377}
        .toybot-home-record{display:flex;justify-content:space-between;width:min(100%,340px);color:#c9dfe8;font-size:11px;font-weight:800}
        .toybot-home-record b{color:#fff;font-size:13px}
        .toybot-home .toybot-home-start{display:flex;justify-content:space-between;align-items:center;width:min(100%,340px);margin:0;padding:13px 18px;border-radius:11px;background:#a7f2f9;color:#0b2936;font-size:17px;box-shadow:0 4px 0 #37879a,0 0 19px #51d9eb77}
        .toybot-home-start span,.toybot-pause-resume span{font-size:28px;line-height:15px}
        .toybot-home-garage{display:flex;justify-content:space-between;align-items:center;gap:7px;width:min(100%,340px);padding:10px 12px;border:1px solid #86d3e499;border-radius:10px;background:#18394bcf;color:#f0fcff;font-size:12px;font-weight:900;cursor:pointer}
        .toybot-home-garage small{margin-left:auto;color:#a8dce8;font-size:10px}
        .toybot-home-exit{margin-top:1px;padding:7px 10px;border:0;background:transparent;color:#b6dce7;font-size:11px;font-weight:800;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
        .toybot-home-exit:focus-visible,.toybot-pause-home:focus-visible,.toybot-result-garage:focus-visible{outline:2px solid #baf5ff;outline-offset:2px}
        .toybot-overlay.toybot-paused{padding:17px;background:#06111ac7;backdrop-filter:blur(7px)}
        .toybot-pause-panel{width:min(100%,340px);overflow:hidden;padding:0 18px 17px;border:1px solid #9de6f3a6;border-radius:20px;background:linear-gradient(180deg,#19384b,#0c1e2f 53%,#0b1928);box-shadow:0 20px 55px #020910db,0 0 22px #55d4ea33;text-align:center}
        .toybot-pause-art{position:relative;height:143px;margin:0 -18px 12px;overflow:hidden;border-bottom:1px solid #b4f3ff77;background:#162c42 url('/games/toybot-breakout/optimized/home-hangar-v1.jpg') center 47%/cover no-repeat}
        .toybot-pause-art:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,#07152433,transparent 45%,#0d2439a8)}
        .toybot-pause-art .toybot-mech-showcase{position:absolute;z-index:1;left:50%;bottom:-48px;width:188px;transform:translateX(-50%);filter:drop-shadow(0 0 8px #71ebff)}
        .toybot-pause-label{color:#8de7f5;font-size:10px;font-weight:900;letter-spacing:.25em}
        .toybot-pause-panel h2{margin:4px 0 13px;font-size:25px;letter-spacing:.04em}
        .toybot-pause-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
        .toybot-pause-stats div{padding:8px 2px;border:1px solid #78b8c766;border-radius:9px;background:#102e40}
        .toybot-pause-stats small{display:block;color:#9ec3d0;font-size:9px;font-weight:800}
        .toybot-pause-stats strong{display:block;margin-top:2px;color:#effdff;font-size:15px}
        .toybot-pause-progress{height:6px;margin:12px 0 5px;overflow:hidden;border-radius:99px;background:#64899a77}
        .toybot-pause-progress span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#56d4ed,#bdfbff)}
        .toybot-pause-panel .toybot-pause-resume{display:flex;justify-content:space-between;align-items:center;width:100%;margin-top:10px;padding:11px 15px;border-radius:10px;font-size:16px}
        .toybot-pause-home{margin-top:11px;padding:6px 10px;border:0;background:transparent;color:#bcdbe3;font-size:12px;font-weight:800;cursor:pointer}
        @keyframes toybot-home-hover{to{transform:translateY(-5px)}}
        @media(max-height:680px){.toybot-overlay.toybot-result{padding-top:8px}.toybot-result .toybot-result-icon{height:58px}.toybot-result .toybot-result-mech{width:55px;height:65px}.toybot-home-heading{padding-top:14px}.toybot-home h1{font-size:29px}.toybot-home-hero{min-height:170px}.toybot-home-mech{width:130px;max-height:182px}.toybot-home-dashboard{gap:6px;padding-top:9px}.toybot-workshop{padding:9px 13px}.toybot-workshop-title{margin-top:3px}.toybot-workshop-title h2{font-size:23px}.toybot-workshop-preview{min-height:145px}.toybot-workshop-mech{width:145px}.toybot-workshop-item{min-height:55px;padding:4px 7px}.toybot-workshop-icon{width:43px;height:43px}.toybot-pause-art{height:108px}.toybot-pause-art .toybot-mech-showcase{width:155px;bottom:-43px}}
        @keyframes toybot-road{to{background-position-y:108px}}
        @keyframes toybot-bob{to{translate:0 -5px}}
        @keyframes toybot-shake{to{translate:2px 0;rotate:2deg}}
        @keyframes toybot-zap{to{opacity:.45;scale:1 .82}}
        @keyframes toybot-shot{to{top:var(--shot-target-y);transform:translateX(calc(-50% + var(--shot-offset, 0px))) scale(.7);opacity:0}}
        @keyframes toybot-hazard-alert{to{translate:0 -5px;filter:drop-shadow(0 0 10px #ff725b)}}
        @keyframes toybot-toast-in{from{opacity:0;transform:translateY(7px) scale(.94)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes toybot-count-pop{50%{transform:scale(1.22);color:#e88655}}
        @keyframes toybot-hit-pop{0%{opacity:0;transform:translate(-50%,7px) scale(.8)}25%{opacity:1}100%{opacity:0;transform:translate(-50%,-18px) scale(1.08)}}
        @keyframes toybot-hit-flash{50%{filter:brightness(2) drop-shadow(0 0 16px #7cf3ff)}}
        @keyframes toybot-strike-warning{to{opacity:.4;box-shadow:0 0 7px #ff6b6b55,inset 0 0 11px #ff5d5d44}}
        @keyframes toybot-impact-burst{18%{opacity:1;transform:translate(-50%,-50%) scale(.8)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.55)}}
        @keyframes toybot-core-pulse{to{opacity:.55;transform:translateX(-50%) scale(1.15)}}
        @keyframes toybot-run-bob{0%,100%{translate:0 0;rotate:0deg}25%{translate:-1px -2px;rotate:-1deg}50%{translate:0 1px;rotate:0deg}75%{translate:1px -2px;rotate:1deg}}
        @keyframes toybot-run-frames{to{background-position-x:133.333%}}
        @keyframes toybot-battle-ready{to{translate:0 -2px;rotate:.5deg}}
        @keyframes toybot-weapon-recoil{45%{translate:2px 3px;filter:brightness(1.45)}100%{translate:0 0}}
        @keyframes toybot-arm-flash{0%{opacity:0;scale:.55}30%{opacity:1;scale:1.1}100%{opacity:0;scale:.65}}
        @keyframes toybot-enemy-frames{to{background-position-x:150%}}
        @keyframes toybot-boss-lunge{to{translate:0 3px;rotate:1deg}}
        @keyframes toybot-boss-victory{to{translate:0 -9px;scale:1.09;filter:drop-shadow(0 0 22px #ff6d5e)}}
        @keyframes toybot-mech-collapse{0%{opacity:1;translate:0 0;rotate:0deg}30%{filter:brightness(2) drop-shadow(0 0 15px #ff6358)}100%{opacity:.1;translate:14px 19px;rotate:64deg;filter:grayscale(1) brightness(.5)}}
        @keyframes toybot-defeat-shade{0%{opacity:0}20%{opacity:1}100%{opacity:1}}
        @keyframes toybot-defeat-beam{0%{opacity:0;scale:1 .15}18%{opacity:1;scale:1 1}55%{opacity:1}100%{opacity:0;scale:1 1.15}}
        @keyframes toybot-defeat-impact{0%{opacity:0;scale:.2}25%{opacity:1;scale:1}100%{opacity:0;scale:1.7}}
        @keyframes toybot-defeat-caption{0%{opacity:0;translate:0 14px}20%,78%{opacity:1;translate:0 0}100%{opacity:0;translate:0 -8px}}
        @keyframes toybot-result-boss{from{opacity:0;transform:scale(1.2)}to{opacity:1;transform:scale(1)}}
        @keyframes toybot-drone-hover{to{translate:0 -4px;rotate:2deg}}
        @keyframes toybot-muzzle{12%{opacity:1;transform:scale(1.15)}55%{opacity:.8}100%{opacity:0;transform:scale(.65)}}
        @keyframes toybot-road-rush{to{background-position-y:78px}}
        @keyframes toybot-road-flow{to{background-position-y:138px}}

        @keyframes toybot-float{to{translate:25px -5px}}
        @media(max-height:680px){.toybot-shell{min-height:0;height:calc(100svh - 20px)}.toybot-page{padding:10px}.toybot-top{padding-top:12px}.toybot-back{top:47px}.toybot-stats{top:47px}.toybot-meter{top:98px}.toybot-bottom{bottom:10px}}
        @media(max-width:360px){.toybot-page{padding:7px}.toybot-shell{height:calc(100svh - 14px);border-width:3px;border-radius:25px}.toybot-pill{min-width:69px;padding:6px}.toybot-back{left:10px;padding:8px}.toybot-stats{gap:5px}.toybot-lane-controls button{width:22px;height:24px}.toybot-squad-avatars .robot-small{width:24px}}
        @media(prefers-reduced-motion:reduce){.toybot-road:before,.toybot-home-mech,.toybot-boss-strike-lane,.toybot-squad-hit,.toybot-scene.is-moving .toybot-road-flow,.toybot-scene.is-moving .toybot-track-guides:before,.toybot-scene.is-moving .toybot-track-guides:after,.toybot-scene.is-moving .toybot-robot,.toybot-scene.is-battle .toybot-robot,.toybot-scene.is-defeat .toybot-robot,.toybot-scene.is-moving .robot-run-sprite,.robot-player-art.is-firing .robot-weapon-pod.right,.robot-fire-spark,.toybot-scene.is-moving .robot-boss-sprite,.toybot-scene.is-moving .toybot-drone-sprite,.toybot-scene.is-defeat .robot-boss-sprite,.toybot-obstacle.victorious,.toybot-defeat-scene,.toybot-defeat-beam,.toybot-defeat-impact,.toybot-defeat-wreck,.toybot-defeat-caption,.toybot-result-boss,.toybot-muzzle-flash,.toybot-obstacle,.toybot-cloud,.toybot-beam,.toybot-shot,.toybot-hazard,.toybot-toast:not(:empty),.toybot-count-pop,.toybot-hit-damage,.toybot-impact-flash{animation:none}.robot-fire-spark,.toybot-muzzle-flash,.toybot-impact-event .toybot-hit-damage,.toybot-impact-burst{opacity:0}}

        .toybot-level-select{display:flex;justify-content:center;gap:8px;margin:0 0 7px}
        .toybot-level-select button{width:34px;height:30px;border:1px solid #84c8d566;border-radius:8px;background:#142e40;color:#c5edf5;font-size:13px;font-weight:900;cursor:pointer}
        .toybot-level-select button[aria-pressed=true]{border-color:#c8fcff;background:#357888;box-shadow:0 0 11px #52d6ed55}
        .toybot-level-select button:disabled{opacity:.4;cursor:default}
        .toybot-boss-strike-lane{top:43%;height:37%;width:21%;border-bottom-width:5px}
        .toybot-obstacle.phase-shield .robot-boss-sprite{filter:drop-shadow(0 0 12px #719dff) saturate(.5)}
        .toybot-obstacle.phase-shield:after{content:'';position:absolute;inset:-6%;border:3px solid #8ab8ffbb;border-radius:45%;box-shadow:0 0 20px #648bff,inset 0 0 13px #719dff66;pointer-events:none}
        .toybot-obstacle.phase-weak .robot-boss-sprite{filter:drop-shadow(0 0 12px #ffd894)}
        .toybot-obstacle.phase-attack{filter:drop-shadow(0 0 16px #ff6253)}
        .toybot-enemy-armor{position:absolute;top:18%;right:4%;color:#e2eaff;font-size:10px;font-weight:900;text-shadow:0 1px 4px #071625}
        .toybot-hazard.is-armored .toybot-drone-sprite{filter:drop-shadow(0 0 6px #b3c8e8) saturate(.65)}
        .toybot-burn-effect{position:absolute;z-index:6;width:60px;height:64px;transform:translate(-50%,-50%);background:url('/games/toybot-breakout/optimized/plasma-impact.png?v=2') center/contain no-repeat;filter:hue-rotate(48deg);opacity:.65;pointer-events:none;animation:toybot-burn-pulse .5s ease-in-out infinite alternate}
        @keyframes toybot-burn-pulse{to{opacity:.25;scale:.83}}
        .toybot-shot.is-charged{filter:drop-shadow(0 0 7px #ffe4a6);z-index:5}
        .toybot-status-effects{display:flex;justify-content:center;gap:5px;margin-bottom:5px;pointer-events:none}
        .toybot-status-effects>span{position:relative;overflow:hidden;min-width:42px;padding:3px 7px;background:#142e40de;border:1px solid #78d8e188;border-radius:7px;color:#b4f6ff;font-size:10px;font-weight:900}
        .toybot-status-effects .effect-charge{border-color:#f8c869;color:#ffe2a0}
        .toybot-status-effects .effect-jam{border-color:#c29fff;color:#e0ceff}
        .toybot-status-effects i{position:absolute;inset:auto auto 0 0;height:2px;background:#ffd78c}
        @media(prefers-reduced-motion:reduce){.toybot-burn-effect{animation:none}}

        .toybot-shot.in-flight{animation:toybot-projectile-flight var(--flight-duration) linear both;transition:none}
        @keyframes toybot-projectile-flight{from{left:var(--flight-from-x);top:var(--flight-from-y);transform:translate(-50%,-50%) rotate(var(--flight-angle)) scale(1);opacity:1}to{left:var(--flight-to-x);top:var(--flight-to-y);transform:translate(-50%,-50%) rotate(var(--flight-angle)) scale(var(--flight-end-scale));opacity:var(--flight-end-opacity)}}
        @media(prefers-reduced-motion:reduce){.toybot-shot.in-flight{animation:none;transition:none}}
        .toybot-scene.is-paused .toybot-shot,.toybot-scene.is-paused .toybot-projectile-ai,.toybot-scene.is-paused .toybot-burn-effect{animation-play-state:paused}

        /* AI art carries the gate depth, silhouettes and upgrade designs. */
        .toybot-gate-door{display:block;width:clamp(64px,23%,92px);height:auto;aspect-ratio:1;padding:0;border:0;border-radius:0;background-color:transparent;background-size:400% 200%;background-repeat:no-repeat;box-shadow:none;transform:translate(-50%,-85%) scale(var(--gate-scale));transform-origin:50% 85%;filter:drop-shadow(0 8px 5px #07162388);transition:top .1s linear,left .1s linear,transform .1s linear,opacity .25s;z-index:5}
        .toybot-gate-door:before{display:none}
        .toybot-gate-door.active-lane{box-shadow:none;filter:drop-shadow(0 6px 7px #4ae4d955)}
        .toybot-gate-door b{position:absolute;left:50%;top:40%;transform:translateX(-50%);font-size:20px;line-height:1.1;color:currentColor;filter:drop-shadow(0 0 5px currentColor)}
        .toybot-gate-door strong{position:absolute;left:12%;right:12%;top:12%;max-width:76%;font-size:9px;line-height:1.3;color:#f1ffff;text-shadow:0 1px 2px #000}
        .toybot-gate-door.resolved{opacity:.58;filter:drop-shadow(0 6px 5px #07162366)}
        .toybot-gate-door.collected b{opacity:0;transition:opacity .12s}
        .toybot-gate-door.missed{opacity:.18}
        .toybot-gate-cross-line{position:absolute;z-index:0;width:21%;height:5px;transform:translate(-50%,-50%);border-radius:50%;background:#7bffdf88;box-shadow:0 0 10px 3px #55eccc55;pointer-events:none}
        .toybot-gate-cross-line.penalty{background:#ff825d88;box-shadow:0 0 10px 3px #ff6d4f55}
        .robot-boss-sprite{background-size:400% 500%;aspect-ratio:1;animation:none}
        .toybot-obstacle.boss{animation:none;transition:left .2s ease-out,top .1s linear}
        .robot-weapon-ai{left:62%;top:-5%;width:48%}
        .robot-player-art.robot-small{width:26px;flex:0 0 26px}
        .weapon-tier-1{--mech-accent:#68eeff}.weapon-tier-2{--mech-accent:#6ca6ff}.weapon-tier-3{--mech-accent:#c29aff}.weapon-tier-4{--mech-accent:#ffdb8d}
        .toybot-boss-threat{position:absolute;z-index:4;width:42px;height:42px;transform:translate(-50%,-50%) scale(var(--threat-scale));transition:top .1s linear,left .1s linear;pointer-events:none;filter:drop-shadow(0 4px 4px #05121a99)}
        .toybot-boss-threat.kind-shell{width:36px;height:42px;z-index:6}
        .toybot-boss-threat.kind-barrier{width:64px;height:64px}
        .toybot-threat-art{position:absolute;inset:0;display:block;background-size:400% 300%;background-repeat:no-repeat;animation:toybot-threat-frames .6s steps(4,end) infinite}
        .kind-shell .toybot-threat-art{animation-duration:.3s}
        .kind-minion .toybot-threat-art{animation-duration:.5s}
        .toybot-boss-threat.sector-3 .toybot-threat-art{filter:hue-rotate(225deg)}
        .toybot-threat-hp{position:absolute;left:15%;right:15%;bottom:0;height:3px;border-radius:3px;overflow:hidden;background:#311c23}
        .toybot-threat-hp i{display:block;height:100%;background:#ffb076;transition:width .1s}
        .toybot-threat-landing{position:absolute;z-index:1;width:15%;height:10px;border:1px solid #ffa56b;border-radius:50%;transform:translate(-50%,-50%);background:#ff714e22;pointer-events:none}
        .toybot-threat-landing.shell{border-color:#ff725c;background:#ff654f33}
        @keyframes toybot-threat-frames{to{background-position-x:133.333333%}}
        .toybot-scene.is-paused .toybot-threat-art{animation-play-state:paused}
        @media(prefers-reduced-motion:reduce){.toybot-threat-art{animation:none}}

        .toybot-battle-banner,.toybot-approach-banner{z-index:1400}
        .toybot-defeat-scene{z-index:1600}
        .toybot-squad-hit{z-index:1300}
        .toybot-gate-door{isolation:isolate}
        .toybot-gate-door:after{content:'';position:absolute;left:16%;right:16%;bottom:12%;height:5%;border-radius:50%;background:#06101977;filter:blur(3px);z-index:-1}

        .toybot-world{position:absolute;inset:0;transform:scale(1);transform-origin:50% 58%;transition:transform 1s cubic-bezier(.22,.61,.36,1)}
        .toybot-world.in-arena{transform:scale(1.035)}
        .toybot-battle-meter{position:relative}
        .toybot-half-hp-mark{position:absolute;z-index:2;left:50%;top:0;bottom:0;width:2px;background:#fff8;pointer-events:none}
        .toybot-boss-weakpoint{position:absolute;z-index:2;left:50%;top:49%;width:27%;aspect-ratio:1;transform:translate(-50%,-50%);background:url('/games/toybot-breakout/optimized/plasma-impact.png?v=2') center/contain no-repeat;filter:hue-rotate(185deg);opacity:.75;animation:toybot-weakpoint-pulse .7s ease-in-out infinite alternate;pointer-events:none}
        .is-boss-intro .robot-boss-sprite{animation:toybot-boss-deploy 1s ease-out both}
        .is-boss-shift .robot-boss-sprite{animation:toybot-boss-unfold 1s ease-out both}
        .toybot-obstacle.boss.is-destroyed{filter:drop-shadow(0 3px 4px #06121c99)}
        .toybot-obstacle.is-enraged:not(.is-destroyed) .robot-boss-sprite{filter:drop-shadow(0 0 13px #ff9b5f) brightness(1.12)}
        @keyframes toybot-boss-deploy{from{opacity:.3;translate:0 -12px;scale:.94}to{opacity:1;translate:0 0;scale:1}}
        @keyframes toybot-boss-unfold{40%{filter:brightness(1.45) drop-shadow(0 0 18px #b8edff)}to{filter:brightness(1)}}
        @keyframes toybot-weakpoint-pulse{to{opacity:.4;scale:.85}}
        .toybot-scene.is-paused .robot-boss-sprite,.toybot-scene.is-paused .toybot-boss-weakpoint{animation-play-state:paused}
        @media(prefers-reduced-motion:reduce){.toybot-world{transition:none}.is-boss-intro .robot-boss-sprite,.is-boss-shift .robot-boss-sprite,.toybot-boss-weakpoint{animation:none}}
        .toybot-scene.is-paused *,.toybot-scene.is-paused *:before,.toybot-scene.is-paused *:after{animation-play-state:paused!important}

        .toybot-player-health{width:100%;padding:7px 10px 9px;margin-bottom:6px;border:1px solid #83cddb88;border-radius:11px;background:#0c1d2ce8;box-shadow:0 3px 12px #06101b77}
        .toybot-health-caption{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;color:#b7eff4;font-size:11px}
        .toybot-health-caption>b{font-size:18px;color:#f0ffff;line-height:1}.toybot-health-caption small{font-size:10px;color:#8bafb9}
        .toybot-health-track{position:relative;overflow:hidden;height:12px;border:1px solid #8bc9d455;border-radius:6px;background:#142734}
        .toybot-health-fill,.toybot-health-trail{position:absolute;inset:0 auto 0 0;display:block;border-radius:5px}
        .toybot-health-fill{background:linear-gradient(90deg,#2cbf9b,#8bf4ce);transition:width .15s ease-out;box-shadow:0 0 8px #53edc1}
        .toybot-health-trail{background:#ffdca0;animation:toybot-health-trail .65s ease-out both}
        .toybot-player-health.critical{border-color:#ff8b79}.toybot-player-health.critical .toybot-health-fill{background:linear-gradient(90deg,#db475e,#ff987d);box-shadow:0 0 10px #ff6e6e}
        @keyframes toybot-health-trail{0%,35%{width:var(--hp-before)}100%{width:var(--hp-now)}}
        .toybot-damage-vignette{position:absolute;inset:0;z-index:1500;background:radial-gradient(ellipse at 50% 58%,transparent 22%,#f3444522 52%,#eb293c99 100%);pointer-events:none;animation:toybot-player-impact .6s ease-out both}
        .toybot-damage-vignette.damage-shield,.toybot-damage-vignette.damage-armor{background:radial-gradient(ellipse at 50% 58%,transparent 25%,#51ccff22 55%,#68dfff88 100%)}
        @keyframes toybot-player-impact{0%{opacity:0}12%{opacity:.95}38%{opacity:.55}100%{opacity:0}}
        .is-player-hit .robot-player-art{animation:toybot-player-stagger .6s ease-out both}
        @keyframes toybot-player-stagger{0%{translate:0 0;filter:brightness(2)}15%{translate:3px 6px;rotate:5deg}30%{translate:-3px 1px;rotate:-3deg;opacity:.35}50%{translate:0 0;rotate:0;opacity:1}70%{opacity:.45}100%{translate:0 0;rotate:0;opacity:1;filter:brightness(1)}}
        .toybot-boss-strike-lane.rush-path{border-color:#ffd27e;background:repeating-linear-gradient(180deg,#ffb46c22 0 16px,#ffbe7766 18px 23px,transparent 25px 44px);box-shadow:0 0 18px #ff9d6277,inset 0 0 13px #ff905655}
        .toybot-boss-strike-lane.rush-path:after{content:'⇣';position:absolute;bottom:9%;left:50%;transform:translateX(-50%);font-size:30px;color:#ffe2a1;text-shadow:0 0 8px #ff9563}
        .toybot-obstacle.is-rushing{transition:none;filter:drop-shadow(0 10px 8px #07131bbf) drop-shadow(0 0 14px #ffab6b88)}
        .toybot-battle-banner{width:min(80%,310px);padding:8px 10px}.toybot-battle-meter{height:12px;border:1px solid #eabd9d66}
        .toybot-attack-name{display:block;margin:4px 0;color:#ffd39a;font-size:12px;letter-spacing:.1em}
        .toybot-boss-strike-lane.attack-mortar{border-color:#ffb150;background:linear-gradient(180deg,#ff9a2522,#ff722b77)}
        .toybot-boss-strike-lane.attack-swarm{border-style:dashed;border-color:#8ef5e1;background:linear-gradient(180deg,#51e8bb11,#51e8bb44)}
        .toybot-boss-strike-lane.attack-bunker{border-color:#e4b0a3;background:repeating-linear-gradient(135deg,#a4423722 0 12px,#eab09c33 13px 22px)}
        .toybot-boss-strike-lane.attack-storm{border-color:#d5a7ff;background:linear-gradient(180deg,#9d6aff11,#a77cff88)}
        .toybot-boss-strike-lane.attack-crossfire{border-color:#ffe9a1;background:linear-gradient(180deg,#efc04811,#ffe27a77)}
        .toybot-boss-threat.kind-lava{width:40px;height:42px;filter:drop-shadow(0 0 12px #ff973c)}
        .kind-lava .toybot-threat-art{filter:sepia(.9) saturate(4) hue-rotate(335deg)}
        .toybot-boss-threat.kind-lava.is-burning{width:19%;height:32px;border:2px solid #ffd47d;border-radius:50%;background:radial-gradient(ellipse,#fff3ac 0%,#ffab3c 25%,#ec5722b0 60%,transparent 75%);box-shadow:0 0 20px #ff7a3c;animation:toybot-lava-pulse .4s ease-in-out infinite alternate}
        .kind-lava.is-burning .toybot-threat-art{display:none}
        @keyframes toybot-lava-pulse{to{filter:brightness(1.4);opacity:.7}}
        .toybot-storm-beam{position:absolute;top:43%;height:19%;width:3%;transform:translateX(-50%);border-radius:50%;background:#b6a0ff33;box-shadow:0 0 15px #ac7aff55;pointer-events:none}
        .toybot-storm-beam.is-firing{width:12%;background:linear-gradient(90deg,transparent,#b899ff,#fff,#b899ff,transparent);box-shadow:0 0 30px #bda2ff;filter:brightness(1.6)}
        @media(prefers-reduced-motion:reduce){.toybot-boss-threat.kind-lava.is-burning{animation:none}}
        .toybot-enemy-target{position:absolute;left:50%;top:56%;height:7%;width:20%;border:1px dashed #ffb86d;border-radius:50%;transform:translateX(-50%);z-index:2;background:radial-gradient(ellipse,#ff965b22,transparent 70%);box-shadow:0 0 10px #ff986633;pointer-events:none}
        .toybot-enemy-target:after{content:"";position:absolute;bottom:-4px;left:10%;width:var(--warning-fill);max-width:80%;height:2px;background:#ffb47c}
        .toybot-enemy-target.attack-shockwave{top:45%;height:18%;border-radius:5px;border-color:#ffda83;background:repeating-linear-gradient(180deg,transparent 0 16px,#ffd67a33 17px 20px)}
        .toybot-enemy-target.attack-pounce{border-color:#ff826e;background:#ff76551a}.toybot-enemy-target.is-live{border-style:solid;box-shadow:0 0 16px #ff986666}
        .toybot-enemy-charge{position:absolute;width:34px;height:34px;transform:translate(-50%,-50%);display:grid;place-items:center;border:2px solid #ffce8d;border-radius:50%;color:#fff2ca;font-size:25px;box-shadow:0 0 13px #ffad76;pointer-events:none}
        .enemy-charging .toybot-drone-sprite,.enemy-charging .toybot-threat-art{filter:brightness(1.5) drop-shadow(0 0 9px #ffb977)}
        .toybot-enemy-bolt{position:absolute;width:24px;height:31px;transform:translate(-50%,-50%);background-size:400% 300%;background-position:0 0;filter:hue-rotate(320deg) drop-shadow(0 0 7px #ff9265);transition:left .1s linear,top .1s linear;pointer-events:none}
        .toybot-enemy-bolt.at-contact{filter:brightness(2) drop-shadow(0 0 12px #ffc891)}
        .toybot-enemy-shockwave{position:absolute;width:19%;height:17px;transform:translate(-50%,-50%);border:3px solid #fff3bb;border-radius:50%;background:#ffba4c33;box-shadow:0 0 10px #ffc04d,inset 0 0 8px #ffbc51;transition:top .1s linear;pointer-events:none}
        .toybot-boss-top-hud{top:126px;left:16px;right:16px;width:auto;transform:none;padding:7px 10px;z-index:5;text-align:left;pointer-events:none}
        .toybot-boss-top-hud small{margin-top:0}.toybot-boss-top-hud .toybot-attack-name{position:absolute;right:10px;top:7px;margin:0;font-size:10px}
        .toybot-obstacle.boss.is-relocating{transition:left .1s linear,top .1s linear;filter:drop-shadow(0 4px 8px #59d4e788)}
        @media(max-height:680px){.toybot-boss-top-hud{top:110px}}
        @media(prefers-reduced-motion:reduce){.is-player-hit .robot-player-art,.toybot-damage-vignette{animation:none}.toybot-damage-vignette{opacity:0}}
      `}</style>

      <section className={'toybot-shell toybot-menu-system reference-v29 coating-'+(game.status==='home'?(coatingPreview??garage.coating??'stock'):(garage.coating??'stock'))+(crowdV43(game)?' is-crowded-v43':'')+(game.burstTicks>0?' has-core-active has-core-readout':'')+' core-style-'+game.mechClass + (game.narrative.radio&&canShoot(game.status)&&!game.narrative.scene?' has-story-radio':'') + (game.status!=='home'&&game.status!=='result'&&game.status!=='defeat'?' has-cockpit':'') + (game.burstTicks===0&&!game.pendingShots.some(shot=>shot.burst)&&settings.shake!==false&&!reducedMotion&&quality!=='low'&&game.feedback.some(f=>f.ticks>=4&&strongFeedbackV42(f))?' has-impact-shake':'') + ((displayStatus==='running'||displayStatus==='battle')?' has-core-control':'') + (arena ? ' in-boss-arena' : '') + (game.narrative.scene?' has-campaign-scene':'')} aria-label="Toybot Breakout game">
        {game.status !== 'home' && <div
          ref={sceneRef}
          className={`toybot-scene art-v28 sector-${game.levelIndex} formation-${formationColumns} weapon-tier-${activeWeapon} ${displayStatus === 'running' ? 'is-moving' : displayStatus === 'battle' ? 'is-battle' : displayStatus === 'defeat' ? `is-defeat ${game.defeatReason}` : ''} ${game.status === 'paused'||previewFrozen||game.finish.resumeTicks>0 ? 'is-paused' : ''} ${game.invulnerableTicks > 0 ? `is-player-hit damage-${game.damageKind}` : ''} ${arena ? 'is-arena' : ''} ${displayStatus === 'boss-intro' ? 'is-boss-intro' : displayStatus === 'boss-shift' ? 'is-boss-shift' : displayStatus === 'boss-victory' ? 'is-boss-victory' : ''}`}
          tabIndex={0}
          aria-keyshortcuts="ArrowLeft ArrowRight Space"
          aria-label="游戏场景。左右拖动或使用方向键切换三条队列，穿过随机奖励门或惩罚门，机器人会自动射击障碍和首领。"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerCancel}
          onLostPointerCapture={handlePointerCancel}
          onKeyDown={handleSceneKeyDown}
        >
          <div className={`toybot-world ${arena ? 'in-arena' : ''}`}>
          <img className="toybot-scene-background" src={MAP_ART[game.levelIndex]} alt="" aria-hidden="true" draggable={false} />
          <RoadWorldV37 level={game.levelIndex}/><div className="toybot-sun" />
          <div className="toybot-cloud" />
          <div className="toybot-cloud c2" />
          <div className="toybot-hills" />
          <div className="toybot-factory left" />
          <div className="toybot-factory right" />
          <div className="toybot-road" />
          <ExperienceLayer game={game} low={quality==='low'} reduced={reducedMotion} shake={settings.shake!==false&&quality!=='low'}/><div className="toybot-road-flow" aria-hidden="true" />
          <div className="toybot-track-guides" aria-hidden="true" /><div className="toybot-reference-lanes" aria-hidden="true"><i/><i/></div>
          <div className="toybot-lane">
            <ArtDetails game={game} low={quality==='low'} reduced={reducedMotion}/>
            <StoryRelay game={game}/><OperationsLayer game={game}/>
            <div className="toybot-selected-lane" style={{ left: `${LANE_CENTERS[game.lane]}%` }} />
            {showRewardGates && (
              <>
                {!game.gateResolved && gateApproach > .5 && gateOptions.map(option => <span key={option.id} className={`toybot-gate-cross-line ${option.polarity}`} style={{ left: LANE_CENTERS[option.lane] + '%', top: GATE_CONTACT_Y + '%' }} aria-hidden="true" />)}
                {gateOptions.map((option,optionIndex) => (
                  <div
                    key={`${game.gate}-${option.id}`} data-motion="gate" data-motion-id={optionIndex}
                    className={`toybot-gate-door ${option.polarity} ${game.gateResolved ? game.gateCollected ? 'resolved collected' : 'resolved missed' : game.lane === option.lane ? 'active-lane' : ''} ${gateApproach >= .62 ? 'ready' : ''}`}
                    style={{ left: laneXAt(option.lane, gateY - 5) + '%', top: gateY + '%', '--gate-scale': .85 + gateApproach * .3, backgroundImage: `url(${GATE_ART})`, zIndex: Math.round(gateY * 10), backgroundPosition: ((game.gateResolved ? game.gateCollected ? 2 : 3 : 1) * 100 / 3) + '% ' + (option.polarity === 'reward' ? '0%' : '100%') } as React.CSSProperties}
                    aria-label={`第 ${(option.lane ?? 1) + 1} 队列：${option.polarity === 'reward' ? '奖励' : '惩罚'}，${option.title}，${gateEffectDetail(game, option)}`}
                    role="img"
                  >

                    <b>{option.icon}</b>
                    <strong>{option.title}</strong>{option.effect==='riskyWeapon'&&<small className="gate-cost-v40">下批6敌耐久+50%</small>}
                  </div>
                ))}
              </>
            )}
            {visibleHazards.map(h => (
              <div key={h.index} data-motion="hazard" data-motion-id={h.index} className={`toybot-hazard enemy-kind-${h.kind ?? 'drone'} ${game.tactics.riskIds.includes(h.index)?'is-risk-v40':''} sector-enemy-${game.levelIndex} ${h.elite?'is-sector-elite':''} ${(game.roadImpacts[h.index]?.fracture??0)>0?'is-fractured':''} ${(game.roadImpacts[h.index]?.stun??0)>0?'is-staggered':''} ${h.horde?'is-horde':''} elite-${h.eliteRole??'none'} ${guardSourceFor(game,h.index)>=0?'is-guarded':''} ${commanderFor(game,h.index)>=0?'is-commanded':''} ${h.hp<hazardMaxHpFor(game,h.index)?'is-damaged':''} ${game.medicPulses.includes(h.index) ? 'is-repairing' : ''} ${h.armor ? 'is-armored' : ''} ${game.enemyAttacks.some(a => a.source === 'hazard' && a.sourceId === h.index && a.phase === 'warning') ? 'enemy-charging' : ''}`} style={{ left: h.x + '%', top: h.y + '%', '--enemy-offset': (h.slot??h.index)*-97+'ms', '--hazard-scale': .72 + (h.y - 39) / 19 * .34, zIndex: Math.round((h.y + 4) * 10) } as React.CSSProperties} role="img" aria-label={roadEnemyName(game.levelIndex,h)}>
                <div className="toybot-drone-sprite hostile-v31-body" style={{backgroundImage:`url(${ENEMY_MOTION_V31[h.kind??'drone']})`,backgroundSize:'800% 400%',backgroundPosition:'0% 0%'}} aria-hidden="true" />{h.eliteRole&&<small className="toybot-elite-tag">{h.elite?roadEnemyName(game.levelIndex,h):eliteRoleName(h.eliteRole)}</small>}{guardSourceFor(game,h.index)>=0&&<span className="toybot-guard-link" aria-label="护卫减伤35%">⬡</span>}
                {h.kind && h.kind !== 'swarm' && !h.horde && !h.elite && <small className="toybot-enemy-role">{roadEnemyName(game.levelIndex,h)}</small>}
                {h.kind === 'medic' && <span className="toybot-medic-pulse" aria-hidden="true">✚</span>}
                {game.tactics.riskIds.includes(h.index)&&<small className="risk-tag-v40">强化×1.5</small>}{!!h.armor && <span className="toybot-enemy-armor" aria-label={`装甲 ${h.armor}`}>⬡{h.armor}</span>}
                <div className="toybot-hazard-hp" aria-label={`障碍耐久 ${h.hp}/${h.hp > 0 ? hazardMaxHpFor(game,h.index) : 0}`}><span style={{ width: h.hp / hazardMaxHpFor(game,h.index) * 100 + '%' }} /></div>
              </div>
            ))}
            {game.comboTicks > 0 && game.combo >= 2 && !arena && <div className={'toybot-combo'+(game.comboRewardTicks>0?' has-reward':'')} role="status" aria-live="off"><b>{game.combo}<small> 连击</small></b><span>{game.comboRewardTicks>0?comboFeedback:`击破 ${game.kills} · 积分 ×${(1 + Math.min(3, Math.floor(game.combo / 3)) * .25).toFixed(2)}`}</span><i style={{ scale: `${game.comboTicks / COMBO_WINDOW_TICKS} 1` }} /></div>}
            {(quality==='low'?game.killEffects.slice(-3):game.killEffects.slice(-8)).map(effect => <div key={effect.id} data-world-y={effect.y} className={'toybot-enemy-break kind-' + effect.kind} style={{ left: effect.x + '%', top: effect.y + '%', '--break-progress': (7 - effect.ticks) / 7, zIndex: Math.round((effect.y + 7) * 10) + 5 } as React.CSSProperties} aria-hidden="true"><span />{effect.id>=game.killSequence-2&&(effect.combo<3||effect.combo%3===0)&&<b>{effect.combo >= 3 ? effect.combo + ' 连击' : '击破'}</b>}</div>)}
            {readableCoreImpacts(game.coreDetonations).map(effect=><span key={effect.id} data-world-y={effect.y} className={'toybot-core-detonation reaction-'+(effect.kind??'blast')} style={{'--detonation-age':(6-effect.ticks)/6,left:effect.x+'%',top:effect.y+'%',opacity:effect.ticks/6,scale:1+(6-effect.ticks)/6,zIndex:Math.round((effect.y+8)*10)} as React.CSSProperties} aria-hidden="true"/>)}
            {game.enemyAttacks.map(attack => {
              const progress = attack.phase === 'flight' ? 1 - attack.ticks / attack.duration : 0;
              const fromX = attack.fromX ?? laneXAt(attack.fromLane, attack.fromY);
              const x = fromX + (LANE_CENTERS[attack.lane] - fromX) * progress;
              const y = attack.fromY + (59 - attack.fromY) * progress;
              const angle = Math.atan2((LANE_CENTERS[attack.lane] - fromX) * .56, Math.max(1, 59 - attack.fromY)) * -180 / Math.PI;
              return <React.Fragment key={attack.id}>
                {attack.phase!=='field'&&<div className={'toybot-enemy-target attack-' + attack.kind + (attack.phase === 'flight' ? ' is-live' : '')} style={{ left: LANE_CENTERS[attack.lane] + '%', '--warning-fill': (1 - attack.ticks / attack.duration) * 100 + '%' } as React.CSSProperties} role="img" aria-label={attack.kind in ELITE_ATTACKS?ELITE_ATTACKS[attack.kind as ElitePattern].name+'，离开标记轨道':attack.kind === 'sniper-shot' ? '狙击锁定，离开标记轨道' : attack.kind === 'bombard' ? '双列轰炸，前往空白轨道' : attack.kind === 'charge' ? '敌人锁定突袭，击破或换道' : attack.kind === 'drone-burst' ? '无人机锁定轨道，准备连射' : attack.kind === 'shockwave' ? '路障电磁冲击波，离开该轨道' : '小机器人准备扑击，击毁或换道'} />}
                {attack.phase === 'warning' && <span data-world-y={attack.fromY} className="toybot-enemy-charge" style={{ left: fromX + '%', top: attack.fromY + '%', zIndex: Math.round((attack.fromY + 5) * 10) }} aria-hidden="true">{attack.kind === 'drone-burst' || attack.kind === 'sniper-shot' ? '⌖' : attack.kind === 'bombard' ? '◎' : attack.kind === 'shockwave' ? 'ϟ' : '»'}</span>}
                {attack.phase === 'flight' && ['drone-burst', 'sniper-shot', 'bombard','heat-mine','hunter-fan','storm-orb','royal-salvo'].includes(attack.kind) && <div data-motion="enemy-bolt" data-motion-id={attack.id} className={'toybot-enemy-bolt bolt-' + attack.kind + (attack.ticks <= 1 ? ' at-contact' : '')} style={{ left: x + '%', top: y + '%', rotate: angle + 'deg', zIndex: Math.round((y + 5) * 10) + 4, backgroundImage: 'url(' + THREAT_ART + ')' }} aria-hidden="true" />}
                {attack.phase==='field'&&<div className={'toybot-road-field kind-'+attack.kind} style={{left:LANE_CENTERS[attack.lane]+'%'}} role="img" aria-label={attack.kind==='heat-mine'?'熔焰地面，换道避开持续灼烧':'导电球场，换道避开干扰'}><span/><b>{attack.kind==='heat-mine'?'灼烧':'导电'}</b><i style={{width:attack.ticks/attack.duration*100+'%'}}/></div>}
                {attack.phase==='flight'&&attack.kind==='siege-laser'&&<div className="toybot-road-rail" style={{left:LANE_CENTERS[attack.lane]+'%'}} role="img" aria-label="重轨炮正在射击该轨道"/>}
                {attack.phase === 'flight' && attack.kind === 'shockwave' && <div data-world-y={y} className="toybot-enemy-shockwave" style={{ left: laneXAt(attack.lane, y) + '%', top: y + '%', zIndex: Math.round((y + 5) * 10) + 4 }} aria-hidden="true" />}
              </React.Fragment>;
            })}
            {coreMuzzlesV34(game.pendingShots).map(shot=><span key={'core-muzzle-'+shot.id} data-motion="core-pulse-muzzle" data-motion-id={shot.id} className={'core-pulse-muzzle fx-'+shot.attackStyle+(signatureShotV34(shot)?' is-signature':'')+(shot.count>=5?' is-large-squad':'')} style={{left:shot.origins[0].x+'%',top:shot.origins[0].y+'%',zIndex:Math.round((shot.origins[0].y+7)*10)}} aria-hidden="true"><i className="core-pulse-muzzle-art" style={{backgroundImage:`url(${CORE_FX_V34[shot.attackStyle??game.mechClass]})`,backgroundPosition:atlasCell(0,0,8,3)}}/></span>)}
            {coreVisualShots(game.pendingShots).map((volley) => (
              <React.Fragment key={volley.id}>
                {volley.origins.map((origin) => {
                  const size = volley.count <= 1 ? '68px' : volley.count <= 4 ? 'clamp(58px,20.55vw,82px)' : 'clamp(27px,9.8vw,38px)';

                  if(volley.burst)return <div key={origin.index} data-motion="core-pulse" data-motion-id={volley.id} className={'core-pulse-flight fx-'+volley.attackStyle+(signatureShotV34(volley)?' is-signature':'')+(volley.count>=5?' is-large-squad':'')} style={{left:origin.x+'%',top:origin.y+'%',zIndex:depthForPulse(volley)}} aria-hidden="true"><span className="core-pulse-flight-art" style={{backgroundImage:`url(${CORE_FX_V34[volley.attackStyle??game.mechClass]})`,backgroundPosition:atlasCell(0,1,8,3)}}/><i className="core-pulse-vortex" style={{backgroundImage:`url(${CORE_FX_V34[volley.attackStyle??game.mechClass]})`,backgroundPosition:atlasCell(0,0,8,3)}}/><i className="core-pulse-wake" style={{backgroundImage:`url(${CORE_FX_V34[volley.attackStyle??game.mechClass]})`,backgroundPosition:atlasCell(0,1,8,3)}}/></div>;
                  if (volley.attackStyle === 'blade'&&!volley.burst) {
                    if (!volley.target || game.lane !== volley.lane) return null;
                    const y = targetY(game, volley.target, volley.targetIndex);
                    const tier = Math.min(3, volley.weaponLevel + Math.min(1, game.armorLevel) + Math.min(1, visualCore));
                    return <div key={origin.index} data-motion="slash" data-motion-id={volley.id} className={'toybot-melee-slash'+(volley.finisher?' is-finisher':'')+(volley.burst?' is-core-burst-slash':'')+(volley.burn?' has-burn-module':'')+(volley.arc?' has-arc-module':'')} style={{ left: (targetWorldX(game, volley.target, volley.targetIndex,volley.lane) + (origin.x - LANE_CENTERS[volley.lane]) * .22) + '%', top: y + '%', backgroundImage: 'url(' + BLADE_SLASH_ART + ')', backgroundPosition: ((volley.duration - volley.ticks) * 100 / 3) + '% ' + (tier * 100 / 3) + '%', zIndex: Math.round((y + 7) * 10) + 7 }} aria-hidden="true" />;
                  }
                  const tier = volley.charged || volley.weaponLevel >= 4 ? 'weapon-ultimate' : volley.weaponLevel >= 3 ? 'weapon-heavy weapon-overdrive' : volley.weaponLevel >= 2 ? 'weapon-heavy' : volley.weaponLevel > 0 ? 'weapon-powered' : '';
                  const flightProgress = (volley.duration - volley.ticks) / volley.duration;
                  // Origins are captured when firing, so changing lanes or losing
                  // a squad member cannot teleport projectiles already in flight.
                  const destinationY = volley.target ? targetY(game, volley.target, volley.targetIndex) : volley.y;
                  const targetX = volley.target ? targetWorldX(game, volley.target, volley.targetIndex,volley.lane) : volley.targetIndex >= 0 || volley.burst ? laneXAt(volley.lane, destinationY) : 50;
                  const angle = Math.atan2((targetX - origin.x) * .56, Math.max(1, origin.y - destinationY)) * 180 / Math.PI;
                  const depth = Math.round((origin.y + (destinationY - origin.y) * flightProgress + 5) * 10) + 2;
                  const lift = volley.muzzle||volley.burst&&!volley.splashDone ? size : '0px';
                  const top = `calc(${origin.y + (destinationY - origin.y) * flightProgress}% - ${lift} * ${(1 - flightProgress) / 4})`;
                  return <React.Fragment key={`${volley.id}-${origin.index}`}>
                    {volley.muzzle && volley.ticks === volley.duration && <div data-motion="muzzle" data-motion-id={volley.id} className="toybot-muzzle-event" style={{ left: `${origin.x}%`, top: `calc(${origin.y}% - ${size} / 4)` }} aria-hidden="true"><span className="toybot-muzzle-flash center" /></div>}
                    <div data-motion="shot" data-motion-id={volley.id} className={`toybot-shot in-flight ${volley.attackStyle === 'heavy' ? 'is-heavy-round' : ''} ${tier}${volley.count >= 5 ? ' is-swarm' : ''}${volley.burst&&volley.attackStyle==='blade'?' is-core-blade-wave':''}${volley.burst&&volley.attackStyle==='heavy'?' is-core-siege-shell':''}${volley.focused ? ' is-focused' : ''}${volley.charged ? ' is-charged' : ''}${volley.burst ? ' is-core-burst-shot' : ''}${volley.arc?' has-arc-module':''}${volley.burn?' has-burn-module':''}`} style={{ ...(volley.burst&&volley.attackStyle==='heavy'?{width:volley.count>=5?26:volley.count>1?34:46,height:volley.count>=5?26:volley.count>1?34:46}:volley.burst&&volley.attackStyle==='blade'?{width:volley.count>=5?38:volley.count>1?50:66,height:volley.count>=5?32:volley.count>1?44:56}:{}),left: `${origin.x + (targetX - origin.x) * flightProgress}%`, top, '--shot-lift':lift,'--flight-from-x': origin.x + '%', '--flight-to-x': targetX + '%', '--flight-from-y': `calc(${origin.y}% - ${lift} / 4)`, '--flight-to-y': destinationY + '%', '--flight-duration': volley.duration * STEP_MS + 'ms', '--flight-angle': angle + 'deg', '--flight-end-scale': volley.target ? '.65' : '.22', '--flight-end-opacity': volley.target ? '1' : '0', zIndex: depth } as React.CSSProperties} aria-hidden="true">
                      {volley.burst&&volley.attackStyle==='heavy'?<span className="core-heavy-round"><ProjectileArt heavy level={4}/></span>:volley.burst?<span className="toybot-core-attack-art" style={{backgroundImage:`url(${CORE_EFFECT_ART})`,backgroundPosition:volley.attackStyle==='heavy'?'50% 50%':'100% 50%'}}/>:volley.fusion?<FusionSprite fusion={volley.fusion} projectile/>:<ProjectileArt heavy={volley.attackStyle === 'heavy'} level={volley.charged || volley.burst ? 4 : volley.focused?Math.max(1,volley.weaponLevel):volley.weaponLevel} />}
                    </div>
                  </React.Fragment>;
                })}
              </React.Fragment>
            ))}
            {game.impactSequence > 0 && (
              <div
                data-world-y={game.impactY} data-world-boss={game.impactTarget==='boss'} className={`toybot-impact-event mech-hit-${game.mechClass} power-${Math.min(4, game.impactWeaponLevel)}`}
                key={`impact-${game.impactSequence}`}
                style={{ left: game.impactX + '%', top: `${game.impactY}%`, zIndex: Math.round((game.impactY + 7) * 10) + 6 }}
                aria-hidden="true"
              >
                {game.mechClass === 'blade' ? <div className="toybot-melee-finisher" style={{ backgroundImage: 'url(' + BLADE_SLASH_ART + ')', backgroundPosition: '100% ' + Math.min(3, activeWeapon + Math.min(1, game.armorLevel) + Math.min(1, visualCore)) * 100 / 3 + '%' }} /> : <div className="toybot-impact-burst" />}
                {(game.impactDamage>=3||game.impactTarget==='boss'||game.feedback.some(f=>f.id===game.feedbackSequence&&f.kind!=='hit'))&&<b className="toybot-hit-damage">−{Number(game.impactDamage.toFixed(2))}</b>}
              </div>
            )}
            {game.damageSequence > 0 && <div className="toybot-squad-hit" key={`squad-hit-${game.damageSequence}`} style={{ left: `${LANE_CENTERS[game.damageLane]}%` }} aria-hidden="true">{game.damageKind === 'shield' ? '护盾格挡' : game.damageKind === 'armor' ? `装甲吸收 ${game.damageAbsorbed}` : game.damageKind === 'squad' ? `−${game.damageLoss} 台` : `−${game.damageLoss} HP`}</div>}
            {game.burns.map(burn => {
              const y = targetY(game, burn.target, burn.index);
              return <span key={burn.target + '-' + burn.index} data-world-y={y} data-world-boss={burn.target==='boss'} className="toybot-burn-effect" style={{ left: laneXAt(burn.lane, y) + '%', top: y + '%', zIndex: Math.round((y + 7) * 10) + 4 }} aria-hidden="true" />;
            })}
            {game.threats.filter(threat => threat.hp !== 0).map(threat => {
              const progress = 1 - threat.ticks / threat.duration, y = enemyThreatY(game, threat);
              if(threat.kind==='lava'&&['vents','smelt'].includes(game.bossAttack))return <div key={threat.id} className="toybot-furnace-zone" style={{left:LANE_CENTERS[threat.lane]+'%'}} role="img" aria-label="熔炉喷口，离开橙色地面"><span style={{backgroundImage:`url(${BOSS_OBJECTIVE_ART})`}} /></div>;
              if (threat.kind in OBJECTIVE_NAMES) {
                const kind=threat.kind as keyof typeof OBJECTIVE_NAMES;
                const cell={egg:1,tether:2,pylon:3,wall:4,orb:5,seal:6,field:7}[kind];
                if(kind==='field') return <div key={threat.id} className={`toybot-skill-field sector-${game.levelIndex}`} style={{left:LANE_CENTERS[threat.lane]+'%'}} role="img" aria-label={OBJECTIVE_NAMES.field}><span style={{backgroundImage:`url(${BOSS_OBJECTIVE_ART})`}} /></div>;
                return <div key={threat.id} data-motion="threat" data-motion-id={threat.id} className={'toybot-skill-object is-targetable-v43 kind-'+kind} style={{left:enemyThreatX(game,threat)+'%',top:y+'%',zIndex:Math.round((y+8)*10)}} role="img" aria-label={OBJECTIVE_NAMES[kind]}>
                  <span className="toybot-skill-object-art" style={{backgroundImage:`url(${BOSS_OBJECTIVE_ART})`,backgroundPosition:(cell%4*100/3)+'% '+(cell>=4?100:0)+'%'}} />
                  {threat.maxHp>0&&<span className="toybot-threat-hp"><i style={{width:threat.hp/threat.maxHp*100+'%'}} /></span>}
                  <i className="toybot-skill-countdown" style={{scale:`${threat.ticks/threat.duration} 1`}} />
                  <small>{kind==='egg'?'孵化':kind==='tether'?'汲能':kind==='pylon'?'护盾':kind==='orb'?'击破断电':kind==='seal'?'王权符印':'盾墙'}</small>
                </div>;
              }
              const fromX = laneXAt(threat.fromLane, threat.originY ?? 43), toX = LANE_CENTERS[game.enemyAttacks.find(a=>a.source==='threat'&&a.sourceId===threat.id&&a.kind==='pounce')?.lane??threat.lane];
              const x = threat.kind === 'shell' ? fromX + (toX - fromX) * progress : enemyThreatX(game,threat);
              const row = threat.kind === 'shell' || threat.kind === 'lava' ? 0 : threat.kind === 'barrier' ? 1 : 2;
              if (threat.kind === 'beam') return <div key={threat.id} className={"toybot-storm-beam " + (threat.ticks <= 2 ? 'is-firing' : '')} style={{ left: toX + '%', zIndex: 700 }} role="img" aria-label="风暴能量束，离开紫色轨道" />;
              return <React.Fragment key={threat.id}>
                <span data-world-y={59} className={`toybot-threat-landing ${threat.kind}`} style={{ left: toX + '%', top: '59%', opacity: .18 + progress * .52 }} aria-hidden="true" />
                <div data-motion="threat" data-motion-id={threat.id} className={`toybot-boss-threat ${threat.maxHp>0?'is-targetable-v43':''} kind-${threat.kind} ${threat.kind === 'lava' && threat.ticks === 0 ? 'is-burning' : ''} ${game.enemyAttacks.some(a => a.source === 'threat' && a.sourceId === threat.id && a.phase === 'warning') ? 'enemy-charging' : ''} sector-${game.levelIndex}`} style={{ left: x + '%', top: y + '%', '--threat-scale': .58 + progress * .5, zIndex: Math.round((y + 5) * 10) + 3 } as React.CSSProperties} role="img" aria-label={threat.kind === 'lava' ? '熔岩炮，落地后持续灼烧' : threat.kind === 'shell' ? '首领炮弹，切换轨道躲避' : threat.kind === 'barrier' ? '可射击破坏的路障' : '可射击的小型机器人'}>
                  {threat.kind==='minion'||threat.kind==='barrier'?<span className="toybot-threat-art hostile-v31-body" style={{backgroundImage:`url(${ENEMY_MOTION_V31[threat.kind==='barrier'?'barrier':'minion']})`,backgroundSize:'800% 400%',backgroundPosition:'0% 0%'}}/>:<span className="toybot-threat-art" style={{ backgroundImage: `url(${THREAT_ART})`, backgroundPositionY: (row * 50) + '%' }} />}
                  {threat.maxHp > 0 && <span className="toybot-threat-hp"><i style={{ width: threat.hp / threat.maxHp * 100 + '%' }} /></span>}
                </div>
              </React.Fragment>;
            })}
            {displayStatus === 'battle' && (phase === 'warning' || (phase === 'attack' && !(game.bossAttack in SPECIAL_LABELS))) && game.bossAttackLanes.map(lane => (
              <div key={lane} className={`toybot-boss-strike-lane attack-${game.bossAttack} ${isRush(game) ? 'rush-path' : ''} ${phase === 'attack' ? 'striking' : ''}`} style={{ left: LANE_CENTERS[lane] + '%' }} aria-hidden="true" />
            ))}
            {showEncounter && (
              <>
                <div data-motion="boss" className={`toybot-obstacle boss ${game.levelIndex===4?'is-final-colossus':''} ${displayStatus === 'boss-victory' ? 'is-destroyed' : arena ? `fighting phase-${phase}` : 'phase-shield'} ${enrage > 0 ? 'is-enraged' : ''} ${game.bossStep === 'rush' ? 'is-rushing' : ''} ${game.bossMoveTicks > 0 ? 'is-relocating' : ''}`} style={{ left: bossX(game) + '%', top: `${bossTop}%`, width: `${bossPixels(game) * (rushVisual && game.bossAttack === 'sweep' ? 1.35 : 1)}px`, '--boss-scale': bossScale, zIndex: displayStatus==='running'?300:Math.round((bossTop + 7) * 10) } as React.CSSProperties}>
                  <div className="robot-boss-sprite hostile-v31-body" style={{backgroundImage:`url(${game.levelIndex===4?EMPEROR_ART_V36:BOSS_MOTION_V31[game.levelIndex]})`,backgroundSize:game.levelIndex===4?'800% 400%':'800% 800%',backgroundPosition:'0% 0%'}}><BossMountedParts game={game}/></div>
                  {bossGuarded(game)&&<span className="boss-linked-shield"><small>击破连接节点</small></span>}
                  {game.status === 'battle' && phase === 'weak' && <span className="toybot-boss-weakpoint" aria-label="弱点暴露" />}
                </div>
                {!arena && game.status === 'running' && encounterProgress !== undefined && game.progress >= encounterProgress - 5 && (
                  <div className="toybot-approach-banner" aria-live="polite">
                    <strong>⚠ 首领即将出现</strong><small>{encounterLabel}</small>
                  </div>
                )}
              </>
            )}
            {robotPositions.map((robot) => (
              <div
                key={robot.index} data-motion="robot" data-motion-id={robot.index}
                className={`toybot-robot ${game.upgradeFx?.positive?'is-equipment-deploying':''} ${game.burstTicks>0?'is-core-burst':''} ${game.dodgeTicks>0?'is-dodging':''} ${robot.index === 0 ? 'lead' : ''}`}
                style={{ left: `${robot.x}%`, top: `${robot.y}%`, zIndex: Math.round((robot.y + 5) * 10) }}
              >
                <Robot awakened={game.burstTicks>0} mechClass={game.mechClass} combat={arena} dodging={game.dodgeTicks > 0} dodgeDirection={game.dodgeDirection} motionFrame={(motionFrame + robot.index) % 4} attacking={attackActive && game.dodgeTicks === 0} index={robot.index} weaponPhase={weaponPhase} firing={canShoot(displayStatus ?? 'home') && game.fireCooldown === attackInterval} weaponLevel={activeWeapon} armorLevel={game.armorLevel} coreLevel={visualCore} />
                {game.mechClass==='heavy'&&canShoot(game.status)&&game.fireCooldown>0&&game.fireCooldown<=3&&game.dodgeTicks===0&&<span className="toybot-charge-orbit" aria-hidden="true"/>}
                <DefenseVfx game={game} index={robot.index} reduced={quality==='low'||reducedMotion}/>

              </div>
            ))}
            {game.damageSequence > 0 && <div key={`damage-vignette-${game.damageSequence}`} className={`toybot-damage-vignette damage-${game.damageKind}`} aria-hidden="true" />}

            {arena&&game.evadeTicks>0&&<span key={game.evadeSequence} className="toybot-evade-success" style={{left:LANE_CENTERS[game.lane]+'%'}} role="status">{game.ops.perfectTicks>0?'完美闪避':'闪避'}</span>}
            {displayStatus === 'defeat' && (
              <div className={`toybot-defeat-scene ${game.defeatReason}`} style={{ '--defeat-lane': `${LANE_CENTERS[game.lane]}%` } as React.CSSProperties} role="status" aria-live="assertive">
                <span className="toybot-defeat-beam" aria-hidden="true" />
                <span className="toybot-defeat-impact" aria-hidden="true" />
                {game.bots === 0 && <div className="toybot-defeat-wreck" aria-hidden="true"><Robot mechClass={game.mechClass} index={0} weaponLevel={game.weaponLevel} armorLevel={game.armorLevel} coreLevel={visualCore} /></div>}
                <div className="toybot-defeat-caption">
                  <strong>{'小队遭到击溃'}</strong>
                  <small>{game.defeatReason === 'boss-wipe' ? '核心生命耗尽，首领挑战失败' : '核心被击毁或小队全灭，突围失败'}</small>
                </div>
              </div>
            )}
          </div>
        </div>

        </div>}

        <header className="toybot-top">
          <div className="toybot-brand"><img className="toybot-reference-logo" src={REFERENCE_LOGO} alt="玩具城突围"/><span>第 {game.levelIndex + 1} 关 · {LEVEL.title}</span></div>
          <button type="button" className="toybot-live-settings" aria-label="声音与画面设置" onClick={openSettings}>⚙</button>
          <button
            type="button"
            className="toybot-pause"
            onClick={() => dispatch({ type: game.status === 'paused' ? 'RESUME' : 'PAUSE' })}
            aria-label={game.status === 'paused' ? '继续游戏' : '暂停游戏'}
            disabled={!isActiveStatus(game.status) && game.status !== 'paused'}
          >
            {game.status === 'paused' ? '▶ 继续' : 'Ⅱ 暂停'}
          </button>
        </header>

        {game.status !== 'home' && displayStatus !== 'running' && displayStatus !== 'battle' && <button type="button" className="toybot-back" onClick={goHome}>← 游戏首页</button>}



        <div className="toybot-stats">
          <div className="toybot-pill"><small>{frontlineStage(game.levelIndex,game.progress).name}</small><b>{Math.floor(game.roadTicks/600)}:{String(Math.floor(game.roadTicks/10)%60).padStart(2,'0')}<em className="frontline-time-goal">{game.sortie?' · 短关':' / 2:00'}</em></b></div>
          <div className="toybot-pill"><small>修复分数</small><b>{game.score}</b></div>
        </div>
        <div className="toybot-meter" aria-label={`关卡进度 ${Math.floor(displayProgress)}%`}>
          <span style={{ width: `${displayProgress}%` }} />
        </div>

        {showEncounter && (arena||displayStatus==='running') && displayStatus !== 'result' && (
                    <div className="toybot-battle-banner toybot-boss-top-hud" aria-label="首领耐久">
                      <small>{phase === 'shield' ? '⬡' : phase === 'weak' ? '◉' : '⚠'} {Math.ceil(bossHudHp)}/{bossHudMax} · {game.bossStage === 1 ? 'Ⅰ' : 'Ⅱ'} · {Math.floor(game.battleTime / 600)}:{String(Math.floor(game.battleTime / 10) % 60).padStart(2, '0')}{enrage > 0 ? ` · ⚡${enrage}` : ''}</small>
                      {displayStatus==='battle'&&game.tactics.windowTicks>0&&<b className="boss-window-v40">规避成功 · 易伤 +65% · {(game.tactics.windowTicks/10).toFixed(1)}s</b>}{displayStatus === 'battle' && phase === 'warning' && <b className="toybot-attack-name">{bossAttackLabel(game)}</b>}
                      <div className="toybot-battle-meter"><i className="toybot-half-hp-mark" /><span style={{ width: `${bossHudMax ? (bossHudHp / bossHudMax) * 100 : 0}%` }} /></div>
                    </div>
        )}

        {canShoot(game.status)&&!game.narrative.scene&&<div className="toybot-story-top"><StoryMission game={game}/><StoryRadio game={game} dispatch={dispatch}/></div>}
        {!game.narrative.scene&&<><LessonCueV41 game={game}/>{game.flow.introTicks<=0&&<TacticalHudV40 game={game}/>}</>}
        {game.sortie?<SortieHudV39 game={game}/>:<OperationsHud game={game}/>}
        {game.status!=='home'&&game.status!=='result'&&game.status!=='defeat'&&<div className="toybot-bottom cockpit-bottom">
          <Cockpit game={game} blocked={!!game.narrative.scene} onMove={lane=>dispatch({type:'MOVE_LANE',lane})} onBurst={()=>dispatch({type:'ACTIVATE_BURST'})}/>
        </div>}
        {!game.narrative.scene&&<PilotFeedbackV44 game={game}/>}
        {game.finish.resumeTicks>0&&game.status!=='paused'&&<div className="resume-receipt-v42" role="status">准备继续 {(game.finish.resumeTicks/10).toFixed(1)}s · 可先换轨</div>}{game.status==='defeat'&&game.defeatTicks>=6&&<button type="button" className="defeat-skip-v42" onClick={()=>dispatch({type:'SKIP_DEFEAT'})}>跳过战败演出</button>}{!game.narrative.scene&&game.finish.receipt&&game.burstTicks===0&&game.flow.introTicks===0&&canShoot(game.status)&&<div className="skill-receipt-v42" role="status"><b>{game.finish.receipt.name} · 本次成果</b><small>技能直伤 {game.finish.receipt.damage} · 期间击破 {game.finish.receipt.kills} · {game.finish.receipt.utility}</small></div>}{!game.narrative.scene&&<CoreBurstScreen game={game} reduced={reducedMotion||quality==='low'}/>}

        {game.status === 'home' && !trainingMode && !storyView && (
          <div className={`toybot-overlay toybot-home menu-refresh ${garageOpen ? 'is-workshop' : ''}`} role="dialog" aria-modal="true" aria-labelledby={garageOpen ? 'toybot-workshop-title' : 'toybot-home-title'}>
            <img className="toybot-home-backdrop" src={UI_HANGAR_ART} decoding="async" alt="" aria-hidden="true" draggable={false} />
            {garageOpen ? <GarageWorkshop career={<CareerV44 garage={garage} level={game.levelIndex} preview={coatingPreview} onPreview={setCoatingPreview} onApply={applyCoating}/>} recommended={garageGoal??nextUpgrade(garage,game)?.id} garage={garage} onUnlock={unlock} onToggle={toggleEquip} onEquipAll={() => setGarage(current => equipAllUpgrades(current))} onSelectMech={id => setGarage(current => ({ ...current, mechClass: id }))} onBack={() => setGarageOpen(false)} /> :
            <div className="toybot-home-content">
              <header className="menu-commandbar">
                <button type="button" className="menu-square-button menu-back" onClick={() => navigate('/home')} aria-label="返回游戏列表">‹</button>
                <div className="menu-currency"><MenuIcon name="garage"/><span><small>零件</small><b>{garage.parts.toLocaleString()}</b></span></div>
                <div className="menu-currency menu-best"><span className="menu-cup" aria-hidden="true">★</span><span><small>最高分</small><b>{garage.bestScore.toLocaleString()}</b></span></div>
                <button type="button" className="menu-square-button" onClick={openSettings} aria-label="声音与画面设置"><MenuIcon name="settings"/></button>
              </header>
              <div className="toybot-home-hero">
                <div className="toybot-home-heading"><div className="toybot-home-kicker">TOYBOT / 五区15项作战</div><h1 id="toybot-home-title">玩具城突围</h1><p className="toybot-home-subtitle">归航行动 · 把伙伴接回来</p></div>
                <button type="button" className="menu-world-shortcut" onClick={()=>setStoryView('world')}><MenuIcon name="world"/><span>世界档案</span></button>
                <MechShowcase mechClass={garage.mechClass} weapon={garage.equipped.weapon} armor={garage.equipped.armor} core={garage.equipped.core} className="toybot-home-mech" />
                <div className="toybot-mech-caption"><small>{mechSpec(garage.mechClass).role} / 出击机型</small><b>{mechSpec(garage.mechClass).name}</b><small>{coreSkill(garage.mechClass).name}</small></div>
                <div className="toybot-home-equipped">
                  <span className={garage.equipped.weapon?'is-equipped':''}>武器 <b>{garage.equipped.weapon?'Lv.'+moduleLevel(garage,'weapon'):'基础'}</b></span>
                  <span className={garage.equipped.armor?'is-equipped':''}>装甲 <b>{garage.equipped.armor?'Lv.'+moduleLevel(garage,'armor'):'基础'}</b></span>
                  <span className={garage.equipped.core?'is-equipped':''}>核心 <b>{garage.equipped.core?'Lv.'+moduleLevel(garage,'core'):'基础'}</b></span>
                </div>
              </div>
              <div className="toybot-home-dashboard">
                <div className="toybot-mission-heading"><span className="menu-sector-number">{String(game.levelIndex+1).padStart(2,'0')}</span><div><small>{selectedSortie?'短关任务 · '+selectedSortie.name:'主线任务 · '+STORY_CHAPTERS[game.levelIndex].title}</small><b>{LEVEL.title}</b></div><span className="menu-sector-status">{selectedSortie?(garage.sortieClears??[]).includes(selectedSortie.key)?'已完成':'待挑战':garage.completedLevels[game.levelIndex]?'已通关':'待突破'}</span></div>
                <div className="toybot-level-select" role="group" aria-label="选择关卡">{LEVELS.map((level, index) => <button key={level.title} type="button" disabled={!canEnterLevel(garage,index)} title={!canEnterLevel(garage,index) ? '请先通关第 ' + index + ' 关' : garage.completedLevels[index] ? '已通关，可再次挑战' : '已解锁，可以挑战'} aria-pressed={game.levelIndex === index} aria-label={`第 ${index + 1} 关 ${level.title}`} onClick={() => dispatch({ type: 'SELECT_LEVEL', levelIndex: index, garage })}><b>{String(index + 1).padStart(2, '0')}</b><small>{!canEnterLevel(garage,index) ? '未解锁' : garage.completedLevels[index] ? '已通关' : '可挑战'}</small></button>)}</div>
                <SortieSelectorV39 garage={garage} level={game.levelIndex} selected={selectedSortie?.key??null} onSelect={setSortieChoice}/>{!selectedSortie&&<ChallengePicker game={game} garage={garage} onSelect={protocol=>dispatch({type:'SET_PROTOCOL',protocol,garage})}/>}{!selectedSortie&&<TrialPickerV40 game={game} garage={garage} onSelect={trial=>dispatch({type:'SET_TRIAL',trial,garage})}/>}<TrialBadgeV40 garage={garage}/><p className="toybot-home-story-objective">{selectedSortie?selectedSortie.name+' · '+sortieGoalV39(selectedSortie)+' · 首通额外零件':STORY_CHAPTERS[game.levelIndex].objective}</p>
                <CareerV44 garage={garage} level={game.levelIndex} preview={coatingPreview} onPreview={setCoatingPreview} onApply={applyCoating}/>
                <button type="button" className="toybot-primary toybot-home-start" disabled={!selectedSortie&&game.tactics.trial==='signature'&&game.mechClass!==SECTOR_MECHS[game.levelIndex]} onClick={start}><span className="menu-play" aria-hidden="true">▶</span><span>{garage.tutorialCompleted ? selectedSortie?'开始短关':'开始突围' : '开始基础训练'}<small>单机甲出发 · 自动攻击</small></span><span className="menu-launch-arrow" aria-hidden="true">››</span></button>
              </div>
              <nav className="menu-bottom-nav" aria-label="游戏功能"><span className="is-current" aria-current="page"><MenuIcon name="battle"/><b>出击</b></span><button type="button" onClick={openGarage}><MenuIcon name="garage"/><b>机库</b></button><button type="button" onClick={()=>setStoryView('comic')}><MenuIcon name="story"/><b>剧情</b></button><button type="button" onClick={()=>setTrainingMode('replay')}><MenuIcon name="training"/><b>训练</b></button></nav>
            </div>}
          </div>
        )}

        {game.status === 'paused' && (
          <div className="toybot-overlay toybot-paused menu-refresh" role="dialog" aria-modal="true" aria-labelledby="toybot-pause-title">
            <div className="toybot-pause-panel">
              <div className="toybot-pause-art" aria-hidden="true"><span className="menu-stage-code">TACTICAL LINK / HOLD</span><MechShowcase mechClass={game.mechClass} weapon={game.weaponLevel > 0} armor={game.armorLevel > 0} core={game.garageCoreLevel > 0} /><span className="menu-pause-symbol">Ⅱ</span></div>
              <div className="toybot-pause-label">MISSION ON HOLD</div>
              <h2 id="toybot-pause-title">作战暂停</h2>
              <p className="toybot-pause-context">第 {game.levelIndex + 1} 关 · {LEVEL.title}</p>
              <div className="toybot-pause-stats">
                <div><small>进度</small><strong>{Math.floor(displayProgress)}%</strong></div>
                <div><small>小队</small><strong>{game.bots} 台</strong></div>
                <div><small>核心生命</small><strong>{game.playerHp}<small> / {game.playerMaxHp}</small></strong></div>
              </div>
              <div className="toybot-pause-progress" aria-label={`当前进度 ${Math.floor(displayProgress)}%`}><span style={{ width: `${displayProgress}%` }} /></div>
              <BuildLogV41 game={game}/><p className="menu-pause-note">战场已冻结，准备好后继续出击</p>
              <button type="button" className="toybot-primary toybot-pause-resume" onClick={() => dispatch({ type: 'RESUME' })}>继续游戏 <span aria-hidden="true">›</span></button>
              <button type="button" className="toybot-pause-settings" onClick={openSettings}>声音与画面设置</button>
              <button type="button" className="toybot-pause-home" onClick={goHome}>返回游戏首页</button>
            </div>
          </div>
        )}

        {game.status === 'result' && !game.narrative.scene && (
          <div className={'toybot-overlay toybot-result ' + (game.won ? 'is-victory menu-refresh' : 'is-failure')} role="dialog" aria-modal="true" aria-labelledby="result-title">
            <div className="toybot-debrief-panel">
              <div className="toybot-debrief-topline"><span>战后报告 / 0{game.levelIndex + 1}</span><span>{game.won ? '任务完成' : '机甲回收'}</span></div>
              <div className={game.won ? 'menu-victory-art' : undefined} aria-hidden="true">{game.won ? <><img className="menu-victory-medal" src={UI_MENU_ART.medal} alt="" decoding="async" draggable={false}/><div className="toybot-v28-victory-mech"><MechShowcase mechClass={game.mechClass} weapon={activeWeapon>0} armor={game.armorLevel>0} core={visualCore>0}/><BattleWear amount={game.report.taken/Math.max(1,game.playerMaxHp)}/></div></> : <div className="toybot-result-crest" style={{ backgroundImage: 'url(' + UI_RESULT_CRESTS + ')', backgroundPositionX: '100%' }} />}</div>
              <ResultGradeV44 game={game}/><div className="toybot-debrief-kicker">{game.won ? 'MISSION COMPLETE' : 'MISSION INCOMPLETE'}</div>
              <h2 id="result-title">{game.sortie?(game.won?'短关完成':'目标未达成'):game.won ? (game.levelIndex === LEVELS.length - 1 ? '全境突破' : '突围成功') : '突围受阻'}</h2>
              <p className="toybot-result-summary">{game.sortie?game.sortie.name+' · '+sortieGoalV39(game.sortie)+' · 实际 '+sortieCountV39(game):game.won ? LEVEL.encounters[0].label + ' 已击败 · 区域安全' : game.defeatReason === 'boss-wipe' ? '核心生命耗尽，整备后再次出击' : '小队停止作战，返回机库重新整备'}</p>
              <div className="toybot-debrief-score"><span>本次作战得分</span><strong>{game.score.toLocaleString()}</strong><small>历史最佳 {garage.bestScore.toLocaleString()}</small></div>
              <div className="toybot-ops-debrief">{game.sortie?<>{sortieGoalV39(game.sortie)} · 完成 {sortieCountV39(game)}/{game.sortie.target}</>:<>任务 {game.ops.mission.status==='done'?'完成':'未完成'} · 救援 {game.ops.event.status==='done'?'成功':'未完成'} · 破阵 {game.ops.broken}/3 · 完美闪避 {game.ops.perfects}{game.won&&game.ops.protocol!=='standard'&&<b><OperationSprite cell={2}/>协议徽章已解锁</b>}</>}</div><div className="toybot-debrief-rewards"><div><small>回收零件</small><b>◈ +{previewState?resultReward:earnedParts}</b></div><div><small>当前库存</small><b>{garage.parts+(previewState?resultReward:0)}</b></div><div><small>{game.won ? '归队机甲' : '关卡进度'}</small><b>{game.won ? game.bots + ' 台' : Math.floor(game.progress) + '%'}</b></div></div>
              <p className="toybot-run-highlights">路段击破 <b>{game.kills}</b> · 最佳连击 <b>{game.bestCombo}</b> · 核心爆发 <b>{game.burstSequence}</b></p>
              {!game.won&&<button type="button" className="toybot-primary toybot-quick-retry" onClick={restart}>立即重试本关 <span aria-hidden="true">↗</span></button>}
              <BuildReportV41 game={game}/><TacticalResultV40 game={game}/>{!game.sortie&&<RunAnalysis game={game}/>}<RunGoals game={game} garage={previewState?{...garage,parts:garage.parts+resultReward}:garage} onGarage={openGarage}/>

              <div className={'toybot-debrief-actions' + (!game.won || game.levelIndex === LEVELS.length - 1 ? ' is-single-route' : '')}>
                {game.won && !game.sortie && game.levelIndex < LEVELS.length - 1 && <button type="button" className="toybot-primary" onClick={() => { setSortieChoice(null);setEarnedParts(0); dispatch({ type: 'NEXT_LEVEL', garage }); }}>前往第 {game.levelIndex + 2} 关 <span aria-hidden="true">›</span></button>}
                {game.won&&<button type="button" className={game.won && game.levelIndex < LEVELS.length - 1 ? 'toybot-secondary' : 'toybot-primary'} onClick={restart}>{game.won ? '再次挑战本关' : '重新出击'}<span aria-hidden="true">↗</span></button>}
                <button type="button" className="toybot-result-garage" onClick={openGarage}>机库整备 <span aria-hidden="true">›</span></button>
                <button type="button" className="toybot-home-exit" onClick={goHome}>返回游戏首页</button>
              </div>
            </div>
          </div>
        )}

        {game.narrative.scene&&<CampaignStory game={game} dispatch={dispatch}/>}
        {game.status==='home'&&storyView&&<StoryDialog initialMode={storyView} initialPage={storyProgress.completed?0:storyProgress.page} completedLevels={garage.completedLevels} onPage={page=>setStoryProgress(current=>({...current,page}))} onClose={completed=>{setStoryProgress(current=>finishStory(current,completed));setStoryView(null);}} />}
        {trainingMode && <Tutorial persist={!previewState} dragSensitivity={settings.dragSensitivity??1} settingsOpen={settingsOpen} onSettings={openSettings} onSound={cue => audio.current?.play(cue)} first={trainingMode === 'first'} renderMech={(index,firing) => <Robot index={index} firing={firing} />} onExit={() => setTrainingMode(null)} onComplete={() => {
          if(!previewState)clearTrainingCheckpoint();
          const updated = { ...garage, tutorialCompleted: true };
          setGarage(current => ({ ...current, tutorialCompleted: true }));
          if (trainingMode === 'first') { setEarnedParts(0); dispatch({ type:'SELECT_LEVEL', levelIndex:0, garage:updated }); dispatch({ type:'START', garage:updated }); }
          setTrainingMode(null);
        }} />}
        {settingsOpen && <PlayerSettingsPanel settings={settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} />}
      </section>
    </main>
  );
};

export default ToybotBreakout;
