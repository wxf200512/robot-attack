import { ROAD_TILES_V37 } from './roadMotionV37';
export function RoadWorldV37({level}:{level:number}){return <div className="toybot-road-world-v37" aria-hidden="true"><div className="toybot-road-surface-v37" style={{backgroundImage:`url(${ROAD_TILES_V37[level]})`}}/><i className="road-divider-v37 left"/><i className="road-divider-v37 right"/></div>;}
