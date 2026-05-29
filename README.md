# Game Template

Boredday 游戏框架的"通用壳"。每个游戏作者 clone 这个模板做一个新游戏，做完后由集成者按 [INTEGRATION.md](./INTEGRATION.md) 合并进主项目。

> **第一次来？** 直接读 👉 [**CREATE_GAME.md**](./CREATE_GAME.md) —— 从 clone 到推分支的 step-by-step 指南，约 15 分钟跑完一遍。下面的内容是参考说明。

> **你是 AI（Claude Code / Codex / Cursor 等）？** 先读 👉 [**AGENTS.md**](./AGENTS.md) ——本仓库给 AI 助手的工作约定，包括禁区、契约、完成定义。

## 快速开始

```bash
git clone <template-url> my-game
cd my-game
git checkout -b game/<your-game-id>
cp .env.example .env       # 占位即可，devMock 兜着，无需真实 FB / API 值
npm install
npm run dev                # 浏览器 http://localhost:5173
```

打开浏览器你会看到一张示例 sample 游戏卡。点进去能玩。这一切都在 mock 环境下跑，不需要任何真实的 Facebook / 广告 / API 配置。

## 新建你的游戏

```bash
cp -r src/games/sample src/games/<your-game-id>
```

然后：

1. 编辑 `src/games/<your-game-id>/manifest.ts` —— 改 id / route / title / homeCard 等字段（每个字段含义见文件内注释）
2. 编辑 `src/games/<your-game-id>/index.tsx` —— 这是路由组件，从这里开始写游戏
3. 子页面、关卡数据、专属 hooks/utils 都放自己文件夹里
4. 资源（图、音频）放 `public/games/<your-game-id>/`

保存后浏览器自动 HMR，首页立刻能看到你的卡片。

## 工程结构

```
src/
├── main.tsx              ← 入口（先装 devMock 再启动 React）
├── App.tsx               ← 路由壳：所有游戏路由从 games/registry 自动生成
├── devMock.ts            ← 本地 dev 时把 FBInstant / fbq 替换为 no-op
├── FBLoader.ts           ← FBInstant 初始化包装
├── i18n.ts               ← i18next 实例（语言检测 + 持久化）
├── types.ts              ← GameManifest 等类型
├── components/           ← 共享 UI（Header / LoadingOverlay / Toast / Home / ErrorBoundary / ScrollToTop）
├── services/LogService   ← 业务日志上报
├── utils/AdService       ← FB Instant 广告封装（本模板已简化，本地都是 no-op）
├── utils/GlobalStore     ← 用户信息单例
├── hooks/                ← 共享 hooks（useSessionTracking）
└── games/
    ├── registry.ts       ← 用 import.meta.glob 自动扫描所有 manifest
    └── sample/           ← 示例游戏（拷一份改名就开工）
```

## 本地能跑通什么 / 跑不通什么

| 项 | 本地表现 | 备注 |
|---|---|---|
| 路由 / 状态 / UI | ✅ 完全正常 | HMR 实时刷新 |
| 设置/弹框/导航 | ✅ 完全正常 | |
| `import.meta.env.DEV` | true | devMock 仅在 DEV 时注入 |
| `FBInstant.player.getID()` | 返回 `'dev-local-player'` | mock 值 |
| `FBInstant.getEntryPointData()` | 返回 `null` | 永远进首页 |
| 测 FB 深链 | 改 `src/devMock.ts` 让 `getEntryPointData` 返回 `{ game: '<your-id>' }` | 改完重新 dev |
| `AdService.initInterstitialAd` | 调用成功，但无广告 | FBInstant mock 是 no-op |
| `AdService.showInterstitialAd` | 同上 | |
| `LogService.uploadLog` | 跳过（VITE_API_BASE_URL 未配置） | console 提示 |
| `fbq('trackCustom', ...)` | no-op | 不会真发到 Pixel |

也就是：**游戏本身玩法 / UI / 状态 100% 本地能开发**；只有"FB 平台真的把玩家带进来"和"广告真的弹出来"这两件事要等到合并进主项目后在 FB Instant Sandbox 里测。

## 完成开发

```bash
git push origin game/<your-game-id>
```

然后告诉集成者分支名，集成者会按 [INTEGRATION.md](./INTEGRATION.md) 把你的游戏合并到主项目。

## 不要碰

为了保证合并顺利，请**不要修改**以下文件（这些都是模板基础设施，主项目里也有它们的版本）：

- `src/App.tsx`
- `src/components/Home.tsx`
- `src/components/Header.tsx`
- `src/utils/AdService.ts`
- `src/utils/GlobalStore.ts`
- `src/services/LogService.ts`
- `src/games/registry.ts`
- `src/main.tsx` / `src/devMock.ts` / `src/FBLoader.ts` / `src/i18n.ts`

如果你确实需要改它们，先跟集成者沟通。

## 命名约定

- `id` / `payloadKey` / 路由 path：全部小写，下划线或短横线，避免空格
- 游戏文件夹名 = id
- 公共资源路径 = `public/games/<id>/...`
- 多语言标题 key（用在主项目 i18n）= `<id>_home_title`
