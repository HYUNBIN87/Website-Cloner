"use client";

import { useMemo, useSyncExternalStore } from "react";
import { sessionStart, useNow } from "./clock";
import {
  DEMO_PRE_ORDERS,
  DEMO_TIME_DEAL,
  productPrice,
  type DemoPreOrder,
  type PreOrderStatus,
} from "./demo-account";
import type { Product } from "./nandapick";
import { paymentDeadline, useStoreSettings, type PaymentDeadlinePolicy } from "./store-settings";

/**
 * Pre-orders created in the demo live room. Like the demo session, they live only in this
 * browser's localStorage; nothing is sent anywhere. Stored entries are either new orders or
 * edited copies of the built-in fake orders (same id).
 */
const STORAGE_KEY = "livemarket-clone-demo-orders-v2";

const BUILT_IN_IDS = new Set(DEMO_PRE_ORDERS.map((order) => order.id));
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): DemoPreOrder[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? (value as DemoPreOrder[]) : [];
  } catch {
    return [];
  }
}

function write(orders: DemoPreOrder[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // Storage blocked: orders simply do not persist.
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

/** Room orders first (newest on top), then the built-in orders with any stored edits applied. */
function merge(stored: DemoPreOrder[]): DemoPreOrder[] {
  const byId = new Map(stored.map((order) => [order.id, order]));
  return [
    ...stored.filter((order) => !BUILT_IN_IDS.has(order.id)),
    ...DEMO_PRE_ORDERS.map((order) => byId.get(order.id) ?? order),
  ];
}

const isRoomOrder = (order: { id: string }) => !BUILT_IN_IDS.has(order.id);

/** An order with everything that depends on the clock and the store's payment deadline filled in. */
export type ResolvedPreOrder = Omit<DemoPreOrder, "status" | "minutesAgo"> & {
  /** Effective status: an unpaid order past its deadline is 기한 만료. */
  status: PreOrderStatus;
  minutesAgo: number;
  /** Payment deadline, epoch ms. */
  deadline: number;
};

function orderedAtMs(order: DemoPreOrder) {
  const parsed = order.orderedAt ? Date.parse(order.orderedAt) : NaN;
  return Number.isNaN(parsed) ? sessionStart() - (order.minutesAgo ?? 0) * 60_000 : parsed;
}

function deadlineOf(order: DemoPreOrder, policy: PaymentDeadlinePolicy) {
  return paymentDeadline(new Date(orderedAtMs(order)), policy).getTime();
}

/** A deposit check in progress keeps the order open; otherwise the deadline expires it. */
const isExpired = (order: DemoPreOrder, policy: PaymentDeadlinePolicy, now: number) =>
  order.status === "UNPAID" && !order.depositRequested && now > deadlineOf(order, policy);

function resolve(order: DemoPreOrder, policy: PaymentDeadlinePolicy, now: number): ResolvedPreOrder {
  return {
    ...order,
    status: isExpired(order, policy, now) ? "EXPIRED" : order.status,
    minutesAgo: Math.max(0, Math.floor((now - orderedAtMs(order)) / 60_000)),
    deadline: deadlineOf(order, policy),
  };
}

/** `undefined` while unknown (server render and hydration), then every demo order. */
export function useDemoOrders(): ResolvedPreOrder[] | undefined {
  const raw = useSyncExternalStore<string | null | undefined>(subscribe, readRaw, () => undefined);
  const now = useNow();
  const policy = useStoreSettings().paymentDeadline;
  return useMemo(
    () =>
      raw === undefined || now === undefined
        ? undefined
        : merge(parse(raw)).map((order) => resolve(order, policy, now)),
    [raw, now, policy],
  );
}

/** The most recent payable order placed in the room, if any. */
export function latestRoomOrder(orders: readonly ResolvedPreOrder[] | undefined) {
  return orders?.find((order) => isRoomOrder(order) && order.status === "UNPAID");
}

const pad = (value: number) => String(value).padStart(2, "0");

function newOrder(now: Date): DemoPreOrder {
  const day = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  return {
    // Same shape as the source's order numbers; the digits are just this browser's clock.
    id: `P${day}${String(now.getTime()).slice(-10)}`,
    label: DEMO_TIME_DEAL.label,
    status: "UNPAID",
    orderedAt: now.toISOString(),
    items: [],
    timeDeal: { startedAt: DEMO_TIME_DEAL.startedAt, title: DEMO_TIME_DEAL.title },
  };
}

export const demoOrders = {
  /**
   * Mirrors the source's pre-order upsert: the item joins the open room order (unpaid, not
   * expired, deposit check not requested yet) or starts a new one. Returns the order id.
   */
  addItem(product: Product, option: string, quantity: number, policy: PaymentDeadlinePolicy): string {
    const now = new Date();
    const stored = parse(readRaw());
    const open = stored.find(
      (order) =>
        isRoomOrder(order) &&
        order.status === "UNPAID" &&
        !order.depositRequested &&
        !isExpired(order, policy, now.getTime()),
    );
    const order = open ?? newOrder(now);
    const unitPrice = productPrice(product);
    const existing = order.items.find((entry) => entry.name === product.name && entry.option === option);
    const items = existing
      ? order.items.map((entry) =>
          entry === existing
            ? { ...entry, quantity: entry.quantity + quantity, amount: entry.amount + unitPrice * quantity }
            : entry,
        )
      : [...order.items, { name: product.name, image: product.image, option, quantity, amount: unitPrice * quantity }];
    const next = { ...order, items };
    write(open ? stored.map((entry) => (entry === open ? next : entry)) : [next, ...stored]);
    return next.id;
  },

  update(id: string, patch: Pick<DemoPreOrder, "request" | "addressConfirmed" | "depositRequested">) {
    const stored = parse(readRaw());
    const current = stored.find((order) => order.id === id);
    if (current) {
      write(stored.map((order) => (order === current ? { ...current, ...patch } : order)));
      return;
    }
    const builtIn = DEMO_PRE_ORDERS.find((order) => order.id === id);
    if (builtIn) write([...stored, { ...builtIn, ...patch }]);
  },
};
