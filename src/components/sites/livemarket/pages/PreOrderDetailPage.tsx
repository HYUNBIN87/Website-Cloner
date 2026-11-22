"use client";

import Link from "next/link";
import { Icon } from "../Icon";
import { useDemoOrders } from "../data/demo-orders";
import { useDemoSession } from "../data/demo-session";
import { ROUTES } from "../data/routes";
import { PreOrderContent } from "../order/PreOrderContent";
import order from "../order/order.module.css";
import styles from "./pages.module.css";

/**
 * /pre-order/{id}: the order sheet opened from an order card. It shows the same content as the
 * room's 타임딜 주문 결제 sheet, for the fake orders of the demo session.
 */
export function PreOrderDetailPage({ orderId }: { orderId: string }) {
  const session = useDemoSession();
  const orders = useDemoOrders();
  const found = orders?.find((entry) => entry.id === orderId);

  return (
    <div className={styles.plainPage}>
      <div className={styles.plainColumn}>
        <header className={order.detailHeader}>
          <Link href={ROUTES.orderList} className={order.back} aria-label="주문내역으로">
            <Icon name="caret-left" width={24} />
          </Link>
          <h1>주문서 상세</h1>
        </header>
        <main className={order.detailBody}>
          {session === undefined || orders === undefined ? null : session === null ? (
            <div className={styles.lockedState}>
              <p className={styles.lockIcon} aria-hidden="true">
                🔒
              </p>
              <div className={styles.lockedText}>
                <p className={styles.lockedTitle}>로그인이 필요합니다</p>
                <p className={styles.lockedSub}>주문서를 확인하려면 로그인해주세요</p>
              </div>
              <Link href={ROUTES.login(ROUTES.preOrder(orderId))} className={styles.navyButton}>
                로그인
              </Link>
            </div>
          ) : found ? (
            <PreOrderContent order={found} />
          ) : (
            <div className={order.detailEmpty}>
              <p>주문서를 찾을 수 없습니다</p>
              <Link href={ROUTES.orderList} className={styles.navyButton}>
                주문내역으로
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
