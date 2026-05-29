# 模板项目 ↔ 主项目 交互流程

## 两个仓库的角色

```
┌─────────────────────────────────────┐      ┌───────────────────────────────────────────────┐
│ 模板项目                              │      │ 主项目                                          │
│ F:\business\game-template           │      │ F:\business\framework-project\boredday\project │
│                                     │      │                                                │
│ • 孤岛沙盒（带 FBInstant mock）        │      │ • 上线项目，FB Instant Games 真实运行           │
│ • 每个游戏一个分支 game/<id>          │      │ • 收纳所有已集成的游戏                          │
│ • 唯一目标：让 dev 跑通自己的游戏      │      │ • shell（App/Home/AdService/i18n）= 共享 spine │
└─────────────────────────────────────┘      └───────────────────────────────────────────────┘
       △                                                              △
       │ npm run new-game                                              │ git commit
       │ npm run dev                                                   │ git push (PR)
       │ npm run export-migration                                      │
       │                                                               │
       └───── npm run integrate ──────────────────────────────────────┘
                  把模板分支的成果搬进主项目（拷文件 + patch 4 个 shell 文件）
```

**交互的物理介质就 3 样东西**：
1. **manifest.ts**（每个游戏的契约：id / route / payloadKey / adType / adUnits / title / homeCard）
2. **git 分支**（开发者在模板上以 `game/<id>` 分支推送）
3. **integrate.mjs 脚本**（把分支机械化搬进主项目；可选搭配 `migrations/<id>.md` 给 AI 看）

---

## 三阶段时序图

### 阶段 0 — 一次性建仓（已完成）

```
你（模板维护者）
    │
    ├─ 复制主项目 shell 到 game-template/
    │  • 删掉所有现有游戏代码 / 资源 / 业务数据
    │  • 生产值改成 import.meta.env.VITE_*
    │  • 重写 App.tsx + Home.tsx 用 games/registry 自动注册
    │  • 加 src/games/sample/ 作参考
    │
    ├─ 写 4 份文档
    │  • README.md         快速入门
    │  • CREATE_GAME.md    给人看的逐步指南
    │  • AGENTS.md         给 AI 看的约束清单
    │  • INTEGRATION.md    集成路径（3 档）
    │
    ├─ 写 3 个脚本
    │  • scripts/new-game.mjs           交互式建骨架
    │  • scripts/export-migration.mjs   导出迁移清单
    │  • scripts/integrate.mjs          一键集成进主项目
    │
    └─ git init + 推到内部远端
```

### 阶段 1 — 开发者做一个新游戏（每个游戏走一次）

```
开发者本地 (可以用 AI 协助)
    │
    1. git clone <template-url> spaceship && cd spaceship
    │  git checkout -b game/spaceship
    │  cp .env.example .env
    │  npm install
    │
    2. npm run new-game
    │  ↓ 终端问 4 个问题（id / en title / zh title / color）
    │  ↓ 自动生成：
    │     src/games/spaceship/manifest.ts
    │     src/games/spaceship/index.tsx     ← 最小骨架（标题 + 返回首页）
    │     public/games/spaceship/.gitkeep
    │
    3. npm run dev
    │  浏览器 http://localhost:5173 → 看到 spaceship 卡片 → 点进游戏页
    │
    4. 写代码（人或 AI）
    │  • 子页面放 src/games/spaceship/components/
    │  • 关卡数据放 src/games/spaceship/data/
    │  • 资源放 public/games/spaceship/
    │  • 不要碰共享 shell（AGENTS.md 红线）
    │
    5. npm run export-migration spaceship  ← 可选，给走"AI 集成路径"用
    │  生成 migrations/spaceship.md
    │
    6. git add src/games/spaceship public/games/spaceship migrations/spaceship.md
    │  git commit -m "feat(spaceship): initial implementation"
    │  git push -u origin game/spaceship
    │
    7. 告诉集成者分支名 "game/spaceship"
```

### 阶段 2 — 集成者把分支搬进主项目

```
集成者（你）
    │
    1. cd F:/business/game-template
    │  git fetch && git checkout game/spaceship
    │
    2. （可选）查看 manifest 决定要不要申请专属广告位
    │  cat src/games/spaceship/manifest.ts
    │  • adType === 'quiz'     → 复用平台默认插页位，零额外操作
    │  • adType === 'spaceship'→ 去 FB Ads Manager 申请 iOS/Android unit
    │                            把真值填回 manifest 再继续
    │
    3. 选一条集成路径：
    │
    │  🟢 路径 A（推荐，零 AI 零手工）
    │     npm run integrate -- spaceship F:/business/framework-project/boredday/project
    │     ↓
    │     脚本自动：
    │     • 拷贝 src/games/spaceship/ → 主项目同位置
    │     • 拷贝 public/games/spaceship/ → 主项目同位置
    │     • patch src/App.tsx（4 处插入）
    │     • patch src/components/Home.tsx（1 处插入卡片）
    │     • patch src/utils/AdService.ts（adType=quiz 时跳过）
    │     • patch src/newgameI18n.ts（追加 i18n 注册）
    │     • 改动前自动备份 *.bak
    │
    │  🟡 路径 B（主项目里有 AI 助手时）
    │     把 migrations/spaceship.md 内容/路径喂给主项目里的 Claude/Codex
    │     AI 照清单粘贴
    │
    │  🔴 路径 C（兜底，纯手工）
    │     照 INTEGRATION.md 逐步改 4 个文件
    │
    4. cd F:/business/framework-project/boredday/project
    │  npm run dev
    │  • 首页应能看到 spaceship 卡片
    │  • 点击进入游戏正常
    │  • 临时改 App.tsx 的 payload 测试行：payload = {"game":"spaceship"}
    │    刷新应直接深链到 spaceship 路由（验完改回）
    │
    5. 验证通过 → 删除 .bak 备份
    │  rm src/App.tsx.bak src/components/Home.tsx.bak src/newgameI18n.ts.bak
    │
    6. git checkout -b feat/integrate-spaceship
    │  git add src/games/spaceship public/games/spaceship \
    │          src/App.tsx src/components/Home.tsx \
    │          src/newgameI18n.ts          # adType=quiz 时不需要 add AdService.ts
    │  git commit -m "feat(spaceship): integrate game from template"
    │  git push -u origin feat/integrate-spaceship
    │
    7. 在主项目 GitHub 开 PR → 审核 → merge → 上线
```

---

## 关键文件 / 命令 / 约定速查

### 模板项目里的 5 个 npm 脚本

| 命令 | 谁跑 | 干啥 |
|---|---|---|
| `npm install` | 开发者 / 集成者 | 装依赖 |
| `npm run dev` | 开发者 | 本地起 Vite dev server |
| `npm run new-game` | 开发者 | 交互建游戏骨架 |
| `npm run export-migration [id]` | 开发者（可选） | 生成 migrations/<id>.md |
| `npm run integrate -- <id> <main-path>` | 集成者 | 机械化搬进主项目 |

### 主项目侧需要的命令

| 命令 | 何时 |
|---|---|
| `npm run dev` | 集成完后验证 |
| `git add ... && git commit && git push` | 验证通过后提交 PR |

### 4 个被 patch 的主项目文件

| 文件 | 改动 | adType=quiz 时跳过？ |
|---|---|---|
| `src/App.tsx` | import + Route + payload nav + payload ad-init（4 处） | 否 |
| `src/components/Home.tsx` | 新增 1 个入口卡片 | 否 |
| `src/utils/AdService.ts` | 加 else-if 分支（2 个函数） | ✅ 是 |
| `src/newgameI18n.ts` | 追加 i18n 注册块 | 否 |

### 红线（AGENTS.md 列得更全）

- ❌ 开发者修改模板里 `src/components/` / `src/utils/` / `src/services/` / `src/App.tsx` / `src/components/Home.tsx` 等共享文件
- ❌ 开发者把游戏代码放 `src/games/<id>/` 之外
- ❌ commit `.env`
- ❌ commit devMock 里临时改的 `getEntryPointData`
- ❌ 集成者编辑模板 / 开发者编辑主项目

---

## 异常处理速查

| 症状 | 原因 | 解决 |
|---|---|---|
| `npm run dev` 白屏 | devMock 没装上 / FBInstant init hang | 检查 `src/devMock.ts` 是否无条件覆盖 |
| `npm run integrate` 找不到锚点 | 主项目 shell 被重构，锚点字符串不在了 | 退到路径 B/C；或修 integrate.mjs 的锚点 |
| 主项目 git pull 后跟模板版本对不上 | shell 漂移 | 把主项目 shell 变化手工同步回模板 |
| 主项目 dev 跑起来后看不到新卡片 | i18n key 名拼错 / homeCard.cover 路径错 | 看浏览器 console；检查 manifest |
| 集成时 .bak 备份还原 | 集成出错需要回滚 | `mv src/App.tsx.bak src/App.tsx`（每个文件单独还原） |
| 加新游戏时锚点匹配失败 | 上一个游戏改了 shell 的 fallthrough 文案 | 修 integrate.mjs 锚点定义 |

---

## 主项目 shell 改动的同步策略（目前手工）

当前模板和主项目是两个独立仓库。如果主项目 shell 有改动（例如 Header 重写、AdService 重构、加新 FBInstant 调用），需要**手工同步回模板**。

建议：
1. 主项目每次 shell 改动 PR 里 @ 自己
2. PR 合入后立即同步对应文件到模板
3. 给模板打 tag 记录"对应主项目 commit X"

漂移控制好的话，每个开发者 clone 到的都是和主项目 shell 等价的环境。

---

## 整张流程一句话总结

> **模板项目是带 FBInstant mock 的沙盒**，开发者在沙盒里建游戏 → push 分支 → 集成者跑 `npm run integrate` 把分支机械化搬进主项目 → PR 上线。模板↔主项目通过 `manifest.ts` + git 分支 + `integrate.mjs` 串联。
