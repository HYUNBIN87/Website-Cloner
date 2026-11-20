# livemarket.pro — REA 분석 보고서

- 분석일: 2026-11-20
- 대상: `https://livemarket.pro` (운영자 본인 사이트)
- 방법: 헤드리스 Chrome(CDP) + REA `inspect_web_page` / `analyze_web_bundle`, 그리고 40개 라우트 HTML에서 참조된 `/_next/static/chunks/*.js` 247개를 내려받아 정적 분석
- REA Evidence ID
  - 페이지 검사: `ev_e759f4e0aed9e64111f348468ed2aa8c8f7115cc8bf88a974178c3be3d8fdb2c`
  - 번들 분석: `ev_8075e9bb0a483a5d8a284f5039267c7c9ae2e27cab298ba4c2148ae3a0726335`

> **근거 수준 표기** — **[관측]** 번들 코드나 브라우저에서 직접 확인함 / **[추론]** 코드 구조에서 유추함 / **[미확인]** 확인하지 못함.
> 이번 분석은 **로그인하지 않은 상태의 정적 분석**이 중심입니다. 실제 네트워크 요청·응답 본문은 캡처하지 않았습니다. CDP가 페이지 로드 *이후*에 붙어서 첫 화면의 네트워크 요청 0건이 기록됐습니다. 아래 §7 참고.

---

## 1. 프레임워크와 기술 스택

| 항목 | 내용 | 근거 |
|---|---|---|
| 프레임워크 | **Next.js App Router** (`/_next/static/chunks/app/**/page-*.js`, `layout`, `error`, `global-error`, `loading`). webpack 빌드이며 Turbopack이 아님 (`webpack-*.js`, `self.webpackChunk_N_E`) | [관측] REA vendor_fingerprint Next.js(high), React(medium) |
| UI | React, styled-components (`u.ZP.div.withConfig({componentId:"sc-…"})`), 일부 MUI 문자열 | [관측] |
| 데이터 페칭 | TanStack React Query (`useQuery`, `useMutation`, `invalidateQueries`, `refetchInterval`) | [관측] |
| 상태관리 | Zustand(`getState()`, persist 미들웨어 `tJ`/`mW`). localStorage 키: `theme-store`, `user-store` | [관측] |
| HTTP 클라이언트 | axios 래퍼 클래스(`instance.request({url,method,params,data,signal})`, 응답은 `.data`만 반환) | [관측] |
| 인증 | Firebase Auth SDK(`@firebase/app` 0.13.1, `@firebase/auth`), Kakao 로그인(`/api/auth/kakao/token` Next API route), 로그인 제공자 enum `firebase` / `kakao` / `paygent` | [관측] |
| 결제 | KCP(`/v1/payments/gateway/kcp/...`, 헤더 KCP media type `MOBILE`/`PC`), Paygent(`paygent.work`) | [관측] |
| 모니터링 | Sentry(브라우저 트레이싱 + Replay, sessionStorage `sentryReplaySession`, `sentry-trace`/`baggage` 헤더) | [관측] |
| 앱 래핑 | `window.ReactNativeWebView` 감지 → 플랫폼 헤더 `ios` / `android` / `web` | [관측] |
| i18n | 번역 네임스페이스 사용(`(0,R.T)("productWidget")`), 언어 헤더 | [관측] |

### 백엔드 오리진 (환경별 설정, `main-app` 청크의 모듈 1410, 2956)

| 용도 | production | development | local |
|---|---|---|---|
| 메인 REST API + SSE + 채팅 소켓 | `https://api.groo.pro` (`NEXT_PUBLIC_GROO_API_URL`로 덮어쓸 수 있음) | `https://api-dev.groo.pro` | `http://localhost:3000` |
| 라이브채팅 수집 서버(TikTok/YouTube) | `https://live-chat.groo.pro` | `https://live-chat-dev.groo.pro` | 동일(dev) |
| 스트림 서버 | `https://stream.groo.pro/live` | `https://dev.stream.groo.pro/live` | 동일(dev) |
| 파일 서버 | `https://file.groo.pro` | | |
| 결제(Paygent) | `https://paygent.work` | `https://dev.paygent.work` | `https://localhost:3000` |
| 프론트 도메인 | `livemarket.pro` | `dev.livemarket.pro` | `localhost:3000` |

번들에서 stage가 `"production"`으로 하드코딩되어 있습니다(`switch("production")`). [관측]

### 공통 요청 헤더 [관측]
REST 클라이언트(`L4`)는 `baseURL = getGrooAPIUrl()`이고, 다음 헤더를 붙입니다.
- `Authorization: Bearer <accessToken>` (토큰이 있을 때)
- 타임존 `Asia/Seoul`, 플랫폼(`web`/`ios`/`android`), 언어 코드, KCP 미디어 타입(`MOBILE`/`PC`)
- `Content-Type: application/json` (기본값)

헤더 *키 이름*은 상수(`WD.HeaderKey.*`)로 감싸져 있어 정확한 문자열은 확인하지 못했습니다. [미확인]

---

## 2. 페이지 라우트 구조

출처: `main-app` 청크의 라우트 상수 테이블(모듈 76883). 각 경로를 실제로 GET 요청해 매칭되는 `app/**/page-*.js` 청크를 확인했습니다. 모든 경로가 HTTP 200을 반환했습니다. [관측]

### 공개 및 구매자 영역
| 경로 | App Router 세그먼트 | 비고 |
|---|---|---|
| `/` | `app/page` | 랜딩 |
| `/about` | `app/about` | |
| `/auth/login` | `app/auth/login` | 구매자 로그인 |
| `/auth/seller-login` | `app/auth/seller-login` | 셀러 로그인 |
| `/auth/youtube/callback` | (상수만 확인함) | YouTube OAuth 콜백 |
| `/search` | `app/search` | 셀러/스토어 검색 |
| `/following` | `app/following` | 팔로우 중인 스토어의 라이브 |
| `/my` | `app/my` | 마이페이지(프로필, 주소, 쿠폰, 주문) |
| `/order/list` | `app/order/list` | 주문 목록 |
| `/order/[orderId]` | `app/order/[orderId]` | 주문 상세 |
| `/pre-order/[orderId]` | `app/pre-order/[orderId]` | 가주문(장바구니형 예약주문) 상세 |
| `/time-deal/[timeDealId]` | `app/time-deal/[timeDealId]` | 타임딜 |
| `/payment/method/register` | `app/payment/method/register` | 결제수단(자동결제 카드) 등록 |
| `/seller-application` | `app/seller-application` | 입점 신청 |
| `/live-chat/monitor` | `app/live-chat/monitor` | 라이브 채팅 모니터(셀러용) |
| `/lab`, `/lab/[category]`, `/lab/[category]/[id]`, `/lab/preview/[id]` | `app/lab/...` | 실험 기능 |
| `/labangmon` | `app/labangmon` | AI 상담("라방몬") |
| `/order` | **`app/[storeName]`로 매칭됨** | `/order` 전용 페이지가 없어서 `storeName="order"`인 스토어 페이지로 처리됨 [관측] |

### 스토어 영역 `/[storeName]/...`
| 경로 | 비고 |
|---|---|
| `/[storeName]` | 스토어 홈 / 판매 페이지 |
| `/[storeName]/profile-live` | 프로필 라이브(구매자 시청) |
| `/[storeName]/profile-live/room` | 라이브 룸 |
| `/[storeName]/profile-live/room/chat` | 라이브 룸 채팅 |
| `/[storeName]/guest-pre-order` | 비회원 가주문 |
| `/[storeName]/widget` | 방송 오버레이용 상품 위젯 |
| `/[storeName]/youtube-chat-collect` | YouTube 채팅 수집 |
| `/[storeName]/order/list` | 스토어별 주문 목록 |
| `/[storeName]/agreement/[id]` | 약관 문서 |

### 셀러 어드민 `/[storeName]/admin/...` (공통 `loading.js` 있음)
`admin`(대시보드), `account`, `order-search`(+`?streamId=`, `?timeDealId=`, `/manual-status`, `/edit`), `product`(+`/[id]`, `/copilot`), `live`(+`/[streamId]/studio`), `order`, `follower`, `banner`, `store-setting`, `notice`(+`/[id]`), `guide`, `quickstart`, `payment-link`, `store-hub`(+`/agreement/[id]`), `block`, `time-deal`(+`/create`, `/edit/[id]`), `coupon`, `address`, `deposit`(+`/quick-inquiry-guide?bank=`), `settlement`(+`?tab=cancel|info`, `/statements/[id]`), `order-chat`, `sms`, `youtube`, `kakao-signup`, `live-chat`(+`?tab=history`, `/history/[id]`), `settings`, `crypto/wallet`

---

## 3. REST API 카탈로그 (`https://api.groo.pro`)

번들의 서비스 클래스에서 `this.client.<method>("<path>", {params|body})` 호출을 추출했습니다. 결과는 약 240개 경로/메서드 조합입니다. [관측]
`params`는 쿼리스트링이고 `body`는 JSON 본문입니다. 경로 끝의 `/`는 뒤에 ID가 이어 붙는다는 뜻입니다(`"/v1/x/".concat(id)`).

> 요청 본문의 **필드 이름**은 대부분 호출부에서 `{body:t}`로 그대로 전달되어 정적으로는 알 수 없습니다. 필드를 확인한 경우만 따로 적었습니다.

### 3.1 사용자 / 인증
| Method | Path | 형태 |
|---|---|---|
| GET, DELETE | `v3/user` | 내 정보 조회, 탈퇴 |
| PATCH | `v3/user/profile` | body |
| POST | `v3/user/profile/nickname-generation` | |
| POST | `v3/user/profile/nickname-validation`, `username-validation` | body |
| GET | `v3/users/{id}`, `v3/users/username/{username}` | |
| GET | `v3/user/products` | params |
| POST, DELETE | `v3/user/blocks`, POST `block-many`, `unblock-many` | body |
| POST | `/api/auth/kakao/token` (Next.js 자체 API route, `livemarket.pro`) | Kakao 인가코드를 토큰으로 교환 |
| — | `/auth/sign-in`, `/auth/sign-up`, `/auth/sign-out`, `/auth/refresh` | 인증 경로 상수 [추론: 백엔드 인증 엔드포인트] |
| — | `v1/accounts`, `v2/accounts/mfa*`, `v1/token`, `v2/recaptchaConfig` | **Firebase Auth SDK 내부 호출**(identitytoolkit/securetoken). 앱 API가 아님 |

### 3.2 팔로우 / 스토어
| Method | Path |
|---|---|
| POST(body) / DELETE(params) | `v1/user/follows` |
| GET(params) | `v1/user/follows/check`, `/follower`, `/following` |
| GET | `v1/partner-store/view/home/{store}`, `v1/partner-store/view/check/{store}` |
| GET(params) | `v1/partner-store/search/seller`, `v1/partner-store/live/streams`, GET `.../streams/{id}` |
| GET / POST / PUT | `v1/partner-store/manage`, `v1/partner-store/manage/bank-transfer/connection` |
| GET / PUT | `v1/partner-store/registration`, PUT `/store-basic`, `/store-profile`, `/business-info`, `/account-info`, POST `/submit` |
| GET(params) / POST | `v1/partner-store/follows/followers`, `/count`, `/following`, POST `/followers/csv/download` |
| GET / POST | `v1/partner-store/marketing/profile-link`, `/sns` |
| PUT | `v1/partner-store/products/live/{id}`, `v1/partner-store/products/time-deal/{id}` |
| GET / PUT | `v1/storefront/settings`, GET `v1/storefront/view/{store}` |
| GET / POST | `v1/user/store-link-migration`, `/check` |

### 3.3 상품
`v1/products` (POST), `v1/products/{id}` (PATCH, DELETE), `/detail/{id}`, `/delete-many`, `/visible-many`, `/refresh`, `/download/csv`, `/excel/*` (템플릿 다운로드·업로드), `/options/{combinations|values}` (PATCH), `/options/replace`, `/live` (GET), `/live/{connect|disconnect|many|pin|unpin}` (POST), `/live/pinned`, `/seller`, `/seller/count`, `/seller/unconnected`, `/seller/pre-order/{metric|refresh}/{id}`, `/seller/sales/{connectable|connected|verify}` (GET), `/seller/sales/{connect-many|disconnect-many|copy}` (POST)

### 3.4 가주문(Pre-order): 구매 흐름의 핵심
| Method | Path | 비고 |
|---|---|---|
| POST | `v1/pre-orders/upsert` | 구매자 가주문 생성/수정. `{body}` [관측] |
| GET / PATCH / DELETE / PUT | `v1/pre-orders/{id}` | PATCH는 `{body}` |
| POST | `v1/pre-orders/{id}/cancel` | |
| GET | `v1/pre-orders/detail/{id}` | `signal` 지원 |
| GET(params) | `v1/pre-orders`, `/unpaid`, `/guest`, `/items/search`, `/deposits/available`, `/sales/metric`, `/events` |
| POST / PUT | `/items/{change-option|delete-many}`, PUT `/items/update-many` |
| GET / POST | `v1/pre-orders/coupons/{id}` |
| POST / PATCH | `/deposits/verification/request`, `/request/image`, PATCH `/approve`, `/reject` | 무통장 입금 확인 |
| 셀러 | `/seller` (GET), `/seller/{id}` (PATCH/POST/PUT), `/seller/upsert`, `/upsert-items`, `/upsert-manual-items`, `/seller/items/all`, `/seller/status-counts`, `/seller/manual/expires-at` |
| POST | `/messaging/{id}`, `/messaging/kakao/searched`, `/download` |

### 3.5 타임딜
`v1/time-deals` (GET/POST), `/{id}` (PATCH/DELETE), `/detail/{id}`, `/is-public/{id}`, `/by-product`, `/live`, `/live/summary`, `/live/redirect-check`, `/pinned`, `/pickups`, `/product-summary`, `/products`, `/products/count`, `/products/pinned`, `/products/{pin|unpin|check-product-code}` (POST), `/products/{update|update-many|update-visibility}` (PATCH), `/pre-orders/upsert` (POST, 구매자), `/pre-orders/unpaid`, `/pre-orders/{id}` (PATCH, 배송방식), `/replay/timeline`, `/messaging/{id}`, `/seller`, `/seller/latest`, `/seller/live/{start|end}`, `/seller/{pin|unpin}`, `/seller/order-type/{enable|disable}`

### 3.6 주문 / 배송 / 결제
- 주문: `v1/orders/{id}` (PATCH/POST), `/detail/{id}`, `/items/{id}`, `/items/update-many`, `/cancel/many`, `/search` (+`/amount-analytics`), `/download`, `/download/pdf`, `/history`, `/messaging/{id}`, `/filter/{nicknames|orderer-names|orderer-phone-numbers|recipient-names|recipient-phone-numbers|streams|time-deals}`, `/filter/{streams|time-deals}/verify`, `/seller`, `/seller/{id}`, `/seller/export`, `/seller/csv/download`, `/seller/manual/status` (+`/searched`), `/seller/shipping/images/{id}`
- 배송: `v1/shipping/invoice` (POST), `/invoice/{id}` (PUT), `/invoice/excel/{template|upload}`
- 결제 체크아웃: `v1/payments/checkout/pre-order/{id}` (GET/POST), `/{id}/revalidate`, `/pre-order/{standard-pay|free}`, `/order-sheet/{auto-pay|standard-pay|free}` (모두 POST, `{body}`)
- PG: `v1/payments/gateway/kcp/script/{standard-pay|auto-pay}` (POST), `/kcp/card/no-interest/{json|text}`
- 결제수단: `v1/payments/methods` (GET/POST), `/{id}` (DELETE), `/detail/{id}`, `/primary` (GET/PUT)
- 주소: `v1/address/customer` (+`/primary`, `/detail/{id}`), `v1/address/seller` (+`/available/{id}`)
- 쿠폰: `v1/coupons` (+`/detail`, `/available`, `/placements`, `/placements/revoke`, `/customer/placements`, `/sales/{connectable|connected|connect-many|customer/available}`)
- 입금 내역: `v1/bank-account/transactions` (GET), `/delete-many`

### 3.7 셀러 / 라이브 / 기타
- 셀러: `v1/sellers/metadata`, `/business-profile`, `/settlement-account`, `/phone-numbers`, `/crypto/wallet-address`, `/customers/{search|search/all|records|statistics/new/daily-count}`, `/payments/{daily|buyer/statistics}`, `/kakao/oauth` (+`/secret`), `/view/kakao-oauth`, `/configuration/announcement`, `/view/announcement`, `/sms`, `/sms/detail`, `/sms/send`, `/youtube/{auth-url|callback|connection}`
- 구매자: `v1/customers/{metadata|verify-codes|verify-codes/issue|pre-orders/has-paid|pre-orders/is-first}`
- 라이브: `v1/live/streams` (+`/{id}` GET/PATCH/DELETE, `/messaging/{id}`), `v1/live/broadcasts` (+`/{id}`, `/replays`), `v1/live/orders`, `v1/tiktok/live/status`, `v1/youtube/live/status`, `v1/youtube/live-chat/disconnect`
- 라이브채팅 관리: `v1/live-chat/messages/{paginate|generate|send|download/excel}` (POST, body), `v1/live-chat/seller/{configuration|configuration/message-templates|registry|registry/all}`, `v1/live-chat/collection/{tiktok|youtube}/{start|stop|status}` (이 그룹의 host는 `live-chat.groo.pro`)
- 업로드: `v1/image/upload/…`, `v1/images/upload/…` (POST, multipart로 추정)

### 3.8 확인된 페이로드 형태
| 대상 | 형태 | 근거 |
|---|---|---|
| 라이브 룸 채팅 전송 `POST v1/chat/channels/live/{channelId}/messages` | `{ message: string }`. 클라이언트가 10,000자로 자름 | [관측] |
| 채팅 메시지 객체 | `{ id, sentAt(ISO→Date), ... }`. 최대 200개를 유지하며 `id` 기준으로 중복 제거 | [관측] |
| 채팅 이벤트 메시지 | `{ eventType, sentAt, ... }`. `eventType === USER_BLOCK`이면 차단 처리 | [관측] |
| 가주문 SSE 이벤트 | `{ event: { type }, productIds: number[], nickname?: string, cancelablePreOrderItem?, maxPreOrderItemCancelCount? }` | [관측] §4.2 |
| 위젯 SSE(`LOTTERY_ROUND`) | `{ eventType, roundId, sourceId, ... }` | [관측] |
| SMS SSE | `{ type: "SMS_LIST" \| "SMS_DETAIL", data: { customerPhoneNumber \| id, ... } }` | [관측] |
| 응답 | axios `response.data`를 그대로 반환하며, envelope 래핑 여부는 [미확인] | |

---

## 4. 실시간 통신

정리하면 **구매/주문 알림은 SSE(Server-Sent Events)로, 라이브 룸 채팅은 Socket.IO(WebSocket)로 옵니다.** 셀러용 통합 채팅 모니터는 별도 SSE를 씁니다.

### 4.1 SSE 공통 구현 [관측]
- 라이브러리: `event-source-polyfill` 계열의 `EventSourcePolyfill`. 네이티브 `EventSource`와 달리 헤더를 붙일 수 있습니다.
- URL: `getGrooAPIUrl() + path` → `https://api.groo.pro/v1/sse/...`
- 인증: `headers: { Authorization: "Bearer <accessToken>" }` (토큰이 있을 때만)
- 요청 헤더 `Accept: text/event-stream`
- 재연결: 커스텀 훅 두 종류가 있습니다.
  - `iX` (단순형): `message` 이벤트를 받아 `JSON.parse(e.data)` 후 콜백을 호출합니다. 15초 안에 연결되지 않으면 error로 처리합니다. `maxSilentReconnect` 기본값은 3회이고, 끊기면 1초 뒤 재접속합니다.
  - `j` (고급형): `eventNames`로 이름 있는 이벤트를 구독합니다. 재시도 횟수를 넘기면 `recoveryIntervalMs`(기본 60초)마다 복구를 시도하고, `connectTimeoutMs`가 있습니다. 상태는 `connecting / connected / reconnecting / error / disconnected`입니다.

### 4.2 SSE 엔드포인트 목록 (모듈 6018)
| 경로 | 용도 | 이벤트 / 처리 |
|---|---|---|
| `/v1/sse/pre-orders/events/streams/{streamId}` | **라이브 방송 구매 알림** | 기본 `message`. `event.type ∈ {ITEM_UPSERTED, ITEM_DELETED, PAYMENT_COMPLETED, CANCEL_CHANCE_UPDATED}` |
| `/v1/sse/pre-orders/events/time-deals/{timeDealId}` | **타임딜 구매 알림** | 위와 같음 |
| `/v1/sse/time-deals/{id}/products` | 타임딜 상품 변경 | |
| `/v1/sse/widgets/{storeName}/events` | 방송 오버레이 위젯 | 이름 있는 이벤트 `LOTTERY_ROUND` |
| `/v1/sse/order-chat/events?timeDealId={id}` | 셀러 주문채팅 화면 갱신 | 이름 있는 이벤트 `PRE_ORDER`, `BANK_ACCOUNT_TRANSACTION`, `TIME_DEAL_PRODUCT` |
| `/v1/sse/sellers/bank-account/transactions/events` | 입금 내역 실시간 반영 | |
| `/v1/sse/sellers/sms/events/subscribe[?phoneNumbers=a,b]` | 셀러 SMS 수신함 | `SMS_LIST`, `SMS_DETAIL` (이름 있는 이벤트와 `message.type` 둘 다 처리) |
| `/v1/sse/live-chat/messages?liveIds=a,b` (**host: `live-chat.groo.pro`**) | 통합 라이브채팅 모니터(TikTok/YouTube/Instagram/Band 수집분) | `message`. `message.live.platform`별로 카운트하며 지수 백오프로 재연결 |

### 4.3 구매 알림 흐름 [관측]
1. 구매자가 `POST /v1/pre-orders/upsert`(라이브) 또는 `POST /v1/time-deals/pre-orders/upsert`(타임딜)로 담거나 주문하고, 결제는 `/v1/payments/checkout/...`로 진행합니다.
2. 서버가 해당 스트림/타임딜 SSE 채널로 `{ event:{type:"ITEM_UPSERTED"|"PAYMENT_COMPLETED"|…}, productIds:[…], nickname }`을 푸시합니다.
3. 클라이언트 처리
   - **구매자 라이브/타임딜 화면**(`StoreAdminProductPreOrderEventContainer`, `ProfileLiveTimeDealContent`): 피드 알림("○○님이 구매")을 표시합니다. `ITEM_UPSERTED`이면 `extractOrderConfirm`으로 `{productIds, nickname}`을 뽑고, 첫 상품을 `getProductDetail`로 조회해 상품 카드를 갱신합니다.
   - `CANCEL_CHANCE_UPDATED`이면 취소 가능 상태(store `updateCancelChance`)를 갱신합니다.
   - **셀러 라이브 관리 화면**: `ITEM_UPSERTED`/`PAYMENT_COMPLETED`이면 상품별 신규 주문 수를 모아 500ms 디바운스로 `recordNewOrders({counts})`를 호출하고, 5초 디바운스로 `USER_PRODUCT_LIST` 쿼리를 무효화합니다.
   - **셀러 주문채팅**: 이벤트 종류별로 1초 디바운스 refetch를 합니다.

### 4.4 라이브 룸 채팅 (Socket.IO) [관측]
- 연결 URL: `getGrooAPIUrl() + "/v1/chat"` → `https://api.groo.pro/v1/chat` (Socket.IO 네임스페이스 `/v1/chat`)
- 옵션: `{ auth: { token: accessToken }, query: { channelId }, transports: ["websocket","polling"], autoConnect: false }`. 게스트는 token 없이 접속합니다.
- 서버 → 클라이언트 이벤트
  - `connect` / `disconnect` / `connect_error` / `error`
  - `wait`: 대기열 상태(`onWait`)
  - `ready`: 입장 완료. 이후 히스토리를 refetch합니다.
  - `messageReceived-{channelId}`[추론: `eventMessageReceived-{channelId}`와 같은 생성 규칙]: 일반 채팅입니다. 200ms 단위로 묶어서 반영합니다.
  - `eventMessageReceived-{channelId}`: 시스템/이벤트 메시지입니다. `USER_BLOCK` 이벤트이면 차단 콜백을 호출합니다.
- 토큰 만료: 에러 `code === AUTH_INVALID_TOKEN`이면 토큰을 갱신한 뒤 재연결합니다. 갱신에 실패하면 shutdown합니다.
- 보조 REST(같은 host)
  - `PUT v1/chat/channels/live/{channelId}/join` (회원) 또는 `PUT .../guest/{channelId}/join` (게스트). 입장한 뒤 소켓을 엽니다.
  - `GET .../{channelId}/messages`: 히스토리입니다. React Query `@live_chat_room_messages`, 창 포커스 시 refetch합니다.
  - `POST .../{channelId}/messages`: 전송, body `{message}`
  - `GET .../{channelId}/watching-count`: 시청자 수
- 메시지 송신은 **REST POST**이고 수신만 소켓입니다. 보낸 메시지는 응답으로 받아 즉시 로컬에 추가합니다.

### 4.5 기타 실시간 채널
- **TikTok 라이브 채팅 수집 소켓**(셀러 `/live-chat/monitor`): `io("https://live-chat.groo.pro/socket/tiktok/live-chat", { query:{username, sellerId}, transports:["websocket"], reconnection:false })`. 이벤트 `SESSION`, `PUPPETEER_STATUS`, `PUPPETEER_RECONNECT` 등이 있습니다. 서버 측 Puppeteer 수집기를 제어합니다.
- **폴링**: AI 상담(라방몬) 대화는 `refetchInterval`이 상태에 따라 2초, 5초, 60초로 바뀌고, 타임딜 상품 목록은 주기적으로 refetch(`PRODUCT_LIST_REFRESH_INTERVAL_SECONDS`)하며, 라이브 통계는 `refetchInterval`로 갱신합니다.

---

## 5. 페이지별 API 사용

App Router 페이지 청크에 서비스 모듈이 통째로 인라인되어 있어서, "청크에 포함된 엔드포인트"가 곧 "그 페이지가 호출하는 엔드포인트"라고 할 수는 없습니다. 아래 표는 **청크에 포함된 서비스 도메인과 실시간 채널**을 기준으로 정리했습니다. [관측, 호출 여부는 추론]

| 페이지 | 주요 REST 도메인 | 실시간 |
|---|---|---|
| `/` | 공통 레이아웃: `v3/user`, follows, partner-store, orders(필터) | — |
| `/auth/login` | `v1/storefront/{settings,view}`, `v1/sellers/{configuration,view}/announcement`, `/api/auth/kakao/token`, Firebase Auth | — |
| `/search`, `/seller-application` | `v1/partner-store/*` (search, registration), `v3/user/products` | — |
| `/following` | `v1/partner-store/live/streams/{id}`, follows | — |
| `/my` | `v3/user/profile*`, `v1/address/customer*`, `v1/coupons*`, `v1/pre-orders*` | — |
| `/payment/method/register` | `v1/payments/methods*` | — |
| `/[storeName]` (스토어 홈/판매) | `v1/storefront/*`, `v1/pre-orders*`, `v1/payments/checkout/*`, `v1/orders/history`, `v1/address/customer*` | Socket.IO `/v1/chat` |
| `/[storeName]/profile-live[/room[/chat]]` | `v1/chat/channels/live/*`, `v1/time-deals/*`, `v1/products/detail` | Socket.IO 채팅 + SSE `pre-orders/events/{streams|time-deals}` |
| `/time-deal/[id]` | `v1/time-deals/*`, `v1/time-deals/pre-orders/*` | SSE `pre-orders/events/time-deals/{id}`, `sse/time-deals/{id}/products` |
| `/[storeName]/widget` | `v1/time-deals/products` (주기적 refetch) | SSE `widgets/{store}/events` (`LOTTERY_ROUND`) + 타임딜 구매 SSE |
| `/[storeName]/admin` (+store-setting) | `v1/partner-store/*`, `v1/sellers/*`, `v3/user` | — |
| `/[storeName]/admin/order`, `order-search` | `v1/orders/*`, 이미지 업로드 | — |
| `/[storeName]/admin/live`, `live/[streamId]/studio` | `v1/live/streams*`, `v1/products/live*`, `v1/orders/*` | SSE `pre-orders/events/streams/{id}` (신규 주문 카운트) |
| `/[storeName]/admin/order-chat` | `v1/sellers/customers/*`, `v1/pre-orders/*` | SSE `order-chat/events`, `pre-orders/events/streams` |
| `/[storeName]/admin/deposit` | `v1/bank-account/transactions*`, `v1/pre-orders/deposits/verification/*` | SSE `sellers/bank-account/transactions/events` |
| `/[storeName]/admin/sms` | `v1/sellers/sms*`, `v1/sellers/phone-numbers` | SSE `sellers/sms/events/subscribe` |
| `/[storeName]/admin/live-chat`, `/live-chat/monitor` | `live-chat.groo.pro`: `v1/live-chat/*`, collection start/stop | SSE `live-chat/messages?liveIds=` + TikTok Socket.IO |
| `/[storeName]/admin/time-deal*`, `product*`, `payment-link` | `v1/time-deals/*`, `v1/products/*` | 타임딜 구매 SSE |
| `/[storeName]/admin/settlement` | `v1/sellers/payments/*`, `v1/sellers/settlement-account` | — |

---

## 6. 스토리지 / 기타 관찰 [관측]
- localStorage 키: `theme-store`, `user-store` (Zustand persist). 값은 수집하지 않음
- sessionStorage 키: `main_thread_stall_beat`, `sentryReplaySession`
- 쿠키 경로 상수 `/__cookies__`, 쿠키 도메인 `.livemarket.pro` (prod/dev)
- 지원 채널 enum: `instagram`, `youtube`, `tiktok`, `band`
- 알림 템플릿 타입(카카오 알림톡으로 추정): `LIVE_MARKET_PURCHASE_PRODCUT`(원문 오타 그대로), `PREORDER`, `PREORDER_UPDATE`, `PREORDER_REMIND`, `PREORDER_DEPOSIT_MATCH`, `TIME_DEAL_OPEN`, `SHIPPING_START`, `SHIPPING_PRODUCT_PHOTO`
- 소스맵: 공개되지 않음(요청 0건 처리)

---

## 7. 한계와 미확인 항목
1. **런타임 캡처 없음**: CDP가 페이지 로드 후에 붙어 실제 요청과 응답 본문, SSE/WebSocket 프레임을 관측하지 못했습니다. 응답 JSON 스키마와 SSE 페이로드의 나머지 필드는 [미확인]입니다. 로그인한 브라우저를 `--remote-debugging-port`로 띄운 뒤 REA `observe_web_session`이나 `capture_browser_scenario`(allowed_origins에 `https://api.groo.pro`, `https://live-chat.groo.pro` 포함)로 라이브 페이지를 보면 실제 프레임 형태를 확인할 수 있습니다.
2. REA 번들 분석에서 대형 청크 1개가 스크립트별 분석 제한 시간(30초)을 넘어 REA AST 분석이 누락됐습니다. 해당 청크도 직접 grep으로 보완했습니다.
3. 엔드포인트 추출은 정규식 기반입니다. 경로를 변수로 동적으로 조합하는 경우(예: `"".concat(base, id)`)는 일부 빠졌을 수 있습니다.
4. 요청 body의 필드 이름은 대부분 호출부에서 객체를 그대로 넘기기 때문에 정적으로 확정할 수 없습니다. TypeScript 원본 저장소가 있으면 그쪽이 정확합니다.
5. `/auth/sign-in` 등 인증 경로 상수의 host(Next API route인지 groo API인지)는 [미확인]입니다.
