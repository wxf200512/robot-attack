#!/usr/bin/env node
// scripts/pack-fb.mjs
// 把模板构建成可上传到 Facebook Instant Games 的 .zip 包。
// 用法：npm run package:fb
//
// 做两件事：
//   1. vite build（vite.config 里 base 已是 './'，产物用相对路径，符合 FB CDN）
//   2. 把 dist/ 的【内容】（index.html 在 zip 根）压成 fb-package.zip
//
// 注意：本脚本只读 dist/，不改任何游戏代码 / 共享 shell，
//       与 integrate.mjs / export-migration.mjs 互不影响。

import { spawnSync } from 'node:child_process';
import { rm, access, readdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');
const OUT = resolve(ROOT, 'fb-package.zip');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.status !== 0) {
    console.error(`\n❌ 命令失败：${cmd} ${args.join(' ')}`);
    process.exit(r.status ?? 1);
  }
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('\n=== [1/2] 构建生产包 (vite build) ===\n');
  run('npx', ['vite', 'build'], { cwd: ROOT, shell: true });

  if (!(await exists(DIST))) {
    console.error(`\n❌ 没找到构建产物：${DIST}`);
    process.exit(1);
  }

  // 删掉 sourcemap：生产包不需要，且避免暴露源码
  const assetsDir = join(DIST, 'assets');
  if (await exists(assetsDir)) {
    const files = await readdir(assetsDir);
    for (const f of files) {
      if (f.endsWith('.map')) await rm(join(assetsDir, f), { force: true });
    }
  }

  console.log('\n=== [2/2] 打包成 fb-package.zip ===\n');
  await rm(OUT, { force: true });

  const entries = await readdir(DIST);
  if (process.platform === 'win32') {
    // 用 Windows 自带 bsdtar（System32\tar.exe）：zip 条目用正斜杠（合规）。
    // 不用 Compress-Archive / .NET ZipFile —— PowerShell 5.1 底层会写反斜杠路径，FB 可能解析异常。
    // 用绝对路径，避免 git-bash 的 GNU tar（不支持 -a 生成 zip）被优先解析。
    const tarExe = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
    run(tarExe, ['-a', '-c', '-f', OUT, '-C', DIST, ...entries]);
  } else {
    // zip 在 dist/ 内执行，'.' 让内容落在 zip 根目录
    run('zip', ['-r', OUT, '.'], { cwd: DIST });
  }

  console.log(`
✅ 完成：fb-package.zip

  · zip 根目录即 index.html + assets/（FB Instant Games 要求）
  · 上传到 FB 开发者后台 → 你的应用 → Instant Games → 上传版本

提醒（FB 线上联调）：
  · 后端地址在构建时由 VITE_API_BASE_URL 烘焙进包；当前 .env.local 指向局域网 HTTP，
    FB 用 HTTPS 托管，会触发混合内容拦截且访问不到局域网。线上测试需把它换成公网 HTTPS 地址。
  · 生产包里 import.meta.env.DEV=false，getSignature() 会走真实 FB 签名（不再用测试值 123456），
    后端需能校验真实 FB signed request。
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
