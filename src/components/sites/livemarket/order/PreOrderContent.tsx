"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  DEMO_ADDRESS,
  DEMO_BANK_ACCOUNT,
  DEMO_SHIPPING,
  PRE_ORDER_STATUS,
  formatKRW,
  formatOrderedAgo,
  orderTotals,
  type DemoPreOrder,
} from "../data/demo-account";
import { demoOrders } from "../data/demo-orders";
import { NANDAPICK } from "../data/nandapick";
import styles from "./order.module.css";

const REQUEST_MAX_LENGTH = 100;

/**
 * Body shared by the room's "타임딜 주문 결제" sheet and the /pre-order/{id} page: store and
 * status, address, items, shipping, request, amounts, payment method and deposit guide.
 * Every name, phone number, address and account shown here is fake.
 */
export function PreOrderContent({ order }: { order: DemoPreOrder }) {
  const status = PRE_ORDER_STATUS[order.status];
  const totals = orderTotals(order);
  const unpaid = order.status === "UNPAID";
  const [copied, setCopied] = useState<"done" | "failed" | null>(null);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText(`${DEMO_BANK_ACCOUNT.bank} ${DEMO_BANK_ACCOUNT.number}`);
      setCopied("done");
    } catch {
      setCopied("failed");
    }
  };

  return (
    <div className={styles.content}>
      <section className={styles.card}>
        <div className={styles.storeStrip}>
          <div className={styles.storeName}>
            <span className={styles.storeAvatar}>
              <Image src={NANDAPICK.avatar} alt="" width={20} height={20} />
            </span>
            <span>{NANDAPICK.name}</span>
          </div>
          <span className={styles.stripLabel}>{order.label}</span>
        </div>
        <div className={styles.statusRow}>
          {/* Status colors come from the source's status table; chip tint is the color at 8%. */}
          <span className={styles.chip} style={{ color: status.color, background: status.tint }}>
            {status.text}
          </span>
          {order.round !== undefined && <span className={styles.roundChip}>타임딜 {order.round}회차</span>}
          <span className={styles.meta}>{formatOrderedAgo(order.minutesAgo)}</span>
        </div>
        <span className={styles.meta}>주문서 {order.id}</span>
      </section>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>주문자정보 / 배송지</h3>
        <AddressBlock />
      </section>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>
          주문 품목 <span>{order.items.length}건</span>
        </h3>
        <div>
          {order.items.map((item) => (
            <div key={`${item.name}-${item.option}`} className={styles.item}>
              <Image src={item.image} alt={item.name} width={64} height={64} className={styles.itemImage} />
              <div className={styles.itemInfo}>
                <p className={styles.itemName}>{item.name}</p>
                <span className={styles.meta}>
                  {item.option}
                  {item.additionalPrice ? ` (+${formatKRW(item.additionalPrice)})` : ""} · 수량 {item.quantity}개
                </span>
                <p className={styles.itemAmount}>{formatKRW(item.amount)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>배송 안내</h3>
        <div className={styles.line}>
          <span>🚚 {DEMO_SHIPPING.method}</span>
          <strong>{formatKRW(DEMO_SHIPPING.fee)}</strong>
        </div>
        <label className={styles.request}>
          <span>요청사항</span>
          <textarea
            value={order.request ?? ""}
            maxLength={REQUEST_MAX_LENGTH}
            rows={2}
            placeholder="예: 문 앞에 놓아주세요"
            readOnly={!unpaid}
            onChange={(event) => demoOrders.update(order.id, { request: event.target.value })}
          />
        </label>
      </section>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>결제 금액</h3>
        <div className={styles.line}>
          <span>상품 금액</span>
          <span>{formatKRW(totals.items)}</span>
        </div>
        <div className={styles.line}>
          <span>배송비</span>
          <span>+ {formatKRW(totals.shipping)}</span>
        </div>
        <div className={`${styles.line} ${styles.totalLine}`}>
          <span>최종 결제 금액</span>
          <strong>{formatKRW(totals.total)}</strong>
        </div>
      </section>

      {unpaid && (
        <>
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>결제수단</h3>
            <button type="button" className={styles.method} aria-pressed="true">
              <span aria-hidden="true">🏦</span> 무통장입금
            </button>
            {order.paymentDeadline && (
              <p className={styles.deadline}>
                <span aria-hidden="true">⏰</span> 결제 기한 <strong>{order.paymentDeadline}</strong>까지
              </p>
            )}
          </section>

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>입금 안내</h3>
            <div className={styles.account}>
              <div>
                <p className={styles.accountNumber}>
                  {DEMO_BANK_ACCOUNT.bank} {DEMO_BANK_ACCOUNT.number}
                </p>
                <span className={styles.meta}>예금주 {DEMO_BANK_ACCOUNT.holder}</span>
              </div>
              <button type="button" className={styles.copyButton} onClick={copyAccount}>
                {copied === "done" ? "복사 완료" : copied === "failed" ? "복사 실패" : "계좌 복사"}
              </button>
            </div>
            <div className={styles.line}>
              <span>입금하실 금액</span>
              <strong>{formatKRW(totals.total)}</strong>
            </div>
            <p className={styles.depositNote}>
              <span aria-hidden="true">⚠️</span> 입금자명은 닉네임이 아닌 주문자 실명(
              <strong>{DEMO_ADDRESS.ordererName}</strong>)으로 입금해주세요.
            </p>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={order.depositRequested}
              onClick={() => demoOrders.update(order.id, { depositRequested: true })}
            >
              {order.depositRequested ? "입금 확인 요청됨" : "입금완료 확인요청"}
            </button>
            {order.depositRequested && (
              <p className={styles.requested}>셀러가 입금을 확인하면 결제완료로 바뀌어요.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/** Fake orderer and delivery address (DEMO_ADDRESS). */
export function AddressBlock() {
  return (
    <div className={styles.address}>
      <div className={styles.addressRow}>
        <span className={styles.addressTag}>주문자</span>
        <p>
          {DEMO_ADDRESS.ordererName} · {DEMO_ADDRESS.ordererPhone}
        </p>
      </div>
      <div className={styles.addressRow}>
        <span className={styles.addressTag}>받는 분</span>
        <p>
          {DEMO_ADDRESS.name} · {DEMO_ADDRESS.phone}
        </p>
      </div>
      <div className={styles.addressRow}>
        <span className={styles.addressTag}>배송지</span>
        <p>
          ({DEMO_ADDRESS.postalCode}) {DEMO_ADDRESS.address} {DEMO_ADDRESS.detailAddress}
        </p>
      </div>
    </div>
  );
}
