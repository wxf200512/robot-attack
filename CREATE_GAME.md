# 新建一个游戏：从零到推分支

读者：被分配到 boredday 平台做一个新游戏的开发者。
预计耗时：第一次从 clone 到看到自己卡片，约 15 分钟。

---

## 前置检查（一次性）

1. **Node**：推荐 LTS（v20 / v22）。模板已知 Node v24 在 Windows 上会触发 `@rollup/rollup-win32-x64-msvc` 缺包，遇到的话照 [README.md → 常见问题] 处理。
2. 你**已经能跑通 sample**：浏览器看到一张 "Sample Game" 蓝色色块卡片。如果跑不通先解决这步，再继续。

---

## Step 1 起个名字 & 建分支

先想个简短的 id，规则：
- 全小写
- 只能用 `[a-z0-9_-]`
- 不和已有游戏冲突（看 `src/games/` 下的文件夹名）

例：`spaceship`、`tower_defense`、`word-quiz`。

```bash
git checkout -b game/spaceship
```

---

## Step 2 跑脚手架命令（推荐）

```bash
npm run new-game
```

命令会问你 4 个问题：

```
游戏 id（小写英文，[a-z0-9_-]，例 spaceship）: spaceship
英文标题（en）: Spaceship
中文标题（zh，回车默认 "Spaceship"）: 太空船
首页卡片色块色（十六进制，回车默认 #3a5a8f）:
```

跑完会自动生成：

```
src/games/spaceship/
  manifest.ts    ← 已经填好你刚才回答的字段
  index.tsx      ← 最小骨架（标题 + 返回首页按钮）
public/games/spaceship/
  .gitkeep       ← 让 git 跟踪这个空文件夹
```

`npm run dev` 已经跑着的话，浏览器自动刷新就能看到你的卡片。**直接跳到 Step 4**。

---

### Step 2 备选 ── 手动复制 sample 文件夹

如果脚手架命令跑不起来（Node 版本问题等），手动操作：

```bash
# Windows PowerShell
Copy-Item -Recurse src\games\sample src\games\spaceship

# Git Bash / macOS
cp -r src/games/sample src/games/spaceship
```

> **不要直接改 src/games/sample**，那是给后来者的参考。

---

## Step 3 编辑 manifest.ts（手动路径才需要）

`npm run new-game` 已经帮你填好了。**只有走 Step 2 备选**时才需要手动改。

打开 `src/games/spaceship/manifest.ts`，把每一项改成你的：

```ts
import type { GameManifest } from '../../types';

const manifest: GameManifest = {
  id: 'spaceship',          // 跟文件夹名一致
  route: '/spaceship',      // 你的页面 URL hash 路径，通常 '/' + id
  payloadKey: 'spaceship',  // FB Instant 推送深链时 payload.game 的命中值
  adType: 'spaceship',      // 改这里要去 Step 7 商量广告位；不想申请就保留 'quiz' 用平台默认插页位
  adUnits: {                // 没申请广告位前就保留占位，集成时由集成者填
    ios: 'PLACEHOLDER_IOS',
    android: 'PLACEHOLDER_ANDROID',
  },
  title: {                  // 至少要有 en；其他语言能填多少填多少
    en: 'Spaceship',
    zh: '太空船',
    ja: 'スペースシップ',
    // ...
  },
  homeCard: {
    cover: null,            // 一开始留 null 用色块兜底，后面有图了改成 '/games/spaceship/home_cover.jpg'
    color: '#3a5a8f',       // 兜底色块色，挑个跟游戏调性配的
  },
  component: () => import('./index'),  // 不要动这行
};

export default manifest;
```

保存后浏览器立刻刷新，标题/颜色都变成你设置的。

---

## Step 4 写你的游戏

打开 `src/games/spaceship/index.tsx`。**这就是用户点首页卡片后进来的页面**。

最简的开始：

```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const SpaceshipGame: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <button onClick={() => navigate('/home')} className="text-sm underline">
        ← 返回首页
      </button>
      <h1 className="text-3xl font-bold mt-4">Spaceship</h1>
      {/* 你的游戏 UI 写这里 */}
    </div>
  );
};

export default SpaceshipGame;
```

接下来想加多少东西都可以。**子组件、关卡数据、专属 hooks 都放进 `src/games/spaceship/` 下**，不要散到 `src/components/` 或 `src/data/`：

```
src/games/spaceship/
├── manifest.ts
├── index.tsx                ← 路由根组件
├── components/
│   ├── AchievementPage.tsx
│   └── SettingsModal.tsx
├── data/
│   └── levels.ts
├── hooks/
│   └── useScore.ts
└── utils/
    └── physics.ts
```

这样集成时一个 `cp -r` 就搬走整个游戏，零摩擦。

### 用共享设施

不需要自己造的东西，直接 import：

```tsx
import { AdService } from '../../utils/AdService';
import { GlobalStore } from '../../utils/GlobalStore';
import LogService from '../../services/LogService';
import { useSessionTracking } from '../../hooks/useSessionTracking';
import i18n from '../../i18n';
import { useTranslation } from 'react-i18next';
```

例如埋点页面停留：

```tsx
useSessionTracking({ pageName: 'spaceship-main' });
```

例如展示插页广告（本地是 no-op，进主项目后是真广告）：

```tsx
await AdService.showInterstitialAd('spaceship');
```

---

## Step 5 放资源

把图片、音频放到：

```
public/games/spaceship/
├── home_cover.jpg          ← 推荐尺寸 694 × 256（首页卡片同比例）
├── bg.png
├── sprites/
└── sound/
```

代码里引用走绝对路径 `/games/spaceship/...`：

```tsx
<img src="/games/spaceship/home_cover.jpg" />
```

或者改 manifest.homeCard.cover 让首页卡片用真图：

```ts
homeCard: {
  cover: '/games/spaceship/home_cover.jpg',
  color: '#3a5a8f',
},
```

> Vite dev 期 `public/` 下的资源不会被打 hash，刷新即可生效。

---

## Step 6 测一遍 FB 深链（可选）

如果你的游戏要响应"被 FB 平台带进来"的场景（比如分享链接、广告投放），需要在本地模拟一次。

临时改 `src/devMock.ts` 里这一行：

```ts
getEntryPointData: () => null,
```

改成：

```ts
getEntryPointData: () => ({ game: 'spaceship', data_type: 'share' }),
```

重启 `npm run dev`，刷新浏览器，App 启动后会**直接跳到 `/spaceship`**而不是首页。

> 验完记得改回去，不要 commit 这个改动（集成者会过审）。

---

## Step 7 如果要专属广告位

模板默认所有游戏 `adType: 'quiz'`，复用平台默认的插页广告位。**省事的话保留 'quiz' 就行**，集成时不用申请新广告位。

如果你的游戏需要：
- 不同的广告频率
- 不同的填充率统计
- 独立的 ROAS 报表

那就在 manifest 里把 `adType` 改成你自己的（比如 `'spaceship'`），并跟集成者打招呼，让他帮你申请一对 iOS/Android 插页广告位 ID。在那之前 `adUnits` 留占位即可。

---

## Step 8 提交分支

```bash
git add src/games/spaceship public/games/spaceship
git status   # 确认没改 src/App.tsx / Home.tsx / 其他共享文件
git commit -m "feat(spaceship): initial implementation"
git push -u origin game/spaceship
```

把分支名告诉集成者，集成者会用下一步的命令秒并到主项目。

## Step 9 集成者侧（仅集成者关心）

集成者一条命令搞定：

```bash
cd F:/business/game-template
git fetch && git checkout game/spaceship
npm run integrate -- spaceship F:/business/framework-project/boredday/project
```

脚本会：
- 拷贝 `src/games/spaceship/` 和 `public/games/spaceship/` 到主项目
- 机械化插入 4 个文件（`App.tsx` / `Home.tsx` / `AdService.ts` / `newgameI18n.ts`）
- 改动前自动备份原文件为 `*.bak`

跑完到主项目 `npm run dev` 验证 → commit + 提交 PR。详见 [INTEGRATION.md](./INTEGRATION.md)。

**作为开发者你不需要跑这个命令**，让集成者跑。但如果你想本地预览将来的 diff，可以加 `--dry-run`：

```bash
npm run integrate -- spaceship F:/business/framework-project/boredday/project --dry-run
```

---

## 红线 / 不要做的事

| 红线 | 为什么 |
|---|---|
| ❌ 修改 `src/App.tsx` | 路由是 registry 自动生成的，改它意味着合并冲突。有需求找集成者 |
| ❌ 修改 `src/components/Home.tsx` | 同上，卡片是 registry 自动生成的 |
| ❌ 修改 `src/components/Header.tsx` / `Header.tsx` 同源共享文件 | 主项目里它们也有同名版本，合并时会冲突 |
| ❌ 修改 `src/utils/AdService.ts` / `GlobalStore.ts` | 同上 |
| ❌ 修改 `src/games/registry.ts` | 它是自动扫描的，没事别动 |
| ❌ 把游戏代码放到 `src/components/` 或 `src/data/` 里 | 没法 `cp -r` 一次搬走，集成时要扫描全项目 |
| ❌ 在 manifest.ts 里写 import 之外的副作用代码 | manifest 是 eager 加载的，副作用会污染首屏 |
| ❌ commit `.env` 或带真实 key 的文件 | `.env` 已在 `.gitignore`，但别手动 add |
| ❌ commit devMock 里临时改的 `getEntryPointData` | 验完深链改回 `() => null` |

---

## 常见问题

**Q: 浏览器白屏？**
看 [README.md → 本地能跑通什么] 排错。最常见是 devMock 没有覆盖到 FBInstant。

**Q: 我的卡片不出现？**
检查 `src/games/<id>/manifest.ts` 是否存在且默认导出，并且 `id` 满足 `[a-z0-9_-]`。registry 在控制台会打印加载失败的错。

**Q: HMR 不刷新？**
Windows 非系统盘 / 网盘目录可能丢 fs watch 事件。vite.config.ts 已经开了 `usePolling: true`。如果还不行重启 `npm run dev`。

**Q: 我能装新依赖吗？**
能。在你的游戏里 `npm install <pkg>` 后正常 import 即可。合并时集成者会同步把它加到主项目的 package.json。

**Q: 我能写多语言 i18n 吗？**
能。两种方式：
1. 简单：直接在游戏组件里 hardcode 多语言文本 + `useTranslation`
2. 系统：游戏内建一个 `i18n.ts` 用 `i18n.addResourceBundle` 注册自己的 key（命名空间隔离）。参考主项目 `src/newgameI18n.ts`

**Q: 怎么测我的游戏在 iOS / Android 上的表现差异？**
临时改 `src/devMock.ts` 里 `getPlatform: () => 'IOS'` 或 `'ANDROID'` 看效果。

**Q: 我的游戏要存档怎么办？**
本地：`localStorage`（FB Instant 上也能用）。云端：用 `FBInstant.player.setDataAsync` 之类，devMock 里没 mock 这些，你写代码时加个 `if (typeof FBInstant !== 'undefined' && FBInstant.player.setDataAsync)` 包一下。

---

## 速查：开发节奏

```
npm run dev                  # 启动一次，全天 HMR
浏览器: http://localhost:5173/#/spaceship
改代码 → 保存 → 自动刷新
console 看 [devMock] / [App] 日志判断初始化是否正常
```

完成后推分支，下一站是集成者的 [INTEGRATION.md](./INTEGRATION.md)。
