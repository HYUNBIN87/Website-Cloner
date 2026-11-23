"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Icon } from "../Icon";
import { LOGIN_URL, NANDAPICK, SECRET_ROOM_URL, type Product } from "../data/nandapick";
import { useStoreProducts } from "../data/store-products";
import { useStoreSettings } from "../data/store-settings";
import { BottomSheet } from "./BottomSheet";
import { ProductCard } from "./ProductCard";
import { LiveVideo } from "./LiveVideo";
import { ReplaySheet, SellerSubtitle } from "./ReplaySheet";
import styles from "./live.module.css";
import sheet from "./sheet.module.css";

type Sheet = { kind: "notice" } | { kind: "intro" } | { kind: "replay"; product: Product } | null;

const store = NANDAPICK;

export function ProfileLive() {
  const settings = useStoreSettings(store.slug);
  // Snapshot products plus the ones the seller listed in the seller admin.
  const storeProducts = useStoreProducts();
  const [query, setQuery] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [openSheet, setOpenSheet] = useState<Sheet>(null);
  const close = useCallback(() => setOpenSheet(null), []);
  const openReplay = useCallback((product: Product) => setOpenSheet({ kind: "replay", product }), []);

  const products = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return storeProducts;
    return storeProducts.filter((product) => product.name.toLowerCase().includes(keyword));
  }, [query, storeProducts]);

  return (
    <div className={styles.page} data-lm-theme="dark">
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href={`/${store.slug}`} className={styles.storeLink}>
            <Image
              src={store.avatar}
              alt={store.name}
              width={34}
              height={34}
              className={styles.storeAvatar}
              priority
            />
            <h1 className={styles.storeName}>{store.name}</h1>
          </Link>
          <div className={styles.headerActions}>
            <a href={LOGIN_URL} className={`${styles.headerButton} ${styles.follow}`}>
              <Icon name="plus" width={16} />
              <p>단골 맺기</p>
            </a>
            <a href={LOGIN_URL} className={`${styles.headerButton} ${styles.login}`}>
              <p>로그인</p>
            </a>
          </div>
        </header>

        <div className={styles.titleRow}>
          <h3 className={styles.liveTitle}>{store.liveTitle}</h3>
        </div>

        <div className={styles.mediaRow}>
          <div className={styles.mediaColumn}>
            <div className={styles.player}>
              <div className={styles.playerFrame}>
                <LiveVideo params={{ autoplay: 1, mute: 1 }} />
              </div>
              <Link href={SECRET_ROOM_URL} className={styles.playerOverlay}>
                <span className={styles.playerShade} />
                <span className={styles.liveBadge}>
                  <span className={styles.liveDot} />
                  <span className={styles.liveText}>LIVE</span>
                </span>
                <span className={styles.secretRoom}>
                  <span className={styles.secretIcons} aria-hidden="true">
                    <span className={styles.secretIcon}>
                      <Icon name="star-four-sm" width={12} />
                    </span>
                    <span className={styles.secretIcon}>
                      <Icon name="star-four-lg" width={21} />
                    </span>
                    <span className={styles.secretIcon}>
                      <Icon name="sparkle" width={25} />
                    </span>
                    <span className={styles.secretIcon}>
                      <Icon name="asterisk" width={23} />
                    </span>
                  </span>
                  <span className={styles.secretLabel}>비밀 라이브방 입장</span>
                </span>
              </Link>
            </div>
          </div>

          <div className={styles.sideColumn}>
            <div className={styles.socials}>
              <a href={settings.socials.instagram} className={styles.social} aria-label="Instagram">
                <Icon name="instagram" width={24} />
              </a>
              <a href={settings.socials.youtube} className={styles.social} aria-label="YouTube">
                <Image
                  src="/sites/livemarket/img/yt_icon_red_digital.png"
                  alt="YouTube"
                  width={29}
                  height={20}
                />
              </a>
              <a href={settings.socials.tiktok} className={styles.social} aria-label="TikTok">
                <Icon name="tiktok" width={24} />
              </a>
              <a href={settings.socials.band} className={styles.social} aria-label="BAND">
                <Icon name="band" width={24} />
              </a>
            </div>
            <div className={styles.actionGroups}>
              <div className={styles.actionGroup}>
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.navy}`}
                  onClick={() => setOpenSheet({ kind: "intro" })}
                >
                  <span>
                    <Icon name="storefront" width={16} />
                    <p>소개글</p>
                  </span>
                </button>
                <a href={settings.customerCenterUrl} className={`${styles.actionButton} ${styles.navy}`}>
                  <span>
                    <Icon name="headset" width={16} />
                    <p>고객센터</p>
                  </span>
                </a>
              </div>
              <div className={styles.actionGroup}>
                <a href={LOGIN_URL} className={`${styles.actionButton} ${styles.dark}`}>
                  <span>
                    <Icon name="receipt" width={16} />
                    <p>주문내역</p>
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.content}>
          <button
            type="button"
            className={styles.notice}
            onClick={() => setOpenSheet({ kind: "notice" })}
          >
            <div className={styles.noticeHead}>
              <Icon name="megaphone" width={16} />
              <span>공지</span>
            </div>
            <div className={styles.noticeBody}>
              <p className={styles.noticeText}>{settings.notice}</p>
              <span className={styles.noticeMore}>(...더보기)</span>
            </div>
          </button>

          <div className={styles.cartBanner}>
            <p>상품을 주문서에 담아주세요!</p>
          </div>

          <div className={styles.searchRow}>
            <div className={styles.field}>
              <div className={styles.fieldIcon}>
                <Icon name="search-input-dark" width={20} />
              </div>
              <input
                type="text"
                value={query}
                placeholder="키워드로 상품 검색"
                aria-label="키워드로 상품 검색"
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={() => setQuery("")}
                  aria-label="검색어 지우기"
                >
                  <span>
                    <Icon name="clear-x" width={14} />
                  </span>
                </button>
              )}
            </div>
            <button
              type="button"
              className={styles.viewToggle}
              onClick={() => setLayout((current) => (current === "grid" ? "list" : "grid"))}
            >
              {layout === "grid" ? (
                <>
                  <Icon name="long-view" width={15} height={17} />
                  <p>길게보기</p>
                </>
              ) : (
                <>
                  <Icon name="grid-view" width={17} />
                  <p>사진크게</p>
                </>
              )}
            </button>
          </div>

          <div className={styles.products}>
            {products.length === 0 ? (
              <p className={styles.empty}>&apos;{query.trim()}&apos; 검색 결과가 없어요</p>
            ) : (
              <div className={layout === "grid" ? styles.grid : styles.list}>
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    layout={layout}
                    onReplay={openReplay}
                  />
                ))}
              </div>
            )}
          </div>

          <footer className={styles.storeFooter}>
            <div className={styles.footerRule}>
              <div />
            </div>
            <span className={`${styles.footerLine} ${styles.footerHeading}`}>사업자정보</span>
            <span className={styles.footerLine}>
              상호명 : <strong>{store.business.company}</strong>
            </span>
            <span className={styles.footerLine}>
              대표자 : <strong>{store.business.ceo}</strong>
            </span>
            <span className={styles.footerLine}>사업자등록번호 : {store.business.registration}</span>
            <span className={styles.footerLine}>사업장 소재지 : {store.business.address}</span>
            <span className={styles.footerLine}>통신판매업 신고번호 : {store.business.mailOrder}</span>
            <a href={`mailto:${store.business.email}`} className={styles.footerEmail}>
              <span className={styles.footerLine}>이메일 : {store.business.email}</span>
            </a>
            <nav className={styles.footerNav}>
              <a href={`https://livemarket.pro/${store.slug}/agreement/membership`}>회원약관</a>
              <a href={`https://livemarket.pro/${store.slug}/agreement/privacy`}>개인정보처리방침</a>
              <a href={`https://livemarket.pro/${store.slug}/agreement/marketing`}>마케팅 수신동의</a>
            </nav>
          </footer>
        </div>
        <div className={styles.toastSpacer} />
      </div>

      <div className={styles.prompt}>
        <h2>지금 단골 맺기 하시고 초특가 이벤트와 회원 전용 혜택을 받아보세요!</h2>
        <a href={LOGIN_URL} className={styles.promptButton}>
          로그인
        </a>
      </div>

      {openSheet?.kind === "notice" && (
        <BottomSheet title="공지" subtitle={<SellerSubtitle />} onClose={close}>
          <p className={sheet.text}>{settings.notice}</p>
        </BottomSheet>
      )}
      {openSheet?.kind === "intro" && (
        <BottomSheet title="소개글" subtitle={<SellerSubtitle />} onClose={close}>
          <p className={sheet.text}>{settings.intro}</p>
        </BottomSheet>
      )}
      {openSheet?.kind === "replay" && <ReplaySheet product={openSheet.product} loginUrl={LOGIN_URL} onClose={close} />}
    </div>
  );
}
