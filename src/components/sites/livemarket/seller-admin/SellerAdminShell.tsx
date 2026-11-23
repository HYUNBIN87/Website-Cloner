"use client";

import type { ReactNode } from "react";
import { AdminShell } from "../admin/AdminShell";
import { NANDAPICK } from "../data/nandapick";
import { ROUTES } from "../data/routes";

export const SELLER_ADMIN_ROUTES = {
  orders: "/seller-admin",
  deposit: "/seller-admin/deposit",
  matching: "/seller-admin/matching",
  shipping: "/seller-admin/shipping",
  inventory: "/seller-admin/inventory",
  sales: "/seller-admin/sales",
  settings: "/seller-admin/settings",
} as const;

const NAV = [
  { href: SELLER_ADMIN_ROUTES.orders, label: "주문 목록" },
  { href: SELLER_ADMIN_ROUTES.deposit, label: "입금 확인" },
  { href: SELLER_ADMIN_ROUTES.matching, label: "자동매칭" },
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
  return (
    <AdminShell
      label="셀러 어드민"
      title={NANDAPICK.name}
      nav={NAV}
      link={{ href: ROUTES.profileLive, label: "스토어 보기" }}
    >
      {children}
    </AdminShell>
  );
}
