#!/usr/bin/env node
// scripts/integrate.mjs
// 把模板里的一个游戏自动集成到主项目（boredday/project）。
// 用法：
//   npm run integrate -- <id> <main-project-path>
// 例：
//   npm run integrate -- test-game F:/business/framework-project/boredday/project
//
// 可选 flags（写在最后即可）:
//   --dry-run     只打印要做什么，不真改文件
//   --no-backup   不备份原文件（默认会备份成 .bak）
//
// 工作内容：
//   1. 校验主项目结构
//   2. 拷贝 src/games/<id>/ 和 public/games/<id>/
//   3. patch App.tsx（4 处）
//   4. patch Home.tsx（1 处）
//   5. patch AdService.ts（3 处；adType=quiz 时跳过）
//   6. patch newgameI18n.ts（追加）
//   7. 任一处 patch 失败则全部回滚

import { readFile, writeFile, mkdir, readdir, copyFile, access, stat, cp } from 'node:fs/promises';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATE_ROOT = resolve(__dirname, '..');

// ===== 参数解析 =====
const rawArgs = process.argv.slice(2);
const flags = new Set(rawArgs.filter((a) => a.startsWith('--')));
const positional = rawArgs.filter((a) => !a.startsWith('--'));
const DRY_RUN = flags.has('--dry-run');
const NO_BACKUP = flags.has('--no-backup');

if (positional.length < 2) {
  console.error(`
用法:  npm run integrate -- <id> <main-project-path> [--dry-run] [--no-backup]

例:    npm run integrate -- test-game F:/business/framework-project/boredday/project
       npm run integrate -- spaceship ../boredday/project --dry-run
`);
  process.exit(1);
}

const [gameId, mainProjectArg] = positional;
const MAIN = resolve(mainProjectArg);

// ===== 工具 =====
async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
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

async function listFiles(dir) {
  const out = [];
  async function walk(d) {
    const entries = await readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const full = join(d, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile()) out.push(full);
    }
  }
  await walk(dir);
  return out;
}

// 用正则解析 manifest.ts，与 export-migration.mjs 同源
function parseManifest(source) {
  const get = (key) => {
    const m = source.match(new RegExp(`\\b${key}\\s*:\\s*['"]([^'"]*)['"]`));
    return m ? m[1] : null;
  };
  const obj = (key) => {
    const m = source.match(new RegExp(`\\b${key}\\s*:\\s*\\{([^}]*)\\}`, 's'));
    return m ? m[1] : null;
  };

  const id = get('id');
  const route = get('route');
  const payloadKey = get('payloadKey');
  const adType = get('adType');

  const auBlock = obj('adUnits');
  const adUnits = { ios: 'PLACEHOLDER_IOS', android: 'PLACEHOLDER_ANDROID' };
  if (auBlock) {
    const ios = auBlock.match(/ios\s*:\s*['"]([^'"]*)['"]/);
    const an = auBlock.match(/android\s*:\s*['"]([^'"]*)['"]/);
    if (ios) adUnits.ios = ios[1];
    if (an) adUnits.android = an[1];
  }

  const titleBlock = obj('title');
  const title = {};
  if (titleBlock) {
    const re = /(\w+)\s*:\s*['"]([^'"]*)['"]/g;
    let m;
    while ((m = re.exec(titleBlock)) !== null) title[m[1]] = m[2];
  }

  const hcBlock = obj('homeCard');
  const homeCard = { cover: null, color: '#3a5a8f' };
  if (hcBlock) {
    const cov = hcBlock.match(/cover\s*:\s*(null|['"]([^'"]*)['"])/);
    if (cov) homeCard.cover = cov[1] === 'null' ? null : cov[2];
    const col = hcBlock.match(/color\s*:\s*['"]([^'"]*)['"]/);
    if (col) homeCard.color = col[1];
  }

  if (!id || !route || !payloadKey || !adType) {
    throw new Error('manifest 关键字段缺失，解析得：' + JSON.stringify({ id, route, payloadKey, adType }));
  }
  return { id, route, payloadKey, adType, adUnits, title, homeCard };
}

// ===== 行尾归一化 =====
// 读 → 记录原始行尾 → 用 LF 处理 → 写回时还原
async function readNormalized(file) {
  const raw = await readFile(file, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const normalized = raw.replace(/\r\n/g, '\n');
  return { content: normalized, eol, raw };
}

function denormalize(content, eol) {
  if (eol === '\n') return content;
  return content.replace(/\n/g, eol);
}

// ===== Patch 引擎 =====
class PatchSet {
  constructor() {
    this.ops = []; // [{file, originalRaw, patched, eol}]
  }
  add(file, originalRaw, patched, eol) {
    this.ops.push({ file, originalRaw, patched, eol });
  }
  async commit() {
    if (DRY_RUN) {
      console.log('  [dry-run] 跳过实际写入');
      return;
    }
    if (!NO_BACKUP) {
      for (const op of this.ops) {
        await writeFile(op.file + '.bak', op.originalRaw);
      }
    }
    for (const op of this.ops) {
      await writeFile(op.file, denormalize(op.patched, op.eol));
    }
  }
}

// 显式 BEFORE → AFTER 替换。BEFORE 必须在 content 中恰好出现一次。
function applyReplace(content, before, after, fileLabel) {
  const idx = content.indexOf(before);
  if (idx < 0) {
    throw new Error(`[${fileLabel}] 找不到 BEFORE 锚点：\n  ${before.split('\n').slice(0, 3).join('\n  ')}...`);
  }
  const second = content.indexOf(before, idx + 1);
  if (second >= 0) {
    throw new Error(`[${fileLabel}] BEFORE 锚点在文件中出现多次，请用更长的上下文`);
  }
  return content.slice(0, idx) + after + content.slice(idx + before.length);
}

// 幂等检查：要插入的字符串如果已存在就跳过
function alreadyContains(content, marker) {
  return content.includes(marker);
}

// ===== 各文件的 patch 函数 =====

async function patchAppTsx(manifest, patchSet) {
  const file = resolve(MAIN, 'src/App.tsx');
  if (!(await exists(file))) throw new Error(`找不到 ${file}`);
  const { content, eol, raw } = await readNormalized(file);
  const orig = raw;
  let next = content;

  const { id, route, payloadKey, adType } = manifest;
  const Pascal = toPascal(id);

  // ---- (1) Import：插在 AdService 那行之前（稳定锚点，不依赖任何具体游戏） ----
  if (alreadyContains(next, `import ${Pascal} from './games/${id}'`)) {
    console.log('  · App.tsx import 已存在，跳过');
  } else {
    const before = `import { AdService } from './utils/AdService';`;
    const after = `import ${Pascal} from './games/${id}';\nimport { AdService } from './utils/AdService';`;
    next = applyReplace(next, before, after, 'App.tsx import');
  }

  // ---- (2) <Route>：插在 /game/:slug 之前（稳定锚点） ----
  if (alreadyContains(next, `path="${route}"`)) {
    console.log('  · App.tsx <Route> 已存在，跳过');
  } else {
    const before = `        <Route path="/game/:slug" element={<GameDetail />} />`;
    const after = `        <Route path="${route}" element={<${Pascal} />} />\n        <Route path="/game/:slug" element={<GameDetail />} />`;
    next = applyReplace(next, before, after, 'App.tsx <Route>');
  }

  // ---- (3) payload nav switch：在 `} else { ... 进入首页2` 之前插入新的 else if ----
  const navSig = `payload.game === '${payloadKey}'`;
  const occur = (next.match(new RegExp(navSig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  if (occur >= 1) {
    console.log('  · App.tsx payload nav switch 已存在，跳过');
  } else {
    const before = `          } else {
            console.log('==============进入首页2==============')`;
    const after = `          } else if (payload.game === '${payloadKey}') {
            console.log('==============进入${payloadKey}==============')
            navigate('${route}');
          } else {
            console.log('==============进入首页2==============')`;
    next = applyReplace(next, before, after, 'App.tsx payload nav switch');
  }

  // ---- (4) ad-init switch：在 `}\n          else {\n            console.log('正在初始化正常插页广告...')` 之前
  //          插入新的 else-if 块。注意复用既有的尾 `}` 作为新 else-if 的开头 ----
  if (occur >= 2) {
    console.log('  · App.tsx ad-init switch 已存在，跳过');
  } else {
    const before = `          }
          else {
            console.log('正在初始化正常插页广告...');`;
    const after = `          }else if(payload.game === '${payloadKey}'){
            await AdService.initInterstitialAd('${adType}');
            console.log('${id}广告初始化成功');
          }
          else {
            console.log('正在初始化正常插页广告...');`;
    next = applyReplace(next, before, after, 'App.tsx ad-init switch');
  }

  patchSet.add(file, orig, next, eol);
}

async function patchHomeTsx(manifest, patchSet) {
  const file = resolve(MAIN, 'src/components/Home.tsx');
  if (!(await exists(file))) throw new Error(`找不到 ${file}`);
  const { content, eol, raw } = await readNormalized(file);
  const orig = raw;
  let next = content;

  const { id, route, homeCard } = manifest;
  const cardId = `{/* ${id} 入口 */}`;

  if (alreadyContains(next, cardId)) {
    console.log('  · Home.tsx 卡片已存在，跳过');
    patchSet.add(file, orig, next, eol);
    return;
  }

  const coverSnippet = homeCard.cover
    ? `            <div className="relative w-full overflow-hidden">
              <img
                src="${homeCard.cover}"
                alt={t('${id}_home_title')}
                draggable={false}
                className="w-full block"
                style={{ aspectRatio: '694 / 256', objectFit: 'cover', userSelect: 'none' }}
              />
            </div>`
    : `            <div
              className="relative w-full overflow-hidden"
              style={{ aspectRatio: '694 / 256', backgroundColor: '${homeCard.color}' }}
            />`;

  const newCard = `      {/* ${id} 入口 */}
      <div className="container mx-auto px-4 pt-[1rem]">
        <div
          className="bg-white w-full overflow-hidden rounded-2xl cursor-pointer transition-transform duration-200 hover:scale-[1.02] relative"
          style={{ border: '0.3rem solid #000000' }}
          onClick={() => {
            navigate('${route}');
          }}
        >
          <div className="relative flex flex-col h-full">
${coverSnippet}
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

`;

  // 锚点：'{/* 内容区域 - 根据banner...' 注释（在 hamster 卡片之后、游戏列表之前）
  const anchor = `      {/* 内容区域 - 根据banner是否显示动态调整顶部内边距 */}`;
  const after = newCard + anchor;

  next = applyReplace(next, anchor, after, 'Home.tsx 卡片');
  patchSet.add(file, orig, next, eol);
}

async function patchAdService(manifest, patchSet) {
  const { adType, adUnits } = manifest;
  if (adType === 'quiz') {
    console.log('  · adType=quiz，跳过 AdService.ts');
    return;
  }
  const file = resolve(MAIN, 'src/utils/AdService.ts');
  if (!(await exists(file))) throw new Error(`找不到 ${file}`);
  const { content, eol, raw } = await readNormalized(file);
  const orig = raw;
  let next = content;

  const sig = `type === '${adType}'`;
  if (alreadyContains(next, sig)) {
    console.log('  · AdService.ts 该 adType 已存在，跳过');
    patchSet.add(file, orig, next, eol);
    return;
  }

  // initInterstitialAd switch：找最后一个 `} else if(type === 'cats')` 块（已有的 cats 分支），插入到它结束的 } 之后
  // 由于 main 里两个函数（initInterstitialAd / initAndShowInterstitialAd）都有 cats 分支，我们要插两次。
  // 锚点：`} else if(type === 'cats'){` ... `}` 这段紧接的整个块。简化：插入到 `await FBInstant.getInterstitialAdAsync(id)` 之前的 `}` 处。
  // 用通用锚点策略：每个函数里 `if (type === 'quiz')` ... 最后一个 else if 在 `await FBInstant.getInterstitialAdAsync(id)` 之前。
  // 为简化，我们就用 cats 闭合 `}` 后紧接的代码作为锚点：

  const block = `} else if (type === '${adType}') {
      id = platform === 'IOS' ? '${adUnits.ios}' : '${adUnits.android}';
    }`;

  // 锚点 1: initInterstitialAd 里
  // 主项目代码：`} else if(type === 'cats'){\n      id = platform === 'IOS' ? '...' : '...';\n      console.log('初始化cats广告');\n    }\n    await FBInstant.getInterstitialAdAsync(id)`
  const anchor1 = `console.log('初始化cats广告');
    }
    await FBInstant.getInterstitialAdAsync(id)`;
  if (next.indexOf(anchor1) >= 0) {
    next = next.replace(
      anchor1,
      `console.log('初始化cats广告');\n    } else if (type === '${adType}') {\n      id = platform === 'IOS' ? '${adUnits.ios}' : '${adUnits.android}';\n    }\n    await FBInstant.getInterstitialAdAsync(id)`
    );
  } else {
    throw new Error('[AdService.ts initInterstitialAd] 找不到 cats 分支锚点');
  }

  // 锚点 2: initAndShowInterstitialAd 里
  // 主项目代码：`} else if (type === 'cats'){\n      id = platform === 'IOS' ? '...' : '...';\n      console.log('cats game show ads')\n    }\n    FBInstant.getInterstitialAdAsync(id).then(`
  const anchor2 = `console.log('cats game show ads')
    }
    FBInstant.getInterstitialAdAsync(id).then(`;
  if (next.indexOf(anchor2) >= 0) {
    next = next.replace(
      anchor2,
      `console.log('cats game show ads')\n    } else if (type === '${adType}') {\n      id = platform === 'IOS' ? '${adUnits.ios}' : '${adUnits.android}';\n    }\n    FBInstant.getInterstitialAdAsync(id).then(`
    );
  } else {
    throw new Error('[AdService.ts initAndShowInterstitialAd] 找不到 cats 分支锚点');
  }

  // 锚点 3: #firstAdRewardedVideoRatio 对象。插到 video_list: 那行后面
  const ratioAnchor = `video_list: 0     // Video list games: disabled
  };

  // 上报错误到服务器`;
  if (next.indexOf(ratioAnchor) >= 0) {
    next = next.replace(
      ratioAnchor,
      `video_list: 0,    // Video list games: disabled\n    '${adType}': 0,\n  };\n\n  // 上报错误到服务器`
    );
  } else {
    // 不致命，warn 一下
    console.warn('  ⚠ AdService.ts firstAdRewardedVideoRatio 锚点未找到，请手工加 \"' + adType + ': 0\"');
  }

  patchSet.add(file, orig, next, eol);
}

async function patchNewgameI18n(manifest, patchSet) {
  const file = resolve(MAIN, 'src/newgameI18n.ts');
  if (!(await exists(file))) throw new Error(`找不到 ${file}`);
  const { content, eol, raw } = await readNormalized(file);
  const orig = raw;
  let next = content;

  const { id, title } = manifest;
  const upper = toUpperSnake(id);
  const sig = `${upper}_HOME_TITLE`;

  if (alreadyContains(next, sig)) {
    console.log('  · newgameI18n.ts 已含该游戏，跳过');
    patchSet.add(file, orig, next, eol);
    return;
  }

  const entries = Object.entries(title)
    .map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`)
    .join('\n');

  const append = `

const ${upper}_HOME_TITLE: Record<string, string> = {
${entries}
};

for (const lang of Object.keys(${upper}_HOME_TITLE)) {
  i18n.addResourceBundle(
    lang,
    'translation',
    { '${id}_home_title': ${upper}_HOME_TITLE[lang] },
    true,
    true
  );
}
`;

  next = content + append;
  patchSet.add(file, orig, next, eol);
}

// ===== 拷贝文件夹 =====
async function copyGameFolder(manifest) {
  const id = manifest.id;
  const srcSrc = resolve(TEMPLATE_ROOT, 'src/games', id);
  const srcDst = resolve(MAIN, 'src/games', id);
  const pubSrc = resolve(TEMPLATE_ROOT, 'public/games', id);
  const pubDst = resolve(MAIN, 'public/games', id);

  if (DRY_RUN) {
    console.log(`  [dry-run] cp -r ${srcSrc} ${srcDst}`);
    if (await exists(pubSrc)) console.log(`  [dry-run] cp -r ${pubSrc} ${pubDst}`);
    return;
  }

  if (await exists(srcDst)) {
    console.log(`  ⚠ ${srcDst} 已存在，跳过拷贝（避免覆盖；若要更新请手动删除）`);
  } else {
    await cp(srcSrc, srcDst, { recursive: true });
    console.log(`  · 已拷贝 src/games/${id}/`);
  }

  if (await exists(pubSrc)) {
    if (await exists(pubDst)) {
      console.log(`  ⚠ ${pubDst} 已存在，跳过拷贝`);
    } else {
      await cp(pubSrc, pubDst, { recursive: true });
      console.log(`  · 已拷贝 public/games/${id}/`);
    }
  }
}

// ===== 主流程 =====
async function main() {
  console.log(`\n=== Integrate ${gameId} → ${MAIN} ===\n`);
  if (DRY_RUN) console.log('🟡 DRY-RUN 模式，不会实际写文件\n');

  // 1. 校验
  const manifestPath = resolve(TEMPLATE_ROOT, 'src/games', gameId, 'manifest.ts');
  if (!(await exists(manifestPath))) {
    throw new Error(`找不到 ${manifestPath}`);
  }
  const manifest = parseManifest(await readFile(manifestPath, 'utf8'));
  console.log('Manifest:', JSON.stringify(manifest, null, 2));
  console.log();

  // 2. 校验主项目结构
  const required = [
    'src/App.tsx',
    'src/components/Home.tsx',
    'src/utils/AdService.ts',
    'src/newgameI18n.ts',
  ];
  for (const f of required) {
    if (!(await exists(resolve(MAIN, f)))) {
      throw new Error(`主项目缺少 ${f}：${resolve(MAIN, f)}`);
    }
  }

  // 3. 拷贝
  console.log('[1/5] 拷贝游戏文件夹');
  await copyGameFolder(manifest);

  // 4. patch
  const patchSet = new PatchSet();
  console.log('\n[2/5] Patch src/App.tsx');
  await patchAppTsx(manifest, patchSet);
  console.log('\n[3/5] Patch src/components/Home.tsx');
  await patchHomeTsx(manifest, patchSet);
  console.log('\n[4/5] Patch src/utils/AdService.ts');
  await patchAdService(manifest, patchSet);
  console.log('\n[5/5] Patch src/newgameI18n.ts');
  await patchNewgameI18n(manifest, patchSet);

  // 5. commit
  console.log('\n=== 提交所有改动 ===');
  await patchSet.commit();

  console.log(`\n✅ 集成完成！\n`);
  if (!DRY_RUN && !NO_BACKUP) {
    console.log('原文件已备份为 *.bak。验证无误后可删除：');
    for (const op of patchSet.ops) {
      console.log(`  rm ${relative(MAIN, op.file)}.bak`);
    }
  }
  console.log(`
下一步验证：
  cd ${mainProjectArg}
  npm run dev
  # 首页看到 "${manifest.title.en || gameId}" 卡片，点进 ${manifest.route} 能玩
`);
}

main().catch(async (err) => {
  console.error('\n❌ 集成失败:', err.message);
  console.error('\n如已 patch 部分文件，可用 .bak 还原：');
  console.error('  Get-ChildItem -Recurse -Filter *.bak | ForEach-Object { Move-Item $_.FullName ($_.FullName -replace ".bak$", "") -Force }');
  process.exit(1);
});
