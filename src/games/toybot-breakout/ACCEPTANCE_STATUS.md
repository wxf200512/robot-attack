> V56动作增量：当前源码已更新全身跑射、肩胯联动和多人构图；旧V55提测ZIP未重打。V56本地验证见 [RUN_FIRE_V56.md](./RUN_FIRE_V56.md)，不能把旧包当作本轮动作验收。

> 2026-11-11最新增量：V55提供九语言和首页无遮挡排版。九语言在320×640与390×844逐一选择检查；新玩家与已通关档案均验证，首屏按钮可见，无横向溢出。独立繁体、词库键/占位符、缓存隔离和真实战斗数值有新增回归。当前包目录为`C:/Users/18440/Documents/Codex/2026-10-30/qing/releases/toybot-v55-final-20261111/`；以release-report.json最终提交与校验值为准。详见[LOCALIZATION_V55.md](./LOCALIZATION_V55.md)。下方V54/V53记录为历史，各平台/真机/真人/正式集成条件没有自动验收通过。

> 2026-11-11增量：V54已接入中英文；玩法仍为V53。原363项回归与8项语言测试通过；语言切换、刷新保存、教学/机库/剧情、首领驾驶舱、暂停和结果显示已本地检查。英文320×640开始按钮下沿约614.7px，无横向溢出。范围与限制见[LOCALIZATION_V54.md](./LOCALIZATION_V54.md)。最新V54包位于`C:/Users/18440/Documents/Codex/2026-10-30/qing/releases/toybot-v54-final-20261111/`，以其release-report.json提交与校验值为准。以下V53验收记录保留供追溯；V53 ZIP不包含语言改动。Facebook、真机、真人与正式集成待验收项没有自动变为通过。

# V53 交付与验收状态

更新日期：2026-11-10。代码包含V52跑步与V53五区25个前置小关。当前为本地提测交付；用户已明确本轮暂不做Facebook平台测试。

| 事项 | 当前状态 | 证据或剩余条件 |
| --- | --- | --- |
| 最新提测包 | 本轮重建并核验 | 最终交付目录release-report.json记录源码提交和ZIP SHA-256；verification-report.json记录CRC、逐文件及125个运行素材对照 |
| 自动功能回归 | 363项通过 | 战斗/存档/发布/locale/25小关测试，含75组三机型无永久改装基础生命通关样本 |
| TypeScript与素材 | 通过 | tsconfig.app.json noEmit；125运行素材URL缺失0；旧共享类型错误已修复 |
| 文档整理 | 完成 | CURRENT_REQUIREMENTS为当前规则入口，其余旧版增加历史状态提示 |
| 构建产物本地界面 | 本地检查通过 | 六步教学、首关结算、继续第二小关、暂停/恢复、设置保存、改装与刷新保存；独立响应层使用替身，ZIP保留真实SDK |
| Facebook平台 | 本轮不执行 | 用户明确暂不需要测试Facebook，未上传、未发布、未做真实平台联调 |
| Android/iOS真机 | 待设备 | 本机未检测到ADB/iPhone测试接口；视口预览不能替代设备帧率、温度、内存、触控和音频 |
| 真人可玩性 | 待试玩人员 | 自动策略和代理操作不代替首次游玩者；交付目录提供试玩记录表和操作用例 |
| 正式主项目集成 | 待真实目标目录 | 文档F盘目标在本机不存在；E盘main目录是无Git的game-template副本，不能认作正式主项目；已准备迁移/交接材料，不修改不明确的目标 |
| 正式广告/后端/统计 | 待主项目配置 | 测试包关闭遥测，不能认作正式服务验收通过；不索取密码、密钥或令牌 |

## 交付内容与核验

最终目录：C:/Users/18440/Documents/Codex/2026-10-30/qing/releases/toybot-v53-final-20261110/。

- toybot-breakout-v53-test.zip：上传测试用包，约58.3MiB，ZIP根目录直接包含index.html与fbapp-config.json。
- release-report.json：源提交、ZIP大小、SHA-256、相对资源路径及调试内容检查。
- verification-report.json：ZIP CRC、全部150文件与staging一致、V52/V53标记、125素材与源码一致、与本地已测站点一致。
- handoff/：官方导出的迁移清单、文件校验清单、人工验收用例及试玩CSV。
- local-qa/：本地构建界面检查证据；平台模拟文件不进入ZIP。

验收从最终提交生成包，核对本地已测候选包与最终包站点逐文件哈希一致。最终提交号与校验值以目录内JSON报告为准，不能按文件夹版本名猜测。旧V48与已撤回V49候选均不作为当前提测包。

## 构建产物实际操作记录

本轮使用候选构建文件（游戏代码提交366b81a6）在嵌套路径/check/运行，只在HTTP响应层替换平台初始化；候选site文件和ZIP字节不受此替身修改。最终包将逐文件比较该已测site，不能只拿开发服务器截图代替构建包检查。

- 从游戏列表进入，实际完成六步教学；训练受击保护生效，正式前置关重新以100生命、1台机甲出发。
- 暂停前后身体样式、道路相位和进度一致，继续时出现准备时间。
- 第一小关真实约45秒结算，41击破、1050分、4零件；点击继续进入第二小关，显示对应伊森通信。
- 返回并刷新后前线1/5、第二小关可挑战、第三小关与守护者仍锁定；静音与流畅画质保持。
- 实际购买装甲Lv.1：零件4→0、生命上限100→110、装甲0→2，自动装配；再次刷新保留。
- 390×844、320×640与1280×900检查；320宽出击按钮下沿619.5px，首屏可见，无横向溢出。最终新页面console error为0，游戏列表往返正常。

以上是代理在本地平台替身下的功能操作，不是首次真人体验、GPU性能、手机或Facebook验收。详细记录和截图在交付目录local-qa/。

## 可复查命令

```powershell
node --test src/games/toybot-breakout/simulation.test.cjs src/games/toybot-breakout/release-unit-v39.cjs src/games/toybot-breakout/integration-v42.cjs src/games/toybot-breakout/preludes-v53.test.cjs
npx tsc -p tsconfig.app.json --noEmit
node src/games/toybot-breakout/audit-assets-v43.cjs --list
node src/games/toybot-breakout/release-v39.mjs <全新输出目录> v53
```

本轮不调整玩法数值、跑步素材、存档结构、共享shell或npm依赖。Facebook、设备和真人项只能在取得对应条件后勾选，不能用本地通过替代。
