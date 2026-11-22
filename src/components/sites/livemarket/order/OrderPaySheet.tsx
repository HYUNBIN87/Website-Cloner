"use client";

import { useState } from "react";
import type { DemoPreOrder } from "../data/demo-account";
import { demoOrders } from "../data/demo-orders";
import { BottomSheet } from "../live/BottomSheet";
import { AddressBlock, PreOrderContent } from "./PreOrderContent";
import styles from "./order.module.css";

/**
 * "타임딜 주문 결제" sheet shown in the live room after an item is added. Until the buyer
 * confirms the delivery address, the 주문자정보/배송지 확인 popup sits on top of it.
 */
export function OrderPaySheet({ order, onClose }: { order: DemoPreOrder; onClose: () => void }) {
  const needsAddress = order.status === "UNPAID" && !order.addressConfirmed;

  return (
    <>
      <BottomSheet
        title="타임딜 주문 결제"
        onClose={onClose}
        panelClassName={styles.paySheet}
        bodyClassName={styles.payBody}
      >
        <PreOrderContent order={order} />
      </BottomSheet>
      {needsAddress && (
        <AddressConfirmModal onConfirm={() => demoOrders.update(order.id, { addressConfirmed: true })} />
      )}
    </>
  );
}

function AddressConfirmModal({ onConfirm }: { onConfirm: () => void }) {
  const [blocked, setBlocked] = useState(false);

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} role="alertdialog" aria-modal="true" aria-label="주문자정보 / 배송지 확인">
        <h3 className={styles.modalTitle}>주문자정보 / 배송지 확인</h3>
        <p className={styles.modalText}>아래 정보로 주문할까요?</p>
        <div className={styles.modalAddress}>
          <AddressBlock />
        </div>
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
