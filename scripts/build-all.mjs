// 4개 sub-app을 한 번에 빌드(next build). 실패한 앱은 표시하고 계속 진행.
import { spawn } from 'node:child_process';
import { loadConfig, appPath, appExists } from './_config.mjs';

function run(cmd, args, cwd) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd, stdio: 'inherit', shell: false });
    p.on('close', (code) => resolve(code));
    p.on('error', () => resolve(1));
  });
}

const cfg = await loadConfig();
const results = [];

for (const app of cfg.apps) {
  if (!appExists(app)) {
    console.warn(`[build] ⚠ ${app.dir} 없음 — 건너뜀`);
    results.push([app.dir, 'missing']);
    continue;
  }
  console.log(`\n[build] ===== ${app.title} (${app.dir}) =====`);
  const code = await run('npx', ['next', 'build'], appPath(app));
  results.push([app.dir, code === 0 ? 'ok' : `fail(${code})`]);
}

console.log('\n[build] 요약:');
for (const [dir, status] of results) {
  const mark = status === 'ok' ? '✓' : '✗';
  console.log(`  ${mark} ${dir}: ${status}`);
}
if (results.some(([, s]) => s !== 'ok')) process.exitCode = 1;
