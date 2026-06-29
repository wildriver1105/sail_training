# Sail Training Hub

`boat_drive`, `trimmer`, `knots`, `sea_nav`, `sailing_tactics` 5개의 독립 Next.js 세일링 앱을
한 곳에서 실행하고, mDNS(`sail.local`)로 같은 WiFi의 다른 기기에서도 접속할 수 있게 해주는 허브입니다.

각 앱은 **자기 포트에서 독립적으로** 실행되고, 허브는 (1) 런처 페이지(:3000), (2) `sail.local`
mDNS 광고, (3) 한 터미널에서 전체 클론/빌드/실행 오케스트레이션을 담당합니다.

| 앱 | 포트 | 설명 |
|----|------|------|
| 런처(허브) | 3000 | 앱 목록 카드 페이지 |
| boat_drive | 3001 | 보트 조종 시뮬레이터 |
| trimmer | 3002 | 세일 트림 시뮬레이터 |
| knots | 3003 | 3D 매듭 학습 (`/api/knots` 포함) |
| sea_nav | 3004 | 해도 내비게이션 |
| sailing_tactics | 3005 | 칠판 스타일 전술 보드 (정적 익스포트) |

> 각 앱 디렉토리는 각자 독립 GitHub repo이며, 이 허브의 git에서는 `.gitignore`로 제외됩니다.
> 따라서 **이 허브만 클론하면 앱 폴더는 비어 있습니다.** 아래 `npm run clone`으로 5개 앱을
> 채운 뒤 실행하세요.

## 새 기기에 클론해서 실행하기

처음부터 끝까지, 새 기기에서 이 4단계면 됩니다:

```bash
git clone https://github.com/wildriver1105/sail_training.git
cd sail_training

npm install          # 허브 의존성 (concurrently, multicast-dns)
npm run clone        # 5개 앱을 각자 GitHub repo에서 이 폴더로 클론 (apps.config.json 기반)
npm run setup        # 5개 앱 각각 npm install (이미 설치돼 있으면 건너뜀)

# 개발 모드 — 한 터미널에서 전부 실행 (핫리로드)
npm run dev

# 또는 프로덕션 — 먼저 일괄 빌드 후 실행 (다중 접속에 빠르고 안정적)
npm run build
npm start
```

실행 후:

- 이 기기에서: <http://localhost:3000>
- 같은 WiFi의 다른 기기에서: <http://sail.local:3000> (네트워크에 따라 다름 — 아래 "네트워크와 mDNS" 참고)

런처에서 카드를 누르면 현재 접속한 호스트명 기준으로 각 앱(`:3001`~`:3005`)으로 이동합니다.

> 사전 요구: Node.js(>=18 권장)와 git. sub-app repo가 비공개라면 해당 기기에 git 인증이 필요합니다.

## 스크립트

| 명령 | 동작 |
|------|------|
| `npm run clone` | 5개 앱을 각자 GitHub repo에서 클론 (이미 있으면 건너뜀) |
| `npm run setup` | 각 앱에서 `npm install` (`-- --force`로 강제 재설치) |
| `npm run build` | 5개 앱 `next build` 일괄 |
| `npm run dev` | 5개 앱 `next dev` + 런처 + mDNS 동시 실행 |
| `npm start` | 5개 앱 `next start`(빌드본) + 런처 + mDNS 동시 실행 |
| `npm run stop` | 허브가 띄운 프로세스(런처·mDNS·앱) 일괄 종료 |
| `sudo npm run forward` | 포트 80 → 3000 리다이렉트 (포트 없이 `http://sail.local` 접속용) |

포그라운드로 실행했다면 Ctrl+C 한 번으로 모두 종료됩니다. 백그라운드로 띄웠거나
다른 터미널에서 정리하려면 **`npm run stop`** 을 쓰세요(설정 포트의 리스너와 허브
스크립트만 종료하며, `--dry-run`으로 무엇을 멈출지 미리 확인할 수 있습니다).

### 포트 없이 `http://sail.local`로 접속하기 (선택)

기본 접속 주소에는 포트가 붙습니다(`http://sail.local:3000`). 포트를 생략하고 싶으면
**별도 터미널**에서 80→3000 리다이렉터를 띄웁니다. 80번은 특권 포트라 `sudo`가 필요합니다:

```bash
sudo npm run forward      # 이 터미널은 켜둔 채로. 끄려면 Ctrl+C.
```

그러면 `http://sail.local`(또는 `http://192.168.55.19`)이 자동으로 `:3000`으로 넘어갑니다.
경로도 유지되어 `http://sail.local/knots` → `:3000/knots`로 갑니다.

> 참고 1: 리다이렉터는 "포트 생략" 문제만 해결합니다. 일부 네트워크가 `.local`을 가로채
> 엉뚱한 IP로 보내는 문제는 별개라, 가장 확실한 건 여전히 **LAN IP 직접 접속**
> (`http://192.168.55.19` — 리다이렉터가 떠 있으면 포트도 생략 가능)입니다.
> 참고 2: `sudo`로 떠서 `npm run stop`으로는 안 꺼집니다. 해당 터미널에서 Ctrl+C 하세요.

### 특정 앱 제외

특정 앱만 빼고 실행하려면 `--skip`을 씁니다(예: 다른 곳에서 이미 knots를 띄운 경우):

```bash
npm run dev -- --skip=knots
```

## 앱 추가하기

`apps.config.json`의 `apps` 배열에 한 항목(`name`, `dir`, `port`, `title`, `desc`, `accent` 등)을
추가하면 런처 카드·빌드·실행에 자동 반영됩니다.

## 참고 / 문제 해결

- **방화벽**: 첫 실행 시 OS가 `node` 수신 연결 허용을 물으면 "허용"하세요. 차단되면 LAN 접속이 안 됩니다.
- **sail.local이 안 잡힐 때**: 아래 "네트워크와 sail.local (mDNS)" 섹션 참고. 가장 확실한 폴백은
  호스트 기기의 **LAN IP 직접 접속**(예: `http://192.168.x.x:3000`)입니다.
- **sea_nav**: 해도/날씨/AIS 타일을 원격에서 가져오므로 인터넷 연결이 필요합니다.
- **sailing_tactics**: `output: "export"`(정적 익스포트) 앱이라 `next start`가 없습니다.
  `npm run dev`는 `next dev`로 정상 동작하고, `npm start`(프로덕션)에서는 `npm run build`로
  만들어진 `out/`을 정적 서버(`scripts/serve-static.mjs`)로 띄웁니다. (Tauri 스크립트는 허브와 무관.)
- **포트 변경**: `apps.config.json`에서 `port`만 바꾸면 됩니다(앱 파일은 건드리지 않음).

## 네트워크와 sail.local (mDNS)

`sail.local`은 **mDNS**(멀티캐스트 DNS, Bonjour/avahi와 같은 것)로 광고됩니다. mDNS는 정의상
`.local` 도메인 전용이며, 같은 WiFi 안에서만 동작하는 link-local 방식입니다(ISP/인터넷과 무관).
빅트론 기기의 `venus.local`이 모든 기기에서 잡히는 것과 **정확히 같은 원리**입니다 — 공유기를
따로 설정한 게 아니라, 기기가 자기 이름을 mDNS로 광고하고 깨끗한 네트워크가 그걸 받는 것입니다.

**핵심: 깨끗한 네트워크에서는 `sail.local`이 별도 설정 없이 잡힙니다.**
(`venus.local`이 되는 그 네트워크라면 `sail.local`도 거의 확실히 됩니다.)

다만 **일부 네트워크는 `.local`을 유니캐스트 DNS로 가로채서**(특히 일부 ISP 망: DHCP가
`domain: local` + ISP 네임서버를 내려보내는 경우) `sail.local`을 엉뚱한 IP로 응답합니다.
이런 망에서는 mDNS 이름이 불안정하니 아래 중 하나를 쓰세요:

1. **LAN IP 직접 접속** — `http://<호스트 LAN IP>:3000`. 어떤 망에서도 가장 확실. 런처 페이지
   하단에 이 주소가 자동 표시됩니다.
2. **호스트 기기 이름 자체를 `sail`로 설정** (가장 venus.local에 가까운 방법). 그러면 그 기기의
   OS(Bonjour/avahi)가 `sail.local`을 **권한 있게** 광고합니다.
   - 리눅스: `sudo hostnamectl set-hostname sail`
   - macOS: `sudo scutil --set LocalHostName sail`
   - 이렇게 OS가 `sail.local`을 직접 소유하면, 허브의 **커스텀 mDNS 응답기는 불필요**하며 충돌을
     피하기 위해 빼는 게 좋습니다 → `npm run dev`/`start` 시 `run-all`에서 mDNS 제외가 필요하면
     알려주세요(현재는 항상 함께 띄웁니다).
3. **공유기에 로컬 DNS 등록** — 공유기 관리자에서 호스트 기기를 고정 IP로 예약하고 이름→IP
   항목을 추가하면, `.local` 없이 원하는 이름(예: `http://sail:3000`)으로 모든 기기에서 접속됩니다.

> 요약: 이번 개발 맥에서 막혔던 건 그 WiFi(ISP 망)가 `.local`을 가로채기 때문이고, 코드 문제가
> 아닙니다. 실제 호스팅 기기를 `venus.local`이 되던 네트워크에 두면 `sail.local`도 동작할 것이며,
> 가장 견고하게 하려면 **그 기기의 호스트명을 `sail`로** 잡으세요.
