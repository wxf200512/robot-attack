# V55 九语言与首页排版

更新日期：2026-11-11。本轮根据实际截图修复机型文字框遮挡，并扩展V54中英文适配。玩法继续使用V53，跑步素材继续使用V52。

## 玩家选择

首页顶部与设置页均使用原生语言选择菜单，提供简体中文、繁體中文、English、Español、Português (BR)、Français、Deutsch、日本語、한국어。切换保留机型、关卡、零件、改装、教学步骤和战斗数值，独立语言偏好键保持`toybot-breakout-language-v1`，原zh/en设置继续有效。地区标签如zh-TW、zh-Hant、zh-HK保留繁体；zh-CN/zh-Hans为简体；pt-*使用巴西葡萄牙语；不支持语言回退英文。

语言词库源码按需导入，重复准备请求合并。当前模板发布配置inlineDynamicImports=true，会将全部词库内联进单一主JS；生产包在本地按选择启用词库，不额外请求语言chunk。其它集成构建配置应交付完整构建产物。运行时不访问在线翻译接口，不发送玩家数据。首次加载失败保留可读的英文回退；手动选择失败时显示可重试提示，原语言和存档不被覆盖。设置页焦点循环包括语言下拉框。原有中文正文作为稳定显示查找键，不翻译战斗状态、关卡ID或存档键。

## 首页修复

移除覆盖机甲的倾斜大标签，机型名放在机甲下方独立信息栏；机甲绝对定位居中，标题、世界档案与机型栏分区。390像素宽下机型栏与机甲边界保持4px间隔；320像素宽的小屏保留6px间隔，标题也不与机体重叠。小屏精简已完成节点的重复文字，缩减边距与装饰尺寸，出击按钮保持首屏可见；完整通关状态继续由勾选与无障碍标签表达，不删通关数据。

## 词库与翻译质量

每个语言包对齐1174个显示键，覆盖菜单、机库、教学、25个前置关卡、守护者部件/技能/预警、奖励门、结算、试炼、漫画字幕、驾驶员和剧情通信。简体中文直接使用原文；英文沿用V54词库；繁体包由OpenCC s2twp从中文原文离线生成，并扫描常见简体界面字；其余六个语言包在构建阶段取得自动翻译初稿，再校对导航、机型与46组关键游戏术语，例如“已通关”表达关卡完成，不使用数据“已删除”的意思。占位符、批次标记和所有键完整性有自动检查。

来源与范围保存在[LOCALE_PROVENANCE_V55.json](./LOCALE_PROVENANCE_V55.json)。其余语言的长篇剧情仍需母语用户做表达、语气与术语一致性复核；没有声称已完成母语审校。保留既有音乐/音效，本轮没有新增多语言配音。产品在非中文界面保留英文品牌名Toybot Breakout。

## 验证

在独立localhost:5182实际应用检查新玩家入口；localhost:5183使用冻结的已通关档案/战斗夹具检查展示，不改用户常用端口存档。九种语言全部经真实下拉选择，分别核对390×844和320×640。320新玩家训练入口下沿595.3—629.5px，已通关档案出击入口下沿594.3—628.5px；无横向溢出，标题/机体/信息栏不重叠。繁体重载后保留，真实素材正常加载，新玩家新页面console error为0。V54已验证教学、机库、剧情、暂停与结果；V55补充七种词库完整性、真实关卡/战斗插值和语言缓存隔离。

命令：
```powershell
node --test src/games/toybot-breakout/simulation.test.cjs src/games/toybot-breakout/release-unit-v39.cjs src/games/toybot-breakout/integration-v42.cjs src/games/toybot-breakout/preludes-v53.test.cjs src/games/toybot-breakout/localization-v54.test.cjs src/games/toybot-breakout/localization-v55.test.cjs
npx tsc -p tsconfig.app.json --noEmit
node src/games/toybot-breakout/audit-assets-v43.cjs
```

## 当前交付

本轮源代码仅改游戏目录，无新增npm或运行时依赖。OpenCC仅安装在独立构建工具目录，游戏仅交付生成的静态词库，复建脚本为convert-traditional-v55.py。V54旧包不包含本轮七个新增语言包和首页修复，最新提测包从最终V55提交生成：`C:/Users/18440/Documents/Codex/2026-10-30/qing/releases/toybot-v55-final-20261111/`。源提交、ZIP大小与SHA-256以该目录release-report.json为准；必须交付完整构建目录；当前模板无额外语言chunk，不能沿用V54旧包。平台、物理设备、真人体验与正式主项目集成仍按[ACCEPTANCE_STATUS.md](./ACCEPTANCE_STATUS.md)保留未验收项。
