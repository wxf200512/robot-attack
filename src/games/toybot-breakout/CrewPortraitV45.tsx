import { useState } from 'react';
import { CREW_V45, CREW_LIST_V45, speakerMetaV45, type SpeakerV45, CREW_WORLD_V45 } from './crewV45';
import { BOSS_ART } from './art';
import { RELAY_ART } from './campaign';
import { PORTRAIT_ART } from './visualArt';
import './crewV45.css';
export function CrewPortraitV45({speaker,level=0,variant='dialogue'}:{speaker:SpeakerV45;level?:number;variant?:'dialogue'|'radio'|'dossier'}){
 const [failed,setFailed]=useState<string|null>(null),meta=speakerMetaV45(speaker),human=Object.prototype.hasOwnProperty.call(CREW_V45,speaker)?CREW_V45[speaker as keyof typeof CREW_V45]:null;
 return <span className={'crew-portrait-v45 portrait-'+variant+' speaker-'+speaker} style={{'--crew-color':meta.color} as React.CSSProperties}>
  {human&&failed!==human.art?<img src={human.art} alt={human.name+' · '+human.role} decoding="async" draggable={false} onError={()=>setFailed(human.art)}/>:human?<b aria-label={human.name+'，立绘暂不可用'}>{meta.short}</b>:speaker==='guardian'?<i aria-label="当前区域守护者" style={{backgroundImage:`url(${BOSS_ART})`,backgroundSize:'400% 500%',backgroundPosition:`0% ${Math.max(0,Math.min(4,level))*25}%`}}/>:speaker==='spark'?<i aria-label="火花机甲核心" style={{backgroundImage:`url(${PORTRAIT_ART})`,backgroundSize:'800% 300%',backgroundPosition:'0% 0%'}}/>:speaker==='miko'?<img src={RELAY_ART} alt="米可维修终端" decoding="async" draggable={false}/>:<b aria-label={meta.name}>SYS</b>}
 </span>;
}
export function CrewDossierV45(){return <section className="crew-dossier-v45" aria-label="归航小队人物档案"><h3>归航小队 · 频道另一端的伙伴</h3><p>{CREW_WORLD_V45}</p><div>{CREW_LIST_V45.map(person=><article key={person.id}><CrewPortraitV45 speaker={person.id} variant="dossier"/><div><small>{person.english} / {person.call}</small><h4>{person.name}</h4><b>{person.role} · {person.age}岁</b><p>{person.bio}</p><blockquote>“{person.quote}”</blockquote></div></article>)}</div></section>;}
