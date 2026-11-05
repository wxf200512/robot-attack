# 首页、暂停与胜利界面 v14

## 联网调研与应用

调研日期：2026-11-05。下列为参考观察与本项目设计取舍；没有导入第三方游戏图片、角色或界面成品。

| 参考 | 可借鉴点 | 本项目应用 |
| --- | --- | --- |
| [Mob Control / 官方 Steam 展示](https://store.steampowered.com/app/2736490/Mob_Control/) | 卡通三维体块、鲜明阵营色、倍增和成长信息清楚；官方介绍强调门、军械库与成长循环 | 保留玩具机甲的立体材质；减少首页重复说明，出击按钮优先，改装与训练并列 |
| [Mech Arena / 官方机库截图与进度说明](https://mecharena-support.plarium.com/hc/en-us/articles/26714386938908-Progress-Path) | 机甲在机库中占据中心，资源和进度在外围，出战入口醒目 | 实际所选机甲与已装装备独立叠在空机库背景上；装配信息不烧进背景图 |
| [Mech Arena / 官方介绍](https://mecharena.game/) | 机甲与武器组合是视觉和养成的核心 | 首页、暂停沿用真实机型和装备展示组件，保持改装同步 |
| [Last War: Survival / 官方商店页](https://apps.apple.com/us/app/last-war-survival/id6448786147) | 分路躲避射击与队伍成长结合 | 将关卡、任务、出击组合成一个清晰的任务面板，剧情与设置作为次级入口 |

上述设计取舍为本项目的归纳，不代表这些游戏全部采用相同菜单布局。

## 三页布局

- 首页：标题 → 独立机甲展台 → 五区关卡/任务/出击 → 改装与训练 → 剧情档案 → 设置与返回。机甲保持真实机型和装备；锁定关卡沿用现有规则。
- 暂停：小幅机库全身展示 → 暂停标题与关卡 → 进度/人数/生命 → 继续 → 设置 → 返回首页。真实战斗仍由原暂停状态冻结。
- 胜利：黎明城市与原创机械勋章 → 成功标题 → 得分 → 零件/库存/归队 → 下一关 → 重玩与改装。最终关不显示下一关，整备按钮占满一行。

视觉基调为深海军蓝、象牙白、青色能源与克制的香槟金。胜利主按钮使用暖金；主界面与暂停使用青色。文本与按钮均为真实 HTML，不包含在生图中。

## AI 素材与可复现来源

使用内置 ImageGen，共生成三份原创素材；完整提示词在 [art-prompts-v14.json](./art-prompts-v14.json)。

| 素材 | 原图存档 | 游戏运行素材 |
| --- | --- | --- |
| 星港机库 | `art-source/ui-menu-hangar-v14.png` | `public/games/toybot-breakout/optimized/ui-menu-hangar-v14.jpg` |
| 黎明城市 | `art-source/ui-menu-victory-v14.png` | `public/games/toybot-breakout/optimized/ui-menu-victory-v14.jpg` |
| 机械胜利徽章 | `art-source/ui-menu-medal-v14.png` | `public/games/toybot-breakout/optimized/ui-menu-medal-v14.png` |

两张环境图为 768×512 JPEG；勋章为 384×192 RGBA PNG，保留透明背景。重建规则已加入 `optimize-assets.ps1`。背景不含机甲，避免切换机型时首页出现错误角色；菜单样式独立限定在 `.menu-refresh` 中。

## 验收

现有 106 项玩法测试、相关 TS/TSX ESLint 和生产构建通过。全项目 TypeScript 仍有共享 App.tsx / LogService.ts 的三项既存错误，没有改动共享文件。

浏览器验收覆盖 1280×720、360×740 与 320×568：首页主按钮可见、无横向按钮溢出；最小屏幕保留纵向滚动；暂停面板可完整容纳；最终关不显示下一关，整备按钮全宽。实际页面的机库进入/返回已验证。

`render-ui-review.cjs --home --mech=blade`、`--pause --mech=heavy`、默认胜利页及 `--final` 生成真实组件的只读验收页面，不读写玩家存档，生成 HTML 已忽略提交。
