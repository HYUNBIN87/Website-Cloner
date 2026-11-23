"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NANDAPICK } from "../data/nandapick";
import { ROUTES } from "../data/routes";
import pages from "../pages/pages.module.css";
import styles from "./seller-admin.module.css";

export const SELLER_ADMIN_ROUTES = {
  orders: "/seller-admin",
  deposit: "/seller-admin/deposit",
  shipping: "/seller-admin/shipping",
  inventory: "/seller-admin/inventory",
  sales: "/seller-admin/sales",
  settings: "/seller-admin/settings",
} as const;

const NAV = [
  { href: SELLER_ADMIN_ROUTES.orders, label: "주문 목록" },
  { href: SELLER_ADMIN_ROUTES.deposit, label: "입금 확인" },
  { href: SELLER_ADMIN_ROUTES.shipping, label: "발송 처리" },
  { href: SELLER_ADMIN_ROUTES.inventory, label: "공급 재고" },
  { href: SELLER_ADMIN_ROUTES.sales, label: "매출" },
  { href: SELLER_ADMIN_ROUTES.settings, label: "설정" },
] as const;

/**
 * Frame of the seller admin draft (/seller-admin). It is not a clone of the source admin, which
 * has not been inspected: the screens follow docs/platform/business-model.md and reuse the
 * consumer screens' column, colors and parts. There is no seller login; all data is fake.
 */
export function SellerAdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className={pages.plainPage}>
      <div className={pages.plainColumn}>
        <header className={styles.header}>
          <div>
            <p className={styles.headerLabel}>셀러 어드민</p>
            <h1 className={styles.headerStore}>{NANDAPICK.name}</h1>
          </div>
          <Link href={ROUTES.profileLive} className={styles.headerLink}>
            스토어 보기
          </Link>
        </header>
        <p className={styles.demoNote}>초안입니다. 모든 데이터는 가짜이고 이 브라우저에만 저장됩니다.</p>
        <nav className={styles.nav} aria-label="셀러 어드민 메뉴">
          {NAV.map((entry) => {
            const active = pathname === entry.href;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {entry.label}
              </Link>
            );
          })}
        </nav>
        <main className={styles.body}>{children}</main>
      </div>
    </div>
  );
}
