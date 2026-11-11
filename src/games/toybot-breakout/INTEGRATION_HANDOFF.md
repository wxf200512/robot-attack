# 玩具城突围集成交接

源仓库：https://github.com/wxf200512/robot-attack.git；开发分支：game/toybot-breakout。源码提交以最终提测包release-report.json的sourceCommit为准。只迁移src/games/toybot-breakout/与public/games/toybot-breakout/两个目录；原画、加工脚本、提示词与测试保留在源码目录，不放入运行ZIP。

V55增量：九语言显示、原生选择菜单和首页信息栏修复均在游戏目录，复用主项目i18next，无新增依赖或共享文件修改。迁移时使用V55最终提交与包，交付完整构建产物（当前模板将全部词库内联入主JS），不能拿V54/V53旧包替代。详见[LOCALIZATION_V55.md](./LOCALIZATION_V55.md)。

## 已准备

游戏manifest默认导出，id/payloadKey均为toybot-breakout，路由/toybot-breakout，按需导入index组件。首页封面为optimized/story-comic-4-v38.jpg，标题中英文均有。返回游戏列表使用/home。无新增npm依赖。

当前adType为quiz，复用主项目平台默认广告类型。manifest内PLACEHOLDER_IOS/ANDROID是模板约定，不代表必须新申请专属广告位。测试包关闭日志/占位统计，正式功能由主项目已配置服务承接。

交付目录handoff/toybot-breakout-migration.md由仓库官方scripts/export-migration.mjs生成。导出在独立临时目录进行，仅复制manifest真实内容和Git跟踪文件清单，不修改根目录或共享文件；临时空文件仅用于清单列举，不是要迁入主项目的源码。实际源文件必须取本仓库对应提交。

## 尚需明确的目标

根文档中的F:/business/framework-project/boredday/project不存在于本机。E:/H5_game/fb-bored-day-games-main的package名称是game-template，且没有.git，无法据此确认为上线主项目；不会把游戏写入这个未确认目标。当前工作区有Git忽略的生成验收HTML与本地测试文件，不列入交接清单。集成源应使用最终提交的干净检出，不能直接把未清理的开发工作区整目录复制进主项目。取得实际主项目路径/仓库后，先核对其AGENTS、分支、工作区改动和集成脚本锚点，再对该目标执行官方集成。

```powershell
# 先从最终sourceCommit创建干净源工作目录，避免夹带生成验收文件。
git worktree add --detach <干净源工作目录> <sourceCommit>
cd <干净源工作目录>
# 在明确实际主项目位置后执行，先只读预演。
npm run integrate -- toybot-breakout <实际主项目目录> --dry-run
# 检查预演结果，再执行同一官方脚本；保留脚本备份。
npm run integrate -- toybot-breakout <实际主项目目录>
```

不要从已撤回候选目录或本地平台替身复制代码，不覆盖主项目的注册器、广告、存档服务及其它游戏。

## 集成后验收

1. 主项目列表显示封面，进入/toybot-breakout，游戏可返回/home。
2. 新玩家完成六步教学进入前置1，五小关依序开放守护者，守护者胜利后开放下一地区。
3. 旧存档保留零件、改装、机型及已通关地区，重试/跳过剧情不重复奖励。
4. 暂停、设置、切后台恢复、音频和资源生命周期正常；手机与平台按各自条件实测。
5. 若正式启用日志/广告/统计，验证真实公网配置、失败恢复和事件去重。Facebook测试本轮按用户要求暂不执行。
6. 在主项目工作分支提交集成PR，记录最终源提交和构建包SHA-256。当前尚未创建主项目PR，不冒报已合并上线。
