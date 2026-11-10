import type { ReactNode } from 'react';
const ICONS:{[key:string]:ReactNode}={
 battle:<><path d="m5 3 13 13M3 5l13 13M14 17l4-4M3 3l4 1-3 3zM19 3l-5 5M17 13l4 6M19 21l-6-4"/></>,
 garage:<><path d="m9 3 1-2h4l1 2 3 2 2 1-1 4v4l1 3-3 3-3-1h-4l-3 1-3-3 1-3v-4L3 6l3-1z"/><circle cx="12" cy="12" r="4"/></>,
 training:<><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v5m0 12v5M1 12h5m12 0h5"/></>,
 story:<><path d="M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3zM12 6v16M6 8h3m-3 4h3m6-4h3m-3 4h3"/></>,
 world:<><path d="m2 5 6-2 8 2 6-2v16l-6 2-8-2-6 2zM8 3v16M16 5v16"/></>,
 settings:<><path d="m9 3 1-2h4l1 2 3 2 2 1-1 4v4l1 3-3 3-3-1h-4l-3 1-3-3 1-3v-4L3 6l3-1z"/><circle cx="12" cy="12" r="4"/></>,
};
export default function MenuIcon({name}:{name:'battle'|'garage'|'training'|'story'|'world'|'settings'}){return <span className="menu-icon menu-line-icon-v47" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICONS[name]}</svg></span>;}
