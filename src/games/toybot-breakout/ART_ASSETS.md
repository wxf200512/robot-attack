> 文档状态：历史设计与验收记录。当前玩法、素材和交付状态请先阅读 [CURRENT_REQUIREMENTS.md](./CURRENT_REQUIREMENTS.md) 与 [ACCEPTANCE_STATUS.md](./ACCEPTANCE_STATUS.md)。本页测试数量、资源路径及“尚未完成”仅描述对应历史版本；被后续版本替代的规则不作为当前缺项。

# 游戏美术约定与 AI 素材

用户偏好：图片相关的角色、装备、弹体和特效素材优先使用 AI 生图。升级需要改变装备结构和图片动画帧，不以 SVG 图形、简单加粗或变色代替正式美术。

## 第二轮场景与角色改造

以下素材由内置 Image Gen 生成并保存到 `public/games/toybot-breakout/`；完整提示词和参考来源记录在同目录源码中的 `art-prompts-v2.json`。

| 文件 | 接入用途 |
| --- | --- |
| `map-1-ai-v2.png` | 晨光工厂出口 |
| `map-2-ai-v2.png` | 高空无人机走廊 |
| `map-3-ai-v2.png` | 橙红铸造与装甲封锁线 |
| `map-4-ai-v2.png` | 紫色能量风暴区域 |
| `map-5-ai-v2.png` | 金色星核堡垒 |
| `gate-3d-ai-v2.png` | 4列×2行：奖励／陷阱实体门的待机、可进入、穿越、离开状态 |
| `boss-roster-ai-v2.png` | 4列×5行：五个独立首领的待机、蓄能、发射、回收帧 |
| `player-evolution-ai-v2.png` | 4列×4行：青色脉冲、蓝色导轨、紫色等离子、金色星核机甲的整身跑动帧 |
| `boss-threats-ai-v2.png` | 4列×3行：朝玩家飞行的炮弹、可摧毁路障、小型机器人动作帧 |

机甲的整身装甲、手炮、弹体按同一武器等级选择素材。首领不再左右移动，其炮弹实际飞到玩家处才产生伤害。可摧毁召唤物会挡住同轨道火线。

### 地图空间与遮挡

场景物体按地面纵深排序，远处的门位于近处机甲后方。门槛落到64%的脚下接触线时触发，贴图脚部以85%高度为锚点；擦过不同轨道的门不会显示收集反馈。

空射子弹向道路远端中心收束，随距离缩小、淡出，并在各地图道路消失点附近结束。命中弹朝对应轨道的投影位置飞行，不允许跨轨道扣血。地图、物体和弹道共用投影位置计算。

## 当前图集

首领流程新增的正式图集为 `boss-intro-ai-v4.png`、`boss-stage2-ai-v4.png`、`boss-defeat-ai-v3.png`，均已保存在 `public/games/toybot-breakout/` 并接入。使用内置 Image Gen，提示词及帧含义见 [BOSS_FLOW.md](./BOSS_FLOW.md)、`art-prompts-v3.json` 与 `art-prompts-v4.json`。

- `public/games/toybot-breakout/weapon-cannon-ai-atlas-v1.png`：内置 Image Gen 生成，1254×1254，透明 RGBA，四行四列。行对应武器等级 1–4；列对应待机、蓄能、开火、回收。以现有 `player-run-single-v1.png` 为风格参考。
- `public/games/toybot-breakout/projectile-ai-atlas-v1.png`：内置 Image Gen 生成，1254×1254，透明 RGBA，四行四列。行对应武器等级 1–4；列为循环飞行动画。

手炮每帧随局内射击冷却切换，弹体动画只影响表现；编队发射位置、目标锁定和命中时结算伤害由游戏模拟管理。

## 生图提示规格

手炮：stylized-concept，透明背景、等距 4×4 图集，保持现有象牙白／深蓝玩具机甲画风。仅生成面向屏幕上方的右前臂手炮，后上方第三人称视角，不生成整个人物。四行依次为青色双叉脉冲炮、蓝色双导轨加速炮、紫色三瓣等离子虹膜炮、金色星核悬浮环炮。四列依次为待机关闭、机械展开蓄能、后坐开火、回收冷却。每帧固定位置和比例，机械结构确实变化；保留金属细节，控制泛光，所有像素留在所属单元格，不加文字、水印或背景。

强化弹：stylized-concept，透明背景、等距 4×4 图集，精细涂装的科幻玩具武器美术。所有弹体朝屏幕上方，每帧中心一致。四行依次为青色三叉能量矛、带象牙白机身和蓝色稳定翼的微型导弹、紫色晶体与三瓣旋转环刃、金色六角星核与分段轨道环。四列展示循环飞行帧，改变尾焰、能量和环刃位置；轮廓在 24 像素仍可辨识。避免长光柱、简单加粗光条、扁平矢量图标、文字、水印和场景背景。

## 接入约束

保持生成图的真实透明通道，不用黑底或棋盘格冒充透明。新素材保存为版本文件，不覆盖原始图。CSS 只负责选帧、定位和必要的位移；主要装备造型与发射特效由 AI 图片承载。
`boss-rush-ai-v5.png`：内置 Image Gen 生成，透明4列×5行首领突袭动作图集，已接入蓄力、前冲、横扫接触与刹停；提示词见 art-prompts-v5.json。

## 界面美术 v6

内置 Image Gen 生成并接入：ui-hangar-ai-v6.png（首页／机库背景，暂停与结算背景同系复用）及 ui-result-crests-ai-v6.png（透明胜利／失败徽章图集）。完整提示词见 art-prompts-v6.json；布局与验证记录见 UI_DESIGN.md。

## 机型美术 v7

内置 Image Gen 生成并接入 mech-heavy-ai-v7.png（力量型）、mech-blade-ai-v7.png（近战型）及 blade-slash-ai-v7.png（四档刀光）。完整提示词见 art-prompts-v7.json，源图保留透明背景；角色展示和动作取帧见 mechArt.ts，机型流程见 MECH_CLASSES.md。
