/* Read-only layout fixture, rendered from the real component. No gameplay/save writes. */
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{MemoryRouter}=require('react-router-dom');
const cache=new Map();let preview;
const react={...React,useReducer(reducer,arg,init){return ['gameReducer','campaignReducer'].includes(reducer.name)?[load('campaign').createCampaign(preview),()=>{}]:React.useReducer(reducer,arg,init);}};
function load(name){const file=path.resolve(__dirname,name+(name.endsWith('.tsx')||name.endsWith('.ts')?'':'.ts'));if(cache.has(file))return cache.get(file);const module={exports:{}};cache.set(file,module.exports);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;new Function('require','module','exports',code)(id=>id==='react'?react:id.endsWith('.css')?{}:id.startsWith('./')?load(id+(fs.existsSync(path.resolve(__dirname,id+'.tsx'))?'.tsx':'')):require(id),module,module.exports);return module.exports;}
const progression=load('progression'),sim=load('simulation');
const menuMech=process.argv.find(a=>a.startsWith('--mech='))?.split('=')[1]||'pulse';
const garage=progression.normalizeGarage({mechClass:menuMech,parts:16,runs:5,wins:4,completedLevels:[true,true,true,true,false],tutorialCompleted:true,levels:{weapon:1,armor:1,core:1},equipped:{weapon:true,armor:true,core:true}});
global.window={localStorage:{getItem:key=>key.includes('settings')?JSON.stringify({muted:true,volume:.45,quality:'high'}):key.includes('garage')?JSON.stringify(garage):null,setItem(){throw Error('Static fixtures must not save');}},matchMedia:()=>({matches:false})};
const defeat=process.argv.includes('--defeat');
preview={...sim.createInitialState(garage,0,0),status:'result',won:!defeat,bossDefeated:!defeat,progress:defeat?93:100,bots:defeat?0:6,playerHp:defeat?0:110,score:1280,battleHp:0,battleMaxHp:1400};
const encounter=process.argv.includes('--encounter');
if(encounter){preview={...sim.createInitialState(garage,4,0),status:'running',progress:46,gate:4,bots:5,combo:6,comboTicks:20,kills:16};}
const bossReview=process.argv.includes('--boss');
if(bossReview){
 const sector=Math.max(0,Math.min(4,Number(process.argv.find(a=>a.startsWith('--sector='))?.split('=')[1])||0));
 const kind=process.argv.find(a=>a.startsWith('--mech='))?.split('=')[1]||'pulse';
 preview={...sim.createInitialState({...garage,mechClass:kind},sector,0),status:'battle',progress:97,bots:3,battleHp:500,battleMaxHp:600,battleLane:1,bossCycle:Number(process.argv.find(a=>a.startsWith('--cycle='))?.split('=')[1])||1,bossStep:'support',fireCooldown:1000};
 preview=sim.gameReducer(preview,{type:'TICK'});
 while(preview.bossStep==='shield'||preview.bossStep==='warning')preview=sim.gameReducer(preview,{type:'TICK'});
 if(process.argv.includes('--dodge')){preview=sim.gameReducer(preview,{type:'MOVE_LANE',lane:2});preview=sim.gameReducer(preview,{type:'TICK'});preview=sim.gameReducer(preview,{type:'TICK'});}
 preview.fireCooldown=process.argv.includes('--attack')?sim.attackIntervalFor(preview):0;
}
const defenseReview=process.argv.includes('--defense');
if(defenseReview){
 const kind=process.argv.find(a=>a.startsWith('--mech='))?.split('=')[1]||'heavy',mode=process.argv.find(a=>a.startsWith('--mode='))?.split('=')[1]||'idle';
 preview={...sim.createInitialState({...garage,mechClass:kind},0,0),status:'running',progress:18,bots:3,gate:2,weaponLevel:1,armorLevel:2,armorPoints:mode==='break'||mode==='empty'?0:4,shieldCharges:mode==='idle'?2:mode==='impact'?1:0,roadTicks:4,fireCooldown:1000,hazardHps:sim.createInitialState(garage).hazardHps.map(()=>-1)};
 if(mode==='impact'||mode==='break')preview.defenseFx={kind:'shield',exhausted:mode==='break',ticks:Number(process.argv.find(a=>a.startsWith('--ticks='))?.split('=')[1])||5,id:1};
}
const homeReview=process.argv.includes('--home'),pauseReview=process.argv.includes('--pause');
if(homeReview)preview=sim.createInitialState(garage,0,0);
if(pauseReview)preview={...sim.createInitialState(garage,2,0),status:'paused',resumeStatus:'running',progress:62,gate:5,bots:3,playerHp:78};
if(process.argv.includes('--final'))preview={...preview,levelIndex:4};
const operationReview=process.argv.find(a=>a.startsWith('--operations='))?.split('=')[1];
const hordeReview=process.argv.includes('--horde')||!!operationReview;
const burstReview=process.argv.includes('--burst')||hordeReview;
if(burstReview){
 const mode=process.argv.find(a=>a.startsWith('--mode='))?.split('=')[1]||'ready';
 const selectedSector=Number(process.argv.find(a=>a.startsWith('--sector='))?.split('=')[1]??4);
 const sector=hordeReview?Math.max(0,Math.min(4,Number.isFinite(selectedSector)?selectedSector:4)):0;
 const progress=hordeReview?Number(process.argv.find(a=>a.startsWith('--progress='))?.split('=')[1]??48):18;
 preview={...sim.createInitialState(garage,sector,0),status:'running',progress,bots:Math.max(1,Math.min(11,Number(process.argv.find(a=>a.startsWith('--bots='))?.split('=')[1])||3)),gate:sim.createInitialState(garage,sector,0).gateChoices.findIndex((_,i)=>load('level').getLevel(sector).gateMarks[i]>progress),burstEnergy:mode==='charging'?48:100,weaponLevel:2,combo:6,bestCombo:6,kills:10,comboTicks:sim.COMBO_WINDOW_TICKS,comboHeal:4,comboRewardTicks:10};
 if(process.argv.includes('--modules'))preview={...preview,modules:{arc:2,burn:1,recycle:1}};
 if(mode==='active')preview=sim.gameReducer(preview,{type:'ACTIVATE_BURST'});
 preview=sim.gameReducer(preview,{type:'TICK'});
 if(hordeReview&&mode==='active')for(let i=0;i<3;i++)preview=sim.gameReducer(preview,{type:'TICK'});
}
if(operationReview){
 const ops=load('operations');preview.ops=ops.copyOperations(preview.ops);preview.ops.fusion=process.argv.includes('--fusion')?'stormfire':null;
 if(operationReview==='mission'){preview.progress=43;preview.lane=preview.ops.mission.lane;}
 if(operationReview==='cargo'){preview.progress=62;preview.lane=preview.ops.event.lane;preview.ops.eventWarning=12;preview.ops.eventLane=preview.ops.event.lane;}
 if(operationReview==='prep'){preview.progress=ops.prepMark(preview)-2.5;preview.ops.prep='pending';}
 if(operationReview==='parts'){preview={...preview,status:'battle',progress:97,battleHp:900,battleMaxHp:1200,battleLane:1,bossStep:'recovery',bossStepTicks:3};preview.ops.parts=ops.makeBossParts(preview);}
 if(operationReview==='perfect'){preview.ops.perfectTicks=6;preview.ops.counterShots=3;preview.ops.perfects=1;}
 const liveMarks=load('level').getLevel(preview.levelIndex).gateMarks;const liveGate=liveMarks.findIndex(mark=>mark-1.5>preview.progress);preview.gate=liveGate<0?liveMarks.length:liveGate;preview.enemyAttacks=[];preview.pendingShots=[];preview.burns=[];
 if(process.argv.includes('--fusion')){preview.modules={arc:2,burn:2,recycle:1};preview.fireCooldown=0;preview=sim.gameReducer(preview,{type:'TICK'});}
}
const App=load('index.tsx').default;
const css=fs.readdirSync(path.resolve(__dirname,'../../../dist/assets')).find(n=>/^main-.*\.css$/.test(n));
if(!css)throw Error('Run npm run build first');
const html='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>胜利页 · 只读布局验收</title><link rel="stylesheet" href="/dist/assets/'+css+'"></head><body>'+renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(App)))+'</body></html>';
const output=burstReview?'burst-review.html':homeReview?'home-review.html':pauseReview?'pause-review.html':defenseReview?'defense-review.html':bossReview?'boss-review.html':encounter?'encounter-review.html':defeat?'defeat-review.html':'victory-review.html';
fs.writeFileSync(path.join(__dirname,output),html.replace(/<style>([\s\S]*?)<\/style>/g,(_,css)=>'<style>'+css.replaceAll('&#x27;',String.fromCharCode(39)).replaceAll('&quot;',String.fromCharCode(34)).replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>')+'</style>'));console.log('Generated read-only '+output+' from actual component');
