# AGENTS.md — 给 AI 助手的工作约定

如果你是 AI（Claude Code / Codex / Cursor / Copilot Chat / 其他）正在协助一位开发者在这个仓库里做游戏，**先读这份文件**。先读完，再动手。

人类版的说明在 [`CREATE_GAME.md`](./CREATE_GAME.md)，可以作为补充上下文，但你应该把本文件当作权威约束。

---

## 这是什么仓库

- **不是产品代码**，是一个**游戏模板**。
- 开发者克隆它做**一个新游戏**，做完后**集成者**会把这个游戏合并进另一个上线的主项目（`F:\business\framework-project\boredday\project`）。
- 你的目标：帮开发者在 `src/games/<id>/` 下产出一个**自包含、可集成**的游戏模块。

---

## 第一性原则（按重要性排序）

1. **只动游戏文件夹**：你写的每一行代码都应该在 `src/games/<id>/` 或 `public/games/<id>/` 内。这两个文件夹之外的任何改动都必须先停下来跟开发者确认。
2. **不重构共享 shell**：哪怕你觉得 `App.tsx` / `Home.tsx` / `Header.tsx` / `AdService.ts` / `GlobalStore.ts` / `registry.ts` 可以写得更好——不要碰。它们在主项目里也有同名版本，改了会触发集成冲突。
3. **manifest 是契约**：游戏对外暴露的所有元信息（路由、广告、首页卡片、标题）只能通过 `src/games/<id>/manifest.ts` 表达，不通过其它方式注入到主项目。
4. **不引入新的全局副作用**：不要在游戏内 `import` 时挂 `window.*`、不要 monkeypatch 共享 Service。所有跨页面状态用 `GlobalStore` 或 `localStorage`。
5. **保守对待依赖**：能用 React + 现有依赖搞定的就别装新包。要装也要在 prompt 里告诉开发者你装了什么。

---

## 工作区拓扑（你必须熟记）

```
src/
├── App.tsx                    ⛔ 不要改（路由从 registry 自动生成）
├── main.tsx                   ⛔ 不要改
├── devMock.ts                 ⚠️ 测深链时可临时改 getEntryPointData，验完改回，不要 commit 这个改动
├── FBLoader.ts                ⛔ 不要改
├── i18n.ts                    ⛔ 不要改
├── types.ts                   ⛔ 不要改（GameManifest 类型来源）
├── components/                ⛔ 整个文件夹都是共享组件，不要改也不要在里面加新文件
│   ├── Header.tsx
│   ├── Home.tsx               ← 卡片是 registry 自动渲染的，不要在这里手工加卡片
│   ├── LoadingOverlay.tsx / .css
│   ├── ScrollToTop.tsx
│   ├── ErrorBoundary.tsx
│   └── Toast.tsx
├── services/LogService.ts     ⛔ 不要改，可以 import 使用
├── utils/
│   ├── AdService.ts           ⛔ 不要改，可以 import 使用
│   └── GlobalStore.ts         ⛔ 不要改，可以 import 使用
├── hooks/useSessionTracking.ts ⛔ 不要改，可以 import 使用
└── games/
    ├── registry.ts            ⛔ 不要改（用 import.meta.glob 自动扫描）
    ├── sample/                ⛔ 不要改，这是给后来者的参考
    └── <id>/                  ✅ 你工作的地方，全权负责
        ├── manifest.ts        ✅ 必须有，默认导出 GameManifest
        ├── index.tsx          ✅ 必须有，默认导出路由根组件
        ├── components/        ✅ 子页面
        ├── data/              ✅ 关卡/题库
        ├── hooks/             ✅ 游戏专属 hooks
        ├── utils/             ✅ 游戏专属工具
        └── i18n.ts            ✅ 游戏专属多语言（可选）

public/games/<id>/             ✅ 你的资源（图、音频）
```

`⛔ = 禁止修改` / `⚠️ = 临时改动需还原` / `✅ = 自由发挥`

---

## Manifest 契约（最小可工作配置）

`src/games/<id>/manifest.ts` 必须默认导出符合下面类型的对象：

```ts
import type { GameManifest } from '../../types';

const manifest: GameManifest = {
  id: 'spaceship',                 // 文件夹名一致，[a-z0-9_-]
  route: '/spaceship',             // 通常 '/' + id
  payloadKey: 'spaceship',         // FB Instant payload.game 命中值，通常等于 id
  adType: 'quiz',                  // 没专属广告位就保留 'quiz'，使用平台默认插页位
  adUnits: {
    ios: 'PLACEHOLDER_IOS',        // 留占位，集成时由集成者填真值
    android: 'PLACEHOLDER_ANDROID',
  },
  title: {
    en: 'Spaceship',               // 至少要 en
    zh: '太空船',
  },
  homeCard: {
    cover: null,                   // 没图设 null，下面 color 兜底
    color: '#3a5a8f',
  },
  component: () => import('./index'),  // 保持原样，不要换成同步 import
};

export default manifest;
```

校验：保存后浏览器 console **不应该**出现 `[registry] ...` 抛错。如果开发者改了 id 不合法你要发现。

---

## 可调用的共享设施（白名单）

下面列出的可以直接 import，**不要尝试 import 其它共享文件**。

```ts
// 路由
import { useNavigate, useLocation, useParams } from 'react-router-dom';

// 多语言
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

// 通用组件（可选）
import Header from '../../components/Header';
import LoadingOverlay from '../../components/LoadingOverlay';
import Toast from '../../components/Toast';

// 业务服务
import { AdService } from '../../utils/AdService';
import { GlobalStore } from '../../utils/GlobalStore';
import LogService from '../../services/LogService';

// Hooks
import { useSessionTracking } from '../../hooks/useSessionTracking';
```

**典型用法**：

```tsx
// 展示插页广告（本地是 no-op，进主项目后是真广告）
await AdService.showInterstitialAd(manifest.adType);

// 埋页面停留时间
useSessionTracking({ pageName: 'spaceship-main' });

// 跨页面状态
const store = GlobalStore.getInstance();
store.setUserInfo({ ...store.getUserInfo(), some_field: 'value' });

// 业务日志
LogService.reportOriginalPlay(gameId);
```

---

## 起步契约：开发者说「我要创建一个新游戏」时

这是你最常接到的第一句话，比如：
- "我要做一个 spaceship 游戏"
- "帮我新建一个塔防游戏"
- "我想做个找茬游戏，叫 finddiff"

**不要急着写业务代码**，先按下面流程产出最小骨架，确认能跑通再继续。

### ⭐ 优先方案：让开发者跑命令

模板已经内置了交互式脚手架命令。**优先建议开发者直接跑**：

```bash
npm run new-game
```

它会在终端问 4 个问题（id / 英文标题 / 中文标题 / 卡片色），然后自动生成完全合规的 manifest + index + .gitkeep 占位。跑完开发者就能 `npm run dev` 直接看到卡片。

**这是首选方案**：你不需要替开发者敲 readline / 替他写 manifest，让他自己跑命令更快也更不容易出错。你的工作从他跑完命令之后开始（写业务玩法）。

只有在以下情况你才需要手动建文件（即下面的 Step 0-3）：
- 开发者明确说不想用命令、要你直接生成
- 命令跑不起来（Node 版本问题之类）
- 已经存在 manifest 你只是要微调

### Step 0 ── 先问清 3 件事（如果开发者没说且要你手建）

1. **id**：英文短名，[a-z0-9_-]，比如 `spaceship` / `tower_defense`。这决定文件夹名、路由、payloadKey。**id 一旦定下就不要改**，改名要重命名整个文件夹和 manifest。
2. **标题**：至少 en 和 zh 两种。如果开发者只说中文名，主动问英文标题。
3. **首页卡片色块颜色**（没图前的兜底）：给个十六进制，比如 `#3a5a8f`。不问也行，挑一个搭调的默认值，回头让开发者改。

其余字段都有合理默认值，**不要为了对话而对话**。

### Step 1 ── 创建恰好这 3 个文件

```
src/games/<id>/manifest.ts          # 必须
src/games/<id>/index.tsx            # 必须
public/games/<id>/.gitkeep          # 空文件夹占位，让 git 跟踪
```

**不要在第一轮多创建任何文件**（不要预设 components/、data/、hooks/、i18n.ts 等子文件夹）。等开发者真的需要时再加。

### Step 2 ── manifest.ts 的标准模板

```ts
import type { GameManifest } from '../../types';

const manifest: GameManifest = {
  id: '<id>',
  route: '/<id>',
  payloadKey: '<id>',
  adType: 'quiz',                  // 默认复用平台 quiz 广告位，不申请新广告位
  adUnits: {
    ios: 'PLACEHOLDER_IOS',
    android: 'PLACEHOLDER_ANDROID',
  },
  title: {
    en: '<English Title>',
    zh: '<中文标题>',
  },
  homeCard: {
    cover: null,                   // 等开发者放图后改成 '/games/<id>/home_cover.jpg'
    color: '<#hex>',
  },
  component: () => import('./index'),
};

export default manifest;
```

**不要自作主张改这些**：
- 不要在 manifest 里加 schema 之外的字段
- 不要把 `component` 改成同步 import
- 不要把 `adUnits` 填真值（你查不到真值，集成者会填）
- 不要把 `adType` 改成自己造的新值，除非开发者明确要专属广告位

### Step 3 ── index.tsx 的最小骨架

```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const <Pascal>Game: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#<深色调>] text-white p-6">
      <button
        onClick={() => navigate('/home')}
        className="text-sm underline opacity-70 hover:opacity-100"
      >
        ← 返回首页
      </button>
      <h1 className="text-3xl font-bold mt-6">{/* 游戏标题 */}</h1>
      <p className="text-sm opacity-70 mt-2">{/* TODO: 在这里开始写游戏 */}</p>
    </div>
  );
};

export default <Pascal>Game;
```

**最小骨架的硬性要求**：
- 必须有"返回首页"路径（`navigate('/home')`）
- 必须 `default export` 一个 React 组件
- **不要**预先 import `AdService` / `LogService` / `useSessionTracking` 等等——等业务真的需要再 import
- **不要**预先装 npm 包
- **不要**写 Header（游戏页通常自己设计顶部，要用再加）

### Step 4 ── 自检 3 条

创建完三个文件后，让开发者：

```bash
npm run dev
```

然后你（AI）告诉开发者验证：

1. `http://localhost:5173/#/home` —— 应该能看到刚加的游戏卡片（色块 + 标题）
2. 点卡片 —— 应该进到游戏页（最小骨架）
3. 点"← 返回首页" —— 应该回到首页

只有这 3 条都过了，才进入后面的"写实际游戏内容"阶段。

### Step 5 ── 然后才开始问"游戏怎么玩"

骨架跑通之后，再跟开发者讨论：
- 玩法机制
- 哪些页面（首页/玩法/结算/成就/设置/...）
- 数据结构
- 资源需求

按需逐步把子文件夹（`components/` / `data/` / `hooks/` / `utils/` / `i18n.ts`）加进来。每加一个东西**问自己**：这是这一步真的需要的吗？不是的话先不加。

### Step 6 ── 完工后导出迁移清单 / 集成

完工后开发者有两条路把游戏并到主项目：

**最优路径（推荐告诉开发者跑这条）—— 纯脚本零 AI 集成**：

```bash
npm run integrate -- <id> F:/business/framework-project/boredday/project
```

脚本机械化插入 4 个文件的改动，自动备份原文件，无需任何 AI。

**次优路径（无法直接访问主项目时）**：

```bash
npm run export-migration            # 生成 migrations/<id>.md
```

把 `migrations/<id>.md` 交给主项目里的 AI（比如对方组里的 Claude/Codex），AI 照清单粘贴。

**你的任务到此结束**，不要替开发者跑这两个命令，不要自己手写迁移代码——脚本生成的更准。

### 反例

下面这些是"我要创建一个新游戏"时**不应该**做的事：

| ❌ 不要 | ✅ 应该 |
|---|---|
| 一上来就写完整玩法 | 先建骨架，跑通卡片+路由，再讨论玩法 |
| 一上来就 import AdService 并写广告调用 | 等业务需要广告时再 import |
| 一上来就建 7 个子文件夹 | 只建 manifest + index 两文件 |
| 装 framer-motion / lottie / zustand | 不装，先问开发者 |
| 在 manifest 里加自定义字段 | 不加，schema 是契约 |
| 改 src/App.tsx 加路由 | 不改，registry 会自动注册 |
| 改 src/components/Home.tsx 加卡片 | 不改，registry 会自动渲染 |
| 一次性 commit 全部 | 默认不 commit，等开发者要求 |

---

## 本地能跑通 / 跑不通

| 项 | 本地表现 | 备注 |
|---|---|---|
| 路由 / 状态 / UI / HMR | ✅ | 写代码主战场 |
| `FBInstant.player.getID()` | mock：`'dev-local-player'` | |
| `FBInstant.getEntryPointData()` | mock：`null`（永远进首页） | 测深链时临时改 devMock |
| `AdService.*` | 本地都是 no-op | 不会真弹广告 |
| `LogService.*` | 跳过（API base 未配置） | console 提示 |
| `fbq('trackCustom', ...)` | no-op | |

**不要试图通过修复 devMock 让广告 / FB API 真的工作。** 它们本来就是本地占位的。

---

## 测 FB 深链的步骤（如果你的游戏需要）

需要验证"被 FB 平台带进来时不停在首页而是直接进游戏"的场景：

1. 改 `src/devMock.ts` 中 `getEntryPointData: () => null` → `getEntryPointData: () => ({ game: '<your-payloadKey>' })`
2. 重启 `npm run dev`，浏览器刷新
3. 应直接跳进游戏页（不停首页）
4. **验完改回 `() => null`，不要 commit 这个改动**

---

## 完成定义（你的"done"是什么）

你做的游戏可以 PR 时，下面 6 条必须**全部**满足：

- [ ] `src/games/<id>/manifest.ts` 存在且默认导出符合 GameManifest 的对象
- [ ] `src/games/<id>/index.tsx` 存在且默认导出 React 组件
- [ ] `npm run dev` 启动，浏览器 `http://localhost:5173/#/<your-route>` 能正常加载游戏（无白屏 / 无 console error）
- [ ] 首页能看到你的卡片，点击能进游戏
- [ ] 游戏内能正常返回首页（提供回退路径）
- [ ] `git status` 显示**只有** `src/games/<id>/` 和 `public/games/<id>/` 下的改动；任何 `src/App.tsx` / `src/components/Home.tsx` / `src/utils/*` / `src/services/*` / `package.json` 之外的根目录文件改动都需要解释

如果你装了新 npm 依赖，提醒开发者在 commit 信息里写明。

---

## AI 常见误区（请避开）

1. **"我帮你把首页 Home.tsx 改一下加你的卡片"** —— 不要。卡片是 registry 自动生成的。
2. **"我把 AdService 重构一下让它更好用"** —— 不要。它在主项目里已经存在，重构会导致合并冲突。
3. **"我在 src/components 下加个新通用组件"** —— 不要。你的子组件放 `src/games/<id>/components/`。
4. **"我装一个 lottie / framer-motion / state-management lib"** —— 先停下，问开发者：业务真的需要吗？现有依赖能搞定吗？引入新依赖时主项目集成者要同步装。
5. **"我把 i18n.ts 加几个 key"** —— 不要。你的游戏内多语言用游戏自己的 `i18n.ts` 用 `i18n.addResourceBundle` 注册，命名空间隔离。
6. **"manifest.ts 我加点别的字段方便配置"** —— 不要扩展字段，schema 是契约。要扩展先跟集成者商量。
7. **"我把 devMock 改一下让广告真的能展示"** —— 不要。本地就是该 no-op。
8. **"我把游戏的关卡数据放 src/data/"** —— 不要，放 `src/games/<id>/data/`。
9. **"我帮你 commit 一下"** —— 默认不 commit 不 push。除非开发者明确要求。
10. **"manifest 的 component 我改成 `() => Promise.resolve({default: ...})` 同步加载"** —— 不要，破坏代码分割。保持 `() => import('./index')`。

---

## 你应该主动做的事

- 提示开发者"这个改动会动到共享文件，你确定吗？"如果发现自己快要碰禁区
- 提示开发者"manifest 的 adType 我保留了 quiz，需要专属广告位的话要在 PR 描述里告诉集成者"
- 写完功能后跑一遍上面"完成定义"清单自检
- 如果开发者要求做与本约定冲突的事，直接说明冲突点，不要默默照做

---

## 不确定的时候

如果遇到这份文件没说清楚的情况，**先停下来问开发者**，而不是按照训练经验自由发挥。这个模板的核心价值是"可预测的集成"，预测的前提是约束。
