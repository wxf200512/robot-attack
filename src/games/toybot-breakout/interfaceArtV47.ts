import type { MechClass } from './mechs';
const ROOT='/games/toybot-breakout/optimized/';
export const SHOWCASE_V47={pulse:ROOT+'showcase-pulse-v47.webp',heavy:ROOT+'showcase-heavy-v47.webp',blade:ROOT+'showcase-blade-v47.webp'};
export const INTERFACE_V47={hangar:ROOT+'interface-hangar-v47.jpg',gold:ROOT+'interface-gold-v47.webp',steel:ROOT+'interface-steel-v47.webp',panel:ROOT+'interface-panel-v47.webp',selected:ROOT+'interface-selected-v47.webp',equipment:ROOT+'interface-equipment-v47.webp'};
export function showcaseCellV47(weapon:boolean,armor:boolean,core:boolean){const cell=Number(weapon)+Number(armor)*2+Number(core)*4;return `${cell%4*100/3}% ${Math.floor(cell/4)*100}%`;}
export const equipmentIconV47=(module:'weapon'|'armor'|'core',mech:MechClass)=>module==='weapon'?({pulse:0,heavy:1,blade:2}[mech]):module==='armor'?3:4;
export const iconCellV47=(cell:number)=>`${cell%3*50}% ${Math.floor(cell/3)*100}%`;
