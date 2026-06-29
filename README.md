# Sail Training Hub

`boat_drive`, `trimmer`, `knots`, `sea_nav` 4개의 독립 Next.js 세일링 앱을 한 곳에서 실행하고,
mDNS(`sail.local`)로 같은 WiFi의 다른 기기에서도 접속할 수 있게 해주는 허브입니다.

각 앱은 **자기 포트에서 독립적으로** 실행되고, 허브는 (1) 런처 페이지(:3000), (2) `sail.local`
mDNS 광고, (3) 한 터미널에서 전체 빌드/실행 오케스트레이션을 담당합니다.

| 앱 | 포트 | 설명 |
|----|------|------|
| 런처(허브) | 3000 | 앱 목록 카드 페이지 |
| boat_drive | 3001 | 보트 조종 시뮬레이터 |
| trimmer | 3002 | 세일 트림 시뮬레이터 |
| knots | 3003 | 3D 매듭 학습 (`/api/knots` 포함) |
| sea_nav | 3004 | 해도 내비게이션 |
| sailing_tactics | 3005 | 칠판 스타일 전술 보드 (정적 익스포트) |

> 각 앱 디렉토리는 각자 독립 GitHub repo이며, 이 허브의 git에서는 `.gitignore`로 제외됩니다.

## 빠른 시작

```bash
cd sail_training
npm install          # 허브 의존성 (concurrently, multicast-dns, bonjour-service)
npm run setup        # 4개 앱 각각 npm install (이미 설치돼 있으면 건너뜀)

# 개발 모드 — 한 터미널에서 전부 실행 (핫리로드)
npm run dev

# 또는 프로덕션 — 먼저 일괄 빌드 후 실행 (다중 접속에 빠르고 안정적)
npm run build
npm start
```

실행 후:

- 이 맥에서: <http://localhost:3000>
- 같은 WiFi의 다른 기기에서: <http://sail.local:3000>

런처에서 카드를 누르면 현재 접속한 호스트명 기준으로 각 앱(`:3001`~`:3004`)으로 이동합니다.

## 스크립트

| 명령 | 동작 |
|------|------|
| `npm run setup` | 각 앱에서 `npm install` (`-- --force`로 강제 재설치) |
| `npm run build` | 4개 앱 `next build` 일괄 |
| `npm run dev` | 4개 앱 `next dev` + 런처 + mDNS 동시 실행 |
| `npm start` | 4개 앱 `next start`(빌드본) + 런처 + mDNS 동시 실행 |

Ctrl+C 한 번으로 모든 프로세스가 함께 종료됩니다.

## 앱 추가하기

`apps.config.json`의 `apps` 배열에 한 항목(`name`, `dir`, `port`, `title`, `desc`, `accent` 등)을
추가하면 런처 카드·빌드·실행에 자동 반영됩니다.

## 참고 / 문제 해결

- **방화벽**: 첫 실행 시 macOS가 `node` 수신 연결 허용을 물으면 "허용"하세요. 차단되면 LAN 접속이 안 됩니다.
- **sail.local이 안 잡힐 때**: 일부 게스트/공용 WiFi는 기기 간 통신(AP isolation)을 막습니다.
  이 경우 맥의 LAN IP(예: `http://192.168.x.x:3000`)로 직접 접속하세요.
- **sea_nav**: 해도/날씨/AIS 타일을 원격에서 가져오므로 인터넷 연결이 필요합니다.
- **sailing_tactics**: `output: "export"`(정적 익스포트) 앱이라 `next start`가 없습니다.
  `npm run dev`는 `next dev`로 정상 동작하고, `npm start`(프로덕션)에서는 `npm run build`로
  만들어진 `out/`을 정적 서버(`scripts/serve-static.mjs`)로 띄웁니다. (Tauri 스크립트는 허브와 무관.)
- **포트 변경**: `apps.config.json`에서 `port`만 바꾸면 됩니다(앱 파일은 건드리지 않음).
