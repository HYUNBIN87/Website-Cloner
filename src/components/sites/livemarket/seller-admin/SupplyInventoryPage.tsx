"use client";

import Image from "next/image";
import { formatKRW } from "../data/demo-account";
import { supplyStock, useSellerOrders } from "../data/seller-admin";
import order from "../order/order.module.css";
import styles from "./seller-admin.module.css";

/**
 * /seller-admin/inventory: 내 공급 재고. Per supplied product: received, sold (shipped) and
 * remaining units. 남은 수량 = 받은 수량 − 판 수량 − 회수 수량, computed, never typed in.
 */
export function SupplyInventoryPage() {
  const orders = useSellerOrders();
  if (orders === undefined) return null;
  const rows = supplyStock(orders);

  return (
    <>
      <p className={styles.intro}>
        운영자에게 받은 공급 상품입니다. 판 수량은 발송 처리(송장번호 입력)한 수량이고, 남은 수량은 받은 수량 − 판 수량 − 회수
        수량으로 자동 계산됩니다. 실제로 가진 수량과 맞는지 대조해 보세요.
      </p>
      {rows.map((row) => (
        <section key={row.name} className={order.card}>
          <div className={styles.stockHead}>
            <Image src={row.image} alt={row.name} width={56} height={56} />
            <div>
              <p className={styles.stockName}>{row.name}</p>
              <span className={order.meta}>
                공급가 {formatKRW(row.supplyPrice)} · 최저 판매가 {formatKRW(row.minPrice)}
              </span>
            </div>
          </div>
          <dl className={styles.stats}>
            <div>
              <dt>받은 수량</dt>
              <dd>{row.received}</dd>
            </div>
            <div>
              <dt>판 수량</dt>
              <dd>{row.shipped}</dd>
            </div>
            <div>
              <dt>회수 수량</dt>
              <dd>{row.recovered}</dd>
            </div>
            <div className={styles.statMain}>
              <dt>남은 수량</dt>
              <dd>{row.remaining}</dd>
            </div>
          </dl>
          {row.awaitingShipment > 0 && (
            <p className={styles.hint}>
              결제완료 후 발송을 기다리는 수량 {row.awaitingShipment}개 (발송 처리하면 판 수량으로 넘어갑니다)
            </p>
          )}
          {row.awaitingShipment > row.remaining && (
            <p className={styles.warning}>
              <span aria-hidden="true">⚠️</span> 발송 대기 수량이 남은 수량보다 많습니다.
            </p>
          )}
        </section>
      ))}
    </>
  );
}
