"use client";

import Image from "next/image";
import { useState } from "react";
import { Icon } from "../Icon";
import { formatDateTime, formatKRW, formatOrderedAgo } from "../data/demo-account";
import {
  CARRIERS,
  SELLER_ORDER_STATUS,
  isValidTrackingNumber,
  sellerAdmin,
  useSellerOrders,
  useSupplyNames,
  type SellerOrder,
  type SellerOrderStatus,
} from "../data/seller-admin";
import { BottomSheet } from "../live/BottomSheet";
import order from "../order/order.module.css";
import orders from "../pages/orders.module.css";
import styles from "./seller-admin.module.css";

type Mode = "all" | "deposit" | "shipping";

/** The five groups of the order list. 기한 만료 orders are listed with 취소. */
const GROUPS = [
  { key: "UNPAID", label: "미결제", statuses: ["UNPAID"] },
  { key: "DEPOSIT_REQUESTED", label: "입금확인요청", statuses: ["DEPOSIT_REQUESTED"] },
  { key: "PAID", label: "결제완료", statuses: ["PAID"] },
  { key: "SHIPPED", label: "발송완료", statuses: ["SHIPPED"] },
  { key: "CANCELED", label: "취소", statuses: ["CANCELED", "EXPIRED"] },
] as const satisfies readonly { key: string; label: string; statuses: readonly SellerOrderStatus[] }[];

type GroupKey = (typeof GROUPS)[number]["key"] | "ALL";

const inGroup = (entry: SellerOrder, key: GroupKey) =>
  key === "ALL" || GROUPS.some((group) => group.key === key && (group.statuses as readonly string[]).includes(entry.status));

const INTRO: Record<Mode, string | null> = {
  all: null,
  deposit: "입금을 기다리는 주문입니다. 통장 입금 내역과 맞춰 본 뒤 주문을 눌러 입금 확인을 해주세요.",
  shipping: "결제완료된 주문입니다. 주문을 눌러 송장번호를 입력하면 발송완료가 되고, 공급 상품은 이때 판매가 확정됩니다.",
};

/**
 * /seller-admin (all orders in five groups), /seller-admin/deposit (orders waiting for a deposit
 * check) and /seller-admin/shipping (paid orders waiting to ship). Tapping an order opens its
 * sheet, where the deposit is confirmed or the tracking number is entered.
 */
export function SellerOrdersPage({ mode }: { mode: Mode }) {
  const all = useSellerOrders();
  const [group, setGroup] = useState<GroupKey>("ALL");
  const [openId, setOpenId] = useState<string | null>(null);

  if (all === undefined) return null;

  const visible =
    mode === "deposit"
      ? // Orders whose buyer says they paid come first.
        [...all.filter((entry) => entry.status === "DEPOSIT_REQUESTED"), ...all.filter((entry) => entry.status === "UNPAID")]
      : mode === "shipping"
        ? // Oldest first: ship in the order they were placed.
          all.filter((entry) => entry.status === "PAID").reverse()
        : all.filter((entry) => inGroup(entry, group));
  const open = all.find((entry) => entry.id === openId);

  return (
    <>
      {INTRO[mode] && <p className={styles.intro}>{INTRO[mode]}</p>}
      {mode === "all" && (
        <div className={styles.filters} role="tablist" aria-label="주문 상태">
          {[{ key: "ALL" as const, label: "전체" }, ...GROUPS].map((entry) => (
            <button
              key={entry.key}
              type="button"
              role="tab"
              aria-selected={group === entry.key}
              className={`${styles.filter} ${group === entry.key ? styles.filterActive : ""}`}
              onClick={() => setGroup(entry.key)}
            >
              {entry.label} <span>{all.filter((item) => inGroup(item, entry.key)).length}</span>
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className={orders.empty}>
          <h1 aria-hidden="true">📦</h1>
          <p className={orders.emptyTitle}>해당하는 주문이 없습니다</p>
        </div>
      ) : (
        visible.map((entry) => <OrderCard key={entry.id} order={entry} onOpen={() => setOpenId(entry.id)} />)
      )}

      {open && <OrderSheet order={open} onClose={() => setOpenId(null)} />}
    </>
  );
}

function StatusChip({ status }: { status: SellerOrderStatus }) {
  const meta = SELLER_ORDER_STATUS[status];
  return (
    // Chip colors follow the consumer order list: the status color on a light tint.
    <span className={orders.chip} style={{ color: meta.color, background: meta.tint }}>
      {meta.text}
    </span>
  );
}

function OrderCard({ order: entry, onOpen }: { order: SellerOrder; onOpen: () => void }) {
  const supplyNames = useSupplyNames();
  return (
    <button type="button" className={`${orders.card} ${styles.orderCard}`} onClick={onOpen}>
      <div className={orders.statusRow}>
        <div className={orders.statusLeft}>
          <StatusChip status={entry.status} />
          {entry.nameMismatch && <span className={styles.mismatchBadge}>⚠️ 입금자명 다름</span>}
        </div>
        <Icon name="chevron-right-outline" width={18} />
      </div>
      <span className={orders.meta}>
        {formatDateTime(entry.orderedAt)} · {formatOrderedAgo(entry.minutesAgo)}
      </span>
      <dl className={styles.facts}>
        <div>
          <dt>주문자명</dt>
          <dd>
            {entry.customer.name} <span className={styles.nickname}>({entry.customer.nickname})</span>
          </dd>
        </div>
        <div>
          <dt>입금자명</dt>
          <dd className={entry.nameMismatch ? styles.mismatchText : undefined}>
            {entry.depositorName ?? <span className={styles.none}>입금 내역 없음</span>}
          </dd>
        </div>
        <div>
          <dt>품목</dt>
          <dd>
            {entry.items.map((item) => (
              <span key={`${item.name}-${item.option}`} className={styles.itemLine}>
                {item.name} · {item.option} × {item.quantity}
                {supplyNames.has(item.name) && <span className={styles.supplyBadge}>공급</span>}
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt>금액</dt>
          <dd className={styles.amount}>{formatKRW(entry.totals.total)}</dd>
        </div>
      </dl>
      <span className={orders.meta}>주문서 {entry.id}</span>
    </button>
  );
}

/** Order detail sheet: where a deposit is confirmed and a tracking number is entered. */
export function OrderSheet({ order: entry, onClose }: { order: SellerOrder; onClose: () => void }) {
  const supplyNames = useSupplyNames();
  const waitingDeposit = entry.status === "UNPAID" || entry.status === "DEPOSIT_REQUESTED";

  return (
    <BottomSheet title="주문서 상세" onClose={onClose} panelClassName={order.paySheet} bodyClassName={order.payBody}>
      <div className={order.content}>
        <section className={order.card}>
          <div className={order.statusRow}>
            <StatusChip status={entry.status} />
            <span className={order.meta}>{formatOrderedAgo(entry.minutesAgo)}</span>
          </div>
          <dl className={order.info}>
            <div>
              <dt>주문서 번호</dt>
              <dd>{entry.id}</dd>
            </div>
            <div>
              <dt>주문 시각</dt>
              <dd>{formatDateTime(entry.orderedAt)}</dd>
            </div>
            <div>
              <dt>결제 마감</dt>
              <dd>{formatDateTime(entry.deadline)}</dd>
            </div>
            <div>
              <dt>주문자</dt>
              <dd>
                {entry.customer.name} ({entry.customer.nickname}) · {entry.customer.phone}
              </dd>
            </div>
            <div>
              <dt>배송지</dt>
              <dd>{entry.customer.address}</dd>
            </div>
            {entry.request && (
              <div>
                <dt>요청사항</dt>
                <dd>{entry.request}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className={order.card}>
          <h3 className={order.cardTitle}>
            주문 품목 <span>{entry.items.length}건</span>
          </h3>
          <div>
            {entry.items.map((item) => (
              <div key={`${item.name}-${item.option}`} className={order.item}>
                <Image src={item.image} alt={item.name} width={64} height={64} className={order.itemImage} />
                <div className={order.itemInfo}>
                  <p className={order.itemName}>
                    {item.name}
                    {supplyNames.has(item.name) && <span className={styles.supplyBadge}>공급</span>}
                  </p>
                  <span className={order.meta}>
                    {item.option} · 수량 {item.quantity}개
                  </span>
                  <p className={order.itemAmount}>{formatKRW(item.amount)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className={order.line}>
            <span>상품 금액</span>
            <span>{formatKRW(entry.totals.items)}</span>
          </div>
          <div className={order.line}>
            <span>배송비</span>
            <span>{entry.totals.shipping === 0 ? "무료" : `+ ${formatKRW(entry.totals.shipping)}`}</span>
          </div>
          <div className={`${order.line} ${order.totalLine}`}>
            <span>입금받을 금액</span>
            <strong>{formatKRW(entry.totals.total)}</strong>
          </div>
        </section>

        <section className={order.card}>
          <h3 className={order.cardTitle}>입금</h3>
          <div className={styles.names}>
            <div>
              <span>주문자명</span>
              <strong>{entry.customer.name}</strong>
            </div>
            <div className={entry.nameMismatch ? styles.namesBad : undefined}>
              <span>입금자명</span>
              <strong>{entry.depositorName ?? "입금 내역 없음"}</strong>
            </div>
          </div>
          {entry.nameMismatch && (
            <p className={styles.warning}>
              <span aria-hidden="true">⚠️</span> 입금자명이 주문자명과 다릅니다. 통장 입금액과 주문 금액(
              {formatKRW(entry.totals.total)})이 맞는지 확인하세요.
            </p>
          )}
          {waitingDeposit && <DepositConfirm key={entry.id} order={entry} />}
        </section>

        {entry.status === "PAID" && <ShipForm key={entry.id} order={entry} />}

        {entry.shipment && (
          <section className={order.card}>
            <h3 className={order.cardTitle}>발송</h3>
            <dl className={order.info}>
              <div>
                <dt>택배사</dt>
                <dd>{entry.shipment.carrier}</dd>
              </div>
              <div>
                <dt>송장번호</dt>
                <dd>{entry.shipment.trackingNumber}</dd>
              </div>
              <div>
                <dt>발송 처리</dt>
                <dd>{formatDateTime(entry.shipment.shippedAt)}</dd>
              </div>
            </dl>
          </section>
        )}
      </div>
    </BottomSheet>
  );
}

/** 입금 확인. A deposit the list cannot vouch for (other name, or none seen) needs an explicit tick. */
function DepositConfirm({ order: entry }: { order: SellerOrder }) {
  const needsCheck = entry.nameMismatch || entry.depositorName === null;
  const [checked, setChecked] = useState(false);

  return (
    <>
      {needsCheck && (
        <label className={styles.check}>
          <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
          <span>
            {entry.nameMismatch
              ? "입금자명이 다르지만 이 주문의 입금이 맞습니다."
              : "통장에서 이 주문의 입금을 직접 확인했습니다."}
          </span>
        </label>
      )}
      <button
        type="button"
        className={order.primaryButton}
        disabled={needsCheck && !checked}
        onClick={() => sellerAdmin.confirmDeposit(entry.id)}
      >
        입금 확인
      </button>
    </>
  );
}

/** 발송 처리. Entering the tracking number ships the order; supplied items count as sold from here. */
function ShipForm({ order: entry }: { order: SellerOrder }) {
  const [carrier, setCarrier] = useState<string>(CARRIERS[0]);
  const [tracking, setTracking] = useState("");
  const [touched, setTouched] = useState(false);
  const valid = isValidTrackingNumber(tracking.trim());
  const supplyNames = useSupplyNames();
  const supplyUnits = entry.items
    .filter((item) => supplyNames.has(item.name))
    .reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section className={order.card}>
      <h3 className={order.cardTitle}>발송 처리</h3>
      <form
        className={styles.shipForm}
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          if (valid) sellerAdmin.ship(entry.id, carrier, tracking.trim());
        }}
      >
        <label className={styles.field}>
          <span>택배사</span>
          <select value={carrier} onChange={(event) => setCarrier(event.target.value)}>
            {CARRIERS.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>송장번호</span>
          <input
            value={tracking}
            inputMode="numeric"
            placeholder="숫자와 - 만, 9~20자"
            aria-invalid={touched && !valid}
            onChange={(event) => setTracking(event.target.value)}
          />
        </label>
        {touched && !valid && <p className={styles.error}>송장번호는 숫자와 - 로 9~20자를 입력해주세요.</p>}
        {supplyUnits > 0 && (
          <p className={styles.hint}>
            발송 처리하면 공급 상품 {supplyUnits}개의 판매가 확정되어 공급 재고와 이번 달 청구 예정 금액에 반영됩니다.
          </p>
        )}
        <button type="submit" className={order.primaryButton}>
          발송 처리
        </button>
      </form>
    </section>
  );
}
