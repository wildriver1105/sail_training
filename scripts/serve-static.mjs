// 정적 익스포트(next build --output:export → out/) 디렉토리를 포트에 서빙한다.
// 사용: node scripts/serve-static.mjs <dir> <port>
// (output:"export"인 앱은 next start가 동작하지 않으므로 프로덕션 실행에 사용)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { normalize, join, extname, resolve } from 'node:path';

const dir = resolve(process.argv[2] || '.');
const port = Number(process.argv[3] || 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
};

async function resolveFile(pathname) {
  // 디렉토리 탈출 방지
  let p = normalize(join(dir, decodeURIComponent(pathname)));
  if (!p.startsWith(dir)) return null;
  try {
    const s = await stat(p);
    if (s.isDirectory()) p = join(p, 'index.html');
  } catch {
    // next export는 /foo → foo.html 형태도 생성
    try { await stat(p + '.html'); p = p + '.html'; } catch { /* fall through */ }
  }
  return p;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    let filePath = await resolveFile(pathname);

    let data;
    try {
      data = await readFile(filePath);
    } catch {
      // SPA/404 폴백: 404.html이 있으면 사용
      try { data = await readFile(join(dir, '404.html')); }
      catch { res.writeHead(404); return res.end('Not Found'); }
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(data);
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch (err) {
    res.writeHead(500);
    res.end(`Server Error: ${err.message}`);
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`[static] serving ${dir} on http://0.0.0.0:${port}`);
});
