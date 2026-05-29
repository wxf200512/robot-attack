#!/usr/bin/env node
// scripts/new-game.mjs
// 交互式新建一个游戏骨架（manifest.ts + index.tsx + public 占位）。
// 用法：npm run new-game

import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const ID_RE = /^[a-z0-9_-]+$/;
const HEX_RE = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;
const RESERVED_IDS = new Set(['sample', 'registry']);

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

function manifestSource({ id, titleEn, titleZh, color }) {
  return `import type { GameManifest } from '../../types';

const manifest: GameManifest = {
  id: '${id}',
  route: '/${id}',
  payloadKey: '${id}',
  adType: 'quiz', // 默认复用平台 quiz 广告位；要专属广告位请改成自己的 adType 并告知集成者
  adUnits: {
    ios: 'PLACEHOLDER_IOS',
    android: 'PLACEHOLDER_ANDROID',
  },
  title: {
    en: ${JSON.stringify(titleEn)},
    zh: ${JSON.stringify(titleZh)},
  },
  homeCard: {
    cover: null, // 等放图后改成 '/games/${id}/home_cover.jpg'
    color: '${color}',
  },
  component: () => import('./index'),
};

export default manifest;
`;
}

function indexSource({ id, titleEn }) {
  const pascal = toPascal(id);
  return `import React from 'react';
import { useNavigate } from 'react-router-dom';

const ${pascal}: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#1a2840] text-white p-6">
      <button
        onClick={() => navigate('/home')}
        className="text-sm underline opacity-70 hover:opacity-100"
      >
        ← 返回首页
      </button>
      <h1 className="text-3xl font-bold mt-6">${titleEn}</h1>
      <p className="text-sm opacity-70 mt-2">TODO: 在这里开始写「${id}」的游戏内容</p>
    </div>
  );
};

export default ${pascal};
`;
}

async function ask(rl, prompt, validate) {
  while (true) {
    const raw = (await rl.question(prompt)).trim();
    const result = validate ? validate(raw) : { ok: true, value: raw };
    if (result.ok) return result.value;
    console.error(`  ❌ ${result.error}`);
  }
}

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  console.log('\n=== 新建游戏骨架 ===\n');

  const id = await ask(rl, '游戏 id（小写英文，[a-z0-9_-]，例 spaceship）: ', (v) => {
    if (!v) return { ok: false, error: 'id 不能为空' };
    if (!ID_RE.test(v)) return { ok: false, error: '只能用 [a-z0-9_-]' };
    if (RESERVED_IDS.has(v)) return { ok: false, error: `"${v}" 是保留名` };
    return { ok: true, value: v };
  });

  const gameDir = resolve(ROOT, 'src/games', id);
  if (await exists(gameDir)) {
    rl.close();
    console.error(`\n❌ ${gameDir} 已存在。换个 id，或先删除该文件夹。\n`);
    process.exit(1);
  }

  const titleEn = await ask(rl, '英文标题（en）: ', (v) =>
    v ? { ok: true, value: v } : { ok: false, error: '英文标题必填' }
  );

  const titleZh = (await rl.question(`中文标题（zh，回车默认 "${titleEn}"）: `)).trim() || titleEn;

  const color = await ask(rl, '首页卡片色块色（十六进制，回车默认 #3a5a8f）: ', (v) => {
    if (!v) return { ok: true, value: '#3a5a8f' };
    if (!HEX_RE.test(v)) return { ok: false, error: '需要 #RRGGBB 或 #RGB 格式' };
    return { ok: true, value: v };
  });

  rl.close();

  // 写文件
  await mkdir(gameDir, { recursive: true });
  await writeFile(resolve(gameDir, 'manifest.ts'), manifestSource({ id, titleEn, titleZh, color }));
  await writeFile(resolve(gameDir, 'index.tsx'), indexSource({ id, titleEn }));

  const publicDir = resolve(ROOT, 'public/games', id);
  await mkdir(publicDir, { recursive: true });
  await writeFile(resolve(publicDir, '.gitkeep'), '');

  console.log(`
✅ 骨架已创建：

  src/games/${id}/
    manifest.ts
    index.tsx
  public/games/${id}/
    .gitkeep

下一步：

  1. 启动 dev 服务（如果还没启动）：
     npm run dev

  2. 浏览器打开 http://localhost:5173/ 应看到 "${titleEn}" 卡片

  3. 点卡片 → 应进入 /${id} 游戏页 → 点"← 返回首页" → 回首页

  4. 在 src/games/${id}/index.tsx 开始写你的游戏

  5. 资源放 public/games/${id}/，代码里用 '/games/${id}/xxx' 引用

完工后导出迁移清单：
  npm run export-migration ${id}
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
