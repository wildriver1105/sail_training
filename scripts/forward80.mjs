// 포트 80 → 런처 포트(기본 3000) 리다이렉트 서버.
// 사용자가 http://sail.local (포트 생략) 으로 접속하면 :3000 으로 302 리다이렉트한다.
//
// 80번은 특권 포트(<1024)라 root 권한이 필요하므로 sudo로 실행한다:
//   sudo npm run forward
// (테스트는 비특권 포트로:  FORWARD_PORT=8080 node scripts/forward80.mjs)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(await readFile(join(__dirname, '..', 'apps.config.json'), 'utf8'));

const TARGET = cfg.launcherPort || 3000;      // 보낼 곳(런처)
const LISTEN = Number(process.env.FORWARD_PORT || 80); // 받을 곳(기본 80)

const server = createServer((req, res) => {
  // 사용자가 입력한 호스트명(sail.local 또는 LAN IP)을 유지하고 포트만 TARGET으로 바꾼다.
  const hostHeader = req.headers.host || `${cfg.host || 'sail.local'}:${LISTEN}`;
  const hostname = hostHeader.split(':')[0];
  const location = `http://${hostname}:${TARGET}${req.url}`;
  res.writeHead(302, { Location: location });
  res.end(`Redirecting to ${location}\n`);
});

server.on('error', (err) => {
  if (err.code === 'EACCES') {
    console.error(`[forward] 포트 ${LISTEN} 바인딩 권한 없음 — sudo로 실행하세요:  sudo npm run forward`);
  } else if (err.code === 'EADDRINUSE') {
    console.error(`[forward] 포트 ${LISTEN} 이(가) 이미 사용 중입니다.`);
  } else {
    console.error('[forward]', err.message);
  }
  process.exit(1);
});

server.listen(LISTEN, '0.0.0.0', () => {
  console.log(`[forward] http://<host>:${LISTEN}  →  http://<host>:${TARGET} 로 리다이렉트`);
  if (LISTEN === 80) console.log(`[forward] 이제 http://${cfg.host || 'sail.local'} (포트 생략) 으로 접속됩니다.`);
});
