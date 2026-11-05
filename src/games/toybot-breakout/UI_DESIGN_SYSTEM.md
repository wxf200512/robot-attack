# Toybot 界面设计系统 v15

本轮重做整体布局和控件系统，接替 v14 的小型卡片大厅；保留 v14 的原创环境素材。

## 联网参考与设计取舍

调研日期：2026-11-05。

- [Archero 2 / 官方商店](https://play.google.com/store/apps/details?id=com.xq.archeroii)；[实际主界面截图](https://assetsio.gnwcdn.com/archero-3.jpg?height=1920&width=1920)：顶部资源栏、中间角色/关卡空间、醒目的金色 Start 按钮、底部功能导航。借鉴主次关系与按钮体积，重新组织为机甲大厅。
- [Survivor.io / 装备界面参考](https://mturbogamer.com/2022/12/survivor-io-how-to-unlock-tsukiyomi-catnips-survivors/)：人物、装备卡片和属性分区。用于机库模块卡片与选中机型的视觉区分。
- [Mech Arena / 官方机库与进度说明](https://mecharena-support.plarium.com/hc/en-us/articles/26714386938908-Progress-Path)：机型与装配展示保持真实、资源不占据中心角色空间。

以上是本项目的归纳与设计选择。未导入竞品角色、品牌、背景、图标或界面截图作为游戏素材。

## 落地规范

1. 大厅：资源栏 → 通栏机甲展台 → 象牙白任务控制台 → 金色出击按钮 → 四项底部导航。世界档案作为展台右侧入口，设置在顶部，返回游戏列表保留。
2. 按钮：金色表示主要行动，蓝色表示次要行动；可点击按钮有顶面高光和底部厚度；按压、焦点、选中、禁用分别显示状态。文字均为 HTML，维持可读性与可访问名称。
3. 面板：海军蓝框架、象牙白搪瓷面板、青色选中与进度、金色主要行动。暂停、胜利、失败、设置与机库使用同一套材质和颜色。
4. 机库：金色选中机型、独立模块卡片、装配标记、清楚的升级成本与禁用状态。保留全部实际升级/装配规则。
5. 结算：勋章、得分、奖励各有独立层级；普通胜利提供下一关；最终胜利与失败的整备按钮全宽。
6. 大厅始终展示实际选择机型和已装模块等级，初始机甲仍为一台。未装配模块显示基础状态。

## 原创图标素材

使用内置 ImageGen 生成六枚三维导航图标，透明图集严格为三列两行：机甲/扳手/靶标，书本/地图/设置。原图 1536×1024；运行图 576×384，单格 192×192，保留 RGBA。所有显示单元按完整格定位。

- 原图：`src/games/toybot-breakout/art-source/ui-menu-icons-v15.png`
- 运行图：`public/games/toybot-breakout/optimized/ui-menu-icons-v15.png`
- 完整提示词：[art-prompts-v15.json](./art-prompts-v15.json)
- 控件：[MenuIcon.tsx](./MenuIcon.tsx)，主题：[menus.css](./menus.css)
- 重建规则：`optimize-assets.ps1`。

不把文字、按钮或资源数值烧进 AI 图中；机甲与装备继续使用真实展示组件。

## 验证

- 原有 106 项玩法测试通过；相关 TS/TSX ESLint、生产构建通过。
- 全项目 TypeScript 仍只有共享 App.tsx / LogService.ts 的三项既存错误，未改共享文件。
- 浏览器检查大厅、机库模块、设置、暂停、胜利和失败；修复浅色背景上的设置标题、选中机型名称对比。
- 360×740 大厅主按钮和底部导航完整显示；320×568 无横向按钮溢出，主按钮可见，并对短屏减小角色展示区。
- 页面重排保留关卡锁定、装备、剧情入口、训练与返回处理；未改战斗逻辑或存档结构。
