# livemarket.pro clone: page brief

Captured 2026-11-20 with headless Chrome (CDP) at 390×844 (mobile UA) and 1440×900, plus 768 and 1920 width sweeps.
Source screenshots and side-by-side comparisons are in `docs/design-references/livemarket/`.

## Route map

| Source | Local | Owner |
|---|---|---|
| `https://livemarket.pro/` | `/` | `src/app/page.tsx` → `src/components/sites/livemarket/home/LivemarketHome.tsx` |
| `https://livemarket.pro/nandapick/profile-live` | `/nandapick/profile-live` | `src/app/nandapick/profile-live/page.tsx` → `src/components/sites/livemarket/live/ProfileLive.tsx` |
| `https://livemarket.pro/nandapick` (client redirect) | `/nandapick` → 307 to `/nandapick/profile-live` | `next.config.ts` redirects |
| `https://livemarket.pro/nandapick/profile-live/room` | `/nandapick/profile-live/room` | `room/LiveRoom.tsx`, plus `RoomOnboarding.tsx`, `RoomProductSheet.tsx`, `StoreVisitModal.tsx` |
| `https://livemarket.pro/following` | `/following` | `pages/FollowingPage.tsx` (inside the shared shell) |
| `https://livemarket.pro/order/list` | `/order/list` | `pages/OrderListPage.tsx` |
| `https://livemarket.pro/my` (logged out → `/auth/login?previousPath=%2Fmy&entryPoint=default`) | `/my` (demo login: profile page; logged out: client redirect to `/auth/login?previousPath=%2Fmy…`) | `src/app/my/page.tsx` → `pages/MyPage.tsx`; login at `src/app/auth/login/page.tsx` → `pages/LoginPage.tsx` |

`/following`, `/order/list` and `/my` exist in two states:
- **Logged out** (anonymous visitor): `/following` shows an empty state, `/order/list` shows a login prompt on both tabs, and `/my` redirects to the login page.
- **Logged in**: observed on 2026-11-20 in the operator's own logged-in Chrome (read-only: page loads, tab switches, opening the address/coupon sheets and the logout confirm; nothing was saved or submitted). The clone renders these screens with a **demo session** and fake data only.

Demo session (clone-only, not on the source):
- `/auth/login` has an extra "데모 계정으로 둘러보기 (가짜 데이터)" link under the Kakao button. It stores `livemarket-clone-demo-session` in localStorage and returns to `previousPath`.
- `/my` → 로그아웃 → confirm clears it and goes to `/`.
- `data/demo-session.ts` holds the store (`useSyncExternalStore`; `undefined` while unknown so nothing flashes or redirects during hydration). `data/demo-account.ts` holds all fake values.

Shared files:
- `src/components/sites/livemarket/shell/PlatformShell.tsx` + `shell.module.css`: header and footer, shared by `/` and `/following`
- `src/components/sites/livemarket/shell/BottomTabBar.tsx`: client tab bar. 내 정보 links to `/auth/login` when logged out and to `/my` with a 24px avatar (1.33px `#828d86` ring) with the demo session, as on the source
- `src/components/sites/livemarket/data/routes.ts`: local routes vs. source-only routes. Gated actions go to the local `/auth/login?previousPath=…`. Kakao OAuth itself continues on the source.
- `src/app/layout.tsx`: root layout, `lang="ko"`, fonts
- `src/components/sites/livemarket/fonts.ts`: self-hosted Pretendard 400–700 and GmarketSans (Bold file = weight 500, Medium file = weight 400, as in the source)
- `src/components/sites/livemarket/base.css`: global rules from the source's stylesheet (`font-synthesis: none`, 150% line height, resets); the profile-live page switches the body to black via `:has([data-lm-theme="dark"])`
- `src/components/sites/livemarket/Icon.tsx`: renders extracted SVGs from `public/sites/livemarket/svg/`

## Layout rules (both pages)
- Single 500px column centered at every width (`max-width: 500px; margin: 0 auto`). This is the same at 390, 768, 1440 and 1920.
- Fonts: Pretendard for body text, GmarketSans for the header titles. Weight 800 text (LIVE, 비밀 라이브방 입장, 공지) renders with the 700 file because `font-synthesis: none`.
- Text uses `word-break: keep-all`.

### Home `/`
- Header: 56px, white, border-bottom `#dcdcdc`, padding 0 14px. Sticky.
- Main: `min-height: 100dvh - 56 - 80`. The hero block is vertically centered with auto margins.
- Seller search: exact-name match.
  - Match: shows the seller card (112px halo, 84px avatar, `livemarket.pro/<slug>`, follower count, navy "스토어 들어가기" button).
  - No match: shows the "'X' 셀러를 못 찾았어요" state.
  - Clear (×) button appears when the field has text.
- "by 라이브마켓 - 개설문의" opens `https://business.livemarket.pro/` in a new tab.
- Bottom tab bar: fixed, 75px, radius 20px 20px 0 0, border `#eff1f1`, 5 tabs. The active tab has a pill background `#e6f9f3`.
- Footer: `#f0fdf4`, padding 28/20/120. Its first link grid sits behind the fixed tab bar on load, as on the source.

### Profile live `/nandapick/profile-live`
- Header: 56px, black. It is **not sticky** in practice, because the source puts it inside an `overflow: auto` `<main>`.
- Player: 9:16 box, max 304px wide, radius 12. The source embeds the seller's YouTube live, sized height 100% × 16/9 width and center-cropped. The clone shows a "LIVE 영상 영역" placeholder unless a video ID is set in `data/live-video.ts` (or `NEXT_PUBLIC_LIVEMARKET_YOUTUBE_VIDEO_ID`).
  - Overlay: white LIVE pill and the "비밀 라이브방 입장" CTA.
  - CTA icon: spins and pulses (`2.4s`) while 4 icons swap with `steps(1)` at 0.3s offsets.
- Side column: 144px wide, shrinks to 141px.
  - 4 social circles with a 2px `#e53935` border and two ripple rings (`::before`/`::after`, 2s, second ring delayed 0.7s).
  - Navy 소개글 / 고객센터 buttons and a dark 주문내역 button.
  - At ≤390px the button text drops to 11px and the buttons are 36px tall.
- Notice card: clamped to 3 lines, followed by "(...더보기)".
- Green "상품을 주문서에 담아주세요!" banner, then the product search field and the 길게보기 toggle.
- Product grid: 2 columns, gap 16.
  - Cards: `#1e1e1e`, radius 12, padding 16, entry animation 0.45s.
  - Pinned card: green glow pulse (2.6s) plus a 📌 drop-and-wiggle.
  - "곧 품절!" badge; stock text in red above the price.
- 길게보기: list rows with an 88px thumbnail. The toggle label changes to "사진크게".
- Fixed follow prompt: `#222` panel. Its heading color is `rgb(30,30,30)`, which is barely visible on the source too.

## Interactions (trigger → result)

| Trigger | Source | Clone |
|---|---|---|
| Home: type a seller name | Calls the API and shows the match or the not-found state | Matches locally against `data/sellers.ts` (fake seller 데모샵 only) |
| Home: 스토어 들어가기 | `/nandapick` → profile-live | Same (local redirect) |
| 공지 card / 소개글 | Bottom sheet (overlay `rgba(0,0,0,.4)`) | Same, `BottomSheet.tsx` |
| N:NN:NN 다시보기 | Bottom sheet with a YouTube clip from that timestamp, a mute prompt, and 주문서 담기 | Same; clip uses `start`/`end=start+180` |
| 상품 검색 | Filters products | Filters by name |
| 길게보기 / 사진크게 | Toggles the grid/list layout | Same |
| 단골 맺기, 로그인, 주문내역, 주문서 담기 | Redirect to `/auth/login?previousPath=…` | Local `/auth/login?previousPath=…` (Kakao button continues on the source) |
| 비밀 라이브방 입장 | `/nandapick/profile-live/room` | Local room |
| Header 검색, 셀러홈, 라방시작 tab | Source routes | Link to the **source** (out of scope) |
| Tabs 라이브마켓 / 내 단골가게 / 주문내역 / 내 정보 | `/`, `/following`, `/order/list`, `/auth/login` | Local routes |
| Order list: 주문서 결제방 / 실시간 결제방 | Switches the tab; both show the login prompt while logged out | Same |

### Logged-in screens (demo session)
| Screen / trigger | Source (observed logged in) | Clone |
|---|---|---|
| `/following` | Same shell; list of favorite stores: `#f8f8f8` card, radius 12, padding 16, 48px avatar, name 16/700, navy outline "스토어 방문". Card links to `/{slug}`. API `GET v1/partner-store/follows/following?perPage=20&page=1` | One fake entry (데모샵 → `/nandapick`) |
| `/order/list` 주문서 결제방 | Pre-order cards (white, radius 16, padding 16): seller strip `#e6f9f3` with avatar + "🔴 yy.MM.dd HH:mm 라이브" or "⏰ yy.MM.dd HH:mm 타임딜", status chip (status color on 8% tint), "N시간 전 주문", order number, item rows (80px image, name, option `(+추가금)`, "수량 N개 · 셀러", amount). Card links to `/pre-order/{id}`. API `GET v1/pre-orders?page=1&perPage=10&customerPreOrderStatus=ALL` | Four fake pre-orders covering 미결제 / 주문서 취소 / 결제완료 / 기한 만료. Orders placed in the demo room are listed first. Cards link to the local `/pre-order/{id}` |
| `/order/list` 실시간 결제방 | "📦 주문 내역이 없습니다 / 주문하시면 여기에 표시됩니다" for this account | Same empty state |
| `/my` | Fixed back button (glass circle), 96px avatar with red camera badge, nickname 22/700, settings card (닉네임 input + 저장, 기본 배송지 row, 내 쿠폰함 row), 로그아웃. APIs `GET v3/user`, `GET v1/address/customer/primary`, `GET v1/coupons/customer/placements` | Same layout with fake values |
| `/my` 닉네임 저장 | Not exercised on the source (would change the account) | Validates 2–24 chars (letters, digits, Hangul, `-` `_` `.`), updates the demo session, shows a toast. Invalid input turns the helper red |
| `/my` camera badge | Not exercised | Picks an image file and previews it in memory only |
| `/my` 기본 배송지 | "배송지 관리" bottom sheet (top 72px, radius 16): 저장된 배송지 + navy "배송지 추가", address card with "⭐ 기본 배송지" chip, name, address, 연락처, 주문자 | Same with the fake address. 배송지 추가 shows a "not available in the clone" toast |
| `/my` 내 쿠폰함 | "내 쿠폰함" sheet: "사용 가능한 쿠폰이 없습니다 / 셀러가 발급한 쿠폰이 여기에 표시됩니다" | Same |
| `/my` 로그아웃 | Confirm popover above the button (glass pill, red "로그아웃") | Same; confirming ends the demo session and goes to `/` |

Pre-order status labels/colors come from the source bundle (seller-side status text table and the customer card's color table): 미결제 `errorDark` (token value not found; clone uses `#DC2626`), 결제완료 `#00BC7C`, 기한 만료 `#FFA726`, 주문서 취소 `#B91C1C` (observed). Only 주문서 취소 was seen rendered for a customer, so the other customer-facing labels are inferred.

### Live room (`/nandapick/profile-live/room`)
| Trigger | Source | Clone |
|---|---|---|
| First visit | 3-step "라이브 입장 전 필독" sheet (공지 → 취소 찬스 → 결제 마감, 이전/확인했어요). Completion is stored in localStorage `profile-live-room-onboarding` per time deal | Same key and shape, with a fake time-deal id |
| Video tap / 소리 | Unmute (red dot on 소리 while muted) | Same; reloads the embed with `mute=0` |
| 새로고침 | Reload the stream | Reloads the embed |
| 채팅 | Hide/show chat list + input | Same |
| 아래로 / 접기 | Expand/collapse the action rail (친구초대 is hidden until expanded) | Same |
| 친구초대 | Copy the link + toast | Same (failure toast text is the source's) |
| 주문서, 배송지, 닉네임, 단골맺기, 주문서 담기, chat send | Login redirect | Local login with `previousPath=/nandapick/profile-live/room` |
| 1:1 문의 | Opens the seller's Kakao channel | Opens `pf.kakao.com` (fake: no real channel) |
| Store avatar/name | "OO님 스토어에 놀러 갈까요?" modal (다음에요 / 구경하러 가기) | Same, goes to profile-live |
| Notice marquee | Notice bottom sheet | Same |
| Product button (count badge) / bar thumbnail | "OO 스토어 · 전체 N개" product sheet with search, 다시보기, 주문서 담기 | Same (다시보기 opens the replay sheet) |
| ✕ | Back to `/nandapick/profile-live` | Same |
| Realtime chat & purchase messages | Socket.IO `messageReceived-{channelId}` + SSE purchase events | **Simulated**: fake messages every 2.5–6 s; viewer count drifts. The list auto-follows the newest message unless the viewer scrolled up, in which case the purple jump button appears |

## Data snapshot
`src/components/sites/livemarket/data/nandapick-products.json` freezes the product list and notice as observed at capture time. The live site changes continuously; products were added during capture.

To refresh, re-run the capture, then run `python -I scripts/livemarket-assets.py <capture-dir>`.

## Asset map
- Fonts: `https://livemarket.pro/fonts/*` → `public/sites/livemarket/fonts/`
- `https://livemarket.pro/assets/png/live_market_icon.png` → `public/sites/livemarket/img/live_market_icon.png`
- `https://livemarket.pro/assets/png/brand/yt_icon_red_digital.png` → `public/sites/livemarket/img/yt_icon_red_digital.png`
- Store avatar: not mirrored (real logo). The clone uses the generated `public/sites/livemarket/img/demo-store-avatar.png`.
- Profile default avatar → `public/sites/livemarket/img/profile_default_1.png` (also used for the demo account)
- Product images (`d2l1frtc95a2nc.cloudfront.net/product/*`) → `public/sites/livemarket/products/<sha1-12>.<ext>`. The original URL is kept as `sourceImage` in the JSON. All files are 512×512 except the 300×300 "사진 미등록" default PNG.
- SVGs: inline markup copied from the DOM, with Sentry attributes stripped → `public/sites/livemarket/svg/*.svg`

## Personal data policy (fake values in the clone)
Real personal data is not carried into the clone. These substitutions keep layout fidelity:

| Item | Clone value |
|---|---|
| Seller display name / avatar | 데모샵 / `img/demo-store-avatar.png` (generated placeholder; the real logo was not kept) |
| Seller business info (대표자, 사업자번호, 주소, 이메일, 상호) | 홍길동, 000-00-00000, 서울특별시 중구 예시로 123(예시동), demo@example.com, 데모상점(DEMO SHOP) |
| Seller SNS links, Kakao customer center | Platform root URLs (instagram.com, youtube.com, tiktok.com, band.us, pf.kakao.com) |
| Platform footer (대표, 사업자번호, 통신판매업신고, 주소, 대표번호, 이메일) | 홍길동, 000-00-00000, 0000-서울중구-00000호, 서울특별시 중구 예시로 123, 4층 401호(예시동), 010-0000-0000, demo@example.com |
| Live embed title (contains channel name) | 데모샵 라이브 |
| Product photo `c6559bc051f3.jpg` (stream screenshot) | Pixelated: viewer chat nicknames and avatars, account handle, Kakao channel name, face |

| Logged-in account (nickname, profile photo, phone, address, orderer, order numbers, order history, followed stores) | 데모유저, platform default avatar, 홍길동 / 010-0000-0000 / (00000) 서울특별시 중구 예시로 123 (예시동, 데모아파트) 101동 101호, order numbers `P2026112000000000NN`, four invented orders built from snapshot products (none match the real account's orders), 데모샵 only. Nothing from the real account was written to the repo; source logged-in screenshots and API responses were kept out of the repo and deleted after use |
| Live-room chat (nicknames, messages, purchase lines) | 100% invented (`data/room-chat.ts`): fake nicknames such as 달빛여우 and 데모유저7, generic messages, and purchase lines built from snapshot product names/prices. Avatars are the platform's generic default images |

Not replaced:
- The route slug `nandapick`, because it is the requested URL.
- Live video: replaced with a "LIVE 영상 영역" placeholder in the room, profile-live and replay clips. The source video ID is not stored; set one in `data/live-video.ts` to embed a real broadcast.
- Source screenshots in `docs/design-references/livemarket/`, which are research evidence of the original page, not clone output.

## Known gaps
- Logged-in screens use a client-side demo session, not real auth. Real nickname/photo/address changes and coupon cards (no coupon existed to observe) are not cloned.
- With the placeholder, the mute prompts ("소리가 꺼져 있어요") are hidden; they return when a video ID is set.
- The replay sheet's mute prompt uses an emoji instead of the source's speaker icon. The copy button uses a glyph, and its source behavior was not verified (the clone copies the page URL).
- Seller search covers only the captured seller. The real search runs server-side on `api.groo.pro`.
- Animation phases (rings, CTA icons, pin wiggle) differ between screenshots because they are time-driven.
- The bottom-sheet drag-to-dismiss gesture (vaul) is not implemented; the overlay, the ×, and Esc close the sheet.

## Order flow after 주문서 담기 (demo session only)

The source's order screens are login-only and were not captured, so this flow is built from a written description of the source, not from inspection. Styling reuses the captured order-list tokens. All names, phone numbers, addresses and the bank account are fake.

| Step | Clone |
| --- | --- |
| 주문서 담기 (product bar, product sheet, replay sheet) | Logged out: login redirect as before. Demo session: 옵션 선택 sheet (컬러, 사이즈, 수량, 합계, 주문서 담기). Options are the same fake set for every product |
| Add | Item is upserted into the open time-deal pre-order (localStorage `livemarket-clone-demo-orders`), the buyer's own "구매 성공! [ 상품명 \| 옵션 - N개 총 N원 ]" line is appended to the chat, and the 타임딜 주문 결제 sheet opens |
| 주문자정보/배송지 확인 popup | Shown over the sheet until 여기로 주문 is pressed, and again from 수정하기. 배송지 변경 only shows a notice (the clone has one fake address) |
| 타임딜 주문 결제 sheet | Store strip, status chip, "yyyy.MM.dd. HH:mm 시작 타임딜" + time-deal title, 주문 품목, 배송 안내 (택배 4,000원, 조건부 무료, 도서산간 추가 배송비, 발송지, 반품지) + 요청사항, 결제 금액, 결제하기 (black box, "결제수단을 선택하세요", white 무통장입금 button, pink 결제 마감 band), then 주문서 정보 (주문서 번호, 닉네임, 배송지, 수정하기) |
| 무통장입금 → "입금 후 결제완료까지" sheet | 최종 결제금액, 계좌정보 (예금주, 입금계좌), black 입금계좌 복사하기, 입금시 주문자명 (green correct example vs red struck-through wrong example + rule), 입금완료 확인요청 with a 필수아님 badge |
| Rail 주문서 | Demo session: reopens the latest unpaid room order, or a toast if none |
| `/pre-order/{id}` | Same content as the sheet as a page, for built-in and room orders. 결제하기 appears only while 미결제. Nothing ever becomes 결제완료: there is no seller side |

### Store settings

Seller-editable values (payment deadline, shipping fees, cancel chances, deposit account, max quantity, order merging, notice, onboarding steps, intro, SNS links, customer center, ship-from and return addresses) live in `src/components/sites/livemarket/data/store-settings.ts` and are read only through `getStoreSettings` / `useStoreSettings`. The item list, demo values, the screens each item drives and the rules are in [store-settings.md](store-settings.md). All values are fake, including the notice (the captured notice text is no longer shown).

The payment deadline defaults to the next day at the same time, matching the source onboarding's 24시간. It is computed once when an order is placed and stored on the order, so later setting changes do not move existing deadlines.

### Seller admin draft (`/seller-admin`)

Not a clone: the source admin has not been inspected. The draft follows `docs/platform/business-model.md` and is described in `docs/platform/seller-admin.md`. It lists the demo buyer's orders together with fake customer orders, confirms deposits, records shipments, shows supply stock and monthly figures, and edits the store settings. Everything is fake and stored in this browser's localStorage.
