"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "../Icon";
import {
  DEMO_PRE_ORDERS,
  PRE_ORDER_STATUS,
  formatKRW,
  formatOrderedAgo,
  type DemoPreOrder,
} from "../data/demo-account";
import { useDemoSession } from "../data/demo-session";
import { NANDAPICK } from "../data/nandapick";
import { ROUTES } from "../data/routes";
import styles from "./pages.module.css";
import orders from "./orders.module.css";

const TABS = ["주문서 결제방", "실시간 결제방"] as const;

/**
 * /order/list. Logged out, both tabs show the login prompt. With the demo login, 주문서 결제방
 * lists fake pre-orders and 실시간 결제방 shows the empty state (as observed on the source).
 */
export function OrderListPage() {
  const [active, setActive] = useState<(typeof TABS)[number]>(TABS[0]);
  const session = useDemoSession();

  return (
    <div className={styles.plainPage}>
      <div className={styles.plainColumn}>
        <main>
          <nav className={styles.orderTabsNav}>
            <div className={styles.orderTabs} role="tablist">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={tab === active}
                  className={`${styles.orderTab} ${tab === active ? styles.orderTabActive : ""}`}
                  onClick={() => setActive(tab)}
                >
                  <p>{tab}</p>
                </button>
              ))}
            </div>
          </nav>
          <div className={styles.orderBody} role="tabpanel" aria-label={active}>
            {session === undefined ? null : session === null ? (
              <div className={styles.lockedState}>
                <p className={styles.lockIcon} aria-hidden="true">
                  🔒
                </p>
                <div className={styles.lockedText}>
                  <p className={styles.lockedTitle}>로그인이 필요합니다</p>
                  <p className={styles.lockedSub}>주문 내역을 확인하려면 로그인해주세요</p>
                </div>
                <Link href={ROUTES.login(ROUTES.orderList)} className={styles.navyButton}>
                  로그인
                </Link>
              </div>
            ) : active === TABS[0] ? (
              DEMO_PRE_ORDERS.map((order) => <PreOrderCard key={order.id} order={order} />)
            ) : (
              <div className={orders.empty}>
                <h1 aria-hidden="true">📦</h1>
                <p className={orders.emptyTitle}>주문 내역이 없습니다</p>
                <p className={orders.emptySub}>주문하시면 여기에 표시됩니다</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/** One pre-order. The source links the card to /pre-order/{id}, which the clone does not cover. */
function PreOrderCard({ order }: { order: DemoPreOrder }) {
  const status = PRE_ORDER_STATUS[order.status];
  return (
    <article className={orders.card} aria-label={`주문서 ${order.id}`}>
      <div className={orders.seller}>
        <div className={orders.sellerName}>
          <span className={orders.avatar}>
            <Image src={NANDAPICK.avatar} alt="" width={20} height={20} />
          </span>
          <span>{NANDAPICK.name}</span>
        </div>
        <span className={orders.label}>{order.label}</span>
      </div>
      <div className={orders.head}>
        <div className={orders.statusRow}>
          <div className={orders.statusLeft}>
            {/* Status colors come from the source's status table; chip tint is the color at 8%. */}
            <span className={orders.chip} style={{ color: status.color, background: status.tint }}>
              {status.text}
            </span>
            <span className={orders.meta}>{formatOrderedAgo(order.minutesAgo)}</span>
          </div>
          <Icon name="chevron-right-outline" width={18} />
        </div>
        <span className={orders.meta}>주문서 {order.id}</span>
      </div>
      <div>
        {order.items.map((item) => (
          <div key={`${item.name}-${item.option}`} className={orders.item}>
            <Image
              src={item.image}
              alt={`${item.name}-image`}
              width={80}
              height={80}
              className={orders.image}
            />
            <div className={orders.info}>
              <p className={orders.name}>{item.name}</p>
              <span className={orders.option}>
                {item.option}
                {item.additionalPrice ? (
                  <span className={orders.extra}> (+{formatKRW(item.additionalPrice)})</span>
                ) : null}
              </span>
              <span className={orders.meta}>
                수량 {item.quantity}개 · {NANDAPICK.name}
              </span>
              <p className={orders.amount}>{formatKRW(item.amount)}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
