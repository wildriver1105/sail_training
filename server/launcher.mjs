// 허브 런처 서버 — public/ 정적 파일을 :3000(0.0.0.0)에서 서빙하고
// apps.config.json을 /config.json 으로 노출한다. (Node 내장 http만 사용)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC = join(ROOT, 'public');
const CONFIG = join(ROOT, 'apps.config.json');

const cfg = JSON.parse(await readFile(CONFIG, 'utf8'));
const PORT = cfg.launcherPort || 3000;

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

    // 설정은 항상 최신 파일에서 읽어 노출 (앱 추가 시 재시작 불필요)
    if (pathname === '/config.json') {
      const fresh = await readFile(CONFIG, 'utf8');
      return send(res, 200, fresh, MIME['.json']);
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
  console.log(`[launcher] http://localhost:${PORT}  (LAN: http://${cfg.host || 'sail.local'}:${PORT})`);
});
