// 허브 런처 서버 — public/ 정적 파일을 :3000(0.0.0.0)에서 서빙하고
// apps.config.json을 /config.json 으로 노출한다. (Node 내장 http만 사용)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';
import os from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC = join(ROOT, 'public');
const CONFIG = join(ROOT, 'apps.config.json');

const cfg = JSON.parse(await readFile(CONFIG, 'utf8'));
// PORT 환경변수가 있으면 우선 (프리뷰/테스트가 빈 포트를 지정할 수 있게).
const PORT = Number(process.env.PORT) || cfg.launcherPort || 3000;

// 현재 머신의 LAN IPv4 — `.local` 해석이 불안정한 네트워크에서 직접 접속용 폴백 주소.
function lanIPv4() {
  const ifaces = os.networkInterfaces();
  const order = ['en0', 'en1', ...Object.keys(ifaces)];
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

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let pathname = decodeURIComponent(url.pathname);

    // 설정은 항상 최신 파일에서 읽어 노출 (앱 추가 시 재시작 불필요).
    // 현재 LAN IP를 함께 실어 보내 페이지가 직접 접속 주소를 안내할 수 있게 한다.
    if (pathname === '/config.json') {
      const fresh = JSON.parse(await readFile(CONFIG, 'utf8'));
      fresh.lanIP = lanIPv4();
      return send(res, 200, JSON.stringify(fresh), MIME['.json']);
    }

    if (pathname === '/') pathname = '/index.html';

    // 디렉토리 탈출 방지
    const filePath = normalize(join(PUBLIC, pathname));
    if (!filePath.startsWith(PUBLIC)) return send(res, 403, 'Forbidden');

    const data = await readFile(filePath);
    return send(res, 200, data, MIME[extname(filePath)] || 'application/octet-stream');
  } catch (err) {
    if (err.code === 'ENOENT') return send(res, 404, 'Not Found');
    return send(res, 500, `Server Error: ${err.message}`);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = lanIPv4();
  console.log(`[launcher] http://localhost:${PORT}`);
  console.log(`[launcher] 다른 기기: http://${cfg.host || 'sail.local'}:${PORT}` +
    (ip ? `  또는 http://${ip}:${PORT}  (← .local 안 잡히면 이 주소)` : ''));
});
