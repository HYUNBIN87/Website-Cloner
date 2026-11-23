"use client";

import Image from "next/image";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  DEMO_ADDRESS,
  DEMO_USER,
  PRE_ORDER_STATUS,
  formatDateTime,
  formatKRW,
  formatOrderedAgo,
  orderTotals,
} from "../data/demo-account";
import { demoOrders, type ResolvedPreOrder } from "../data/demo-orders";
import { useDemoSession } from "../data/demo-session";
import { NANDAPICK } from "../data/nandapick";
import { formatStoreAddress, useStoreSettings } from "../data/store-settings";
import { DepositSheet } from "./DepositSheet";
import styles from "./order.module.css";

const REQUEST_MAX_LENGTH = 100;

/**
 * Body shared by the room's "타임딜 주문 결제" sheet and the /pre-order/{id} page: store, status
 * and time deal, items, shipping guide, amounts, the 결제하기 box and the order info footer.
 * Every name, phone number, address and account shown here is fake.
 */
export function PreOrderContent({ order }: { order: ResolvedPreOrder }) {
  const settings = useStoreSettings();
  const nickname = useDemoSession()?.nickname ?? DEMO_USER.nickname;
  const { shipping } = settings;
  const status = PRE_ORDER_STATUS[order.status];
  const totals = orderTotals(order, shipping);
  const unpaid = order.status === "UNPAID";
  const deadline = formatDateTime(order.deadline);
  const [depositOpen, setDepositOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const addressPopup = unpaid && (editingAddress || !order.addressConfirmed);

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
          <span className={styles.meta}>{formatOrderedAgo(order.minutesAgo)}</span>
        </div>
        {order.timeDeal && (
          <div className={styles.timeDeal}>
            <p className={styles.timeDealStart}>
              <span aria-hidden="true">⏰</span> {formatDateTime(order.timeDeal.startedAt)} 시작 타임딜
            </p>
            <p className={styles.timeDealTitle}>{order.timeDeal.title}</p>
          </div>
        )}
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
          <span>🚚 {shipping.method}</span>
          <strong>{formatKRW(shipping.fee)}</strong>
        </div>
        {(shipping.freeFrom !== null || shipping.remoteAreaFee !== null) && (
          <ul className={styles.shippingNotes}>
            {shipping.freeFrom !== null && (
              <li>
                <span className={styles.freeChip}>조건부 무료</span>
                <span>{formatKRW(shipping.freeFrom)} 이상 구매 시 무료</span>
              </li>
            )}
            {shipping.remoteAreaFee !== null && (
              <li>
                <span className={styles.remoteChip}>도서산간</span>
                <span>제주·도서산간 지역은 추가 배송비 {formatKRW(shipping.remoteAreaFee)}</span>
              </li>
            )}
          </ul>
        )}
        <dl className={styles.info}>
          <div>
            <dt>발송지</dt>
            <dd>{formatStoreAddress(settings.shipFrom)}</dd>
          </div>
          <div>
            <dt>반품지</dt>
            <dd>{formatStoreAddress(settings.returnTo)}</dd>
          </div>
        </dl>
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
          <span>{totals.shipping === 0 ? "무료" : `+ ${formatKRW(totals.shipping)}`}</span>
        </div>
        <div className={`${styles.line} ${styles.totalLine}`}>
          <span>최종 결제 금액</span>
          <strong>{formatKRW(totals.total)}</strong>
        </div>
      </section>

      {unpaid && (
        <section className={styles.pay}>
          <div className={styles.payBox}>
            <h3>결제하기</h3>
            <p>{order.depositRequested ? "입금 확인을 요청했어요" : "결제수단을 선택하세요"}</p>
            <button type="button" className={styles.payMethod} onClick={() => setDepositOpen(true)}>
              무통장입금
            </button>
          </div>
          <p className={styles.payDeadline}>
            <span aria-hidden="true">⏰</span> 결제 마감 <strong>{deadline}</strong>
          </p>
        </section>
      )}
      {order.status === "EXPIRED" && (
        <p className={styles.payDeadline}>
          <span aria-hidden="true">⏰</span> 결제 마감 <strong>{deadline}</strong>이 지나 결제할 수 없어요
        </p>
      )}

      <section className={styles.card}>
        <div className={styles.infoHead}>
          <h3 className={styles.cardTitle}>주문서 정보</h3>
          {unpaid && (
            <button type="button" className={styles.editButton} onClick={() => setEditingAddress(true)}>
              수정하기
            </button>
          )}
        </div>
        <dl className={styles.info}>
          <div>
            <dt>주문서 번호</dt>
            <dd>{order.id}</dd>
          </div>
          <div>
            <dt>닉네임</dt>
            <dd>{nickname}</dd>
          </div>
          <AddressRows />
        </dl>
      </section>

      {/* Portaled so the room sheet's slide-in transform cannot capture these fixed layers. */}
      {depositOpen &&
        createPortal(
          <DepositSheet
            total={totals.total}
            account={settings.bankAccount}
            nickname={nickname}
            requested={Boolean(order.depositRequested)}
            onRequest={() => demoOrders.update(order.id, { depositRequested: true })}
            onClose={() => setDepositOpen(false)}
          />,
          document.body,
        )}
      {addressPopup &&
        createPortal(
          <AddressConfirmModal
            onConfirm={() => {
              demoOrders.update(order.id, { addressConfirmed: true });
              setEditingAddress(false);
            }}
          />,
          document.body,
        )}
    </div>
  );
}

/** Fake orderer and delivery address (DEMO_ADDRESS). */
function AddressRows() {
  return (
    <>
      <div>
        <dt>주문자</dt>
        <dd>
          {DEMO_ADDRESS.ordererName} · {DEMO_ADDRESS.ordererPhone}
        </dd>
      </div>
      <div>
        <dt>받는 분</dt>
        <dd>
          {DEMO_ADDRESS.name} · {DEMO_ADDRESS.phone}
        </dd>
      </div>
      <div>
        <dt>배송지</dt>
        <dd>
          ({DEMO_ADDRESS.postalCode}) {DEMO_ADDRESS.address} {DEMO_ADDRESS.detailAddress}
        </dd>
      </div>
    </>
  );
}

/** 주문자정보/배송지 확인 popup: shown until confirmed, and again from 수정하기. */
function AddressConfirmModal({ onConfirm }: { onConfirm: () => void }) {
  const [blocked, setBlocked] = useState(false);

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} role="alertdialog" aria-modal="true" aria-label="주문자정보 / 배송지 확인">
        <h3 className={styles.modalTitle}>주문자정보 / 배송지 확인</h3>
        <p className={styles.modalText}>아래 정보로 주문할까요?</p>
        <dl className={`${styles.info} ${styles.modalAddress}`}>
          <AddressRows />
        </dl>
        {blocked && (
          <p className={styles.modalNotice} role="status">
            클론에서는 배송지를 변경할 수 없어요 (가짜 배송지 1개만 있어요)
          </p>
        )}
        <div className={styles.modalActions}>
          <button type="button" className={styles.modalSecondary} onClick={() => setBlocked(true)}>
            배송지 변경
          </button>
          <button type="button" className={styles.modalPrimary} onClick={onConfirm} autoFocus>
            여기로 주문
          </button>
        </div>
      </div>
    </div>
  );
}
