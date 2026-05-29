#!/usr/bin/env node
// scripts/export-migration.mjs
// 读 src/games/<id>/manifest.ts，列出游戏所有文件，生成一份给主项目 AI 看的迁移清单。
// 用法：
//   npm run export-migration              # 自动找唯一的非 sample 游戏
//   npm run export-migration spaceship    # 指定 id

import { readFile, writeFile, mkdir, readdir, stat, access } from 'node:fs/promises';
import { resolve, dirname, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(dir) {
  const out = [];
  async function walk(d) {
    const entries = await readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const full = join(d, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (e.isFile()) {
        out.push(full);
      }
    }
  }
  await walk(dir);
  return out;
}

function toPascal(id) {
  return id
    .split(/[_-]/)
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join('');
}

function toUpperSnake(id) {
  return id.replace(/-/g, '_').toUpperCase();
}

// ===== Manifest 解析（正则版，对标准模板格式工作） =====
function parseManifest(source) {
  const stringField = (key) => {
    const m = source.match(new RegExp(`\\b${key}\\s*:\\s*['"]([^'"]*)['"]`));
    return m ? m[1] : null;
  };

  const objectField = (key) => {
    // 匹配 `key: { ... }`，注意非贪婪
    const re = new RegExp(`\\b${key}\\s*:\\s*\\{([^}]*)\\}`, 's');
    const m = source.match(re);
    return m ? m[1] : null;
  };

  const id = stringField('id');
  const route = stringField('route');
  const payloadKey = stringField('payloadKey');
  const adType = stringField('adType');

  // adUnits
  const adUnitsBlock = objectField('adUnits');
  const adUnits = { ios: null, android: null };
  if (adUnitsBlock) {
    const ios = adUnitsBlock.match(/ios\s*:\s*['"]([^'"]*)['"]/);
    const android = adUnitsBlock.match(/android\s*:\s*['"]([^'"]*)['"]/);
    adUnits.ios = ios ? ios[1] : null;
    adUnits.android = android ? android[1] : null;
  }

  // title 对象
  const titleBlock = objectField('title');
  const title = {};
  if (titleBlock) {
    const langRe = /(\w+)\s*:\s*['"]([^'"]*)['"]/g;
    let m;
    while ((m = langRe.exec(titleBlock)) !== null) {
      title[m[1]] = m[2];
    }
  }

  // homeCard
  const homeCardBlock = objectField('homeCard');
  const homeCard = { cover: null, color: null };
  if (homeCardBlock) {
    const cover = homeCardBlock.match(/cover\s*:\s*(null|['"]([^'"]*)['"])/);
    homeCard.cover = cover ? (cover[1] === 'null' ? null : cover[2]) : null;
    const color = homeCardBlock.match(/color\s*:\s*['"]([^'"]*)['"]/);
    homeCard.color = color ? color[1] : null;
  }

  if (!id || !route || !payloadKey || !adType) {
    throw new Error(
      'manifest.ts 字段不完整。解析得：' +
        JSON.stringify({ id, route, payloadKey, adType }, null, 2)
    );
  }

  return { id, route, payloadKey, adType, adUnits, title, homeCard };
}

// ===== 找出要导出的游戏 id =====
async function resolveGameId(arg) {
  if (arg) {
    const gamePath = resolve(ROOT, 'src/games', arg);
    if (!(await exists(gamePath))) {
      throw new Error(`找不到 src/games/${arg}/`);
    }
    return arg;
  }

  const gamesDir = resolve(ROOT, 'src/games');
  const entries = await readdir(gamesDir, { withFileTypes: true });
  const candidates = entries
    .filter((e) => e.isDirectory() && e.name !== 'sample')
    .map((e) => e.name);

  if (candidates.length === 0) {
    throw new Error('src/games/ 下没有除 sample 之外的游戏。先 npm run new-game 创建一个。');
  }
  if (candidates.length > 1) {
    throw new Error(
      `src/games/ 下有多个游戏 (${candidates.join(', ')})，请显式指定：npm run export-migration <id>`
    );
  }
  return candidates[0];
}

// ===== 生成 migration markdown =====
function buildMigration({ manifest, srcFiles, publicFiles }) {
  const { id, route, payloadKey, adType, adUnits, title, homeCard } = manifest;
  const pascal = toPascal(id);
  const upperSnake = toUpperSnake(id);

  const srcList = srcFiles.map((f) => `- ${f}`).join('\n');
  const publicList = publicFiles.length
    ? publicFiles.map((f) => `- ${f}`).join('\n')
    : '_(本游戏没有 public 资源)_';

  const titleEntries = Object.entries(title)
    .map(([lang, v]) => `  ${lang}: ${JSON.stringify(v)},`)
    .join('\n');

  const homeCardCoverSnippet = homeCard.cover
    ? `<img
              src="${homeCard.cover}"
              alt="${title.en}"
              draggable={false}
              className="w-full block"
              style={{ aspectRatio: '694 / 256', objectFit: 'cover', userSelect: 'none' }}
            />`
    : `<div
              className="relative w-full overflow-hidden"
              style={{ aspectRatio: '694 / 256', backgroundColor: '${homeCard.color}' }}
            />`;

  return `# Migration Manifest: ${id}

> 这份文件由模板的 \`npm run export-migration ${id}\` 自动生成。
> 把整份内容（或链接）交给主项目里的 AI 助手，照着做就能完成集成。
> 主项目根目录：\`F:\\business\\framework-project\\boredday\\project\`

## 元信息

| 字段 | 值 |
|---|---|
| id | \`${id}\` |
| route | \`${route}\` |
| payloadKey | \`${payloadKey}\` |
| adType | \`${adType}\` |
| adUnits.ios | \`${adUnits.ios ?? 'PLACEHOLDER_IOS'}\` |
| adUnits.android | \`${adUnits.android ?? 'PLACEHOLDER_ANDROID'}\` |
| homeCard.cover | ${homeCard.cover ? `\`${homeCard.cover}\`` : '_null（用色块）_'} |
| homeCard.color | \`${homeCard.color}\` |
| title (en) | ${title.en ? `\`${title.en}\`` : '_未设_'} |

## 给主项目 AI 的指令（按顺序做）

### Step 1 — 拷贝游戏文件夹（纯新增，不会冲突）

把下面这些文件从模板仓库拷贝到主项目对应位置：

**模板源 → 主项目目标**

\`\`\`
F:\\business\\game-template\\src\\games\\${id}\\        →  src\\games\\${id}\\
F:\\business\\game-template\\public\\games\\${id}\\     →  public\\games\\${id}\\
\`\`\`

PowerShell：

\`\`\`powershell
Copy-Item -Recurse F:\\business\\game-template\\src\\games\\${id}     src\\games\\${id}
${publicFiles.length ? `Copy-Item -Recurse F:\\business\\game-template\\public\\games\\${id}  public\\games\\${id}` : '# 本游戏无 public 资源，跳过'}
\`\`\`

模板里包含的全部源文件：

${srcList}

模板里包含的全部 public 资源：

${publicList}

### Step 2 — 编辑 \`src/App.tsx\`（4 处插入）

> 全部"在已有 hamster 那段同位置后面再加一段"，不替换已有内容。

**(a)** 顶部 import 区（其它 \`import XxxHome from\` 旁边）：

\`\`\`tsx
import ${pascal} from './games/${id}';
\`\`\`

**(b)** \`<Routes>\` 块里（其它 \`<Route path="/hamster">\` 旁边）：

\`\`\`tsx
<Route path="${route}" element={<${pascal} />} />
\`\`\`

**(c)** payload nav switch（仿 \`} else if (payload.game === 'find_cats')\` 那段）：

\`\`\`tsx
} else if (payload.game === '${payloadKey}') {
  console.log('==============进入${payloadKey}==============')
  navigate('${route}');
}
\`\`\`

**(d)** payload ad-init switch（仿 \`} else if(payload.game === 'find_cats')\` 那段）：

\`\`\`tsx
} else if (payload.game === '${payloadKey}') {
  await AdService.initInterstitialAd('${adType}');
  console.log('${id}广告初始化成功');
}
\`\`\`

### Step 3 — 编辑 \`src/components/Home.tsx\`（1 处插入）

在 hamster 入口卡片下方粘一段，与已有结构对齐：

\`\`\`tsx
{/* ${id} 入口 */}
<div className="container mx-auto px-4 pt-[1rem]">
  <div
    className="bg-white w-full overflow-hidden rounded-2xl cursor-pointer transition-transform duration-200 hover:scale-[1.02] relative"
    style={{ border: '0.3rem solid #000000' }}
    onClick={() => {
      navigate('${route}');
    }}
  >
    <div className="relative flex flex-col h-full">
      ${homeCardCoverSnippet}
      <div className="p-4 bg-white">
        <div className="flex items-center justify-between">
          <h3 className="text-xl text-left font-bold text-black line-clamp-2 font-nunito flex-1">
            {t('${id}_home_title')}
          </h3>
        </div>
      </div>
    </div>
  </div>
</div>
\`\`\`

### Step 4 — 编辑 \`src/utils/AdService.ts\`

${
    adType === 'quiz'
      ? `**本游戏 adType=quiz，复用平台默认插页位 → 本步整步跳过，不需要改 AdService.ts。**`
      : `**(a)** \`initInterstitialAd\` 的 if/else 链最后加：

\`\`\`ts
} else if (type === '${adType}') {
  id = platform === 'IOS' ? '${adUnits.ios}' : '${adUnits.android}';
}
\`\`\`

> 上面的 ios/android 值如果是 \`PLACEHOLDER_*\`，集成者要先去 FB Ads Manager 申请真值再粘贴，再回来填这里。

**(b)** \`initAndShowInterstitialAd\` 的 if/else 链最后加完全相同的一段。

**(c)** \`#firstAdRewardedVideoRatio\` 对象里加一行（默认不弹激励视频）：

\`\`\`ts
'${adType}': 0,
\`\`\``
  }

### Step 5 — 编辑 \`src/newgameI18n.ts\`（1 处追加）

文件末尾追加：

\`\`\`ts
const ${upperSnake}_HOME_TITLE: Record<string, string> = {
${titleEntries}
};

for (const lang of Object.keys(${upperSnake}_HOME_TITLE)) {
  i18n.addResourceBundle(
    lang,
    'translation',
    { '${id}_home_title': ${upperSnake}_HOME_TITLE[lang] },
    true,
    true
  );
}
\`\`\`

## Step 6 — 本地验证

\`\`\`powershell
cd F:\\business\\framework-project\\boredday\\project
npm run dev
\`\`\`

- [ ] 浏览器看到 ${title.en || id} 卡片（${homeCard.cover ? '封面图' : '色块 ' + homeCard.color}）
- [ ] 点卡片能进 \`${route}\`
- [ ] 游戏内能返回首页
- [ ] console 无报错
- [ ] 临时把 App.tsx 测试 payload 行解开 \`payload = {"game":"${payloadKey}"}\`，刷新应直接跳进 \`${route}\`（验完改回）

## Step 7 — PR

\`\`\`powershell
git checkout -b feat/integrate-${id}
git add src\\games\\${id} ${publicFiles.length ? `public\\games\\${id} ` : ''}src\\App.tsx src\\components\\Home.tsx ${adType !== 'quiz' ? 'src\\utils\\AdService.ts ' : ''}src\\newgameI18n.ts
git commit -m "feat(${id}): integrate game from template"
git push -u origin feat/integrate-${id}
\`\`\`

## 完成判断

如果 Step 6 的 5 个 checkbox 全过，集成完成。
`;
}

async function main() {
  const arg = process.argv[2];
  const id = await resolveGameId(arg);

  const manifestPath = resolve(ROOT, 'src/games', id, 'manifest.ts');
  if (!(await exists(manifestPath))) {
    throw new Error(`找不到 ${manifestPath}`);
  }
  const source = await readFile(manifestPath, 'utf8');
  const manifest = parseManifest(source);

  if (manifest.id !== id) {
    console.warn(
      `⚠️  目录名 "${id}" 与 manifest.id "${manifest.id}" 不一致，按 manifest 走`
    );
  }

  // 列文件
  const srcDir = resolve(ROOT, 'src/games', manifest.id);
  const publicDir = resolve(ROOT, 'public/games', manifest.id);

  const srcFiles = (await listFiles(srcDir))
    .map((p) => relative(ROOT, p).replace(/\\/g, '/'))
    .sort();
  const publicFiles = (await exists(publicDir))
    ? (await listFiles(publicDir))
        .filter((p) => !p.endsWith('.gitkeep'))
        .map((p) => relative(ROOT, p).replace(/\\/g, '/'))
        .sort()
    : [];

  const migrationDir = resolve(ROOT, 'migrations');
  await mkdir(migrationDir, { recursive: true });
  const outPath = resolve(migrationDir, `${manifest.id}.md`);
  const content = buildMigration({ manifest, srcFiles, publicFiles });
  await writeFile(outPath, content);

  console.log(`
✅ 迁移清单已生成：

  ${relative(ROOT, outPath).replace(/\\/g, '/')}

把它的内容粘给主项目里的 AI（或直接给 AI 路径让它读），AI 会照单全收完成集成。

如果广告位还是占位（PLACEHOLDER_*），记得集成前去 FB Ads Manager 申请真值。
`);
}

main().catch((err) => {
  console.error('\n❌', err.message);
  process.exit(1);
});
