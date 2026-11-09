import { PORTRAIT_ART, equipmentCell } from './visualArt';
import type { Garage } from './progression';
import type { GameState } from './simulation';
import { mechSpec } from './mechs';
import { COATINGS_V44, coatingUnlockedV44, masteryKeyV44, gradeV44, type CoatingV44 } from './replayV44';
import { buildV44, partEffectV44 } from './combatV44';
export function CareerV44({garage:g,level,preview,onPreview,onApply}:{garage:Garage;level:number;preview:CoatingV44|null;onPreview:(id:CoatingV44|null)=>void;onApply:(id:CoatingV44)=>void}){
 return <details className="career-v44"><summary>作战评级 · 机甲涂装 <span>⌄</span></summary><p>主线从C起评：生命≥65%、5分钟内、道路碰撞≤2次，每项提高一档。只保留最佳，无额外属性。</p><div className="career-grades-v44" aria-label="当前关卡机型最佳评级">{(['pulse','heavy','blade'] as const).map(m=><span key={m}>{mechSpec(m).name}<b>{g.mastery?.[masteryKeyV44(level,m)]??'未评级'}</b></span>)}</div><div className="coating-preview-v44"><span aria-hidden="true" className="toybot-v28-portrait" style={{backgroundImage:`url(${PORTRAIT_ART})`,backgroundPosition:equipmentCell(g.mechClass,g.equipped.weapon,g.equipped.armor,g.equipped.core)}}/><div><b>{COATINGS_V44.find(c=>c.id===(preview??g.coating??'stock'))?.name}</b><small>{preview&&preview!==g.coating?'外观预览 · 属性不变':'当前装配 · 首页与局内同步'}</small></div></div><div className="coating-picker-v44">{COATINGS_V44.map(c=>{const unlocked=coatingUnlockedV44(g.mastery??{},c.id);return <div key={c.id}><i className={'swatch-'+c.id}/><strong>{c.name}</strong><small>{c.goal}</small><button type="button" aria-label={'预览'+c.name} onClick={()=>onPreview(c.id)}>预览</button><button type="button" aria-label={g.coating===c.id?'已装配'+c.name:unlocked?'装配'+c.name:'达成目标解锁'+c.name} disabled={!unlocked||g.coating===c.id} onClick={()=>onApply(c.id)}>{g.coating===c.id?'已装配':unlocked?'装配':'未解锁'}</button></div>;})}</div>{preview&&preview!==g.coating&&<p>正在预览，出击使用已装配涂装。<button type="button" onClick={()=>onPreview(null)}>恢复已装配</button></p>}</details>;
}
export function ResultGradeV44({game:s}:{game:GameState}){const grade=gradeV44(s);return grade?<section className="grade-receipt-v44" aria-label="本局作战评级"><b>{grade}</b><span>主线作战评级<small>生命 {Math.ceil(s.playerHp/s.playerMaxHp*100)}% · {(s.tactics.elapsed/10).toFixed(0)}秒 · 碰撞{s.tactics.collisions}次</small></span></section>:null;}
export function PilotFeedbackV44({game:s}:{game:GameState}){
 if(s.status!=='running'&&s.status!=='battle')return null;
 const input=s.finish.input,broken=s.ops.parts.filter(p=>p.hp===0&&p.brokenAt!==undefined&&s.battleTime-p.brokenAt>=0&&s.battleTime-p.brokenAt<18).sort((a,b)=>(b.brokenAt??0)-(a.brokenAt??0))[0];
 return <>{input&&<div className="pilot-input-v44" aria-live="off">{input.queued?'已接收 · 排队换至':'已接收 · 换至'}{['左轨','中轨','右轨'][input.lane]}<i/></div>}{s.evadeTicks>0&&<div className="pilot-evade-v44">闪避成功</div>}{broken&&<div className="part-receipt-v44" role="status">{broken.name}<strong>{partEffectV44(broken.kind)}</strong></div>}</>;
}
export function BuildIdentityV44({game:s}:{game:GameState}){const build=buildV44(s);return <p className="build-identity-v44"><b>{build.name}</b> · {build.detail}</p>;}
