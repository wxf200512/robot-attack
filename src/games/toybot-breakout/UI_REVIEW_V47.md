> 文档状态：历史设计与验收记录。当前玩法、素材和交付状态请先阅读 [CURRENT_REQUIREMENTS.md](./CURRENT_REQUIREMENTS.md) 与 [ACCEPTANCE_STATUS.md](./ACCEPTANCE_STATUS.md)。本页测试数量、资源路径及“尚未完成”仅描述对应历史版本；被后续版本替代的规则不作为当前缺项。

# V47 production-art implementation review

The user rejected the V46 implementation because the reference's actual art/material effects were absent. V47 uses the same five-screen accepted concept as the target and introduces production bitmap assets rather than retaining the old rear-view menu sprite and bright city hangar.

## Reference / screenshot comparison

Concepts in C:/Users/18440/.codex/generated_images/01a18b43-6631-7861-9e77-876e06553323/:

- Home: exec-64942fdf-2a79-4aab-a298-6f037b8475de.png
- Hangar: exec-890b6ba7-78c5-4656-bd53-e094bbbc7c0d.png
- Story: exec-b964b930-a313-446c-9873-00ac90f813d4.png
- Result: exec-a9ff7f29-415d-4535-8eaa-61f3acb1c90e.png
- Combat: exec-88fc142a-7652-48ca-bade-30e24fb00e4b.png

Actual IAB Playwright screenshots in C:/Users/18440/Documents/Codex/2026-10-30/qing/:

- ui-v47-home.png; ui-v47-home-320.png; ui-v47-desktop.png
- ui-v47-hangar.png; ui-v47-heavy.png; ui-v47-blade.png
- ui-v47-story.png; ui-v47-victory.png; ui-v47-defeat-320.png
- ui-v47-pause.png; ui-v47-combat.png

Native-size checks:390×844,320×640,1280×900. Concepts and final screenshots inspected with view_image, in addition to browser DOM, interactions and console checks.

| Comparison point | V47 implementation / review |
| --- | --- |
| Hero subject | New front three-quarter white/cyan premium toy-mech; no old back-view avatar. Three classes and eight loadout combinations use their own artwork. |
| Environment | Actual dark industrial hangar, cyan ceiling lighting, yellow rails and circular lit display plinth. Fixed platform/feet alignment and mobile composition. |
| Type / hierarchy | Large italic white title, cyan rule, prominent mech, mission heading, five chapter controls, gold launch, quieter secondary controls. Removed the extra V46 eyebrow/subtitle and highest-score chip from this composition. |
| Surface material | Four generated milled-metal/chamfered/cyan or amber-edged frames, sliced to preserve corners; gold primary, blue secondary and navy panels. Replaces V46 flat rounded CSS cards. |
| Navigation | Cohesive line icons and metal button faces in four-tab dock, no mixed colorful raster menu icons. All controls remain native interactive HTML. |
| Hangar anatomy | Larger front mech, equipment icons, three spatial selectors with lines, live stats, one selected module inspector and actionable purchase/equip. |
| Dialogue | Existing Maya/Nora/Ethan chest portraits integrated with title, dialogue, objective and two full-width choices; both support choices fit390-width view. |
| Result | Outcome above a combined grade/score panel and condition line; rewards and next actions follow; details folded. Fixed old independent translate causing crop. |
| Combat chrome | Same metal health frame, red/orange fill, cyan player effects and distinct striped danger indicators; no collision/cadence changes. |
| Responsive / input |320-wide home scrollHeight=clientHeight640, dock bottom640; no horizontal overflow. Workshop scrolls vertically when needed; result retry bottom446 at320×640. Desktop remains centered430px play surface. |

## Data and artwork differences retained deliberately

The reference uses illustrative figures and values. Real unlocked chapters, parts, scores, grades and upgrade prices remain authoritative. Existing V45 human identities and the established chapter films are preserved (the concept's incidental face changes are not adopted). New eight-state menu poses preserve equipped-state identity; existing combat animation assets remain independent so no front-facing menu still is substituted for running/attacking frames. This is a material/art/layout implementation of the reference, not a pixel-identical raster page.

## Reproduction / verification

- interface-prompts-v47.json: complete built-in Image Gen prompts; no API fallback.
- art-source/interface-{pulse,heavy,blade,hangar,chrome,equipment}-v47.png: six source images.
- optimize-interface-v47.py: only crop/pad/resize/encode; no programmatic replacement artwork.
- interface-art-v47.json: nine runtime resources, 2740627bytes total.
-349 regression tests passed, TypeScript and changed TS/TSX ESLint passed,121 evaluated runtime URLs missing0.
-Real isolated-preview clicks verified purchase and pose update, class switching, support choice, options close, pause/settings/resume. Preview save guards preserved. Console error0; browser tabs closed and viewport reset.

Remaining external validation: Facebook test environment, physical mobile device and human playtest; no production publication.
