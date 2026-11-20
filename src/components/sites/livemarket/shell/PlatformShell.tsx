import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "../Icon";
import { ROUTES, SOURCE_ROUTES } from "../data/routes";
import { BottomTabBar, type TabKey } from "./BottomTabBar";
import styles from "./shell.module.css";

export function PlatformHeader() {
  return (
    <header className={styles.header}>
      <Link href={ROUTES.home} className={styles.brand}>
        <Image
          src="/sites/livemarket/img/live_market_icon.png"
          alt="라이브마켓"
          width={40}
          height={40}
          className={styles.brandIcon}
          priority
        />
        <h1 className={styles.brandName}>라이브마켓</h1>
      </Link>
      <div className={styles.headerActions}>
        <a href={SOURCE_ROUTES.search} className={styles.searchLink} aria-label="검색">
          <Icon name="search" width={24} />
        </a>
        <a href={SOURCE_ROUTES.sellerLogin} className={styles.sellerHome}>
          <p>🧑🏻‍💻 셀러홈</p>
        </a>
      </div>
    </header>
  );
}

export function PlatformFooter() {
  return (
    <footer className={styles.footer}>
      <nav className={styles.footerNav}>
        <div className={styles.footerPrimary}>
          <a href="mailto:demo@example.com">
            <span>회사소개 &amp; IR미팅 요청</span>
          </a>
          <a href="mailto:demo@example.com">
            <span>이메일 문의하기</span>
          </a>
          <a href="mailto:demo@example.com">
            <span>파트너십 신청</span>
          </a>
          <a href={SOURCE_ROUTES.sellerLogin}>
            <span className={styles.sellerLogin}>셀러 로그인</span>
          </a>
        </div>
        <div className={styles.footerLinks}>
          <a href="https://groo.pro/agreement-membership">
            <span>회원약관</span>
          </a>
          <a href="https://groo.pro/agreement-privacy">
            <span>개인보호정책</span>
          </a>
          <a href="https://groo.pro/agreement-marketing">
            <span>마케팅이용동의</span>
          </a>
        </div>
      </nav>
      <div className={styles.divider} />
      <ul className={styles.companyInfo}>
        <li>
          <span className={styles.copyright}>copyright 주식회사 코어브릭스(COREBRICKS, inc.)</span>
        </li>
        {/* Personal/contact details below are fake placeholders, not the source's real data. */}
        <li>
          <span>사업자 등록번호 : 000-00-00000 | 대표 : 홍길동</span>
        </li>
        <li>
          <span>통신판매업신고 : 0000-서울중구-00000호</span>
        </li>
        <li>
          <span>서울특별시 중구 예시로 123, 4층 401호(예시동)</span>
        </li>
        <li>
          <a href="tel:010-0000-0000">
            <span>대표번호 : 010-0000-0000</span>
          </a>
        </li>
        <li>
          <a href="mailto:demo@example.com">
            <span>이메일 : demo@example.com</span>
          </a>
        </li>
      </ul>
      <span className={styles.disclaimer}>
        (주)코어브릭스는 통신판매중개자로서 라이브마켓의 거래 당사자가 아니며, 판매자가 등록한
        상품정보 및 거래 등에 대해 일절 책임을 지지 않습니다.
        <br />
        단, (주)코어브릭스가 판매자로 등록 판매한 상품의 경우 판매자로서 책임을 부담합니다.
      </span>
    </footer>
  );
}

/** Page frame shared by home and following: 500px column, header, page body, tab bar, footer. */
export function PlatformShell({ active, children }: { active: TabKey; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <PlatformHeader />
        {children}
        <BottomTabBar active={active} />
        <PlatformFooter />
      </div>
    </div>
  );
}
