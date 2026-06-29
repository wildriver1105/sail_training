// 허브가 띄운 프로세스를 일괄 종료한다 (런처 + mDNS + 각 앱).
//   node scripts/stop-all.mjs            → 종료
//   node scripts/stop-all.mjs --dry-run  → 무엇을 종료할지 표시만(실제 종료 안 함)
//
// 안전장치: apps.config.json에 정의된 포트(런처+앱)의 TCP 리스너와, 허브 스크립트
// (run-all/launcher/mdns/serve-static) 프로세스만 대상으로 한다. 설정에 없는 포트
// (예: 다른 세션이 띄운 :3009)는 절대 건드리지 않는다.
import { execSync } from 'node:child_process';
import { loadConfig, ROOT } from './_config.mjs';

const dryRun = process.argv.includes('--dry-run');
const cfg = await loadConfig();
const ports = [cfg.launcherPort, ...cfg.apps.map((a) => a.port)].filter(Boolean);

function sh(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; } // 매치 없음(비정상 종료 코드) → 빈 문자열
}

const pids = new Set();

// 1) 우리 설정 포트의 TCP 리스너 (런처 + next 서버 + 정적 서버)
for (const port of ports) {
  for (const p of sh(`lsof -ti tcp:${port} -sTCP:LISTEN`).split('\n')) {
    if (p.trim()) pids.add(p.trim());
  }
}

// 2) 허브 스크립트 프로세스 (mDNS는 TCP 포트가 없어 명령줄로 식별)
for (const name of ['run-all.mjs', 'server/launcher.mjs', 'server/mdns.mjs', 'scripts/serve-static.mjs']) {
  for (const p of sh(`pgrep -f "${name}"`).split('\n')) {
    if (p.trim()) pids.add(p.trim());
  }
}

// 자기 자신/부모(npm)는 제외
[String(process.pid), String(process.ppid), '1'].forEach((p) => pids.delete(p));

const list = [...pids].filter(Boolean);
if (!list.length) {
  console.log('[stop] 실행 중인 허브 프로세스가 없습니다.');
  process.exit(0);
}

console.log(`[stop] 대상 ${list.length}개:`);
for (const pid of list) {
  const info = sh(`ps -p ${pid} -o pid=,command=`);
  if (info) console.log(`  ${info.slice(0, 110)}`);
}

if (dryRun) {
  console.log('[stop] --dry-run: 실제로 종료하지 않았습니다.');
  process.exit(0);
}

// SIGTERM(정상 종료) → 1.5초 후 살아있으면 SIGKILL
for (const pid of list) { try { process.kill(Number(pid), 'SIGTERM'); } catch {} }
console.log(`[stop] SIGTERM 전송 (${list.length}개)`);

await new Promise((r) => setTimeout(r, 1500));

const survivors = list.filter((pid) => { try { process.kill(Number(pid), 0); return true; } catch { return false; } });
for (const pid of survivors) { try { process.kill(Number(pid), 'SIGKILL'); } catch {} }
if (survivors.length) console.log(`[stop] SIGKILL 강제 종료 (${survivors.length}개)`);

console.log('[stop] 완료.');
