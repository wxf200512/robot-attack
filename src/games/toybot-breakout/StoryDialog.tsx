import { CrewDossierV45, CrewPortraitV45 } from './CrewPortraitV45';
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
    <header className="story-heading"><div><small>TOYBOT / HOMECOMING</small><h2 id="toybot-story-title">{mode==='comic'?'归航行动':'星穹玩具城档案'}</h2></div><button type="button" className="story-close" onClick={()=>onClose(false)} aria-label="关闭剧情，返回首页">×</button></header>
    <div className="story-tabs" role="group" aria-label="剧情内容"><button type="button" aria-pressed={mode==='comic'} onClick={()=>setMode('comic')}>序章漫画</button><button type="button" aria-pressed={mode==='world'} onClick={()=>setMode('world')}>世界档案</button></div>
    <div className={'story-body mode-'+mode} ref={body} tabIndex={0} aria-label={mode==='comic'?'漫画阅读区':'世界设定与五区任务'}>
      {mode==='comic'?<article className="story-comic-page" key={page}>
        <div className="story-comic-art"><span className="story-panel-number">PROLOGUE / 0{page+1}</span>{failed.includes(page)?<div className="story-art-fallback"><p>插画暂未加载，仍可阅读剧情</p><button type="button" onClick={()=>setFailed(current=>current.filter(index=>index!==page))}>重新加载插画</button></div>:<img src={item.art} alt={item.alt} decoding="async" draggable={false} onError={()=>setFailed(current=>current.includes(page)?current:[...current,page])}/>}</div>
        <div className="story-comic-copy" aria-live="polite" aria-atomic="true"><div className="story-page-kicker">星穹城记事 / 第 {page+1} 幕</div><h3>{item.title}</h3><p>{item.caption}</p><blockquote className="crew-comic-quote-v45"><CrewPortraitV45 speaker={item.character} variant="radio"/><div><span>{item.speaker}</span><p>“{item.line}”</p></div></blockquote></div>
      </article>:<div className="story-world">
        <section className="story-world-intro"><small>一场等待伙伴到齐的归航巡游</small><h3>五盏航标，一支不断壮大的维修队</h3><p>星穹玩具城的五区准备点亮归航航标。风暴却让安全系统误把“保护玩具”变成了“全部归箱”，五位守护者开始执行错误的回收指令。</p><p>你是火花维修队。每局单机出发，沿途接应伙伴、穿过支援门，回收零件改装机体，再解除守护者身上的封锁部件，让归航巡游重新出发。</p></section>
        <CrewDossierV45/><div className="story-people"><article><span>SPK-01 / 火花</span><h4>同一枚核心，三种机型</h4><p>装入脉冲先锋、重锤泰坦或疾刃游侠，选择你的战斗方式。每局单机出发，伙伴在途中集结。</p></article><article><span>MIKO / 米可</span><h4>始终在线的维修终端</h4><p>负责支援选择、中继护盾和紧急回收。失败时会带核心回机库；带回的零件用于永久改装，下一次仍从一台机甲开始。</p></article></div>
        <div className="story-district-heading"><h3>五区行动记录</h3><span>{completedLevels.filter(Boolean).length} / 5 航标点亮</span></div>
        {STORY_CHAPTERS.map((chapter,index)=>{const level=getLevel(index),cleared=completedLevels[index]===true;return <article key={chapter.permission} className={'story-district '+(cleared?'is-restored':'')}>
          <img src={MAP_ART[index]} alt="" loading="lazy" decoding="async" />
          <div><div className="story-district-top"><small>0{index+1} / {chapter.district}</small><span>{cleared?'航标已点亮':'等待接通'}</span></div><h4>{chapter.title} <small>· {level.title}</small></h4><p>{chapter.background}</p><div className="story-district-task"><span>主要任务</span><strong>{chapter.objective}</strong></div><details><summary>守护者与战术 · {level.encounters[0].label}</summary><p>{chapter.tip}</p></details></div>
        </article>;})}
        <p className="story-world-note">完成本关首领战并进入胜利结算，才会点亮该区航标并解锁下一关。阅读故事或重看漫画不会改变战斗进度。</p>
      </div>}
    </div>
    <footer className="story-footer">
      {mode==='comic'?<><div className="story-pagination" role="group" aria-label="漫画页码">{STORY_PAGES.map((p,index)=><button key={p.title} type="button" aria-label={`阅读第 ${index+1} 幕：${p.title}`} aria-pressed={page===index} onClick={()=>changePage(index)}><span /></button>)}<b>{page+1} / {STORY_PAGES.length}</b></div><div className="story-reader-actions"><button type="button" className="story-previous" disabled={page===0} onClick={()=>changePage(page-1)}>‹ 上一幕</button><button type="button" className="toybot-primary" onClick={()=>last?onClose(true):changePage(page+1)}>{last?'进入机库首页':'下一幕'} <span aria-hidden="true">›</span></button></div><button type="button" className="story-skip" onClick={()=>onClose(false)}>稍后再看 · 返回首页</button></>:<button type="button" className="toybot-primary" onClick={()=>onClose(false)}>返回首页，准备出发 <span aria-hidden="true">›</span></button>}
    </footer>
  </div>;
}
