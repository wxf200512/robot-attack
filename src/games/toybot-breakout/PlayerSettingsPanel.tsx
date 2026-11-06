import { useEffect, useRef } from 'react';
import type { PlayerSettings } from './settings';
export default function PlayerSettingsPanel({settings,onChange,onClose}:{settings:PlayerSettings;onChange:(s:PlayerSettings)=>void;onClose:()=>void}){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{root.current?.focus({preventScroll:true});},[]);
 return <div ref={root} tabIndex={-1} className="toybot-overlay toybot-settings" role="dialog" aria-modal="true" aria-labelledby="toybot-settings-title" onKeyDown={e=>{
  if(e.key==='Escape'){onClose();return;}if(e.key!=='Tab'||e.ctrlKey||e.metaKey||e.altKey)return;
  const items=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),input'));const first=items[0],last=items[items.length-1];
  if(e.target===e.currentTarget||e.shiftKey&&e.target===first){e.preventDefault();(e.shiftKey?last:first)?.focus();}else if(!e.shiftKey&&e.target===last){e.preventDefault();first?.focus();}
 }}>
 <div className="toybot-settings-panel"><div className="toybot-settings-heading"><small>PLAYER PREFERENCES</small><button type="button" onClick={onClose} aria-label="关闭设置">×</button></div><h2 id="toybot-settings-title">声音与画面</h2>
 <div className="toybot-settings-row"><span>游戏声音<small>战斗音效与背景配乐</small></span><button type="button" aria-pressed={!settings.muted} onClick={()=>onChange({...settings,muted:!settings.muted})}>{settings.muted?'已静音':'已开启'}</button></div>
 <label className="toybot-volume-label" htmlFor="toybot-volume">音效音量 <b>{Math.round(settings.volume*100)}%</b></label><input id="toybot-volume" type="range" min="0" max="100" value={Math.round(settings.volume*100)} onChange={e=>onChange({...settings,volume:Number(e.target.value)/100})}/>
<label className="toybot-volume-label" htmlFor="toybot-music-volume">背景音乐 <b>{Math.round((settings.musicVolume??.55)*100)}%</b></label><input id="toybot-music-volume" type="range" min="0" max="100" value={Math.round((settings.musicVolume??.55)*100)} onChange={e=>onChange({...settings,musicVolume:Number(e.target.value)/100})}/>
<div className="toybot-settings-row"><span>轻量震屏<small>重击与精英击破反馈</small></span><button type="button" aria-pressed={settings.shake!==false} onClick={()=>onChange({...settings,shake:settings.shake===false})}>{settings.shake===false?'已关闭':'已开启'}</button></div>
 <p className="toybot-quality-label">画面效果</p><div className="toybot-quality-options" role="group" aria-label="画面质量">{([{id:'auto',label:'自动'},{id:'low',label:'流畅优先'},{id:'high',label:'精细画面'}] as const).map(q=><button key={q.id} type="button" aria-pressed={settings.quality===q.id} onClick={()=>onChange({...settings,quality:q.id})}>{q.label}</button>)}</div>
 <p className="toybot-settings-note">流畅优先会减少装饰光效，保留攻击、预警与受击反馈。切回游戏后请手动继续作战。</p><button type="button" className="toybot-primary" onClick={onClose}>保存并返回 <span>›</span></button></div>
 </div>;
}
