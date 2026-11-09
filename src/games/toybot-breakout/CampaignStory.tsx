import { useEffect, useRef, useState } from 'react';
import { BOSS_NAMES } from './art';
import { STORY_CHAPTERS } from './story';
import { CHAPTER_FILMS, CHAPTER_FILM_RATIOS, RELAY_ART, filmFrame, relayVisible, sceneCopy, type CampaignState, type CampaignAction } from './campaign';
import { gateGroundY, laneXAt } from './simulation';
import './campaign.css';

export function StoryRelay({game}:{game:CampaignState}){
 if(!relayVisible(game))return null;
 const n=game.narrative,y=gateGroundY(game.progress,n.relayMark),near=y>=61;
 return <div data-world-y={y} className={'campaign-relay '+(near?'is-near':'')} style={{left:laneXAt(n.relayLane,y)+'%',top:y+'%',zIndex:Math.round(y*10)-1,transform:`translate(-50%,-85%) scale(${Math.max(.5,(y-30)/34)})`}} role="img" aria-label={`剧情中继在第${n.relayLane+1}轨，驶过接取${n.route==='rescue'?'伙伴':'护盾'}`}>
  <span className="campaign-relay-ground"/><img src={RELAY_ART} alt="" draggable={false}/><b>{n.route==='rescue'?'伙伴 +1':'护盾 +1'}</b><small>{near?'驶过接通':'中继接应'}</small>
 </div>;
}
export function StoryRadio({game,dispatch}:{game:CampaignState;dispatch:(action:CampaignAction)=>void}){
 const radio=game.narrative.radio;
 if(!radio||game.narrative.scene||!['running','battle'].includes(game.status))return null;
 return <aside className="campaign-radio" key={radio.id} aria-label="局内剧情通信"><div className="campaign-radio-label"><span>MIKO / 实时通信</span><button type="button" aria-label="关闭这条剧情通信" onClick={()=>dispatch({type:'STORY_DISMISS_RADIO'})}>×</button></div><p>{radio.text}</p><i style={{width:radio.ticks/75*100+'%'}}/></aside>;
}
export function StoryMission({game}:{game:CampaignState}){
 const n=game.narrative;
 if(game.status!=='running'||n.scene||n.objective==='inactive')return null;
 return <div className={'campaign-mission state-'+n.objective} aria-live="polite"><b>{n.objective==='collected'?'✓ 支援接应完成':n.objective==='missed'?'中继交由维修队接手':n.route==='rescue'?'支援任务 · 接应伙伴':'支援任务 · 同步航标'}</b><span>{n.objective==='pending'?`第 ${n.relayLane+1} 轨 · 驶过发光中继接通`:n.objective==='collected'?(n.route==='rescue'?'伙伴已加入小队':'维护护盾已接通'):'继续点亮归航航标'}</span></div>;
}
export default function CampaignStory({game,dispatch}:{game:CampaignState;dispatch:(action:CampaignAction)=>void}){
 const [clock,setClock]=useState(0),[artFailed,setArtFailed]=useState(false);
 const root=useRef<HTMLDivElement>(null),body=useRef<HTMLDivElement>(null),scene=game.narrative.scene;
 const sceneId=scene?`${game.runId}:${scene.kind}:${scene.step}`:'';
 const visible=!!scene&&game.status!=='paused';
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 useEffect(()=>{setClock(0);setArtFailed(false);body.current?.scrollTo({top:0});if(visible)root.current?.focus({preventScroll:true});},[sceneId,visible]);
 useEffect(()=>{if(!visible||reduced)return;const timer=window.setInterval(()=>setClock(time=>time+100),100);return()=>window.clearInterval(timer);},[visible,reduced]);
 useEffect(()=>{if(!scene)return;const image=new Image();image.onerror=()=>setArtFailed(true);image.src=CHAPTER_FILMS[game.levelIndex];return()=>{image.onerror=null;};},[game.levelIndex,sceneId,scene]);
 useEffect(()=>{if(scene?.kind==='aftermath'&&scene.step===1&&scene.synced>0)(root.current?.querySelector<HTMLButtonElement>('.campaign-sync-track button:not(:disabled)')??root.current?.querySelector<HTMLButtonElement>('footer button'))?.focus({preventScroll:true});},[scene?.kind,scene?.step,scene?.synced]);
 if(!scene||!visible)return null;
 const copy=sceneCopy(game),chapter=STORY_CHAPTERS[game.levelIndex],frame=filmFrame(scene.kind,scene.step,clock,reduced);
 return <div className="toybot-overlay campaign-story" ref={root} role="dialog" aria-modal="true" aria-labelledby="campaign-title" tabIndex={-1} onKeyDown={event=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dispatch({type:'STORY_SKIP'});return;}
  if(event.key!=='Tab')return;
  const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled),[tabindex="0"]'));
  const first=buttons[0],last=buttons[buttons.length-1];
  if(event.target===event.currentTarget){event.preventDefault();(event.shiftKey?last:first)?.focus();}
  else if(event.shiftKey&&event.target===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&event.target===last){event.preventDefault();first?.focus();}
 }}>
  <header><div><small>HOMECOMING / CHAPTER 0{game.levelIndex+1}</small><strong>{chapter.title}</strong></div><button type="button" onClick={()=>dispatch({type:'STORY_SKIP'})}>跳过演出 ›</button></header>
  <div className="campaign-scroll" ref={body} tabIndex={0} aria-label="剧情分镜与行动选择">
   <div className={'campaign-film '+(scene.kind==='confrontation'?'is-guardian':'')} style={{aspectRatio:CHAPTER_FILM_RATIOS[game.levelIndex],width:`min(100%,${(scene.step===1?160:240)*CHAPTER_FILM_RATIOS[game.levelIndex]}px)`}} aria-label={scene.kind==='aftermath'?'城市灯光与守护者回收的连续分镜':'火花与米可的连续行动分镜'} role="img">
    {!artFailed&&<><div className="campaign-film-frame" style={{backgroundImage:`url(${CHAPTER_FILMS[game.levelIndex]})`,backgroundPosition:`0% ${Math.floor(frame/2)*50}%`}}/><div className="campaign-film-frame campaign-film-reveal" style={{backgroundImage:`url(${CHAPTER_FILMS[game.levelIndex]})`,backgroundPosition:`100% ${Math.floor(frame/2)*50}%`,opacity:frame%2}}/></>}
    {artFailed&&<div className="campaign-film-unavailable">通信画面暂不可用<br/>文字与交互仍可继续</div>}
    <span className="campaign-film-tag">{scene.kind==='briefing'?'现场接入':scene.kind==='confrontation'?BOSS_NAMES[game.levelIndex]:'城市恢复记录'} <i/></span>
    <span className="campaign-film-corners"/>
   </div>
   <div className="campaign-dialogue" key={sceneId}><small>{copy.speaker}</small><h2 id="campaign-title">{copy.title}</h2><p>{copy.line}</p>{copy.hint&&<div className="campaign-objective">{copy.hint}</div>}</div>
   {scene.kind==='briefing'&&scene.step===1&&<div className="campaign-choices" role="group" aria-label="选择支援任务">
    <button type="button" onClick={()=>dispatch({type:'STORY_ROUTE',route:'rescue'})}><b>接应失联伙伴</b><span>驶过中继 → 小队机甲 +1</span><small>“收到信号的伙伴，一个也不落下。”</small></button>
    <button type="button" onClick={()=>dispatch({type:'STORY_ROUTE',route:'signal'})}><b>同步维护航标</b><span>驶过中继 → 护盾 +1</span><small>“先把通往城市的路点亮。”</small></button>
   </div>}
   {scene.kind==='aftermath'&&scene.step===1&&<div className="campaign-sync"><div className="campaign-sync-track" aria-label={`已接通${scene.synced}个维护节点，共3个`}>{[0,1,2].map(index=><button type="button" key={index} disabled={index!==scene.synced} className={index<scene.synced?'is-synced':''} aria-label={`接通第${index+1}个维护节点`} onClick={()=>dispatch({type:'STORY_SYNC',index})}><i/>{index<scene.synced?'已连接':`节点 0${index+1}`}</button>)}</div><p aria-live="polite">{scene.synced===3?(game.narrative.replay?'巡查报告已回传，城市维护网络保持在线。':game.levelIndex===4?'五区已重新连接。主线完成：归航巡游。':'维护记录已传回，下一段旅程正在等待。'):'依次点击发光的节点，与米可一起接回城市网络。'}</p></div>}
  </div>
  <footer><span>战场已冻结 · 可随时跳过</span>{!(scene.kind==='briefing'&&scene.step===1)&&<button type="button" className="toybot-primary" disabled={scene.kind==='aftermath'&&scene.step===1&&scene.synced<3} onClick={()=>dispatch({type:'STORY_NEXT'})}>{scene.step===0?(scene.kind==='briefing'?'连接支援频道':scene.kind==='confrontation'?'回应守护者':'同步维护记录'):(scene.kind==='confrontation'?'开始交战':'返回胜利结算')} <span aria-hidden="true">›</span></button>}</footer>
 </div>;
}
