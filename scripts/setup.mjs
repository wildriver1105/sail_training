// 각 sub-app에서 의존성 설치. node_modules가 이미 있으면 건너뛴다(--force로 강제).
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig, appPath, appExists } from './_config.mjs';

const force = process.argv.includes('--force');

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, stdio: 'inherit', shell: false });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
    p.on('error', reject);
  });
}

const cfg = await loadConfig();
let installed = 0, skipped = 0, missing = 0;

for (const app of cfg.apps) {
  const dir = appPath(app);
  if (!appExists(app)) {
    console.warn(`[setup] ⚠ ${app.dir} 없음 — 디렉토리 이동(mv) 후 다시 실행하세요.`);
    missing++;
    continue;
  }
  if (!force && existsSync(join(dir, 'node_modules'))) {
    console.log(`[setup] ✓ ${app.dir} — node_modules 존재, 건너뜀`);
    skipped++;
    continue;
  }
  console.log(`[setup] → ${app.dir} npm install …`);
  await run('npm', ['install'], dir);
  installed++;
}

console.log(`[setup] 완료: 설치 ${installed} · 건너뜀 ${skipped} · 누락 ${missing}`);
if (missing > 0) process.exitCode = 1;
