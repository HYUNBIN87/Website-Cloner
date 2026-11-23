"use client";

import type { ResolvedPreOrder } from "../data/demo-orders";
import { BottomSheet } from "../live/BottomSheet";
import { PreOrderContent } from "./PreOrderContent";
import styles from "./order.module.css";

/** "타임딜 주문 결제" sheet shown in the live room after an item is added. */
export function OrderPaySheet({ order, onClose }: { order: ResolvedPreOrder; onClose: () => void }) {
  return (
    <BottomSheet
      title="타임딜 주문 결제"
      onClose={onClose}
      panelClassName={styles.paySheet}
      bodyClassName={styles.payBody}
    >
      <PreOrderContent order={order} />
    </BottomSheet>
  );
}
