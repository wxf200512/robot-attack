import { difficultyV57 } from './difficultyV57';
import type { HazardSpec, LevelSpec, EnemyKind } from './level';
import { FRONTLINES } from './frontline';
import { PRELUDES_V53 } from './preludeDataV53';
export function buildPreludeLevelV53(base:LevelSpec,key:string):LevelSpec{
 const spec=PRELUDES_V53.find(s=>s.key===key);
 if(!spec)return base;
 const difficulty=difficultyV57(spec.level,spec.slot);
 const theme=FRONTLINES[spec.level],hazards:HazardSpec[]=[],perWave=spec.enemyCount/3;
 for(let wave=0;wave<3;wave++)for(let i=0;i<perWave;i++){
  const elite=spec.slot>=2&&i===perWave-1&&(wave===1||spec.slot===4&&wave===2);
  const specialist=i===6||i===14&&spec.slot>=1||i===20&&spec.slot>=3||i===28&&spec.level>=2&&spec.slot>=2;
  const kind:EnemyKind=elite?(theme.special as EnemyKind):specialist?(spec.slot===0?'drone':i===6?'sniper':spec.level>=2?'medic':'bomber'):'swarm';
  hazards.push({progress:[10,spec.end/2,spec.end-8][wave]+Math.floor(i/6)*.65,lane:(i%2+spec.slot)%3,
   hp:elite?Math.ceil((12+spec.level*2+spec.slot)*difficulty.eliteHpScale):specialist?Math.ceil((4+spec.level)*(1+difficulty.rank*.007)):1+Math.floor(spec.level/2),kind,horde:!elite&&!specialist,
   wave,slot:i,encounterId:'prelude-'+spec.slot+'-'+wave,elite,pattern:elite?theme.patterns[(spec.slot+wave)%3]:undefined,
   title:elite?theme.elites[wave]:undefined,eliteRole:!elite&&i===0?'energy':!elite&&i===12&&spec.slot>=2?'guard':!elite&&i===20&&spec.slot>=3?'commander':undefined});
 }
 return {...base,title:base.title,focus:spec.name+' · 无首领怪潮',hazards,gateMarks:[4,9,16,spec.end-10,spec.end-3],zones:[],
  // The distant encounter keeps legacy projection helpers well defined but is
  // unreachable: short-mission completion returns before the arena branch.
  encounters:[{...base.encounters[0],progress:spec.end+24}]};
}
