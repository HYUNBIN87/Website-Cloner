"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../Icon";
import { roomPass, useLiveBroadcast, useLiveVideoId, type Broadcast } from "../data/broadcasts";
import { DEMO_USER } from "../data/demo-account";
import { demoOrders, latestRoomOrder, useDemoOrders } from "../data/demo-orders";
import { useDemoSession } from "../data/demo-session";
import { NANDAPICK, ROOM_LOGIN_URL, type Product } from "../data/nandapick";
import { nextFakeMessage, ownPurchaseMessage, seedMessages, type ChatMessage } from "../data/room-chat";
import { useStoreProducts } from "../data/store-products";
import { maxOrderQuantity, useStoreSettings } from "../data/store-settings";
import { ROUTES } from "../data/routes";
import { SELLERS } from "../data/sellers";
import { BottomSheet } from "../live/BottomSheet";
import { LiveVideo } from "../live/LiveVideo";
import { ReplaySheet, SellerSubtitle } from "../live/ReplaySheet";
import sheet from "../live/sheet.module.css";
import { OptionSheet } from "../order/OptionSheet";
import { OrderPaySheet } from "../order/OrderPaySheet";
import { RoomOnboarding, hasCompletedOnboarding } from "./RoomOnboarding";
import { RoomProductSheet } from "./RoomProductSheet";
import { StoreVisitModal } from "./StoreVisitModal";
import overlays from "./overlays.module.css";
import styles from "./room.module.css";

const store = NANDAPICK;
const MAX_MESSAGES = 200;
const DIGIT_HEIGHT = 18;

type Overlay =
  | { kind: "notice" }
  | { kind: "products" }
  | { kind: "store" }
  | { kind: "replay"; product: Product }
  | { kind: "option"; product: Product }
  | { kind: "pay"; orderId: string }
  | null;

function ViewerCount({ value }: { value: number }) {
  const digits = String(value).split("");
  return (
    <span className={styles.viewerCount}>
      <span className={styles.odometer} aria-hidden="true">
        {digits.map((digit, index) => (
          <span
            key={`${digits.length}-${index}`}
            className={styles.digit}
            style={{ transform: `translateY(-${Number(digit) * DIGIT_HEIGHT}px)` }}
          >
            {Array.from({ length: 10 }, (_, n) => (
              <span key={n}>{n}</span>
            ))}
          </span>
        ))}
      </span>
      <span className="sr-only">{value}</span>명
    </span>
  );
}

const RAIL_ITEMS = [
  { key: "refresh", label: "새로고침", icon: "room-refresh" },
  { key: "sound", label: "소리", icon: "room-sound" },
  { key: "order", label: "주문서", icon: "room-order" },
  { key: "address", label: "배송지", icon: "room-address" },
  { key: "inquiry", label: "1:1 문의", icon: "room-inquiry" },
  { key: "chat", label: "채팅", icon: "room-chat" },
  { key: "nickname", label: "닉네임", icon: "room-nickname" },
  { key: "invite", label: "친구초대", icon: "room-invite" },
] as const;

type RailKey = (typeof RAIL_ITEMS)[number]["key"];

/** The live room of one broadcast. Entry (no broadcast, secret room) is decided by `LiveRoom` below. */
function Room({ broadcast }: { broadcast: Broadcast }) {
  const router = useRouter();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playerKey, setPlayerKey] = useState(0);
  const [chatVisible, setChatVisible] = useState(true);
  const [railOpen, setRailOpen] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [viewers, setViewers] = useState(12);
  const [messages, setMessages] = useState<ChatMessage[]>(() => seedMessages());
  const [atBottom, setAtBottom] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const sequence = useRef(0);
  const session = useDemoSession();
  const orders = useDemoOrders();
  const settings = useStoreSettings(store.slug);

  const hasVideo = useLiveVideoId() !== "";
  // The products chosen for this broadcast, out of the snapshot products plus the seller's listings.
  const storeProducts = useStoreProducts();
  const chosen = storeProducts.filter((product) => broadcast.productIds.includes(product.id));
  const products = chosen.length > 0 ? chosen : storeProducts;
  const pinned = products.find((product) => product.pinned) ?? products[0];
  const followers = SELLERS.find((seller) => seller.slug === store.slug)?.followers ?? 0;
  const close = useCallback(() => setOverlay(null), []);
  const payOrder = overlay?.kind === "pay" ? orders?.find((order) => order.id === overlay.orderId) : undefined;

  /** 주문서 담기: logged out it goes to login (like the source), logged in it opens the option sheet. */
  const startOrder = (product: Product) => {
    if (session) setOverlay({ kind: "option", product });
    else router.push(ROOM_LOGIN_URL);
  };

  /** The item joins this broadcast's order, the purchase line appears in chat, then the pay sheet opens. */
  const placeOrder = (product: Product, option: string, quantity: number) => {
    if (!session) return;
    const orderId = demoOrders.addItem(product, option, quantity, settings, broadcast);
    sequence.current += 1;
    const message = ownPurchaseMessage(
      `mine-${sequence.current}`,
      { nickname: session.nickname, avatar: DEMO_USER.avatar },
      product,
      option,
      quantity,
    );
    setMessages((current) => [...current, message].slice(-MAX_MESSAGES));
    setAtBottom(true);
    setOverlay({ kind: "pay", orderId });
  };

  // Onboarding is shown until completed for this time deal (stored in localStorage, like the source).
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOnboardingOpen(!hasCompletedOnboarding(broadcast.id)));
    return () => cancelAnimationFrame(frame);
  }, [broadcast.id]);

  // Simulated realtime: the source pushes chat and purchase messages over a socket.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        sequence.current += 1;
        const message = nextFakeMessage(sequence.current);
        setMessages((current) => [...current, message].slice(-MAX_MESSAGES));
        schedule();
      }, 2500 + Math.random() * 3500);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  // Viewer count drifts like the live counter.
  useEffect(() => {
    const id = setInterval(() => {
      setViewers((current) => Math.max(5, current + Math.round(Math.random() * 2 - 1)));
    }, 6000);
    return () => clearInterval(id);
  }, []);

  // Keep the chat pinned to the newest message unless the viewer scrolled up.
  useEffect(() => {
    const list = listRef.current;
    if (list && atBottom) list.scrollTop = list.scrollHeight;
  }, [messages, atBottom, chatVisible]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const onScroll = () => {
    const list = listRef.current;
    if (!list) return;
    setAtBottom(list.scrollHeight - list.scrollTop - list.clientHeight < 8);
  };

  const jumpToBottom = () => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
    setAtBottom(true);
  };

  const unmute = () => {
    setMuted(false);
    setPlayerKey((key) => key + 1);
  };

  const onRail = async (key: RailKey) => {
    switch (key) {
      case "refresh":
        setPlayerKey((value) => value + 1);
        break;
      case "sound":
        if (muted) unmute();
        else {
          setMuted(true);
          setPlayerKey((value) => value + 1);
        }
        break;
      case "order": {
        if (!session) {
          router.push(ROOM_LOGIN_URL);
          break;
        }
        const current = latestRoomOrder(orders);
        if (current) setOverlay({ kind: "pay", orderId: current.id });
        else setToast("주문서에 담은 상품이 없어요");
        break;
      }
      case "address":
      case "nickname":
        router.push(session ? ROUTES.my : ROOM_LOGIN_URL);
        break;
      case "inquiry":
        window.open(settings.customerCenterUrl, "_blank", "noopener,noreferrer");
        break;
      case "chat":
        setChatVisible((visible) => !visible);
        break;
      case "invite":
        try {
          await navigator.clipboard.writeText(window.location.href);
          setToast("링크를 복사했어요. 친구에게 공유해보세요!");
        } catch {
          setToast("복사하지 못했어요. 직접 선택해서 복사해주세요.");
        }
        break;
    }
  };

  return (
    <div className={styles.screen} data-lm-theme="dark">
      <div className={styles.stage}>
        <div className={styles.video}>
          <LiveVideo params={{ autoplay: 1, mute: muted ? 1 : 0 }} reloadKey={playerKey} />
        </div>
        {hasVideo && muted && (
          <button type="button" className={styles.unmute} onClick={unmute} aria-label="소리 켜기">
            <span className={styles.unmuteCard}>
              <span className={styles.unmuteIcon} aria-hidden="true">
                🔇
              </span>
              <span className={styles.unmuteTitle}>소리가 꺼져 있어요</span>
              <span className={styles.unmuteSub}>여기를 눌러 소리를 켜주세요!</span>
            </span>
          </button>
        )}

        <div className={styles.top}>
          <div className={`${styles.topRow} ${styles.row1}`}>
            <div className={styles.livePill}>
              <span className={styles.liveDot} />
              <span className={styles.liveText}>LIVE</span>
            </div>
            <div className={styles.viewers}>
              <Icon name="room-viewers" width={13} />
              <ViewerCount value={viewers} />
            </div>
            <span className={styles.liveTitle}>{broadcast.title}</span>
            <Link href={ROUTES.profileLive} className={styles.closeButton} aria-label="라이브 나가기">
              <Icon name="room-close" width={20} />
            </Link>
          </div>
          <div className={`${styles.topRow} ${styles.row2}`}>
            <button type="button" className={styles.storeButton} onClick={() => setOverlay({ kind: "store" })}>
              <Image src={store.avatar} alt={store.name} width={22} height={22} />
              <span className={styles.storeName}>{store.name}</span>
            </button>
            <a href={ROOM_LOGIN_URL} className={styles.followPill}>
              <Icon name="room-follow" width={13} />
              <span>단골맺기</span>
            </a>
            <button type="button" className={styles.marquee} onClick={() => setOverlay({ kind: "notice" })}>
              <div className={styles.marqueeViewport}>
                <div className={styles.marqueeTrack}>
                  <span>{settings.notice.replace(/\n/g, " ")}</span>
                  <span aria-hidden="true">{settings.notice.replace(/\n/g, " ")}</span>
                </div>
              </div>
            </button>
          </div>
          <div className={`${styles.topRow} ${styles.row3}`}>
            <div className={styles.cancelChip} aria-label={`취소찬스 ${settings.cancelChances}회`}>
              <span aria-hidden="true">🍀</span>
              <span>취소찬스</span>
              <span>{settings.cancelChances}</span>
            </div>
          </div>
        </div>

        <div className={styles.rail}>
          <div className={styles.railColumn}>
            <div className={`${styles.railScroll} ${railOpen ? styles.railExpanded : ""}`}>
              {RAIL_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={styles.railButton}
                  onClick={() => onRail(item.key)}
                  aria-pressed={item.key === "chat" ? !chatVisible : undefined}
                >
                  <span className={styles.railIcon}>
                    <Icon name={item.icon} width={13} />
                    {item.key === "sound" && muted && <span className={styles.railDot} />}
                  </span>
                  <span className={styles.railLabel}>{item.label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`${styles.railButton} ${styles.railToggle} ${railOpen ? styles.railToggleOpen : ""}`}
              onClick={() => setRailOpen((open) => !open)}
              aria-expanded={railOpen}
            >
              <span className={styles.railIcon}>
                <Icon name="room-down" width={13} />
              </span>
              <span className={styles.railLabel}>{railOpen ? "접기" : "아래로"}</span>
            </button>
          </div>
        </div>

        <section className={`${styles.chat} ${chatVisible ? "" : styles.chatHidden}`} aria-label="채팅">
          <div className={styles.messagesWrap}>
            <div ref={listRef} className={styles.messages} onScroll={onScroll} aria-live="polite">
              {messages.map((message) => (
                <div key={message.id} className={styles.message}>
                  <div className={styles.messageAvatar}>
                    <Image src={message.avatar} alt={message.nickname} width={24} height={24} />
                  </div>
                  <div className={styles.bubble}>
                    <span className={styles.nick}>{message.nickname}</span>
                    <span className={styles.colon}>:</span>
                    <span>{message.text}</span>
                  </div>
                </div>
              ))}
            </div>
            {!atBottom && (
              <button type="button" className={styles.jump} onClick={jumpToBottom} aria-label="최신 채팅으로">
                <Icon name="room-jump" width={18} />
              </button>
            )}
          </div>
          <form
            className={styles.chatForm}
            onSubmit={(event) => {
              event.preventDefault();
              router.push(ROOM_LOGIN_URL);
            }}
          >
            <div className={styles.chatInputRow}>
              <input
                className={styles.chatInput}
                placeholder="채팅에 참여하려면 로그인하세요"
                aria-label="채팅 입력"
                readOnly
              />
              <button type="submit" className={styles.sendButton} aria-label="보내기">
                <Icon name="room-send" width={20} />
              </button>
            </div>
          </form>
        </section>

        <div className={styles.productCorner}>
          <button
            type="button"
            className={styles.productButton}
            onClick={() => setOverlay({ kind: "products" })}
            aria-label={`상품 ${products.length}개 보기`}
          >
            <span className={styles.productThumb}>
              <Image src={pinned.image} alt="" width={40} height={40} />
            </span>
            <span className={styles.countBadge}>
              <span className={styles.badgeRing} />
              <span className={styles.badgeFill} />
              <span className={styles.badgeText}>{products.length}</span>
            </span>
          </button>
        </div>

        <div className={styles.productBar}>
          <div className={styles.productCard}>
            <span className={styles.productCardBg} />
            <div className={styles.productCardThumb}>
              <button type="button" onClick={() => setOverlay({ kind: "products" })} aria-label="상품 목록">
                <Image src={pinned.image} alt={pinned.name} width={48} height={48} />
              </button>
            </div>
            <div className={styles.productCardInfo}>
              <p className={styles.productCardName}>{pinned.name}</p>
              <div className={styles.productCardPrice}>
                <span aria-hidden="true">📍</span>
                <p>{pinned.price}</p>
              </div>
            </div>
            <button type="button" className={styles.addButton} onClick={() => startOrder(pinned)}>
              주문서 담기
            </button>
          </div>
        </div>

        {toast && (
          <div className={styles.toast} role="status">
            {toast}
          </div>
        )}
      </div>

      {overlay?.kind === "notice" && (
        <BottomSheet title="공지" subtitle={<SellerSubtitle />} onClose={close}>
          <p className={sheet.text}>{settings.notice}</p>
        </BottomSheet>
      )}
      {overlay?.kind === "products" && (
        <RoomProductSheet
          storeName={store.name}
          products={products}
          onAdd={startOrder}
          onReplay={(product) => setOverlay({ kind: "replay", product })}
          onClose={close}
        />
      )}
      {overlay?.kind === "replay" && (
        <ReplaySheet product={overlay.product} loginUrl={ROOM_LOGIN_URL} onAdd={startOrder} onClose={close} />
      )}
      {overlay?.kind === "option" && (
        <OptionSheet
          product={overlay.product}
          maxQuantity={maxOrderQuantity(settings)}
          onSubmit={(option, quantity) => placeOrder(overlay.product, option, quantity)}
          onClose={close}
        />
      )}
      {payOrder && <OrderPaySheet order={payOrder} onClose={close} />}
      {overlay?.kind === "store" && (
        <StoreVisitModal
          storeName={store.name}
          avatar={store.avatar}
          followers={followers}
          storeHref={ROUTES.profileLive}
          onClose={close}
        />
      )}
      {onboardingOpen && (
        <RoomOnboarding timeDealId={broadcast.id} settings={settings} onDone={() => setOnboardingOpen(false)} />
      )}
    </div>
  );
}

/**
 * /{store}/profile-live/room. Shows the broadcast that is 진행 중 in the seller admin's 방송 관리.
 * A secret room asks for its password or lets only logged-in 단골 in; the check happens in the
 * browser (fake data), so it is not real access control.
 */
export function LiveRoom() {
  const live = useLiveBroadcast();
  const session = useDemoSession();
  const [unlockedId, setUnlockedId] = useState<string | null>(null);
  const waiting = <div className={styles.screen} data-lm-theme="dark" />;

  if (live === undefined) return waiting;
  if (live === null) {
    return (
      <RoomNotice title="진행 중인 방송이 없습니다" text="방송이 시작되면 이곳에서 볼 수 있어요.">
        <Link href={ROUTES.profileLive} className={overlays.storeGo}>
          스토어로 돌아가기
        </Link>
      </RoomNotice>
    );
  }
  if (live.secret.enabled && live.secret.condition === "FOLLOWERS") {
    if (session === undefined) return waiting;
    // The demo account is a 단골 of the demo store (see DEMO_FOLLOWING).
    if (session === null) {
      return (
        <RoomNotice title="단골만 입장할 수 있는 비밀 라이브방입니다" text="로그인하고 단골을 맺으면 입장할 수 있어요.">
          <Link href={ROUTES.profileLive} className={overlays.storeLater}>
            돌아가기
          </Link>
          <Link href={ROOM_LOGIN_URL} className={overlays.storeGo}>
            로그인
          </Link>
        </RoomNotice>
      );
    }
  }
  if (live.secret.enabled && live.secret.condition === "PASSWORD" && unlockedId !== live.id && !roomPass.has(live.id)) {
    return (
      <PasswordGate
        password={live.secret.password}
        onPass={() => {
          roomPass.remember(live.id);
          setUnlockedId(live.id);
        }}
      />
    );
  }
  return <Room key={live.id} broadcast={live} />;
}

function RoomNotice({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <div className={styles.screen} data-lm-theme="dark">
      <div className={overlays.modalOverlay}>
        <div className={overlays.storeModal} role="alertdialog" aria-modal="true" aria-label={title}>
          <div className={overlays.storeCopy}>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
          <div className={overlays.storeActions}>{children}</div>
        </div>
      </div>
    </div>
  );
}

function PasswordGate({ password, onPass }: { password: string; onPass: () => void }) {
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);

  return (
    <div className={styles.screen} data-lm-theme="dark">
      <div className={overlays.modalOverlay}>
        <form
          className={overlays.storeModal}
          aria-label="비밀 라이브방 입장"
          onSubmit={(event) => {
            event.preventDefault();
            if (value.trim() === password) onPass();
            else setWrong(true);
          }}
        >
          <div className={overlays.storeCopy}>
            <h3>비밀 라이브방입니다</h3>
            <p>셀러에게 받은 비밀번호를 입력해주세요.</p>
          </div>
          <input
            className={overlays.gateInput}
            type="password"
            value={value}
            placeholder="비밀번호"
            aria-label="비밀번호"
            aria-invalid={wrong}
            autoFocus
            onChange={(event) => {
              setValue(event.target.value);
              setWrong(false);
            }}
          />
          {wrong && (
            <p className={overlays.gateError} role="alert">
              비밀번호가 맞지 않습니다.
            </p>
          )}
          <div className={overlays.storeActions}>
            <Link href={ROUTES.profileLive} className={overlays.storeLater}>
              돌아가기
            </Link>
            <button type="submit" className={overlays.storeGo}>
              입장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
