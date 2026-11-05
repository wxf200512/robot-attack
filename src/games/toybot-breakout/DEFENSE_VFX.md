# 护盾与装甲 VFX v13

## 玩家可见效果

- 有护盾次数时，全队机甲显示青蓝色弧面能量罩、少量六边形折射片与地面光晕。僚机亮度低于领队，保持机体和子弹可见。
- 护盾格挡时，领队罩面播放命中闪点与扩散涟漪；仍有护盾次数则回到持续保护状态。
- 最后一层护盾耗尽，全队播放罩面碎片消散，并发出独立碎裂音效。每台机甲的外罩属于同一套小队防护，不增加独立格挡次数。
- 没有护盾但仍有装甲余量时，使用金色的离散能量装甲片，替换原来的紫色矩形光圈。装甲耗尽后停止持续显示；装甲吸收与耗尽反馈使用对应暖色效果。
- 三种机型共用防御特效，颜色不随武器配色改变。特效跟随各自机甲的换道、跑动与闪避位置，不拦截拖拽或射击输入。

## 时序与判定

`applySquadHit` 在真实吸收伤害后记录独立的 `defenseFx`（种类、是否耗尽、剩余 ticks、事件 id）。持续 8 个游戏 tick，约 0.8 秒；6 格图集逐格播放。原有无敌窗口仍为 6 tick，动画不会延长无敌或改变伤害计算。

暂停、剧情冻结时保持当前帧；新伤害可以更新反馈。进入首领区域、首领击破、战败与重新出击清除旧瞬态。永久升级等级不等于剩余装甲，持续效果依赖实际 `armorPoints` / `shieldCharges`。

持续保护使用 6 帧循环；低画质与系统减少动态效果偏好使用静态持续帧，保留必要的受击反馈。没有新增战斗定时器。

## AI 素材

内置 ImageGen 生成 4 套透明图集、共 24 帧；各图均为两列三行、固定六格。源图 1024×1536，运行图 512×768，保留 alpha 和透明中心，运行图共约 1.98 MB。

| 状态 | 原图 | 运行素材 |
| --- | --- | --- |
| 保护 | `art-source/shield-idle-v13.png` | `public/games/toybot-breakout/optimized/shield-idle-v13.png` |
| 命中 | `art-source/shield-impact-v13.png` | `public/games/toybot-breakout/optimized/shield-impact-v13.png` |
| 耗尽 | `art-source/shield-break-v13.png` | `public/games/toybot-breakout/optimized/shield-break-v13.png` |
| 装甲 | `art-source/shield-armor-v13.png` | `public/games/toybot-breakout/optimized/shield-armor-v13.png` |

完整提示词：`art-prompts-v13.json`。重建已加入 `optimize-assets.ps1`；前端 `DefenseVfx.tsx` / `defenseArt.ts` / `defense.css` 使用这些位图。

## 验证

- 106 项游戏测试通过，包含格挡与耗尽区分、无敌期不重复消费、动画不延长无敌、装甲余量耗尽、暂停、过场清理、六格尺寸与 alpha。
- 五关、三机型、两种支援路线的原有完整模拟仍通过。
- 生产构建、相关 TS/TSX ESLint 通过；全项目 TypeScript 仍只有既存共享 App.tsx / LogService.ts 的 3 处错误。
- 只读实际组件验收：`node src/games/toybot-breakout/render-ui-review.cjs --defense --mode=idle|armor|impact|break|empty --ticks=5`。三台机甲的保护、装甲和破碎叠层可复核；生成页 `defense-review.html` 不提交，不读写玩家存档。
