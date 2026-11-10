> 文档状态：历史设计与验收记录。当前玩法、素材和交付状态请先阅读 [CURRENT_REQUIREMENTS.md](./CURRENT_REQUIREMENTS.md) 与 [ACCEPTANCE_STATUS.md](./ACCEPTANCE_STATUS.md)。本页测试数量、资源路径及“尚未完成”仅描述对应历史版本；被后续版本替代的规则不作为当前缺项。

# V48 in-game visual synchronization review

## References and actual output

Style reference: V47 generated ivory/navy/cyan front mech atlases in art-source/interface-{pulse,heavy,blade}-v47.png. Layout reference: C:/Users/18440/.codex/generated_images/01a18b43-6631-7861-9e77-876e06553323/exec-88fc142a-7652-48ca-bade-30e24fb00e4b.png.

Actual IAB screenshots at C:/Users/18440/Documents/Codex/2026-10-30/qing/:

- ui-v48-combat.png (final390×844, first area, three pulse mechs, reward portal, Nora)
- ui-v48-combat-320.png (320×640)
- ui-v48-radio.png (communication vs guardian bounds)
- ui-v48-heavy-dodge-320.png (separate heavy arena/dodge art)
- ui-v48-blade-burst-320.png (blade art and actual activated core)

Concept and final screenshots inspected using view_image after browser verification. This round delivers playable raster assets and layout changes rather than a full-screen mockup overlay.

| Inspected point | Actual implementation |
| --- | --- |
| Character material/identity | New rear-view ivory ceramic shells, dark joints, cyan pulse, violet heavy and teal sword equipment match the menu family. Class-specific running, planted combat, attacks and dodges stay independent. |
| Ground / depth | Five new low-contrast metal surfaces repeat from authoritative progress. Existing environments and guardian/mob motion remain. |
| Reward object | Eight-state physical arch with side depth and floor base, cyan reward and orange penalty, unchanged contact projection and removal rules. |
| Header | Shared nine-slice metal frame, guardian portrait/name/stage, red/orange HP, readable numeric HP,44px settings/pause targets. Smaller viewport omits secondary clock. |
| Communication | Portrait/callsign/message/close in one compact top strip. Mission chip no longer spans guardian body. Existing Nora identity retained rather than the concept's incidental blonde portrait. |
| Bottom console | New ivory/navy hardware frame, separate real DOM HP and squad data, reactor hardware center, correct live/disabled skill button. All data remains real gameplay data. |
| Shared coordinate space | Reserved top band moves every world actor/object/projectile together; world dimensions also feed pixel-length effects. No isolated door/shell transform hack. |
| Presentation limits | Existing five guardian designs, mob designs, independent AI and animations retained and graded; they were not all newly illustrated in this round. Squad still follows the selected lane, not the concept's three-lane spread. |

Native checks:390×844 and320×640. The390 sample communication ends at111px and guardian bounds begin at134px. Console714—844px; sample squad above it.320 sample has no horizontal overflow. No mobile-device/Facebook or guaranteed-FPS claim.

## Assets / reproducibility

- combat-prompts-v48.json: complete selected-generation prompts, built-in Image Gen mode.
- art-source/combat-*-v48.png: ten selected originals; front-facing erroneous blade candidate was discarded and is not referenced.
- optimize-combat-v48.py: mechanical atlas layout/crop/resize/encode only.
- combat-art-v48.json:16 runtime assets,5655914bytes,272 mech animation cells plus8 gate states and5 guardian portrait cells.
- combatArtV48.ts: evaluated URL registry used by active render modules and audit.

349 existing and2 new tests passed (351 total). TypeScript, changed TS/TSX ESLint and122-runtime-URL audit passed. Same-lane firing, captured per-member origins, gates, boss timing, saved equipment and preview guards retain existing checks. Browser verified heavy brace→weight-shift on ArrowLeft and separate blade-cut atlas; actual skill click changes to active/disabled state. Console error0. One CDP interaction timed out; same-tab documented AX fallback completed the final frozen composition. A manual gate step was interrupted by normal auto-pause; that particular browser step is not counted as passed (engine regression covers it).

No shared shell changes, new npm dependencies, API image fallback, platform publication or save writes from QA fixtures. Facebook/device/human playtest remains external.
