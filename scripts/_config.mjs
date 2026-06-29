// 공통: apps.config.json 로드 + 경로 헬퍼
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, '..');

export async function loadConfig() {
  const cfg = JSON.parse(await readFile(join(ROOT, 'apps.config.json'), 'utf8'));
  return cfg;
}

// sub-app 디렉토리가 실제로 존재하는지 확인 (디렉토리 이동 전이면 경고)
export function appPath(app) {
  return join(ROOT, app.dir);
}

export function appExists(app) {
  return existsSync(join(appPath(app), 'package.json'));
}
