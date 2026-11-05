import { useEffect, useRef, useState } from 'react';
import { MAP_ART } from './art';
import { getLevel } from './level';
import { preloadImages } from './loading';
import { STORY_PAGES, STORY_CHAPTERS } from './story';
import './story.css';

type Props={initialMode:'comic'|'world';initialPage:number;completedLevels:boolean[];onPage:(page:number)=>void;onClose:(completed:boolean)=>void};
export default function StoryDialog({initialMode,initialPage,completedLevels,onPage,onClose}:Props){
  const [mode,setMode]=useState(initialMode),[page,setPage]=useState(Math.max(0,Math.min(STORY_PAGES.length-1,initialPage)));
  const [failed,setFailed]=useState<number[]>([]);
  const root=useRef<HTMLDivElement>(null),body=useRef<HTMLDivElement>(null);
  const item=STORY_PAGES[page],last=page===STORY_PAGES.length-1;
  useEffect(()=>{root.current?.focus({preventScroll:true});},[]);
  useEffect(()=>{if(mode==='comic'&&page<STORY_PAGES.length-1)void preloadImages([STORY_PAGES[page+1].art]);},[page,mode]);
  useEffect(()=>{body.current?.scrollTo({top:0});},[mode,page]);
  const changePage=(next:number)=>{const index=Math.max(0,Math.min(STORY_PAGES.length-1,next));setPage(index);onPage(index);};
  return <div ref={root} className="toybot-overlay toybot-story" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="toybot-story-title" onKeyDown={e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose(false);return;}
    if(mode==='comic'&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){e.preventDefault();e.stopPropagation();changePage(page+(e.key==='ArrowRight'?1:-1));return;}
    if(e.key!=='Tab'||e.ctrlKey||e.metaKey||e.altKey)return;
    const buttons=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),[tabindex="0"]'));
    const first=buttons[0],final=buttons[buttons.length-1];
    if(e.target===e.currentTarget){e.preventDefault();(e.shiftKey?final:first)?.focus();}
    else if(e.shiftKey&&e.target===first){e.preventDefault();final?.focus();}else if(!e.shiftKey&&e.target===final){e.preventDefault();first?.focus();}
  }}>
    <header className="story-heading"><div><small>TOYBOT / DAWN REBOOT</small><h2 id="toybot-story-title">{mode==='comic'?'黎明重启':'星穹城档案'}</h2></div><button type="button" className="story-close" onClick={()=>onClose(false)} aria-label="关闭剧情，返回首页">×</button></header>
    <div className="story-tabs" role="group" aria-label="剧情内容"><button type="button" aria-pressed={mode==='comic'} onClick={()=>setMode('comic')}>序章漫画</button><button type="button" aria-pressed={mode==='world'} onClick={()=>setMode('world')}>世界档案</button></div>
    <div className={'story-body mode-'+mode} ref={body} tabIndex={0} aria-label={mode==='comic'?'漫画阅读区':'世界设定与五区任务'}>
      {mode==='comic'?<article className="story-comic-page" key={page}>
        <div className="story-comic-art"><span className="story-panel-number">PROLOGUE / 0{page+1}</span>{failed.includes(page)?<div className="story-art-fallback"><p>插画暂未加载，仍可阅读剧情</p><button type="button" onClick={()=>setFailed(current=>current.filter(index=>index!==page))}>重新加载插画</button></div>:<img src={item.art} alt={item.alt} decoding="async" draggable={false} onError={()=>setFailed(current=>current.includes(page)?current:[...current,page])}/>}</div>
        <div className="story-comic-copy" aria-live="polite" aria-atomic="true"><div className="story-page-kicker">星穹城记事 / 第 {page+1} 幕</div><h3>{item.title}</h3><p>{item.caption}</p><blockquote><span>{item.speaker}</span><p>“{item.line}”</p></blockquote></div>
      </article>:<div className="story-world">
        <section className="story-world-intro"><small>一座等待重新亮起的城市</small><h3>五个区域，一条回家的路</h3><p>星穹城漂浮在云海之上，工厂、航道、城防、能源塔和中央基地彼此相连。一场能源风暴让应急程序“静默协议”失控，城市守护者开始拦截自己的居民。</p><p>你要带着伙伴恢复五区权限，关闭静默协议，让城市重新运转。</p></section>
        <div className="story-people"><article><span>SPK-01 / 火花</span><h4>同一枚核心，三种机型</h4><p>装入脉冲先锋、重锤泰坦或疾刃游侠，选择你的战斗方式。每局单机出发，伙伴在途中集结。</p></article><article><span>MIKO / 米可</span><h4>始终在线的维修终端</h4><p>负责机体校准、通信与回收。带回的零件用于机库永久改装；它会陪你走完这条路。</p></article></div>
        <div className="story-district-heading"><h3>五区行动记录</h3><span>{completedLevels.filter(Boolean).length} / 5 权限恢复</span></div>
        {STORY_CHAPTERS.map((chapter,index)=>{const level=getLevel(index),cleared=completedLevels[index]===true;return <article key={chapter.permission} className={'story-district '+(cleared?'is-restored':'')}>
          <img src={MAP_ART[index]} alt="" loading="lazy" decoding="async" />
          <div><div className="story-district-top"><small>0{index+1} / {chapter.district}</small><span>{cleared?'权限已恢复':'等待恢复'}</span></div><h4>{chapter.title} <small>· {level.title}</small></h4><p>{chapter.background}</p><div className="story-district-task"><span>主要任务</span><strong>{chapter.objective}</strong></div><details><summary>守护者与战术 · {level.encounters[0].label}</summary><p>{chapter.tip}</p></details></div>
        </article>;})}
        <p className="story-world-note">完成本关首领战并进入胜利结算，才会恢复该区权限并解锁下一关。阅读故事或重看漫画不会改变战斗进度。</p>
      </div>}
    </div>
    <footer className="story-footer">
      {mode==='comic'?<><div className="story-pagination" role="group" aria-label="漫画页码">{STORY_PAGES.map((p,index)=><button key={p.title} type="button" aria-label={`阅读第 ${index+1} 幕：${p.title}`} aria-pressed={page===index} onClick={()=>changePage(index)}><span /></button>)}<b>{page+1} / {STORY_PAGES.length}</b></div><div className="story-reader-actions"><button type="button" className="story-previous" disabled={page===0} onClick={()=>changePage(page-1)}>‹ 上一幕</button><button type="button" className="toybot-primary" onClick={()=>last?onClose(true):changePage(page+1)}>{last?'进入机库首页':'下一幕'} <span aria-hidden="true">›</span></button></div><button type="button" className="story-skip" onClick={()=>onClose(false)}>稍后再看 · 返回首页</button></>:<button type="button" className="toybot-primary" onClick={()=>onClose(false)}>返回首页，准备出发 <span aria-hidden="true">›</span></button>}
    </footer>
  </div>;
}
