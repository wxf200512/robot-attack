# 集成手册（INTEGRATION.md）

把模板里某个 `game/<id>` 分支的游戏合并进主项目 `F:\business\framework-project\boredday\project`。

---

## 🟢 最快路径：一条命令搞定（推荐）

```bash
cd F:/business/game-template
git checkout game/<id>
npm run integrate -- <id> F:/business/framework-project/boredday/project
```

脚本会自动：
1. 拷贝 `src/games/<id>/` 和 `public/games/<id>/` 到主项目
2. 在主项目的 `App.tsx`（4 处）、`Home.tsx`（1 处）、`AdService.ts`（adType=quiz 时跳过）、`newgameI18n.ts`（1 处）**机械化插入代码**
3. 改动前自动备份 `*.bak`；任一步失败则保留备份等你检查

可选 flag：
- `--dry-run` 只看要做什么，不写文件
- `--no-backup` 不备份（不推荐）

跑完去主项目 `npm run dev` 验证：首页能看到卡片、点击能进游戏、深链 payload 工作正常 → `git add` + commit + push。

**这是给"没 AI 上下文"也能 100% 机械执行的路径**。本文档下面剩下的内容是兜底（万一脚本因主项目大改而失效时用）。

---

## 🟡 中等路径：让 AI 照清单做

开发者跑过 `npm run export-migration` 后模板里有 `migrations/<id>.md`，里面每段代码都已经填好实际值。把这个文件路径交给主项目里的 AI（Claude Code / Codex / Cursor），让 AI 照着粘贴 4 个文件 5 处。约 5 分钟。

---

## 🔴 兜底路径：手工 6 步

万一脚本失败、AI 也不在线，按下面逐步手工做。

---

## Step 0 准备

主项目和模板都用本地 worktree。假设你的目录结构是：

```
F:\business\
├── framework-project\boredday\project\   ← 主项目
└── game-template\                        ← 模板（含开发者推上来的 game/<id> 分支）
```

## Step 1 拉模板分支看 manifest

```powershell
cd F:\business\game-template
git fetch
git checkout game/<id>
cat src\games\<id>\manifest.ts
```

记下 manifest 里的关键字段：`id` / `route` / `payloadKey` / `adType` / `title` / `adUnits`。

## Step 2 申请 / 准备 FB 广告位

如果 `adType` 不是 `'quiz'`（即开发者想要自己的专属广告位），到 **Facebook Ads Manager** 申请：
- iOS 一个 interstitial unit
- Android 一个 interstitial unit

把两个 unit ID 记在本步骤的 manifest 旁边（小本本 / 浏览器标签）。

如果 `adType === 'quiz'`，可以跳过本步骤直接走默认 quiz 广告位。

## Step 3 拷贝游戏文件到主项目

**约定**：主项目从此采用 `src/games/<id>/` 收纳新游戏（旧游戏在 `src/components/` 不动）。

```powershell
cd F:\business\framework-project\boredday\project

# 游戏代码
Copy-Item -Recurse F:\business\game-template\src\games\<id>  src\games\<id>

# 游戏资源
if (Test-Path F:\business\game-template\public\games\<id>) {
  Copy-Item -Recurse F:\business\game-template\public\games\<id>  public\games\<id>
}
```

## Step 4 编辑主项目 4 个共享文件

每个"<…>"用你 Step 1 拿到的值替换。

### 4.1 `src/App.tsx`（4 处）

**(a)** 顶部 import：

```tsx
import <Pascal>Home from './games/<id>';
```

（`<Pascal>` 是 id 的 PascalCase，比如 `spaceship → Spaceship`）

**(b)** `<Routes>` 段落里加：

```tsx
<Route path="<route>" element={<<Pascal>Home />} />
```

**(c)** payload nav switch 加（仿 hamster 那段）：

```tsx
} else if (payload.game === '<payloadKey>') {
  console.log('==============进入<payloadKey>==============')
  navigate('<route>');
}
```

**(d)** payload ad-init switch 加（仿 hamster 那段）：

```tsx
} else if (payload.game === '<payloadKey>') {
  await AdService.initInterstitialAd('<adType>');
  console.log('<id>广告初始化成功');
}
```

### 4.2 `src/components/Home.tsx`（1 处）

在 hamster 入口卡片下方粘一段同款，替换：
- `onClick` → `navigate('<route>')`
- 封面：如果 manifest.homeCard.cover 有值（比如 `/games/<id>/home_cover.jpg`），用 `<img>`；否则用色块 `style={{ backgroundColor: '<homeCard.color>' }}`
- 标题：`{t('<id>_home_title')}`

```tsx
{/* <id> 入口 */}
<div className="container mx-auto px-4 pt-[1rem]">
  <div
    className="bg-white w-full overflow-hidden rounded-2xl cursor-pointer transition-transform duration-200 hover:scale-[1.02] relative"
    style={{ border: '0.3rem solid #000000' }}
    onClick={() => navigate('<route>')}
  >
    <div className="relative flex flex-col h-full">
      {/* 有图就用 <img>，无图用色块 */}
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: '694 / 256', backgroundColor: '<homeCard.color>' }}
      />
      <div className="p-4 bg-white">
        <h3 className="text-xl text-left font-bold text-black line-clamp-2 font-nunito flex-1">
          {t('<id>_home_title')}
        </h3>
      </div>
    </div>
  </div>
</div>
```

### 4.3 `src/utils/AdService.ts`（3 处）

**(a)** `initInterstitialAd` 的 switch 里加：

```ts
} else if (type === '<adType>') {
  id = platform === 'IOS' ? '<step2-ios-unit>' : '<step2-android-unit>';
}
```

**(b)** `initAndShowInterstitialAd` 同位置加同一段（注意是另一个函数）。

**(c)** 文件顶部 `#firstAdRewardedVideoRatio` 对象加一行：

```ts
'<adType>': 0,
```

（要试激励视频再改成非零值。）

### 4.4 `src/newgameI18n.ts`（1 处）

文件末尾仿现有写法：

```ts
const <UPPER_ID>_HOME_TITLE: Record<string, string> = {
  en: 'Spaceship',      // 把 manifest.title 整个搬过来
  zh: '太空船',
  // …
};

for (const lang of Object.keys(<UPPER_ID>_HOME_TITLE)) {
  i18n.addResourceBundle(
    lang,
    'translation',
    { '<id>_home_title': <UPPER_ID>_HOME_TITLE[lang] },
    true,
    true
  );
}
```

## Step 5 本地验证

```powershell
cd F:\business\framework-project\boredday\project
npm run dev
```

- 首页应能看到新卡片，点击进入新游戏路由
- 临时改 `src/App.tsx` 把 payload 测试行解开：
  ```ts
  payload = {"game":"<payloadKey>"};
  ```
  刷新页面，应直接跳到新游戏路由（验完改回）

## Step 6 PR

```powershell
git checkout -b feat/integrate-<id>
git add .
git commit -m "feat(<id>): integrate game from template"
git push -u origin feat/integrate-<id>
```

然后开 PR。

---

## 多个游戏先后合并的冲突处理

如果合并第二个游戏时 `App.tsx` / `Home.tsx` / `AdService.ts` / `newgameI18n.ts` 出现 git conflict，通常是"两个 `else if` 都在 switch 末尾插入"的平凡冲突：

```diff
<<<<<<< HEAD
} else if (payload.game === 'spaceship') {
  navigate('/spaceship');
}
=======
} else if (payload.game === 'pirate') {
  navigate('/pirate');
}
>>>>>>> feat/integrate-pirate
```

解：把两个分支都保留即可，顺序无关：

```ts
} else if (payload.game === 'spaceship') {
  navigate('/spaceship');
} else if (payload.game === 'pirate') {
  navigate('/pirate');
}
```

`Home.tsx` 的入口卡片同理，两张卡都保留。

## 后续：升级到方案 B（脚本化）

当手工合并次数多了想自动化：

1. 在主项目 4 个文件分别加锚点注释，比如：
   ```tsx
   {/* GAMES:ROUTES_BEGIN */}
   <Route path="/hamster" element={<HamsterHome />} />
   {/* GAMES:ROUTES_END */}
   ```
2. 在模板里加 `scripts/integrate.js`，读 manifest，用锚点定位插入。
3. 集成命令：`node scripts/integrate.js <id> <main-project-path>`。

`manifest.ts` schema 不变，所以现有游戏不用动。
