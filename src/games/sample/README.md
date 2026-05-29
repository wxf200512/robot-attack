# Sample Game

这是模板自带的示例游戏，作为你新建游戏时的蓝本。

> **要做新游戏？** 先看根目录 [**CREATE_GAME.md**](../../../CREATE_GAME.md) 走一遍流程。下面是文件夹结构速查。

## 怎么用

1. **不要直接改这个文件夹**，而是复制：
   ```bash
   cp -r src/games/sample src/games/<your-game-id>
   ```
2. 进 `src/games/<your-game-id>/manifest.ts` 改字段（id / route / title / homeCard / 等）
3. 进 `src/games/<your-game-id>/index.tsx` 写你的游戏 UI
4. 资源放 `public/games/<your-game-id>/`
5. `npm run dev` → 首页自动出现你的卡片

## 一个游戏可以放什么

```
src/games/<your-game-id>/
├── manifest.ts          ← 必须有
├── index.tsx            ← 必须有（路由组件）
├── components/          ← 子页面（成就页、设置页等）
├── data/                ← 关卡/题库
├── hooks/               ← 游戏专属 hooks
├── utils/               ← 游戏专属工具
└── i18n.ts              ← 游戏专属多语言（可选）
```

## 可以用的共享设施

- `import Header from '../../components/Header'` —— 通用顶部导航
- `import { AdService } from '../../utils/AdService'` —— 广告（本地是 no-op，主项目里是真广告）
- `import { GlobalStore } from '../../utils/GlobalStore'` —— 用户信息单例
- `import LogService from '../../services/LogService'` —— 业务上报
- `import { useSessionTracking } from '../../hooks/useSessionTracking'` —— 页面停留时间 fbq 上报
- `import i18n from '../../i18n'` —— i18next 实例

## 本地测试限制

读 README.md 根目录文档「本地能跑通什么 / 跑不通什么」一节。

## 完成后

`git push origin game/<your-game-id>`，把分支名发给集成者。
