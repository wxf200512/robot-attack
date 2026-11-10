import type { MechClass } from './mechs';
const ROOT='/games/toybot-breakout/optimized/';
export const COMBAT_RUN_V48:Record<MechClass,string>={pulse:ROOT+'combat-run-pulse-v48.webp',heavy:ROOT+'combat-run-heavy-v48.webp',blade:ROOT+'combat-run-blade-v48.webp'};
export const COMBAT_ARENA_V48:Record<MechClass,string>={pulse:ROOT+'combat-arena-pulse-v48.webp',heavy:ROOT+'combat-arena-heavy-v48.webp',blade:ROOT+'combat-arena-blade-v48.webp'};
export const COMBAT_BLADE_V48=ROOT+'combat-blade-strike-v48.webp';
export const COMBAT_UI_V48={gate:ROOT+'combat-gate-v48.webp',console:ROOT+'combat-cockpit-v48.webp',reactor:ROOT+'combat-reactor-v48.webp',bossIcons:ROOT+'combat-boss-icons-v48.webp'};
export const COMBAT_ROADS_V48=[1,2,3,4,5].map(n=>ROOT+'combat-road-'+n+'-v48.webp');
