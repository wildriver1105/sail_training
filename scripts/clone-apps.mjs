// 5개 sub-app을 각자 GitHub repo에서 허브 폴더 안으로 클론한다.
// (sub-app은 .gitignore라 허브만 클론하면 비어 있으므로, 새 기기 셋업의 첫 단계)
//   node scripts/clone-apps.mjs
// 이미 존재하는 앱은 건너뛴다.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig, ROOT, appPath } from './_config.mjs';

function run(cmd, args, cwd) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd, stdio: 'inherit', shell: false });
    p.on('close', (code) => resolve(code));
    p.on('error', () => resolve(1));
  });
}

const cfg = await loadConfig();
let cloned = 0, skipped = 0, failed = 0, norepo = 0;

for (const app of cfg.apps) {
  const dir = appPath(app);
  if (existsSync(join(dir, 'package.json'))) {
    console.log(`[clone] ✓ ${app.dir} — 이미 존재, 건너뜀`);
    skipped++;
    continue;
  }
  if (!app.repo) {
    console.warn(`[clone] ⚠ ${app.dir} — apps.config.json에 repo URL 없음, 수동 클론 필요`);
    norepo++;
    continue;
  }
  console.log(`[clone] → ${app.dir}  (${app.repo})`);
  const code = await run('git', ['clone', app.repo, app.dir], ROOT);
  if (code === 0) cloned++;
  else { console.error(`[clone] ✗ ${app.dir} 실패(code ${code})`); failed++; }
}

console.log(`[clone] 완료: 클론 ${cloned} · 건너뜀 ${skipped} · repo없음 ${norepo} · 실패 ${failed}`);
console.log('[clone] 다음: npm run setup  →  npm run dev');
if (failed || norepo) process.exitCode = 1;
