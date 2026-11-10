# V46 design and local visual verification

## Direction and fidelity ledger

Concepts generated with built-in Image Gen before implementation. Source concepts are local QA references, not shipping backgrounds. Comparison uses view_image on the concepts and actual browser screenshots in the same QA pass.

| Aspect | Reference → implementation | Result / deliberate difference |
| --- | --- | --- |
| Home hierarchy | Hero, chapter row, objective, amber launch, two quiet entries, four-tab dock | Same information order; launch visible at 390×844 and 320×640. Existing hangar and mech artwork retained rather than adopting invented concept art. |
| Surface / controls | Navy panels, amber primary, cyan state, consistent outlines/corners | Applied across home, pause, garage, result and story. Existing raster icon atlas retained; real HTML buttons and focus rings. |
| Hangar | Three spatial slots + one inspector | Weapon/armor/core selectors frame the existing mech, lines connect inward, only the selected module is shown; transaction and equipped-state feedback verified. Character tabs use existing names and real stats. |
| Communication | Portrait + identity + dialogue within one card | Existing V45 Nora/Maya/Ethan remain unchanged. More compact portrait than concept to preserve readable live text and mobile controls. Choices stack vertically. |
| Debrief | Small hero, grade/score, three rewards, next action, collapsed details | All in first viewport at390×844; real earned values retained. Grade and score remain separate compact rows for three-digit life/time and long translated text. |
| Combat | Quiet environment; warm threat shapes; compact top bar; cockpit bottom | Existing gameplay assets retained. Pattern + sign distinguish hazards and gates. Settings and pause44px, health-bar right edge278px precedes settings left285px at390px width. Formation remains the real same-lane squad, not the concept's three-lane spread. |
| Pause | Compact scene and current state before resume | Long build history collapses; corrected world-HUD bleed and settings stacking. |

## Evidence locations

Local output directory: C:/Users/18440/Documents/Codex/2026-10-30/qing/

- ui-v46-home.png; ui-v46-home-320.png; ui-v46-desktop.png
- ui-v46-hangar.png; ui-v46-hangar-320.png
- ui-v46-story.png; ui-v46-options.png
- ui-v46-pause.png; ui-v46-victory.png; ui-v46-defeat.png; ui-v46-defeat-320.png
- ui-v46-combat.png; ui-v46-gates.png
- v46-tests.log (348 passed)

Concept directory: C:/Users/18440/.codex/generated_images/01a18b43-6631-7861-9e77-876e06553323/

- Home exec-64942fdf-2a79-4aab-a298-6f037b8475de.png
- Hangar exec-890b6ba7-78c5-4656-bd53-e094bbbc7c0d.png
- Story exec-b964b930-a313-446c-9873-00ac90f813d4.png
- Result exec-a9ff7f29-415d-4535-8eaa-61f3acb1c90e.png
- Combat exec-88fc142a-7652-48ca-bade-30e24fb00e4b.png

No Facebook test URL or physical device was supplied. These are local browser checks, not Facebook/device/performance certification. The existing preview guard and save isolation remain intact. No shared source, new dependency or production publishing.
