import { LanguageSelector } from './LanguageSelector';
import { lt } from './i18n';
import { useEffect, useRef } from 'react';
import type { PlayerSettings } from './settings';
export default function PlayerSettingsPanel({settings,onChange,onClose}:{settings:PlayerSettings;onChange:(s:PlayerSettings)=>void;onClose:()=>void}){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{root.current?.focus({preventScroll:true});},[]);
 return <div ref={root} tabIndex={-1} className="toybot-overlay toybot-settings" role="dialog" aria-modal="true" aria-labelledby="toybot-settings-title" onKeyDown={e=>{
  if(e.key==='Escape'){onClose();return;}if(e.key!=='Tab'||e.ctrlKey||e.metaKey||e.altKey)return;
  const items=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),input,select:not([disabled])'));const first=items[0],last=items[items.length-1];
  if(e.target===e.currentTarget||e.shiftKey&&e.target===first){e.preventDefault();(e.shiftKey?last:first)?.focus();}else if(!e.shiftKey&&e.target===last){e.preventDefault();first?.focus();}
 }}>
 <div className="toybot-settings-panel"><div className="toybot-settings-heading"><small>PLAYER PREFERENCES</small><button type="button" onClick={onClose} aria-label={lt("关闭设置")}>×</button></div><h2 id="toybot-settings-title">{lt("操作、声音与画面")}</h2>
 <LanguageSelector/>
 <div className="toybot-settings-row"><span>{lt("游戏声音")}<small>{lt("战斗音效与背景配乐")}</small></span><button type="button" aria-pressed={!settings.muted} onClick={()=>onChange({...settings,muted:!settings.muted})}>{lt(settings.muted?'已静音':'已开启')}</button></div>
 <label className="toybot-volume-label" htmlFor="toybot-volume">{lt("音效音量 ")}<b>{lt(Math.round(settings.volume*100))}%</b></label><input id="toybot-volume" type="range" min="0" max="100" value={Math.round(settings.volume*100)} onChange={e=>onChange({...settings,volume:Number(e.target.value)/100})}/>
<label className="toybot-volume-label" htmlFor="toybot-music-volume">{lt("背景音乐 ")}<b>{lt(Math.round((settings.musicVolume??.55)*100))}%</b></label><input id="toybot-music-volume" type="range" min="0" max="100" value={Math.round((settings.musicVolume??.55)*100)} onChange={e=>onChange({...settings,musicVolume:Number(e.target.value)/100})}/>
<div className="toybot-settings-row"><span>{lt("轻量震屏")}<small>{lt("重击与精英击破反馈")}</small></span><button type="button" aria-pressed={settings.shake!==false} onClick={()=>onChange({...settings,shake:settings.shake===false})}>{lt(settings.shake===false?'已关闭':'已开启')}</button></div>
 <p className="toybot-quality-label">{lt("拖拽灵敏度")}</p><div className="toybot-quality-options" role="group" aria-label={lt("拖拽灵敏度")}>{lt(([{value:.75,label:'稳健'},{value:1,label:'标准'},{value:1.35,label:'灵敏'}] as const).map(option=><button type="button" key={option.value} aria-pressed={(settings.dragSensitivity??1)===option.value} onClick={()=>onChange({...settings,dragSensitivity:option.value})}>{lt(option.label)}</button>))}</div><p className="toybot-settings-note">{lt("长拖可跨两轨，反向拖动可回切；首领战按逐轨闪避执行。")}</p>
 <p className="toybot-quality-label">{lt("画面效果")}</p><div className="toybot-quality-options" role="group" aria-label={lt("画面质量")}>{lt(([{id:'auto',label:'自动'},{id:'low',label:'流畅优先'},{id:'high',label:'精细画面'}] as const).map(q=><button key={q.id} type="button" aria-pressed={settings.quality===q.id} onClick={()=>onChange({...settings,quality:q.id})}>{lt(q.label)}</button>))}</div>
 <p className="toybot-settings-note">{lt("流畅优先会减少装饰光效，保留攻击、预警与受击反馈。切回游戏后请手动继续作战。")}</p><button type="button" className="toybot-primary" onClick={onClose}>{lt("保存并返回 ")}<span>›</span></button></div>
 </div>;
}
