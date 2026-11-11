import { lt } from './i18n';
import { useState } from 'react';
import { CREW_V45, CREW_LIST_V45, speakerMetaV45, type SpeakerV45, CREW_WORLD_V45 } from './crewV45';
import { BOSS_ART } from './art';
import { RELAY_ART } from './campaign';
import { PORTRAIT_ART } from './visualArt';
import './crewV45.css';
export function CrewPortraitV45({speaker,level=0,variant='dialogue'}:{speaker:SpeakerV45;level?:number;variant?:'dialogue'|'radio'|'dossier'}){
 const [failed,setFailed]=useState<string|null>(null),meta=speakerMetaV45(speaker),human=Object.prototype.hasOwnProperty.call(CREW_V45,speaker)?CREW_V45[speaker as keyof typeof CREW_V45]:null;
 return <span className={'crew-portrait-v45 portrait-'+variant+' speaker-'+speaker} style={{'--crew-color':meta.color} as React.CSSProperties}>
  {human&&failed!==human.art?<img src={human.art} alt={lt(human.name+' · '+human.role)} decoding="async" draggable={false} onError={()=>setFailed(human.art)}/>:human?<b aria-label={lt(human.name+'，立绘暂不可用')}>{lt(meta.short)}</b>:speaker==='guardian'?<i aria-label={lt("当前区域守护者")} style={{backgroundImage:`url(${BOSS_ART})`,backgroundSize:'400% 500%',backgroundPosition:`0% ${Math.max(0,Math.min(4,level))*25}%`}}/>:speaker==='spark'?<i aria-label={lt("火花机甲核心")} style={{backgroundImage:`url(${PORTRAIT_ART})`,backgroundSize:'800% 300%',backgroundPosition:'0% 0%'}}/>:speaker==='miko'?<img src={RELAY_ART} alt={lt("米可维修终端")} decoding="async" draggable={false}/>:<b aria-label={lt(meta.name)}>SYS</b>}
 </span>;
}
export function CrewDossierV45(){return <section className="crew-dossier-v45" aria-label={lt("归航小队人物档案")}><h3>{lt("归航小队 · 频道另一端的伙伴")}</h3><p>{lt(CREW_WORLD_V45)}</p><div>{lt(CREW_LIST_V45.map(person=><article key={person.id}><CrewPortraitV45 speaker={person.id} variant="dossier"/><div><small>{lt(person.english)} / {lt(person.call)}</small><h4>{lt(person.name)}</h4><b>{lt(person.role)} · {lt(person.age)}{lt("岁")}</b><p>{lt(person.bio)}</p><blockquote>“{lt(person.quote)}”</blockquote></div></article>))}</div></section>;}
