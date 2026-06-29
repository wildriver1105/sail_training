// mDNS 응답기 — 같은 WiFi의 기기가 `sail.local`(및 sail.local:300X)을 해석할 수 있게
// A-레코드만 직접 응답한다.
//
// 주의: 머신의 호스트 이름(예: Hyuns-Silicon-MacBook-Pro.local)은 절대 광고/방어하지 않는다.
// (Bonjour 서비스 광고는 머신 호스트명 A-레코드까지 announce해서 macOS 내장 mDNSResponder와
//  충돌 → 호스트명이 "-2"로 바뀌는 부작용이 있어 제거함. sail.local 해석에는 불필요.)
import os from 'node:os';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import makeMdns from 'multicast-dns';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(await readFile(join(__dirname, '..', 'apps.config.json'), 'utf8'));

const HOSTNAME = cfg.host || 'sail.local';            // 우리가 광고할 이름 (머신명이 아님)
const LAUNCHER_PORT = cfg.launcherPort || 3000;

// 현재 머신의 첫 LAN IPv4 (내부/가상 인터페이스 제외)
function lanIPv4() {
  const ifaces = os.networkInterfaces();
  const order = ['en0', 'en1', ...Object.keys(ifaces)]; // en0(보통 Wi-Fi) 우선
  const seen = new Set();
  for (const name of order) {
    if (seen.has(name)) continue;
    seen.add(name);
    for (const ni of ifaces[name] || []) {
      if (ni.family === 'IPv4' && !ni.internal) return ni.address;
    }
  }
  return null;
}

const ip = lanIPv4();
if (!ip) {
  console.warn('[mdns] LAN IPv4를 찾지 못했습니다. WiFi/이더넷 연결을 확인하세요. (런처는 계속 동작)');
}

// sail.local A-레코드 응답기 — 우리 이름을 묻는 멀티캐스트 질의에만 응답한다.
const mdns = makeMdns();

mdns.on('query', (query) => {
  if (!ip) return;
  for (const q of query.questions || []) {
    if (q.name === HOSTNAME && (q.type === 'A' || q.type === 'ANY')) {
      mdns.respond({
        answers: [{ name: HOSTNAME, type: 'A', ttl: 120, data: ip }],
      });
    }
  }
});

mdns.on('error', (err) => console.warn('[mdns] responder error:', err.message));

if (ip) {
  console.log(`[mdns] ${HOSTNAME} -> ${ip}  (http://${HOSTNAME}:${LAUNCHER_PORT})`);
} else {
  console.log('[mdns] IP 미탐지 — sail.local 응답 비활성 (localhost로는 접속 가능)');
}

function shutdown() {
  try { mdns.destroy(); } catch {}
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
