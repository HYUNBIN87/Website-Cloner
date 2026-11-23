"use client";

import { useMemo, useSyncExternalStore } from "react";
import { sessionStart, useNow } from "./clock";
import {
  DEMO_ADDRESS,
  DEMO_USER,
  orderTotals,
  type DemoPreOrder,
  type DemoPreOrderItem,
} from "./demo-account";
import { demoOrders, resolvePreOrder, useDemoOrders, type ResolvedPreOrder } from "./demo-orders";
import { NANDAPICK } from "./nandapick";

/*
 * Seller admin draft data. Everything here is FAKE and local:
 *  - the customers, names, phone numbers, addresses, depositor names and tracking numbers are invented;
 *  - the supply products, supply prices and the monthly plan are invented;
 *  - what the seller does (confirm a deposit, ship) is saved only in this browser's localStorage.
 * There is no server, bank, payment or courier integration.
 */

// ---------------------------------------------------------------------------
// Supply (운영자 공급 상품) and plan fixtures
// ---------------------------------------------------------------------------

/** A product supplied by the operator and held by this seller. See docs/platform/business-model.md. */
export type SupplyProduct = {
  /** Matches order items by product name (the demo order items carry no product id). */
  name: string;
  image: string;
  /** 공급가: what the seller owes the operator per shipped unit. Never shown to buyers. */
  supplyPrice: number;
  /** 최저 판매가 */
  minPrice: number;
  /** 넘긴 수량: units the operator handed to this seller. */
  received: number;
  /** 회수 수량: unsold units the operator took back. */
  recovered: number;
};

const supply = (index: number, supplyPrice: number, minPrice: number, received: number, recovered = 0): SupplyProduct => ({
  name: NANDAPICK.products[index].name,
  image: NANDAPICK.products[index].image,
  supplyPrice,
  minPrice,
  received,
  recovered,
});

export const SUPPLY_PRODUCTS: readonly SupplyProduct[] = [
  supply(0, 5000, 7000, 40),
  supply(1, 5000, 7000, 30, 5),
  supply(2, 12000, 16000, 20),
];

const SUPPLY_BY_NAME = new Map(SUPPLY_PRODUCTS.map((product) => [product.name, product]));
export const supplyProductOf = (item: { name: string }) => SUPPLY_BY_NAME.get(item.name);

/** Fake 이용료 플랜 assigned to the demo seller. */
export const SELLER_PLAN = { name: "베이직", monthlyFee: 50000 } as const;

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
  /** Name on the deposit, as the seller would read it from the bank statement. `null`: no deposit seen. */
  depositorName: string | null;
  paidMinutesAgo?: number;
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

const LIVE = "🔴 26.11.20 08:00 라이브";
const DAY = 24 * 60;

const CUSTOMER_ORDERS: readonly CustomerOrderFixture[] = [
  {
    id: "P202611230000000101",
    label: LIVE,
    status: "UNPAID",
    minutesAgo: 8,
    paymentWindowMinutes: DAY,
    items: [item(0, "블랙/L", 2)],
    customer: customer("김데모", "달빛여우", 1),
    depositorName: null,
    addressConfirmed: true,
  },
  {
    id: "P202611230000000102",
    label: LIVE,
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
    label: LIVE,
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
    label: LIVE,
    status: "PAID",
    minutesAgo: 2 * 60,
    paidMinutesAgo: 90,
    paymentWindowMinutes: DAY,
    items: [item(0, "화이트/M", 3), item(12, "블랙/L")],
    customer: customer("최샘플", "하늘별", 4),
    depositorName: "최샘플",
    addressConfirmed: true,
  },
  {
    id: "P202611230000000105",
    label: LIVE,
    status: "PAID",
    minutesAgo: 3 * 60,
    paidMinutesAgo: 150,
    paymentWindowMinutes: DAY,
    items: [item(7, "차콜/L")],
    customer: customer("오더미", "새벽러너", 5),
    depositorName: "오더미",
    addressConfirmed: true,
  },
  {
    id: "P202611220000000106",
    label: LIVE,
    status: "PAID",
    minutesAgo: DAY + 2 * 60,
    paidMinutesAgo: DAY,
    paymentWindowMinutes: DAY,
    items: [item(0, "네이비/L", 4), item(1, "블랙/M", 2), item(2, "블랙/L")],
    customer: customer("정테스트", "모카빵", 6),
    depositorName: "정테스트",
    shipped: { carrier: CARRIERS[0], trackingNumber: "0000-0000-0001", minutesAgo: 3 * 60 },
    addressConfirmed: true,
  },
  {
    id: "P202611230000000107",
    label: LIVE,
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
type Fulfillment = { paidAt?: string; carrier?: string; trackingNumber?: string; shippedAt?: string };

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
  status: SellerOrderStatus;
  /** Epoch ms. */
  orderedAt: number;
  minutesAgo: number;
  deadline: number;
  customer: OrderCustomer;
  depositorName: string | null;
  /** A deposit was seen and its name is not exactly the orderer's name. */
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

/** Every order of the store, newest first. `undefined` during server render and hydration. */
export function useSellerOrders(): SellerOrder[] | undefined {
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
    // The demo buyer's deposit name is only known once they say they paid (or the order is paid).
    const fromBuyer = buyerOrders.map((order) =>
      toSellerOrder(
        order,
        DEMO_BUYER,
        order.depositRequested || order.status === "PAID" || saved[order.id]?.paidAt ? DEMO_BUYER.name : null,
        now,
        saved[order.id],
      ),
    );
    return [...fromBuyer, ...fromCustomers].sort((a, b) => b.orderedAt - a.orderedAt);
  }, [raw, now, buyerOrders]);
}

export const sellerAdmin = {
  /** 입금 확인: the order becomes 결제완료. The buyer's own screens show it as paid too. */
  confirmDeposit(orderId: string) {
    const saved = parse(readRaw());
    write({ ...saved, [orderId]: { ...saved[orderId], paidAt: new Date().toISOString() } });
    demoOrders.markPaid(orderId);
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
// Supply stock and monthly figures (docs/platform/business-model.md)
// ---------------------------------------------------------------------------

export type SupplyStockRow = SupplyProduct & {
  /** 발송 수량: units in shipped orders. A sale is confirmed at shipment. */
  shipped: number;
  /** 셀러 보유 재고 = 넘긴 수량 − 발송 수량 − 회수 수량 */
  remaining: number;
  /** Units in paid orders that still have to ship. */
  awaitingShipment: number;
};

function unitsOf(orders: readonly SellerOrder[], name: string, status: SellerOrderStatus) {
  return orders
    .filter((order) => order.status === status)
    .flatMap((order) => order.items)
    .filter((entry) => entry.name === name)
    .reduce((sum, entry) => sum + entry.quantity, 0);
}

export function supplyStock(orders: readonly SellerOrder[]): SupplyStockRow[] {
  return SUPPLY_PRODUCTS.map((entry) => {
    const shipped = unitsOf(orders, entry.name, "SHIPPED");
    return {
      ...entry,
      shipped,
      remaining: entry.received - shipped - entry.recovered,
      awaitingShipment: unitsOf(orders, entry.name, "PAID"),
    };
  });
}

export type MonthlySummary = {
  /** "2026년 11월" */
  month: string;
  shippedOrders: number;
  /** 상품 매출: item amounts of orders shipped this month. */
  itemSales: number;
  /** Shipping fees collected on those orders. */
  shippingFees: number;
  supplyLines: { name: string; quantity: number; supplyPrice: number; amount: number }[];
  /** 공급 대금 = Σ 발송 수량 × 공급가 */
  supplyCost: number;
  monthlyFee: number;
  /** 청구 예정 금액 = 월 이용료 + 공급 대금 (no returns exist in the draft). */
  billing: number;
};

export function monthlySummary(orders: readonly SellerOrder[], now: number): MonthlySummary {
  const today = new Date(now);
  const shippedThisMonth = orders.filter((order) => {
    if (!order.shipment) return false;
    const date = new Date(order.shipment.shippedAt);
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
  });
  const supplyLines = SUPPLY_PRODUCTS.map((entry) => {
    const quantity = shippedThisMonth
      .flatMap((order) => order.items)
      .filter((line) => line.name === entry.name)
      .reduce((sum, line) => sum + line.quantity, 0);
    return { name: entry.name, quantity, supplyPrice: entry.supplyPrice, amount: quantity * entry.supplyPrice };
  }).filter((line) => line.quantity > 0);
  const supplyCost = supplyLines.reduce((sum, line) => sum + line.amount, 0);
  return {
    month: `${today.getFullYear()}년 ${today.getMonth() + 1}월`,
    shippedOrders: shippedThisMonth.length,
    itemSales: shippedThisMonth.reduce((sum, order) => sum + order.totals.items, 0),
    shippingFees: shippedThisMonth.reduce((sum, order) => sum + order.totals.shipping, 0),
    supplyLines,
    supplyCost,
    monthlyFee: SELLER_PLAN.monthlyFee,
    billing: SELLER_PLAN.monthlyFee + supplyCost,
  };
}
