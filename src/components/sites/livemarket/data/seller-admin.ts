"use client";

import { useMemo, useSyncExternalStore } from "react";
import { DEFAULT_LIVE_BROADCAST, orderBroadcastInfo } from "./broadcasts";
import { sessionStart, useNow } from "./clock";
import {
  DEMO_ADDRESS,
  DEMO_PRE_ORDERS,
  DEMO_USER,
  orderTotals,
  type DemoPreOrder,
  type DemoPreOrderItem,
} from "./demo-account";
import { demoOrders, resolvePreOrder, useDemoOrders, type ResolvedPreOrder } from "./demo-orders";
import { createLocalStore, parseJson } from "./local-store";
import { NANDAPICK } from "./nandapick";
import {
  DEMO_SELLER_ID,
  invoiceFor,
  monthOf,
  sellerHoldings,
  usePlatform,
  type Invoice,
  type PlatformState,
  type ShippedUnits,
} from "./platform";

/*
 * Seller admin draft data. Everything here is FAKE and local:
 *  - the customers, names, phone numbers, addresses, bank deposits and tracking numbers are invented;
 *  - what the seller does (confirm a deposit, ship) is saved only in this browser's localStorage.
 * Supply products, handed and recovered quantities and the fee plan come from the platform store
 * shared with the operator admin (data/platform.ts). There is no server, bank, payment or
 * courier integration.
 */

/** Fake couriers for the 발송 처리 form. */
export const CARRIERS = ["예시택배", "데모택배"] as const;

/** Digits and hyphens, 9 to 20 characters. */
export const isValidTrackingNumber = (value: string) => /^[0-9-]{9,20}$/.test(value);

// ---------------------------------------------------------------------------
// Orders from other (fake) customers
// ---------------------------------------------------------------------------

export type OrderCustomer = { name: string; nickname: string; phone: string; address: string };

type Shipment = { carrier: string; trackingNumber: string };

type CustomerOrderFixture = DemoPreOrder & {
  customer: OrderCustomer;
  /**
   * Depositor name the seller already knows for this order (the buyer's deposit-check request, or
   * an earlier confirmation). `null`: unknown, unless a bank deposit is matched to the order.
   */
  depositorName: string | null;
  shipped?: Shipment & { minutesAgo: number };
};

const product = (index: number) => NANDAPICK.products[index];
const item = (index: number, option: string, quantity = 1): DemoPreOrderItem => ({
  name: product(index).name,
  image: product(index).image,
  option,
  quantity,
  amount: (Number(product(index).price.replace(/[^0-9]/g, "")) || 0) * quantity,
});

const customer = (name: string, nickname: string, n: number): OrderCustomer => ({
  name,
  nickname,
  phone: `010-0000-000${n}`,
  address: `(00000) 서울특별시 중구 예시로 ${n}길 ${n * 10} 데모빌라 ${n}0${n}호`,
});

/** The other customers ordered in the broadcast that is live by default. */
const CURRENT = orderBroadcastInfo(DEFAULT_LIVE_BROADCAST);
const DAY = 24 * 60;

const CUSTOMER_ORDERS: readonly CustomerOrderFixture[] = [
  {
    id: "P202611230000000101",
    ...CURRENT,
    status: "UNPAID",
    minutesAgo: 8,
    paymentWindowMinutes: DAY,
    items: [item(0, "블랙/L", 2)],
    customer: customer("김데모", "달빛여우", 1),
    depositorName: null,
    addressConfirmed: true,
  },
  {
    id: "P202611230000000108",
    ...CURRENT,
    status: "UNPAID",
    minutesAgo: 15,
    paymentWindowMinutes: DAY,
    items: [item(6, "블랙/M", 2)],
    customer: customer("윤견본", "모카라떼", 8),
    depositorName: null,
    addressConfirmed: true,
  },
  {
    id: "P202611230000000102",
    ...CURRENT,
    status: "UNPAID",
    depositRequested: true,
    minutesAgo: 25,
    paymentWindowMinutes: DAY,
    items: [item(1, "화이트/M"), item(6, "네이비/L")],
    customer: customer("이예시", "초코쿠키", 2),
    depositorName: "이예시",
    addressConfirmed: true,
  },
  {
    id: "P202611230000000103",
    ...CURRENT,
    status: "UNPAID",
    depositRequested: true,
    minutesAgo: 40,
    paymentWindowMinutes: DAY,
    items: [item(2, "그레이/XL")],
    customer: customer("박가상", "민트라떼", 3),
    // Deliberately different from the orderer name: the case the seller must notice.
    depositorName: "박가상민트라떼",
    addressConfirmed: true,
  },
  {
    id: "P202611230000000104",
    ...CURRENT,
    status: "PAID",
    minutesAgo: 2 * 60,
    paymentWindowMinutes: DAY,
    items: [item(0, "화이트/M", 3), item(12, "블랙/L")],
    customer: customer("최샘플", "하늘별", 4),
    depositorName: "최샘플",
    addressConfirmed: true,
  },
  {
    id: "P202611230000000105",
    ...CURRENT,
    status: "PAID",
    minutesAgo: 3 * 60,
    paymentWindowMinutes: DAY,
    items: [item(7, "차콜/L")],
    customer: customer("오더미", "새벽러너", 5),
    depositorName: "오더미",
    addressConfirmed: true,
  },
  {
    id: "P202611220000000106",
    ...CURRENT,
    status: "PAID",
    minutesAgo: DAY + 2 * 60,
    paymentWindowMinutes: DAY,
    items: [item(0, "네이비/L", 4), item(1, "블랙/M", 2), item(2, "블랙/L")],
    customer: customer("정테스트", "모카빵", 6),
    depositorName: "정테스트",
    shipped: { carrier: CARRIERS[0], trackingNumber: "0000-0000-0001", minutesAgo: 3 * 60 },
    addressConfirmed: true,
  },
  {
    id: "P202611230000000107",
    ...CURRENT,
    status: "CANCELED",
    minutesAgo: 5 * 60,
    paymentWindowMinutes: DAY,
    items: [item(10, "블랙/M")],
    customer: customer("한임시", "구름솜", 7),
    depositorName: null,
    addressConfirmed: true,
  },
];

// ---------------------------------------------------------------------------
// What the seller did, saved in this browser
// ---------------------------------------------------------------------------

/** Seller-side record for one order: deposit confirmation and shipment. */
type Fulfillment = {
  paidAt?: string;
  /** The bank deposit this confirmation was made from (bulk confirmation of matched deposits). */
  depositId?: string;
  carrier?: string;
  trackingNumber?: string;
  shippedAt?: string;
};

const STORAGE_KEY = "livemarket-clone-seller-admin";
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): Record<string, Fulfillment> {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, Fulfillment>) : {};
  } catch {
    return {};
  }
}

function write(next: Record<string, Fulfillment>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: the seller's actions simply do not persist.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// ---------------------------------------------------------------------------
// The seller's view of an order
// ---------------------------------------------------------------------------

/** 미결제 / 입금확인요청 / 결제완료 / 발송완료 / 취소. An order past its deadline is listed with 취소. */
export type SellerOrderStatus = "UNPAID" | "DEPOSIT_REQUESTED" | "PAID" | "SHIPPED" | "CANCELED" | "EXPIRED";

export const SELLER_ORDER_STATUS: Record<SellerOrderStatus, { text: string; color: string; tint: string }> = {
  UNPAID: { text: "미결제", color: "#DC2626", tint: "rgba(220, 38, 38, 0.08)" },
  DEPOSIT_REQUESTED: { text: "입금확인요청", color: "rgb(20, 48, 112)", tint: "rgba(20, 48, 112, 0.08)" },
  PAID: { text: "결제완료", color: "#00BC7C", tint: "rgba(0, 188, 124, 0.08)" },
  SHIPPED: { text: "발송완료", color: "rgb(54, 70, 58)", tint: "rgb(232, 232, 232)" },
  CANCELED: { text: "주문서 취소", color: "rgb(185, 28, 28)", tint: "rgba(185, 28, 28, 0.08)" },
  EXPIRED: { text: "기한 만료", color: "#FFA726", tint: "rgba(255, 167, 38, 0.08)" },
};

export type SellerOrder = {
  id: string;
  label: string;
  /** The broadcast the order was placed in. */
  broadcastId?: string;
  status: SellerOrderStatus;
  /** Epoch ms. */
  orderedAt: number;
  minutesAgo: number;
  deadline: number;
  customer: OrderCustomer;
  depositorName: string | null;
  /** A depositor name is known and it is not exactly the orderer's name. */
  nameMismatch: boolean;
  items: DemoPreOrderItem[];
  totals: { items: number; shipping: number; total: number };
  request?: string;
  shipment?: Shipment & { shippedAt: number };
};

/** The demo buyer account (the orders placed through the consumer screens). */
const DEMO_BUYER: OrderCustomer = {
  name: DEMO_ADDRESS.ordererName,
  nickname: DEMO_USER.nickname,
  phone: DEMO_ADDRESS.ordererPhone,
  address: `(${DEMO_ADDRESS.postalCode}) ${DEMO_ADDRESS.address} ${DEMO_ADDRESS.detailAddress}`,
};

function toSellerOrder(
  order: ResolvedPreOrder,
  who: OrderCustomer,
  depositorName: string | null,
  now: number,
  saved: Fulfillment | undefined,
  builtInShipment?: CustomerOrderFixture["shipped"],
): SellerOrder {
  const shippedAt = saved?.shippedAt
    ? Date.parse(saved.shippedAt)
    : builtInShipment
      ? sessionStart() - builtInShipment.minutesAgo * 60_000
      : undefined;
  const paid = order.status === "PAID" || Boolean(saved?.paidAt);
  const status: SellerOrderStatus =
    order.status === "CANCELED"
      ? "CANCELED"
      : shippedAt !== undefined
        ? "SHIPPED"
        : paid
          ? "PAID"
          : order.status === "EXPIRED"
            ? "EXPIRED"
            : order.depositRequested
              ? "DEPOSIT_REQUESTED"
              : "UNPAID";
  return {
    id: order.id,
    label: order.label,
    broadcastId: order.broadcastId,
    status,
    orderedAt: now - order.minutesAgo * 60_000,
    minutesAgo: order.minutesAgo,
    deadline: order.deadline,
    customer: who,
    depositorName,
    nameMismatch: depositorName !== null && depositorName !== who.name,
    items: order.items,
    totals: orderTotals(order),
    request: order.request,
    shipment:
      shippedAt === undefined
        ? undefined
        : {
            carrier: saved?.carrier ?? builtInShipment?.carrier ?? "",
            trackingNumber: saved?.trackingNumber ?? builtInShipment?.trackingNumber ?? "",
            shippedAt,
          },
  };
}

// ---------------------------------------------------------------------------
// Bank deposits (fake) and automatic matching
// ---------------------------------------------------------------------------

/** One incoming transfer on the seller's account, as a bank feed would report it. */
export type BankDeposit = { id: string; depositorName: string; amount: number; at: number };

const fixtureTotal = (orderId: string) => {
  const found = [...CUSTOMER_ORDERS, ...DEMO_PRE_ORDERS].find((entry) => entry.id === orderId);
  return found ? orderTotals(found).total : 0;
};

/** Amounts are derived from the fake orders so that each case below stays what it is meant to be. */
const DEPOSIT_FIXTURES: readonly { id: string; name: string; minutesAgo: number; amount: () => number }[] = [
  // Wrong amount: 2,000원 short of the order of 김데모.
  { id: "D-0008", name: "김데모", minutesAgo: 5, amount: () => fixtureTotal("P202611230000000101") - 2000 },
  // Exact: the built-in unpaid order of the demo buyer.
  { id: "D-0007", name: DEMO_ADDRESS.ordererName, minutesAgo: 10, amount: () => fixtureTotal(DEMO_PRE_ORDERS[0].id) },
  { id: "D-0006", name: "이예시", minutesAgo: 20, amount: () => fixtureTotal("P202611230000000102") },
  // Right amount, but the name has the nickname attached, so it cannot be matched by name.
  { id: "D-0005", name: "박가상민트라떼", minutesAgo: 35, amount: () => fixtureTotal("P202611230000000103") },
  // Belongs to no order.
  { id: "D-0004", name: "무명씨", minutesAgo: 50, amount: () => 15000 },
  // Deposits of orders that are already confirmed.
  { id: "D-0003", name: "최샘플", minutesAgo: 90, amount: () => fixtureTotal("P202611230000000104") },
  { id: "D-0002", name: "오더미", minutesAgo: 150, amount: () => fixtureTotal("P202611230000000105") },
  { id: "D-0001", name: "정테스트", minutesAgo: DAY, amount: () => fixtureTotal("P202611220000000106") },
];

function bankDeposits(): BankDeposit[] {
  return DEPOSIT_FIXTURES.map((entry) => ({
    id: entry.id,
    depositorName: entry.name,
    amount: entry.amount(),
    at: sessionStart() - entry.minutesAgo * 60_000,
  }));
}

/** 확인 완료 / 매칭됨 / 금액 불일치 / 미매칭 */
export type MatchResult = "CONFIRMED" | "MATCHED" | "AMOUNT_MISMATCH" | "UNMATCHED";

export type DepositMatch = {
  deposit: BankDeposit;
  result: MatchResult;
  /** The order the deposit belongs to (every result except 미매칭). */
  order?: SellerOrder;
  /** 미매칭 only: orders still waiting for a deposit of exactly this amount, for a manual check. */
  sameAmount: SellerOrder[];
};

export type DepositMatching = {
  /** Newest deposit first. */
  matches: DepositMatch[];
  /** 미입금: orders waiting for a deposit that no deposit was matched to. Newest first. */
  unpaid: SellerOrder[];
};

const awaitsDeposit = (order: SellerOrder) => order.status === "UNPAID" || order.status === "DEPOSIT_REQUESTED";

/**
 * Matches bank deposits to orders by depositor name + amount. A deposit and an order are used at
 * most once; older deposits and older orders go first.
 *  1. deposits a confirmation was recorded from, and deposits equal to an already paid order → 확인 완료
 *  2. same name and same amount as an order waiting for a deposit → 매칭됨
 *  3. same name as a waiting order but another amount → 금액 불일치
 *  4. anything else → 미매칭 (waiting orders of the same amount are listed as hints)
 */
export function matchDeposits(
  deposits: readonly BankDeposit[],
  orders: readonly SellerOrder[],
  confirmedFrom: Readonly<Record<string, string | undefined>>,
): DepositMatching {
  const pendingDeposits = [...deposits].sort((a, b) => a.at - b.at);
  const oldestFirst = [...orders].sort((a, b) => a.orderedAt - b.orderedAt);
  const paid = oldestFirst.filter((order) => order.status === "PAID" || order.status === "SHIPPED");
  const waiting = oldestFirst.filter(awaitsDeposit);
  const usedOrders = new Set<string>();
  const resolved = new Map<string, DepositMatch>();

  const pass = (
    pool: readonly SellerOrder[],
    result: MatchResult,
    fits: (deposit: BankDeposit, order: SellerOrder) => boolean,
  ) => {
    for (const deposit of pendingDeposits) {
      if (resolved.has(deposit.id)) continue;
      const order = pool.find((entry) => !usedOrders.has(entry.id) && fits(deposit, entry));
      if (!order) continue;
      usedOrders.add(order.id);
      resolved.set(deposit.id, { deposit, result, order, sameAmount: [] });
    }
  };
  const sameName = (deposit: BankDeposit, order: SellerOrder) => deposit.depositorName === order.customer.name;
  const exact = (deposit: BankDeposit, order: SellerOrder) =>
    sameName(deposit, order) && deposit.amount === order.totals.total;

  pass(paid, "CONFIRMED", (deposit, order) => confirmedFrom[order.id] === deposit.id);
  pass(paid, "CONFIRMED", exact);
  pass(waiting, "MATCHED", exact);
  pass(waiting, "AMOUNT_MISMATCH", sameName);

  const unpaid = waiting.filter((order) => !usedOrders.has(order.id));
  const matches = pendingDeposits
    .map(
      (deposit): DepositMatch =>
        resolved.get(deposit.id) ?? {
          deposit,
          result: "UNMATCHED",
          sameAmount: unpaid.filter((order) => order.totals.total === deposit.amount),
        },
    )
    .reverse();
  return { matches, unpaid: [...unpaid].reverse() };
}

/** Orders (newest first) and the deposit matching. `undefined` during server render and hydration. */
export function useSellerData(): { orders: SellerOrder[]; matching: DepositMatching } | undefined {
  const raw = useSyncExternalStore<string | null | undefined>(subscribe, readRaw, () => undefined);
  const now = useNow();
  const buyerOrders = useDemoOrders();
  return useMemo(() => {
    if (raw === undefined || now === undefined || buyerOrders === undefined) return undefined;
    const saved = parse(raw);
    const fromCustomers = CUSTOMER_ORDERS.map((fixture) =>
      toSellerOrder(
        resolvePreOrder(fixture, now),
        fixture.customer,
        fixture.depositorName,
        now,
        saved[fixture.id],
        fixture.shipped,
      ),
    );
    // The demo buyer's deposit name is known once they say they paid (or the order is paid).
    const fromBuyer = buyerOrders.map((order) =>
      toSellerOrder(
        order,
        DEMO_BUYER,
        order.depositRequested || order.status === "PAID" || saved[order.id]?.paidAt ? DEMO_BUYER.name : null,
        now,
        saved[order.id],
      ),
    );
    const known = [...fromBuyer, ...fromCustomers].sort((a, b) => b.orderedAt - a.orderedAt);
    const confirmedFrom = Object.fromEntries(Object.entries(saved).map(([id, entry]) => [id, entry.depositId]));
    const deposits = bankDeposits();
    // An order with no known depositor name takes the name of the bank deposit matched to it.
    const nameByOrder = new Map(
      matchDeposits(deposits, known, confirmedFrom).matches.flatMap((match) =>
        match.order ? [[match.order.id, match.deposit.depositorName] as const] : [],
      ),
    );
    const orders = known.map((order) =>
      order.depositorName === null && nameByOrder.has(order.id)
        ? { ...order, depositorName: nameByOrder.get(order.id) ?? null }
        : order,
    );
    return { orders, matching: matchDeposits(deposits, orders, confirmedFrom) };
  }, [raw, now, buyerOrders]);
}

/** Every order of the store, newest first. `undefined` during server render and hydration. */
export function useSellerOrders(): SellerOrder[] | undefined {
  return useSellerData()?.orders;
}

export const sellerAdmin = {
  /** 입금 확인: the order becomes 결제완료. The buyer's own screens show it as paid too. */
  confirmDeposit(orderId: string) {
    sellerAdmin.confirmDeposits([{ orderId }]);
  },
  /** 입금 확인 for several orders at once (the matched deposits of the 입금 자동매칭 screen). */
  confirmDeposits(pairs: readonly { orderId: string; depositId?: string }[]) {
    const saved = parse(readRaw());
    const paidAt = new Date().toISOString();
    for (const { orderId, depositId } of pairs) saved[orderId] = { ...saved[orderId], paidAt, depositId };
    write(saved);
    for (const { orderId } of pairs) demoOrders.markPaid(orderId);
  },
  /** 발송 처리: entering the tracking number ships the order; supplied items count as sold from here. */
  ship(orderId: string, carrier: string, trackingNumber: string) {
    const saved = parse(readRaw());
    write({
      ...saved,
      [orderId]: { ...saved[orderId], carrier, trackingNumber, shippedAt: new Date().toISOString() },
    });
  },
  /** Clears every deposit confirmation and shipment recorded in this browser. */
  reset() {
    write({});
  },
};

// ---------------------------------------------------------------------------
// The bank the deposits would be read from (입금 자동매칭)
// ---------------------------------------------------------------------------

/** Fake bank names for the picker; the real list comes with the bank integration. */
export const BANK_CHOICES = ["예시은행", "데모은행", "샘플은행"] as const;

export type SellerBank = { bank: string; accountNumber: string };

const bankStore = createLocalStore("livemarket-clone-seller-bank");

/** The saved bank, if any. `undefined` during server render and hydration, `null` when none is saved. */
export function useSellerBank(): SellerBank | null | undefined {
  const raw = bankStore.useRaw();
  return useMemo(() => {
    if (raw === undefined) return undefined;
    const value = parseJson(raw);
    if (typeof value !== "object" || value === null) return null;
    const { bank, accountNumber } = value as Record<string, unknown>;
    return typeof bank === "string" && typeof accountNumber === "string" ? { bank, accountNumber } : null;
  }, [raw]);
}

export const sellerBank = { save: (bank: SellerBank) => bankStore.write(bank) };

// ---------------------------------------------------------------------------
// Supply stock and monthly figures (docs/platform/business-model.md)
// ---------------------------------------------------------------------------

/** The demo store's shipped units per product name. A sale is confirmed at shipment. */
export function demoSellerShipped(orders: readonly SellerOrder[], now: number): Map<string, ShippedUnits> {
  const thisMonth = monthOf(now, "thisMonth").start;
  const lastMonth = monthOf(now, "lastMonth").start;
  const units = new Map<string, ShippedUnits>();
  for (const order of orders) {
    if (!order.shipment) continue;
    const at = order.shipment.shippedAt;
    for (const line of order.items) {
      const row = units.get(line.name) ?? { thisMonth: 0, lastMonth: 0, total: 0 };
      row.total += line.quantity;
      if (at >= thisMonth) row.thisMonth += line.quantity;
      else if (at >= lastMonth) row.lastMonth += line.quantity;
      units.set(line.name, row);
    }
  }
  return units;
}

/** Names of the supply products this seller was handed, for the "공급" mark on order items. */
export function useSupplyNames(): ReadonlySet<string> {
  const state = usePlatform();
  return useMemo(
    () =>
      new Set(
        (state?.products ?? [])
          .filter((entry) =>
            state?.handovers.some((move) => move.sellerId === DEMO_SELLER_ID && move.productId === entry.id),
          )
          .map((entry) => entry.name),
      ),
    [state],
  );
}

export type SupplyStockRow = {
  name: string;
  image: string;
  supplyPrice: number;
  minPrice: number;
  /** 받은 수량: units the operator handed over (operator admin, 공급 출고 기록). */
  received: number;
  /** 판 수량: units in shipped orders. */
  shipped: number;
  /** 회수 수량: units the operator took back (operator admin, 회수 처리). */
  recovered: number;
  /** 남은 수량 = 받은 수량 − 판 수량 − 회수 수량 */
  remaining: number;
  /** Units in paid orders that still have to ship. */
  awaitingShipment: number;
};

export function supplyStock(orders: readonly SellerOrder[], state: PlatformState, now: number): SupplyStockRow[] {
  return sellerHoldings(state, DEMO_SELLER_ID, demoSellerShipped(orders, now)).map((row) => ({
    name: row.product.name,
    image: row.product.image,
    supplyPrice: row.product.supplyPrice,
    minPrice: row.product.minPrice,
    received: row.handed,
    shipped: row.shipped.total,
    recovered: row.recovered,
    remaining: row.holding,
    awaitingShipment: orders
      .filter((order) => order.status === "PAID")
      .flatMap((order) => order.items)
      .filter((line) => line.name === row.product.name)
      .reduce((total, line) => total + line.quantity, 0),
  }));
}

export type MonthlySummary = {
  shippedOrders: number;
  /** 상품 매출: item amounts of orders shipped this month. */
  itemSales: number;
  /** Shipping fees collected on those orders. */
  shippingFees: number;
  /** 청구 예정 금액: the same invoice the operator admin shows for this seller. */
  invoice: Invoice;
};

export function monthlySummary(orders: readonly SellerOrder[], state: PlatformState, now: number): MonthlySummary {
  const start = monthOf(now, "thisMonth").start;
  const shippedThisMonth = orders.filter((order) => order.shipment && order.shipment.shippedAt >= start);
  return {
    shippedOrders: shippedThisMonth.length,
    itemSales: shippedThisMonth.reduce((total, order) => total + order.totals.items, 0),
    shippingFees: shippedThisMonth.reduce((total, order) => total + order.totals.shipping, 0),
    invoice: invoiceFor(state, DEMO_SELLER_ID, "thisMonth", now, demoSellerShipped(orders, now)),
  };
}
