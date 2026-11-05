/* Read-only layout fixture, rendered from the real component. No gameplay/save writes. */
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{MemoryRouter}=require('react-router-dom');
const cache=new Map();let preview;
const react={...React,useReducer(reducer,arg,init){return ['gameReducer','campaignReducer'].includes(reducer.name)?[load('campaign').createCampaign(preview),()=>{}]:React.useReducer(reducer,arg,init);}};
function load(name){const file=path.resolve(__dirname,name+(name.endsWith('.tsx')||name.endsWith('.ts')?'':'.ts'));if(cache.has(file))return cache.get(file);const module={exports:{}};cache.set(file,module.exports);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;new Function('require','module','exports',code)(id=>id==='react'?react:id.endsWith('.css')?{}:id.startsWith('./')?load(id+(fs.existsSync(path.resolve(__dirname,id+'.tsx'))?'.tsx':'')):require(id),module,module.exports);return module.exports;}
const progression=load('progression'),sim=load('simulation');
const garage=progression.normalizeGarage({mechClass:'pulse',parts:16,runs:5,wins:4,completedLevels:[true,true,true,true,false],tutorialCompleted:true,levels:{weapon:1,armor:1,core:1},equipped:{weapon:true,armor:true,core:true}});
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
const App=load('index.tsx').default;
const css=fs.readdirSync(path.resolve(__dirname,'../../../dist/assets')).find(n=>/^main-.*\.css$/.test(n));
if(!css)throw Error('Run npm run build first');
const html='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>胜利页 · 只读布局验收</title><link rel="stylesheet" href="/dist/assets/'+css+'"></head><body>'+renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(App)))+'</body></html>';
const output=bossReview?'boss-review.html':encounter?'encounter-review.html':defeat?'defeat-review.html':'victory-review.html';
fs.writeFileSync(path.join(__dirname,output),html.replace(/<style>([\s\S]*?)<\/style>/g,(_,css)=>'<style>'+css.replaceAll('&#x27;',String.fromCharCode(39)).replaceAll('&quot;',String.fromCharCode(34)).replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>')+'</style>'));console.log('Generated read-only '+output+' from actual component');
