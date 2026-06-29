// 한 터미널에서 4개 앱 + 런처 + mDNS를 동시에 실행한다.
//   node scripts/run-all.mjs dev    → 각 앱 next dev   (핫리로드)
//   node scripts/run-all.mjs start  → 각 앱 next start (사전 빌드 필요)
// Ctrl+C 한 번으로 전체 종료.
import { join } from 'node:path';
import concurrently from 'concurrently';
import { loadConfig, ROOT, appPath, appExists } from './_config.mjs';

const mode = (process.argv[2] || 'dev').toLowerCase();
if (!['dev', 'start'].includes(mode)) {
  console.error(`사용법: node scripts/run-all.mjs <dev|start> (받은 값: ${mode})`);
  process.exit(1);
}

const cfg = await loadConfig();
const palette = ['blue', 'green', 'yellow', 'magenta', 'cyan', 'red'];

const missing = cfg.apps.filter((a) => !appExists(a));
if (missing.length) {
  console.warn(`[run] ⚠ 누락된 앱: ${missing.map((a) => a.dir).join(', ')} — mv 후 다시 실행하세요.`);
}

const appCommands = cfg.apps
  .filter(appExists)
  .map((app, i) => {
    let command;
    if (mode === 'start' && app.staticExport) {
      // output:"export" 앱은 next start 불가 → 빌드된 out/ 을 정적 서버로 서빙
      command = `node ${join(ROOT, 'scripts', 'serve-static.mjs')} ${join(appPath(app), 'out')} ${app.port}`;
    } else {
      // dev 모드는 staticExport 앱도 next dev로 정상 동작
      command = `npx next ${mode} -H 0.0.0.0 -p ${app.port}`;
    }
    return {
      command,
      name: app.name,
      prefixColor: palette[i % palette.length],
      cwd: appPath(app),
    };
  });

const infraCommands = [
  { command: 'node server/launcher.mjs', name: 'launcher', prefixColor: 'white', cwd: ROOT },
  { command: 'node server/mdns.mjs', name: 'mdns', prefixColor: 'gray', cwd: ROOT },
];

const commands = [...infraCommands, ...appCommands];

console.log(`[run] 모드=${mode} · 앱 ${appCommands.length}개 + 런처 + mDNS 시작`);
console.log(`[run] 런처: http://localhost:${cfg.launcherPort} (LAN: http://${cfg.host}:${cfg.launcherPort})`);

const { result } = concurrently(commands, {
  prefix: 'name',
  killOthers: ['failure', 'success'],
  restartTries: 0,
  handleInput: true,
});

result.then(
  () => process.exit(0),
  () => process.exit(1),
);
