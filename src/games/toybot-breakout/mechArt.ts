import type { CSSProperties } from 'react';
import { MECH_CLASS_ART, MECH_FRONT_ART } from './art';
import type { MechClass } from './mechs';

// Blade's generated sheet has unequal row gutters; use explicit source bounds
// so the front-view feet and slash follow-through are not cut by an even grid.
const BLADE_ROWS = [0, 190, 345, 495, 645, 795, 945, 1105, 1265, 1420];
export function mechSpriteStyle(kind: Exclude<MechClass, 'pulse'>, row: number, tier: number, front = false): CSSProperties {
  const frame = Math.max(0, Math.min(8, row));
  const imageHeight = kind === 'blade' ? 1448 : 1881;
  const cellWidth = kind === 'blade' ? 271.5 : 209;
  const top = kind === 'blade' ? BLADE_ROWS[frame] : frame * 209;
  const height = kind === 'blade' ? BLADE_ROWS[frame + 1] - top : 209;
  const width = cellWidth / height * (front ? 100 : 400 / 3);
  return {
    backgroundImage: `url(${front ? MECH_FRONT_ART[kind] : MECH_CLASS_ART[kind]})`,
    backgroundSize: front ? '400% 100%' : `400% ${imageHeight / height * 100}%`,
    backgroundPosition: `${Math.max(0, Math.min(3, tier)) * 100 / 3}% ${top / (imageHeight - height) * 100}%`,
    width: width + '%', left: (100 - width) / 2 + '%',
  };
}
