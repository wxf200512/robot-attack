#!/usr/bin/env node
// scripts/delete-game.mjs
// 删除一个游戏项目（src/games/<id>/ + public/games/<id>/）。
// 用法：
//   npm run delete-game -- <id>            # 删除前会要求确认
//   npm run delete-game -- <id> --yes      # 跳过确认（-y 同义）
//   npm run delete-game -- <id> --dry-run  # 只打印将删除什么，不真删
//   npm run delete-game                    # 不带 id 时进入交互式选择

import { access, rm, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const ID_RE = /^[a-z0-9_-]+$/;
const RESERVED_IDS = new Set(['sample', 'registry']);

// ===== 参数解析 =====
const rawArgs = process.argv.slice(2);
const flags = new Set(rawArgs.filter((a) => a.startsWith('--') || a === '-y'));
const positional = rawArgs.filter((a) => !a.startsWith('-'));
const DRY_RUN = flags.has('--dry-run');
const SKIP_CONFIRM = flags.has('--yes') || flags.has('-y');

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

// 列出 src/games 下除保留名外的真实游戏文件夹
async function listGames() {
  const gamesDir = resolve(ROOT, 'src/games');
  const entries = await readdir(gamesDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !RESERVED_IDS.has(e.name))
    .map((e) => e.name)
    .sort();
}

async function pickGameInteractively(rl) {
  const games = await listGames();
  if (games.length === 0) {
    console.error('\n❌ src/games 下没有可删除的游戏。\n');
    process.exit(1);
  }
  console.log('\n现有游戏：\n');
  games.forEach((g, i) => console.log(`  ${i + 1}. ${g}`));
  console.log();

  while (true) {
    const raw = (await rl.question('输入要删除的序号或 id（回车取消）: ')).trim();
    if (!raw) {
      console.log('已取消。');
      process.exit(0);
    }
    const byIndex = Number.parseInt(raw, 10);
    if (Number.isInteger(byIndex) && byIndex >= 1 && byIndex <= games.length) {
      return games[byIndex - 1];
    }
    if (games.includes(raw)) return raw;
    console.error('  ❌ 无效输入，请输入列表中的序号或 id');
  }
}

function validateId(id) {
  if (!ID_RE.test(id)) {
    console.error(`\n❌ "${id}" 不是合法 id（只能用 [a-z0-9_-]）。\n`);
    process.exit(1);
  }
  if (RESERVED_IDS.has(id)) {
    console.error(`\n❌ "${id}" 是保留名，不能删除。\n`);
    process.exit(1);
  }
}

async function main() {
  let id = positional[0];

  const rl = readline.createInterface({ input: stdin, output: stdout });

  if (!id) {
    id = await pickGameInteractively(rl);
  }

  validateId(id);

  const srcDir = resolve(ROOT, 'src/games', id);
  const publicDir = resolve(ROOT, 'public/games', id);

  const srcExists = await exists(srcDir);
  const publicExists = await exists(publicDir);

  if (!srcExists && !publicExists) {
    rl.close();
    console.error(`\n❌ 找不到游戏 "${id}"（src/games/${id} 和 public/games/${id} 都不存在）。\n`);
    process.exit(1);
  }

  const targets = [];
  if (srcExists) targets.push(srcDir);
  if (publicExists) targets.push(publicDir);

  console.log(`\n将删除游戏 "${id}" 的以下文件夹：\n`);
  for (const t of targets) console.log(`  - ${t}`);
  console.log();

  if (DRY_RUN) {
    rl.close();
    console.log('🟡 DRY-RUN 模式，未实际删除任何文件。\n');
    return;
  }

  if (!SKIP_CONFIRM) {
    const answer = (await rl.question(`确认删除？此操作不可恢复。输入游戏 id "${id}" 确认: `)).trim();
    if (answer !== id) {
      rl.close();
      console.log('\n输入不匹配，已取消。\n');
      process.exit(0);
    }
  }

  rl.close();

  for (const t of targets) {
    await rm(t, { recursive: true, force: true });
    console.log(`  · 已删除 ${t}`);
  }

  console.log(`
✅ 游戏 "${id}" 已删除。

提示：
  - registry 用 import.meta.glob 自动扫描，删完刷新浏览器首页卡片就会消失。
  - 若 dev 服务在跑，可能需要重启 npm run dev 让 Vite 重新扫描。
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
