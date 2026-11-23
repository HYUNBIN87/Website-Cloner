"use client";

import { useNow } from "../data/clock";
import { formatKRW } from "../data/demo-account";
import { usePlatform } from "../data/platform";
import { monthlySummary, useSellerOrders } from "../data/seller-admin";
import order from "../order/order.module.css";
import styles from "./seller-admin.module.css";

/**
 * /seller-admin/sales: 내 매출 and 이번 달 청구 예정 금액. Both count orders shipped this month:
 * a sale is confirmed when the tracking number is entered (docs/platform/business-model.md).
 */
export function SalesPage() {
  const orders = useSellerOrders();
  const now = useNow();
  const state = usePlatform();
  if (orders === undefined || now === undefined || state === undefined) return null;
  const summary = monthlySummary(orders, state, now);
  const { invoice } = summary;

  return (
    <>
      <p className={styles.intro}>
        이번 달에 발송 처리한 주문 기준입니다. 결제완료지만 아직 발송하지 않은 주문은 포함되지 않습니다.
      </p>

      <section className={order.card}>
        <h3 className={order.cardTitle}>
          {invoice.monthLabel} 매출 <span>발송 완료 {summary.shippedOrders}건</span>
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
        <p className={order.meta}>운영자에게 낼 금액 = 월 이용료 + 공급 대금 (발송 수량 × 공급가) − 취소·반품분</p>
        <div className={order.line}>
          <span>월 이용료 ({invoice.plan?.name ?? "플랜 없음"} 플랜)</span>
          <span>{formatKRW(invoice.monthlyFee)}</span>
        </div>
        {invoice.lines.length === 0 ? (
          <div className={order.line}>
            <span>공급 대금</span>
            <span>{formatKRW(0)}</span>
          </div>
        ) : (
          invoice.lines.map((line) => (
            <div key={line.name} className={order.line}>
              <span>
                {line.name} {line.quantity}개 × {formatKRW(line.supplyPrice)}
              </span>
              <span>{formatKRW(line.amount)}</span>
            </div>
          ))
        )}
        <div className={order.line}>
          <span>취소·반품분</span>
          <span>− {formatKRW(invoice.returns)}</span>
        </div>
        <div className={`${order.line} ${order.totalLine}`}>
          <span>청구 예정 금액</span>
          <strong>{formatKRW(invoice.total)}</strong>
        </div>
        {invoice.plan && (
          <p className={order.meta}>
            결제일: 다음 달 {invoice.plan.billingDay}일 · 운영자 어드민의 {invoice.monthLabel} 청구서와 같은 금액입니다.
          </p>
        )}
        <p className={styles.hint}>
          취소·반품분 차감은 아직 없습니다. 초안에는 발송 후 반품 기능이 없습니다.
        </p>
      </section>
    </>
  );
}
