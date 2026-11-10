import { COMBAT_UI_V48 } from './combatArtV48';
const ROOT = '/games/toybot-breakout/optimized/';
export const MAP_ART = [1, 2, 3, 4, 5].map(n => `${ROOT}map-${n}-v29.jpg`);
export const BOSS_ART = `${ROOT}boss-roster-ai-v2.webp`;
export const BOSS_INTRO_ART = `${ROOT}boss-intro-ai-v4.webp`;
export const BOSS_STAGE2_ART = `${ROOT}boss-stage2-ai-v4.webp`;
export const BOSS_DEFEAT_ART = `${ROOT}boss-defeat-ai-v3.webp`;
export const BOSS_RUSH_ART = `${ROOT}boss-rush-ai-v5.webp`;
export const GATE_ART = COMBAT_UI_V48.gate;
export const PLAYER_ART = `${ROOT}player-evolution-ai-v2.webp`;
export const THREAT_ART = `${ROOT}boss-threats-ai-v2.webp`;
export const ENEMY_ART = `${ROOT}enemy-roster-ai-v9.webp`;
export const BATTLE_ART = { pulse: ROOT + 'mech-pulse-combat-v10.webp', heavy: ROOT + 'mech-heavy-combat-v10.webp', blade: ROOT + 'mech-blade-combat-v10.webp' };
export const BOSS_CAST_ART = ROOT + 'boss-cast-v10.webp';
export const BOSS_OBJECTIVE_ART = ROOT + 'boss-objectives-v10.webp';
export const BOSS_NAMES = ['铸炉监工', '苍穹蜂后', '赤铁堡垒', '风暴先知', '星核帝皇'];

export const UI_HANGAR_ART = ROOT + 'ui-hangar-ai-v6.jpg';
export const UI_RESULT_CRESTS = ROOT + 'ui-result-crests-ai-v6.webp';
export const UI_MENU_ART = { hangar: ROOT + 'ui-menu-hangar-v19.jpg', victory: ROOT + 'ui-menu-victory-v14.jpg', medal: ROOT + 'ui-menu-medal-v14.png' };
export const UI_MENU_ICONS = ROOT + 'ui-menu-icons-v15.webp';
export const STORY_ART = [1,2,3,4].map(page=>ROOT + `story-comic-${page}-v38.jpg`);
export const STORY_COVER = ROOT + 'story-comic-1-v38.jpg';

export const MECH_CLASS_ART = { heavy: ROOT + 'mech-heavy-ai-v7.webp', blade: ROOT + 'mech-blade-ai-v7.webp' };
export const BLADE_SLASH_ART = ROOT + 'blade-slash-ai-v7.webp';

export const MECH_FRONT_ART = { heavy: ROOT + 'mech-heavy-front-v8.webp', blade: ROOT + 'mech-blade-front-v8.webp' };
