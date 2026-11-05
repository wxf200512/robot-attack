const ROOT = '/games/toybot-breakout/optimized/';
export const MAP_ART = [1, 2, 3, 4, 5].map(n => `${ROOT}map-${n}-ai-v2.jpg`);
export const BOSS_ART = `${ROOT}boss-roster-ai-v2.png`;
export const BOSS_INTRO_ART = `${ROOT}boss-intro-ai-v4.png`;
export const BOSS_STAGE2_ART = `${ROOT}boss-stage2-ai-v4.png`;
export const BOSS_DEFEAT_ART = `${ROOT}boss-defeat-ai-v3.png`;
export const BOSS_RUSH_ART = `${ROOT}boss-rush-ai-v5.png`;
export const GATE_ART = `${ROOT}gate-3d-ai-v2.png`;
export const PLAYER_ART = `${ROOT}player-evolution-ai-v2.png`;
export const THREAT_ART = `${ROOT}boss-threats-ai-v2.png`;
export const ENEMY_ART = `${ROOT}enemy-roster-ai-v9.png`;
export const BATTLE_ART = { pulse: ROOT + 'mech-pulse-combat-v10.png', heavy: ROOT + 'mech-heavy-combat-v10.png', blade: ROOT + 'mech-blade-combat-v10.png' };
export const BOSS_CAST_ART = ROOT + 'boss-cast-v10.png';
export const BOSS_OBJECTIVE_ART = ROOT + 'boss-objectives-v10.png';
export const BOSS_NAMES = ['铸炉监工', '苍穹蜂后', '赤铁堡垒', '风暴先知', '星核帝皇'];

export const UI_HANGAR_ART = ROOT + 'ui-hangar-ai-v6.jpg';
export const UI_RESULT_CRESTS = ROOT + 'ui-result-crests-ai-v6.png';
export const STORY_ART = [1,2,3,4].map(page=>ROOT + `story-comic-${page}-v11.jpg`);
export const STORY_COVER = ROOT + 'story-cover-v11.jpg';

export const MECH_CLASS_ART = { heavy: ROOT + 'mech-heavy-ai-v7.png', blade: ROOT + 'mech-blade-ai-v7.png' };
export const BLADE_SLASH_ART = ROOT + 'blade-slash-ai-v7.png';

export const MECH_FRONT_ART = { heavy: ROOT + 'mech-heavy-front-v8.png', blade: ROOT + 'mech-blade-front-v8.png' };
