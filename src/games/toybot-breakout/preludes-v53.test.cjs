const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const cache=new Map();
function load(name){const file=path.join(__dirname,name+'.ts');if(cache.has(file))return cache.get(file);const module={exports:{}};cache.set(file,module.exports);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;new Function('require','module','exports',code)(id=>id.startsWith('./')?load(id):require(id),module,module.exports);return module.exports;}
const sim=load('simulation'),p=load('progression'),sorties=load('sortiesV39'),levels=load('level'),campaign=load('campaign'),safety=load('safetyV42');
const fresh=()=>p.normalizeGarage({tutorialCompleted:true});
const tick=s=>sim.gameReducer(s,{type:'TICK'});
test('V53 twenty-five unique roads have increasing hordes and preserve the five original guardian recipes',()=>{
 assert.equal(sorties.SORTIES_V39.length,25);assert.equal(new Set(sorties.SORTIES_V39.map(s=>s.key)).size,25);
 for(let sector=0;sector<5;sector++){const base=levels.getLevel(sector),snapshot=JSON.stringify(base);let previous=0;for(const spec of sorties.SORTIES_V39.filter(s=>s.level===sector)){const road=levels.getLevel(sector,spec.key);assert.notEqual(road,base);assert.equal(road,levels.getLevel(sector,spec.key));assert.equal(road.hazards.length,spec.enemyCount);assert.ok(road.hazards.length>previous);previous=road.hazards.length;assert.ok(road.encounters[0].progress>spec.end+6);assert.ok(road.hazards.every(h=>h.progress<spec.end));assert.ok(spec.intro&&spec.mid&&spec.outro);for(let start=0;start<spec.end;start+=.5){const lanes=new Set(road.hazards.filter(h=>h.progress>=start&&h.progress<=start+4.4).map(h=>h.lane));assert.ok(lanes.size<=2);}}
 assert.equal(JSON.stringify(base),snapshot);}
});
test('V53 old clears migrate once and corrupt/noncontiguous small-stage records never unlock a guardian',()=>{
 const old=p.normalizeGarage({tutorialCompleted:true,completedLevels:[true,true,false,false,false],parts:17,levels:{weapon:3,armor:2,core:1},sortieClears:['2:0','2:1','2:4','3:0','bad']});assert.equal(old.parts,17);assert.equal(old.levels.weapon,3);assert.ok(Array.from({length:5},(_,i)=>'0:'+i).every(k=>old.sortieClears.includes(k)));assert.ok(old.sortieClears.includes('2:1'));assert.ok(!old.sortieClears.includes('2:4'));assert.ok(!old.sortieClears.includes('3:0'));assert.deepEqual(p.normalizeGarage(old),old);assert.equal(p.canChallengeBossV53(old,2),false);assert.equal(p.canChallengeBossV53(old,1),true);
});
test('V53 real success sequentially opens five stages then the guardian, failure does not skip ahead',()=>{
 let g=fresh(),s=sim.createInitialState(g,0,0);
 for(let slot=0;slot<5;slot++){assert.equal(p.canChallengeBossV53(g,0),false);assert.equal(sorties.canEnterSortieV39(g,'0:'+slot),true);if(slot<4)assert.equal(sorties.canEnterSortieV39(g,'0:'+(slot+1)),false);s=sim.gameReducer({...s,status:'home'},{type:'START',garage:g});assert.equal(s.sortie.key,'0:'+slot);assert.equal(s.bots,1);assert.equal(s.progress,0);const paused=sim.gameReducer(s,{type:'PAUSE'});assert.deepEqual(tick(paused),paused);const failed=tick({...s,progress:s.sortie.end-.01,kills:0,hazardHps:s.hazardHps.map(()=>-1)});assert.equal(failed.won,false);assert.deepEqual(sorties.recordSortieV39(g,failed),g);s=tick({...s,progress:s.sortie.end-.01,kills:s.sortie.target,hazardHps:s.hazardHps.map(()=>-1)});assert.equal(s.status,'result');assert.equal(s.won,true);assert.equal(s.bossDefeated,false);g=sorties.recordSortieV39(g,s);assert.equal(g.unlockedLevel,0);assert.equal(g.completedLevels[0],false);assert.deepEqual(sorties.recordSortieV39(g,s),g);}
 assert.equal(p.canChallengeBossV53(g,0),true);const boss=sim.gameReducer(s,{type:'START',garage:g});assert.equal(boss.sortie,undefined);assert.equal(boss.status,'running');assert.equal(boss.bots,1);
});
test('V53 guardian victory opens next district at its first prelude instead of bypassing the route',()=>{
 const g=p.normalizeGarage({...fresh(),sortieClears:Array.from({length:5},(_,i)=>'0:'+i)}),s={...sim.createInitialState(g),status:'result',won:true,bossDefeated:true,progress:100};const next=sim.gameReducer(s,{type:'NEXT_LEVEL',garage:g});assert.equal(next.levelIndex,1);assert.equal(next.status,'home');const saved=p.recordLevelCompletion(g,s),started=sim.gameReducer(next,{type:'START',garage:saved});assert.equal(started.sortie.key,'1:0');assert.equal(sorties.canEnterSortieV39(saved,'1:1'),false);
});
test('V53 every road shares supply, target, lane, and safety coordinates in all three layouts',()=>{
 const g=p.normalizeGarage({...fresh(),completedLevels:[true,true,true,true,true]});for(const spec of sorties.SORTIES_V39){const source=JSON.stringify(levels.getLevel(spec.level,spec.key));for(let layout=0;layout<3;layout++){const s=sim.gameReducer(sim.createInitialState(g,spec.level,layout),{type:'START_SORTIE',key:spec.key,garage:g}),road=levels.getLevel(s.levelIndex,s.sortie.key);s.layoutIndex=layout;s.gateChoices=sim.createGateChoices(spec.level,layout,()=>.2,spec.key);assert.equal(s.hazardHps.length,road.hazards.length);road.hazards.forEach((h,i)=>{assert.equal(sim.hazardMaxHpFor(s,i),h.hp);assert.equal(sim.roadEnemyLane(s,i),levels.hazardLaneAt(layout,i,s.progress,s.levelIndex,s.sortie.key));});s.gateChoices.forEach((row,i)=>row.forEach(o=>assert.ok(!road.hazards.some((h,j)=>Math.abs(h.progress-road.gateMarks[i])<=6&&levels.hazardLaneAt(layout,j,road.gateMarks[i],spec.level,spec.key)===o.lane))));assert.ok(safety.hasEscapeV42(s,safety.dangerWindowsV42(s)));}assert.equal(JSON.stringify(levels.getLevel(spec.level,spec.key)),source);}
});
test('V53 each prelude advances its own nonblocking story once and freezes communication on pause',()=>{
 const g=p.normalizeGarage({...fresh(),completedLevels:[true,true,true,true,true]});for(const spec of sorties.SORTIES_V39){let s=campaign.campaignReducer(campaign.createCampaign(sim.createInitialState(g,spec.level)),{type:'START_SORTIE',key:spec.key,garage:g});assert.equal(s.narrative.scene,null);assert.equal(s.narrative.radio.text,spec.intro);s=campaign.campaignReducer({...s,progress:spec.end*.45,hazardHps:s.hazardHps.map(()=>-1)},{type:'TICK'});assert.equal(s.narrative.radio.text,spec.mid);const n=s.narrative.radio.ticks;const paused=campaign.campaignReducer(s,{type:'PAUSE'});assert.equal(campaign.campaignReducer(paused,{type:'TICK'}).narrative.radio.ticks,n);s=campaign.campaignReducer(s,{type:'TICK'});assert.equal(s.narrative.radio.ticks,n-1);assert.equal(s.narrative.seen.filter(x=>x==='prelude-mid').length,1);s=campaign.campaignReducer({...s,progress:spec.end-.01,kills:spec.target,hazardHps:s.hazardHps.map(()=>-1)},{type:'TICK'});assert.equal(s.status,'result');assert.equal(s.narrative.scene,null);assert.equal(s.bossDefeated,false);}
});
test('V53 seventy-five ordinary single-mech deployments can finish without added health or permanent upgrades',()=>{
 const results=[];
 for(const spec of sorties.SORTIES_V39)for(const mechClass of ['pulse','heavy','blade']){
  const g=p.normalizeGarage({...fresh(),completedLevels:[true,true,true,true,true],mechClass});let s=sim.gameReducer(sim.createInitialState(g,spec.level),{type:'START_SORTIE',key:spec.key,garage:g}),ticks=0,maxVisible=0;
  assert.equal(s.bots,1);assert.equal(s.playerMaxHp,100);
  while(sim.isActiveStatus(s.status)&&ticks++<1200){
   const road=levels.getLevel(s.levelIndex,s.sortie.key),danger=safety.dangerWindowsV42(s).filter(w=>w.from<=4&&w.to>=0),safe=[0,1,2].filter(lane=>!danger.some(w=>w.lane===lane));
   const visible=road.hazards.flatMap((h,i)=>s.hazardHps[i]>0&&load('flowV41').enemyVisibleV41(s,h)?[i]:[]);maxVisible=Math.max(maxVisible,visible.length);
   const reachable=visible.filter(i=>safe.includes(sim.roadEnemyLane(s,i))).sort((a,b)=>road.hazards[a].progress-road.hazards[b].progress);let lane=reachable.length?sim.roadEnemyLane(s,reachable[0]):safe.includes(s.lane)?s.lane:safe[0]??s.lane;
   const supply=s.gateChoices[s.gate]?.find(o=>o.polarity==='reward'&&safe.includes(o.lane));if(supply&&!s.gateResolved&&Math.abs(road.gateMarks[s.gate]-s.progress)<1.7)lane=supply.lane;
   s=sim.gameReducer(s,{type:'MOVE_LANE',lane});if(sim.canActivateBurst(s))s=sim.gameReducer(s,{type:'ACTIVATE_BURST'});s=tick(s);
   assert.ok(!['boss-intro','battle','boss-shift','boss-victory'].includes(s.status));
  }
  assert.equal(s.won,true,spec.key+' '+mechClass+' HP '+s.playerHp+' kills '+s.kills+'/'+spec.target);assert.equal(s.status,'result');assert.equal(s.bossDefeated,false);assert.ok(ticks<1200);assert.ok(maxVisible<=96,'visible budget '+maxVisible);results.push(spec.key+' '+mechClass+' '+(ticks/10).toFixed(1)+'s HP'+s.playerHp+' kills'+s.kills+' visible'+maxVisible);
 }
 console.log('V53 unmodified health/gear deployment samples: '+results.join('; '));
});
