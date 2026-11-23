"use client";

import { useNow } from "../data/clock";
import { formatKRW } from "../data/demo-account";
import { SELLER_PLAN, monthlySummary, useSellerOrders } from "../data/seller-admin";
import order from "../order/order.module.css";
import styles from "./seller-admin.module.css";

/**
 * /seller-admin/sales: 내 매출 and 이번 달 청구 예정 금액. Both count orders shipped this month:
 * a sale is confirmed when the tracking number is entered (docs/platform/business-model.md).
 */
export function SalesPage() {
  const orders = useSellerOrders();
  const now = useNow();
  if (orders === undefined || now === undefined) return null;
  const summary = monthlySummary(orders, now);

  return (
    <>
      <p className={styles.intro}>
        이번 달에 발송 처리한 주문 기준입니다. 결제완료지만 아직 발송하지 않은 주문은 포함되지 않습니다.
      </p>

      <section className={order.card}>
        <h3 className={order.cardTitle}>
          {summary.month} 매출 <span>발송 완료 {summary.shippedOrders}건</span>
        </h3>
        <div className={order.line}>
          <span>상품 매출</span>
          <span>{formatKRW(summary.itemSales)}</span>
        </div>
        <div className={order.line}>
          <span>받은 배송비</span>
          <span>{formatKRW(summary.shippingFees)}</span>
        </div>
        <div className={`${order.line} ${order.totalLine}`}>
          <span>고객에게 받은 금액</span>
          <strong>{formatKRW(summary.itemSales + summary.shippingFees)}</strong>
        </div>
      </section>

      <section className={order.card}>
        <h3 className={order.cardTitle}>이번 달 청구 예정 금액</h3>
        <p className={order.meta}>운영자에게 낼 금액 = 월 이용료 + 공급 대금 (발송 수량 × 공급가)</p>
        <div className={order.line}>
          <span>월 이용료 ({SELLER_PLAN.name} 플랜)</span>
          <span>{formatKRW(summary.monthlyFee)}</span>
        </div>
        {summary.supplyLines.length === 0 ? (
          <div className={order.line}>
            <span>공급 대금</span>
            <span>{formatKRW(0)}</span>
          </div>
        ) : (
          summary.supplyLines.map((line) => (
            <div key={line.name} className={order.line}>
              <span>
                {line.name} {line.quantity}개 × {formatKRW(line.supplyPrice)}
              </span>
              <span>{formatKRW(line.amount)}</span>
            </div>
          ))
        )}
        <div className={`${order.line} ${order.totalLine}`}>
          <span>청구 예정 금액</span>
          <strong>{formatKRW(summary.billing)}</strong>
        </div>
        <p className={styles.hint}>
          취소·반품분 차감은 아직 없습니다. 초안에는 발송 후 반품 기능이 없습니다.
        </p>
      </section>
    </>
  );
}
