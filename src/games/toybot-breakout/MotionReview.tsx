import { HostileMotionReview } from './HostileMotionReview';
/* Standalone development-only entry. Not registered as a game route. */
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Game from './index';
import { bossHealthFor, applySquadHit, applyGateEffect, createInitialState, gameReducer, RUN_SPEED, type GameState } from './simulation';
import { normalizeGarage, type Garage } from './progression';
import { makeBossParts } from './operations';
import { createCampaign, freshNarrative } from './campaign';
import { getLevel, hazardLaneAt } from './level';
import type { MechClass } from './mechs';
function seed(mechClass:MechClass,battle:boolean):GameState{
 const g=normalizeGarage({mechClass,tutorialCompleted:true,completedLevels:[true,true,true,true,true]});
 const s=createInitialState(g,1,0);Object.assign(s,{status:battle?'battle':'running',progress:battle?93:32,bots:3,weaponLevel:2,shieldCharges:1,fireCooldown:0,gate:battle?6:2,burstEnergy:100});
 if(battle){Object.assign(s,{battleHp:1800,battleMaxHp:1800,battleLane:1,bossStep:'recovery',bossStepTicks:3,bossCycle:1});s.ops.parts=makeBossParts(s);}
 return s;
}
export default function MotionReview(){
 const monitor=useRef<HTMLOutputElement>(null);
 useEffect(()=>{let last=performance.now(),frames=0;const timer=window.setInterval(()=>{const node=document.querySelector<HTMLElement>('.has-motion-clock'),count=Number(node?.dataset.motionFrames??0),now=performance.now();if(monitor.current)monitor.current.textContent=`绘制采样 ${Math.max(0,Math.round((count>=frames?count-frames:count)*1000/(now-last)))} Hz · ${node?.dataset.motionCost??'0'} ms · 对象 ${document.querySelectorAll('[data-motion]').length}`;frames=count;last=now;},1000);return()=>clearInterval(timer);},[]);
 const [mech,setMech]=useState<MechClass>('pulse'),[battle,setBattle]=useState(false),[revision,setRevision]=useState(0);
 const [hostiles,setHostiles]=useState(false);const [gallery,setGallery]=useState(false);
 const [frozen,setFrozen]=useState(false);
 const [testGarage,setTestGarage]=useState<Garage|null>(null);
 const [state,setState]=useState(()=>seed('pulse',false));
 const reset=(kind:MechClass,arena:boolean)=>{setTestGarage(null);setMech(kind);setBattle(arena);setRevision(n=>n+1);setState(seed(kind,arena));};
 const inspect=(result:boolean)=>{const sample=seed(mech,true);if(result)Object.assign(sample,{status:'result',battleHp:540,playerHp:0,bots:0,defeatReason:'boss-wipe',score:650,report:{...sample.report,dealt:1360,bossDamage:1260,taken:100,hostile:72,collisions:28}});setRevision(n=>n+1);setState(result?sample:applyGateEffect(sample,{id:'preview',title:'火力+1',detail:'升级演出预览',icon:'⚡',polarity:'reward',effect:'weaponUp',amount:1,lane:1}));};
 const frontlinePreview=(sector:number)=>{
  const g=normalizeGarage({mechClass:mech,tutorialCompleted:true,completedLevels:[true,true,true,true,true]});
  const sample=createInitialState(g,sector,0),level=getLevel(sector),elite=level.hazards.find(h=>h.elite)!;
  Object.assign(sample,{status:'running',progress:elite.progress-13.4,roadTicks:Math.round((elite.progress-13.4)/RUN_SPEED),bots:3,weaponLevel:2,fireCooldown:10000,gate:level.gateMarks.length,playerHp:1000,playerMaxHp:1000});
  setState(sample);setRevision(n=>n+1);
 };
 const playabilityPreview=(kind:'win'|'breather'|'finisher')=>{
  const sample=seed(kind==='finisher'?'blade':mech,kind!=='breather');
  if(kind==='win')Object.assign(sample,{status:'result',won:true,bossDefeated:true,progress:100,battleHp:0,tactics:{...sample.tactics,elapsed:2600},score:1500,bestCombo:26,kills:75,report:{...sample.report,elites:3,dealt:3900,bossDamage:1800,blocked:25,taken:15},ops:{...sample.ops,bonusParts:6,mission:{...sample.ops.mission,status:'done'},broken:3}});
  else if(kind==='breather')Object.assign(sample,{breatherTicks:25,report:{...sample.report,elites:1}});
  else sample.report={...sample.report,bladeReady:true,bladeCombo:3};
  setState(sample);setRevision(n=>n+1);
 };
 const artPreview=(sector:number,phase2=false)=>{const sample=seed(mech,true);Object.assign(sample,{levelIndex:sector,bossStage:phase2?2:1,battleTime:phase2?500:10,bossStep:'recovery',bossStepTicks:100,playerHp:1000,playerMaxHp:1000,fireCooldown:1000});sample.ops.parts=[];setState(gameReducer(sample,{type:'TICK'}));setRevision(n=>n+1);};
 const materialPreview=()=>{const sample=seed(mech,true);Object.assign(sample,{fireCooldown:1000,feedbackSequence:4,feedback:[{id:1,x:35,y:47,ticks:4,kind:'hit'},{id:2,x:65,y:47,ticks:4,kind:'armor'},{id:3,x:50,y:40,ticks:12,kind:'boss'}],defenseFx:{kind:'shield',exhausted:true,ticks:8,id:1},damageLane:1,damageSequence:1,killEffects:[{id:1,x:40,y:48,ticks:7,kind:'swarm',combo:1}]});setState(sample);setRevision(n=>n+1);};
 const referencePreview=()=>{const g=normalizeGarage({mechClass:'pulse',tutorialCompleted:true,completedLevels:[true,true,true,true,true]});let sample=createInitialState(g,0,0);const gateIndex=getLevel(0).gateMarks.findIndex(m=>m>=10);Object.assign(sample,{gate:gateIndex,status:'running',progress:getLevel(0).gateMarks[gateIndex]-10,bots:3,weaponLevel:0,fireCooldown:0,burstEnergy:100});const option=sample.gateChoices[gateIndex].find(o=>o.polarity==='reward')??sample.gateChoices[gateIndex][0];sample.gateChoices[gateIndex]=[{...option,lane:2}];for(let i=0;i<8;i++)sample=gameReducer(sample,{type:'TICK'});setMech('pulse');setBattle(false);setState(sample);setRevision(n=>n+1);};
 const pursuitPreview=(road=false)=>{let sample=seed(mech,!road);Object.assign(sample,{fireCooldown:1000,bots:1,lane:2,playerHp:1000,playerMaxHp:1000,breatherTicks:0});sample.ops.parts=[];
 if(road){const level=getLevel(sample.levelIndex),index=level.hazards.findIndex(h=>h.kind==='swarm'&&!h.elite);sample.progress=level.hazards[index].progress-4.9;sample.hazardHps=sample.hazardHps.map((_,i)=>i===index?50:-1);sample.gate=level.gateMarks.length;sample.lane=hazardLaneAt(sample.layoutIndex,index,sample.progress,sample.levelIndex)===2?0:2;}
 else{sample.bossStep='flight';sample.bossSalvos=0;sample.threats=[{id:900,kind:'minion',lane:0,fromLane:0,ticks:26,duration:32,hp:50,maxHp:50,damage:14}];}
 sample=gameReducer(sample,{type:'TICK'});setBattle(!road);setState(sample);setFrozen(true);setRevision(n=>n+1);};
 const scrollingPreview=()=>{const sample=seed(mech,false);Object.assign(sample,{fireCooldown:1000,progress:30,gate:getLevel(sample.levelIndex).gateMarks.length,hazardHps:sample.hazardHps.map(()=>-1),enemyAttacks:[],bots:1});sample.ops.mission.status='done';sample.ops.event.status='done';setBattle(false);setState(sample);setFrozen(true);setRevision(n=>n+1);};
 const homecomingPreview=()=>{const sample=createCampaign(createInitialState(normalizeGarage({mechClass:mech,tutorialCompleted:true,completedLevels:[true,true,true,true,true]}),0,0));sample.status='running';sample.narrative.scene={kind:'briefing',step:0,synced:0};sample.narrative.seen=['briefing'];setBattle(false);setState(sample);setFrozen(false);setRevision(n=>n+1);};
 const damagedPartsPreview=()=>{const sample=createCampaign(seed(mech,true));Object.assign(sample,{battleTime:20,fireCooldown:1000,playerHp:1000,playerMaxHp:1000,bossStep:'recovery',bossStepTicks:2});sample.ops.parts=makeBossParts(sample).map((p,i)=>({...p,hp:0,brokenAt:[20,16,0][i]}));sample.ops.broken=3;sample.narrative.seen=['briefing','confrontation','aftermath','lore','part-release'];setBattle(true);setState(sample);setFrozen(true);setRevision(n=>n+1);};
 const gateReceiptPreview=()=>{const g=normalizeGarage({tutorialCompleted:true}),sample=createInitialState(g,0,0);Object.assign(sample,{status:'running',progress:getLevel(0).gateMarks[0]-1.6,lane:1,fireCooldown:1000,hazardHps:sample.hazardHps.map(()=>-1)});sample.gateChoices[0]=[{...sample.gateChoices[0][0],id:'receipt',effect:'weaponUp',amount:1,title:'火力+1',icon:'⚡',polarity:'reward',lane:1}];setState(sample);setFrozen(true);setRevision(n=>n+1);};
 const sortieEndPreview=()=>{const g=normalizeGarage({tutorialCompleted:true}),sample=gameReducer(createInitialState(g,0,0),{type:'START_SORTIE',key:'0:0',garage:g});Object.assign(sample,{progress:42.9,kills:8,fireCooldown:1000,hazardHps:sample.hazardHps.map(()=>-1)});setState(sample);setFrozen(true);setRevision(n=>n+1);};
 const colossusPreview=()=>{const sample=seed(mech,true);Object.assign(sample,{levelIndex:4,battleLane:1,bossMoveFromLane:1,bossMoveTicks:0,bossStep:'warning',bossStepTicks:0,battleTime:0});sample.battleMaxHp=bossHealthFor(sample);sample.battleHp=sample.battleMaxHp;sample.ops.parts=makeBossParts(sample);setBattle(true);setState(sample);setFrozen(true);setRevision(n=>n+1);};
 const corePreview=()=>{let sample=seed(mech,true);sample=gameReducer(sample,{type:'ACTIVATE_BURST'});for(let i=0;i<12;i++)sample=gameReducer(sample,{type:'TICK'});setBattle(true);setState(sample);setFrozen(true);setRevision(n=>n+1);};
 const tacticsPreview=(kind:'gate'|'window'|'result'|'pulse')=>{
  let sample=seed(kind==='pulse'?'pulse':mech,kind!=='gate');
  if(kind==='gate'){
   sample=createInitialState(normalizeGarage({tutorialCompleted:true}),0,0);Object.assign(sample,{status:'running',progress:13.4,gate:1,lane:2,fireCooldown:1000,playerHp:60});
  }else if(kind==='window'){
   Object.assign(sample,{levelIndex:0,bossStep:'rush',bossStepTicks:20,bossRushHit:true,bossAttack:'rush',damageSequence:0});sample.ops.parts=[];sample=gameReducer(sample,{type:'TICK'});
  }else if(kind==='result'){
   Object.assign(sample,{levelIndex:0,status:'result',progress:100,won:true,bossDefeated:true,battleHp:0,kills:70,score:900});sample.tactics={...sample.tactics,trial:'clean',firstTrial:true,elapsed:2600,windows:4,chainKills:16,guardBreaks:2};
  }else{
   sample.threats=[0,1,2].map(lane=>({id:100+lane,kind:'shell' as const,hp:-1,maxHp:0,lane,fromLane:1,ticks:10,duration:20,damage:15}));
  }
  setState(sample);setFrozen(true);setRevision(n=>n+1);
 };
 const flowPreview=(kind:'build'|'lesson'|'failure'|'drag')=>{
  let sample=seed(mech,false);sample.flow.log=[];
  sample=applyGateEffect(sample,{id:'flow-arc',title:'电弧+1',effect:'arc',amount:1,lane:1,polarity:'reward',icon:'ϟ',detail:'电弧模块'});
  sample=applyGateEffect(sample,{id:'flow-burn',title:'燃烧+1',effect:'burn',amount:1,lane:1,polarity:'reward',icon:'♨',detail:'燃烧模块'});
  sample.tactics.elapsed=450;sample.upgradeFx=null;
  if(kind==='lesson'){
   const g=normalizeGarage({tutorialCompleted:true}),level=getLevel(0),i=level.hazards.findIndex(h=>h.elite),fresh=createInitialState(g,0,0);
   sample={...fresh,status:'running',progress:level.hazards[i].progress-13.4,hazardHps:fresh.hazardHps.map((hp,j)=>j===i?hp:-1),gate:level.gateMarks.length,fireCooldown:1000};sample=gameReducer(sample,{type:'TICK'});
  }else if(kind==='failure'){
   sample.playerHp=25;sample.shieldCharges=0;sample.armorPoints=0;applySquadHit(sample,25,'hostile','siege-laser');
   Object.assign(sample,{status:'result',won:false,defeatReason:'squad-wipe',score:600,kills:30});sample.flow.contribution={direct:320,arc:180,burn:95,burst:210,chain:75,counter:30};sample.report.dealt=910;
  }else if(kind==='drag'){
   Object.assign(sample,{bots:1,lane:1,progress:30,gate:getLevel(sample.levelIndex).gateMarks.length,hazardHps:sample.hazardHps.map(()=>-1),fireCooldown:1000});
  }
  setState(sample);setFrozen(true);setRevision(n=>n+1);
 };
 const careerPreviewV44=()=>{const g=normalizeGarage({tutorialCompleted:true,completedLevels:[true,true,true,true,true],mastery:{'0:pulse':'A'},parts:20});const sample=createInitialState(g,0,0);setTestGarage(g);setMech('pulse');setBattle(false);setState(sample);setFrozen(true);setRevision(n=>n+1);};
 const inputPreviewV44=()=>{const sample=seed(mech,true);sample.fireCooldown=1000;sample.ops.parts=[];setState(sample);setTestGarage(null);setFrozen(true);setRevision(n=>n+1);};
 const launchPreview=(kind:'novice'|'pulse'|'heavy'|'blade'|'resume'|'feedback'|'defeat')=>{
  setTestGarage(null);let sample=seed(mech,true);
  if(kind==='novice'){const g=normalizeGarage({});setTestGarage(g);sample=createInitialState(g,0,0);}
  else if(kind==='pulse'||kind==='heavy'||kind==='blade'){
   sample=seed(kind,true);setMech(kind);sample.ops.parts=kind==='heavy'?makeBossParts(sample):[];sample.threats=[0,1,2].map(lane=>({id:800+lane,kind:'shell' as const,hp:-1,maxHp:0,lane,fromLane:1,ticks:5,duration:12,damage:15}));
  }else if(kind==='resume'){sample=gameReducer(gameReducer(sample,{type:'PAUSE'}),{type:'RESUME'});}
  else if(kind==='defeat'){Object.assign(sample,{status:'defeat',defeatTicks:6,playerHp:0,bots:0,defeatReason:'boss-wipe',narrative:{...freshNarrative(),seen:['briefing','confrontation'],route:'signal',objective:'pending'}});}
  else{sample.feedback=[{id:1,x:50,y:43,ticks:4,kind:'hit'},{id:2,x:50.2,y:43,ticks:4,kind:'heavy'},{id:3,x:50,y:43,ticks:8,kind:'elite',destroyed:true},{id:4,x:32,y:47,ticks:4,kind:'armor',armorBreak:true}];sample.feedbackSequence=4;}
  setState(sample);setFrozen(true);setRevision(n=>n+1);
 };
 const homePreview=()=>{setState({...seed(mech,false),status:'home'});setRevision(n=>n+1);};
 const storyPreview=()=>{const sample=createCampaign(seed(mech,false));sample.narrative.seen=['briefing','confrontation','aftermath','lore'];sample.narrative.radio={id:'layout-preview',ticks:75,text:'米可：三条航道已接通。启动核心解放清理敌群，注意首领的蓄力预警。'};setState(sample);setRevision(n=>n+1);};
 if(hostiles)return <HostileMotionReview close={()=>setHostiles(false)}/>;
 return <MemoryRouter><div style={{maxWidth:430,margin:'0 auto',background:'#0e263c',color:'#d9f7ff',font:'11px sans-serif',padding:'6px 8px',display:gallery?'none':'flex',gap:5,flexWrap:'wrap'}}><b>动作验收 · 不写存档</b><button type="button" onClick={()=>setHostiles(true)}>敌方独立动作</button><button type="button" onClick={referencePreview}>参考构图</button><button type="button" onClick={()=>setGallery(true)}>纯画面</button><button type="button" onClick={()=>setFrozen(v=>!v)}>{frozen?'播放动作':'冻结画面'}</button><output ref={monitor} style={{width:'100%',height:14,minHeight:14}}/>{(['pulse','heavy','blade'] as const).map((kind,i)=><button key={kind} type="button" onClick={()=>reset(kind,battle)}>{['脉冲','力量','近战'][i]}</button>)}<button type="button" onClick={()=>reset(mech,!battle)}>{battle?'切到跑图':'切到首领战'}</button><button type="button" onClick={()=>reset(mech,battle)}>重置预览</button><button type="button" onClick={homePreview}>首页验收</button><button type="button" onClick={careerPreviewV44}>评级涂装</button><button type="button" onClick={inputPreviewV44}>换轨响应</button><button type="button" onClick={()=>launchPreview('novice')}>新手流程</button><button type="button" onClick={()=>launchPreview('pulse')}>清弹时机</button><button type="button" onClick={()=>launchPreview('heavy')}>破拆时机</button><button type="button" onClick={()=>launchPreview('blade')}>格挡时机</button><button type="button" onClick={()=>launchPreview('resume')}>恢复准备</button><button type="button" onClick={()=>launchPreview('feedback')}>命中层次</button><button type="button" onClick={()=>launchPreview('defeat')}>战败快进</button><button type="button" onClick={()=>flowPreview('build')}>构筑记录</button><button type="button" onClick={()=>flowPreview('lesson')}>首次敌情</button><button type="button" onClick={()=>flowPreview('failure')}>损伤建议</button><button type="button" onClick={()=>flowPreview('drag')}>拖拽验收</button><button type="button" onClick={()=>tacticsPreview('gate')}>双门选择</button><button type="button" onClick={()=>{setState(s=>gameReducer(s,{type:'TICK'}));setRevision(n=>n+1);}}>单步验收</button><button type="button" onClick={()=>tacticsPreview('window')}>反击窗口</button><button type="button" onClick={()=>tacticsPreview('pulse')}>净化弹幕</button><button type="button" onClick={()=>tacticsPreview('result')}>试炼结算</button><button type="button" onClick={corePreview}>核心演出</button><button type="button" onClick={colossusPreview}>全列首领</button><button type="button" onClick={gateReceiptPreview}>门回收验收</button><button type="button" onClick={sortieEndPreview}>短关终点</button><button type="button" onClick={homecomingPreview}>归航剧情</button><button type="button" onClick={damagedPartsPreview}>部件受损</button><button type="button" onClick={()=>pursuitPreview(false)}>召唤物突袭</button><button type="button" onClick={()=>pursuitPreview(true)}>小怪突袭</button><button type="button" onClick={scrollingPreview}>道路滚动</button><button type="button" onClick={()=>inspect(false)}>强化预览</button><button type="button" onClick={materialPreview}>材质命中</button>{[0,1,2,3,4].map(sector=><button type="button" key={"boss-"+sector} onClick={()=>artPreview(sector,true)}>变形{sector+1}</button>)}<button type="button" onClick={()=>inspect(true)}>失败复盘</button><button type="button" onClick={storyPreview}>顶部通信</button><button type="button" onClick={()=>playabilityPreview('win')}>通关复盘</button><button type="button" onClick={()=>playabilityPreview('breather')}>精英回收</button><button type="button" onClick={()=>playabilityPreview('finisher')}>终结斩</button>{[0,1,2,3,4].map(sector=><button type="button" key={sector} onClick={()=>frontlinePreview(sector)}>前线{sector+1}</button>)}</div><button type="button" aria-label="显示验收工具" style={{position:'fixed',right:0,top:'48%',opacity:.05,zIndex:99999}} onClick={()=>setGallery(false)}>⋯</button><Game key={revision} previewState={state} previewFrozen={frozen} previewGarage={testGarage??normalizeGarage({tutorialCompleted:true,completedLevels:[true,true,true,true,true],mechClass:mech,parts:10})}/></MemoryRouter>;
}
const reviewRoot=createRoot(document.getElementById('motion-review-root')!);reviewRoot.render(<MotionReview/>);
if(import.meta.hot)import.meta.hot.dispose(()=>reviewRoot.unmount());
