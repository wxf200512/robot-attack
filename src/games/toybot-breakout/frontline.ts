import type { HazardSpec, LevelSpec, EnemyKind } from './level';
export type ElitePattern='heat-mine'|'hunter-fan'|'siege-laser'|'storm-orb'|'royal-salvo';
export const ROAD_TARGET_SECONDS=120;
export const ELITE_ATTACKS:Record<ElitePattern,{name:string;warning:number;flight:number;damage:number;shots:number;field:number;rearm:number}>={
 'heat-mine':{name:'熔焰地雷',warning:18,flight:10,damage:9,shots:1,field:20,rearm:65},
 'hunter-fan':{name:'猎蜂扇射',warning:15,flight:8,damage:5,shots:3,field:0,rearm:55},
 'siege-laser':{name:'重轨贯射',warning:24,flight:2,damage:16,shots:1,field:0,rearm:60},
 'storm-orb':{name:'导电球场',warning:18,flight:12,damage:7,shots:1,field:24,rearm:70},
 'royal-salvo':{name:'禁卫交错炮',warning:20,flight:10,damage:9,shots:2,field:0,rearm:60},
};
export const FRONTLINES=[
 {theme:'熔炉清障',names:['熔渣搬运机','炉渣爬虫','热熔哨','熔焰投手','检修机'],stages:['废料压场','输送线焚区','出口破拆阵'],elites:['废钢破拆者','熔焰铸造师','熔炉守门人'],patterns:['heat-mine','heat-mine','siege-laser'],pack:'swarm',special:'bomber',color:'#ffad69'},
 {theme:'蜂群空袭',names:['侧翼猎蜂','拦截蜂','针刺哨蜂','投弹蜂','补能蜂'],stages:['侦猎蜂群','针刺航道','蜂巢护航阵'],elites:['猎蜂队长','针刺领航机','蜂群护航长'],patterns:['hunter-fan','hunter-fan','royal-salvo'],pack:'swarm',special:'drone',color:'#72eaff'},
 {theme:'重盾推进',names:['城防盾卫','履带突击机','轨道炮手','破城炮车','战地修复机'],stages:['盾卫堵口','轨道炮阵','重装督军阵'],elites:['盾列督战官','重轨炮台长','城防铁卫长'],patterns:['siege-laser','siege-laser','heat-mine'],pack:'drone',special:'sniper',color:'#e9c88e'},
 {theme:'极性风暴',names:['磁暴巡游机','电涌爬虫','导电哨','电容投射机','聚能维修机'],stages:['电涌前哨','导电封路阵','极性执法阵'],elites:['聚能监察机','导电执法者','极性仲裁机'],patterns:['storm-orb','storm-orb','siege-laser'],pack:'swarm',special:'medic',color:'#c1a1ff'},
 {theme:'禁卫合围',names:['皇城近卫','突袭近卫','裁决狙击手','裁决炮车','中枢维修机'],stages:['近卫突袭','裁决混编阵','帝皇禁卫阵'],elites:['禁卫猎杀者','裁决炮兵长','王座指挥官'],patterns:['hunter-fan','royal-salvo','storm-orb'],pack:'swarm',special:'bomber',color:'#ff8ea6'},
] as const;
export const frontlineStage=(levelIndex:number,progress:number)=>{const f=FRONTLINES[levelIndex];return {theme:f.theme,name:progress<20?'外围侦察':progress<43?f.stages[0]:progress<69?f.stages[1]:progress<86?f.stages[2]:'战前整备'};};
export const roadEnemyName=(levelIndex:number,h:HazardSpec)=>h.title??FRONTLINES[levelIndex].names[(['drone','swarm','sniper','bomber','medic'] as EnemyKind[]).indexOf(h.kind??'drone')];
export function populateFrontline(level:LevelSpec,sector:number){
 const f=FRONTLINES[sector];level.bossTargetSeconds=180;level.focus=f.theme+' · 3段精英遭遇 · 约5分钟';
 // Keep an escape/supply lane under every rotated layout. Existing indices stay stable.
 const reserved=level.gateMarks.map(mark=>{const used=new Set(level.hazards.filter(h=>Math.abs(h.progress-mark)<=6).map(h=>(h.lane+(h.moving&&mark>=h.progress-8?1:0))%3));return {mark,lane:[0,1,2].find(l=>!used.has(l))??2};});
 const add=(h:HazardSpec,visibleBudget=0)=>{
  // Check every overlapping 5.5-second contact window, including legacy waves.
  // This keeps dense packs in two lanes rather than turning them into a wall.
  const contact=(unit:HazardSpec)=> (unit.lane+(unit.moving?1:0))%3;
  for(let retry=0;retry<(visibleBudget?128:24);retry++){
   if(visibleBudget){
    const starts=[h.progress-14,...level.hazards.filter(u=>u.progress>=h.progress-14&&u.progress<=h.progress).map(u=>u.progress)];
    if(starts.some(start=>1+level.hazards.filter(u=>u.progress>=start&&u.progress<=start+14).length>visibleBudget)){h.progress+=.25;continue;}
    if(h.progress>80)break;
   }
   const nearby=level.hazards.filter(unit=>Math.abs(unit.progress-h.progress)<=4.4);
   const starts=[h.progress,...nearby.filter(unit=>unit.progress<=h.progress).map(unit=>unit.progress)];
   const allowed=[0,1,2].filter(lane=>{
    const trial={...h,lane};
    return reserved.every(r=>Math.abs(h.progress-r.mark)>6||contact(trial)!==r.lane)&&starts.every(mark=>new Set([contact(trial),...nearby.filter(unit=>unit.progress>=mark&&unit.progress<=mark+4.4).map(contact)]).size<=2);
   });
   if(allowed.length){h.lane=allowed.includes(h.lane)?h.lane:allowed[0];level.hazards.push(h);return;}
   h.progress+=.25;
  }
  throw new Error('Frontline recipe has no safe lane: '+sector+' / '+h.progress);
 };
 for(const [stage,mark]of [24,46,66].entries())for(let i=0;i<12+sector*4;i++)add({progress:mark+Math.floor(i/6)*1.1,lane:(stage+i%2)%3,hp:1+Math.floor(sector/2),kind:f.pack,horde:true,slot:i,encounterId:'surge-'+stage});
 for(const [stage,mark]of [32,58,84].entries()){
  const id='elite-'+stage,kind:EnemyKind=sector===1?'drone':sector===2?'sniper':sector===3?'sniper':'bomber';
  add({progress:mark,lane:stage%3,hp:Math.round((60+sector*12)*(1+stage*.22)),armor:sector===2?2:0,kind,elite:true,eliteRole:stage===0?'energy':stage===1?'guard':'commander',pattern:f.patterns[stage],title:f.elites[stage],encounterId:id,moving:sector===1});
  for(let i=0;i<4+sector;i++)add({progress:mark-1+Math.floor(i/2)*.55,lane:(stage+i%2)%3,hp:3+sector,kind:i===0?f.special:'swarm',armor:sector===2&&i%2===0?1:0,pattern:i===0&&sector===0?'heat-mine':i===0&&sector===3?'storm-orb':undefined,encounterId:id,slot:i});
 }
 // Extra fodder uses free space between existing packs; retain the 72-body budget.
 for(const [stage,mark]of [16,38,60].entries())for(let i=0;i<4;i++)add({progress:mark+i*.55,lane:(stage+i%2)%3,hp:1+Math.floor(sector/2),kind:f.pack,horde:true,slot:12+sector*4+i,encounterId:'surge-'+stage},72);

}
