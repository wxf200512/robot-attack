import type { CSSProperties } from 'react';
import type { GameState } from './simulation';
import { gateGroundY, laneXAt, LANE_CENTERS, bossY } from './simulation';
import type { Garage } from './progression';
import { ART_V19, FUSION_ART_V19, FUSIONS, PROTOCOLS, MISSION_NAMES, MISSION_REWARDS, fieldVisible, fieldY, prepMark, eligibleFusion, type Fusion, type Protocol } from './operations';
export function OperationSprite({cell,className=''}:{cell:number;className?:string}){return <span className={'ops-art '+className} style={{backgroundImage:`url(${ART_V19})`,backgroundPosition:`${cell%3*50}% ${Math.floor(cell/3)*50}%`}} aria-hidden="true"/>;}
export function FusionSprite({fusion,projectile=false}:{fusion:Fusion;projectile?:boolean}){return <span className={'ops-fusion-art'+(projectile?' is-projectile':'')} style={{backgroundImage:`url(${FUSION_ART_V19})`,backgroundPosition:`${FUSIONS[fusion].cell*50}% ${projectile?100:0}%`}} aria-hidden="true"/>;}
const placed=(lane:number,y:number):CSSProperties=>({left:laneXAt(lane,y)+'%',top:y+'%',zIndex:Math.round((y+5)*10)});
export default function OperationsLayer({game:s}:{game:GameState}){
 const o=s.ops,prepY=gateGroundY(s.progress,prepMark(s));
 return <>
  {fieldVisible(s,o.mission)&&<div className="ops-field-object mission-object" style={placed(o.mission.lane,fieldY(s,o.mission))} role="img" aria-label={MISSION_NAMES[s.levelIndex]+` 耐久 ${o.mission.hp}/${o.mission.maxHp}`}><OperationSprite cell={[3,4,7,3,1][s.levelIndex]}/><b>{MISSION_NAMES[s.levelIndex]}</b><i><span style={{width:o.mission.hp/o.mission.maxHp*100+'%'}}/></i></div>}
  {fieldVisible(s,o.event)&&<div className="ops-field-object cargo-object" style={placed(o.event.lane,fieldY(s,o.event))} role="img" aria-label={`风险救援：击破运输锁，获得模块和零件。耐久 ${o.event.hp}/${o.event.maxHp}`}><OperationSprite cell={4}/><b>救援补给</b><i><span style={{width:o.event.hp/o.event.maxHp*100+'%'}}/></i></div>}
  {o.eventWarning>0&&<div className="ops-risk-warning" style={{left:LANE_CENTERS[o.eventLane]+'%'}} role="img" aria-label="运输护卫即将攻击本轨道"><span>危险</span></div>}
  {s.status==='running'&&o.prep==='pending'&&s.progress>=prepMark(s)-6&&(['维修','重调','蓄能'] as const).map((name,lane)=><div key={name} className={'ops-prep-door'+(s.lane===lane?' is-selected':'')} style={placed(lane,prepY)} role="img" aria-label={`${lane+1}轨整备：${name}，穿过领取`}><OperationSprite cell={[5,1,3][lane]}/><b>{name}</b><small>{[o.protocol==='scarcity'?'生命+18':'生命+35',Math.max(...Object.values(s.modules))>=3?'满级→40分':'最高模块+1','强化齐射+2'][lane]}</small></div>)}
  {s.status==='battle'&&o.parts.map((part,index)=>part.hp>0&&<div key={part.kind} className={'ops-boss-part part-'+part.kind} style={placed(part.lane,bossY(s)+4)} role="img" aria-label={`${part.name} 可破坏部件，耐久 ${part.hp}/${part.maxHp}`}><OperationSprite cell={index+6}/><b>{part.name}</b><i><span style={{width:part.hp/part.maxHp*100+'%'}}/></i></div>)}
  {(s.status==='running'||s.status==='battle')&&o.perfectTicks>0&&<div className="ops-perfect-flare" style={{left:LANE_CENTERS[s.lane]+'%',top:'59%',opacity:o.perfectTicks/8}}><OperationSprite cell={0}/></div>}
 </>;
}
export function OperationsHud({game:s}:{game:GameState}){
 if(s.status!=='running'&&s.status!=='battle')return null;
 const fusion=eligibleFusion(s.modules),mission=s.ops.mission,preparing=s.status==='running'&&s.ops.prep==='pending'&&s.progress>=prepMark(s)-6;
 return <div className="ops-mission-hud" aria-label="战术任务">
  <OperationSprite cell={s.status==='battle'?6:3}/><div><b>{s.status==='battle'?`部件破阵 ${s.ops.broken}/3`:preparing?'首领前整备':MISSION_NAMES[s.levelIndex]}</b><small>{s.status==='battle'?(s.ops.breakTicks>0?'破防窗口 · 集火首领':'击破部件可打断攻击'):preparing?'提前换道，穿门选择一次补给':mission.status==='done'?MISSION_REWARDS[s.levelIndex]:mission.status==='missed'?'本次未完成，继续突围':s.progress<mission.mark-12?'前方目标 · 对线自动攻击':'切入目标轨道，击破装置'}</small></div>
  {!s.ops.fusion&&fusion&&<span className="ops-fusion-hint">融合门就绪</span>}
 </div>;
}
export function ChallengePicker({game,garage,onSelect}:{game:GameState;garage:Garage;onSelect:(protocol:Protocol)=>void}){
 if(!garage.completedLevels[game.levelIndex])return <div className="ops-challenge-locked">通关本区后解锁挑战协议</div>;
 return <details className="ops-challenge-picker"><summary><OperationSprite cell={2}/><span>挑战协议 · {PROTOCOLS[game.ops.protocol].name}</span><b>⌄</b></summary><div role="group" aria-label="选择挑战协议">{(Object.keys(PROTOCOLS) as Protocol[]).map(key=><button key={key} type="button" aria-pressed={game.ops.protocol===key} onClick={()=>onSelect(key)}><strong>{PROTOCOLS[key].name}</strong><small>{PROTOCOLS[key].detail}</small>{garage.challengeClears.includes(game.levelIndex+':'+key)&&<em><OperationSprite cell={2}/>已获徽章</em>}</button>)}</div></details>;
}
