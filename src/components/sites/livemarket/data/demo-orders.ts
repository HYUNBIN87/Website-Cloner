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
import { maxOrderQuantity, paymentDeadline, type StoreSettings } from "./store-settings";

/**
 * Pre-orders created in the demo live room. Like the demo session, they live only in this
 * browser's localStorage; nothing is sent anywhere. Stored entries are either new orders or
 * edited copies of the built-in fake orders (same id).
 */
const STORAGE_KEY = "livemarket-clone-demo-orders-v3";

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

/** An order with everything that depends on the clock filled in. */
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

/**
 * The deadline saved with the order. It never consults the current store settings, so changing
 * the payment deadline setting leaves existing orders alone.
 */
function deadlineOf(order: DemoPreOrder) {
  const stored = order.paymentDeadline ? Date.parse(order.paymentDeadline) : NaN;
  return Number.isNaN(stored) ? orderedAtMs(order) + (order.paymentWindowMinutes ?? 0) * 60_000 : stored;
}

/** A deposit check in progress keeps the order open; otherwise the deadline expires it. */
const isExpired = (order: DemoPreOrder, now: number) =>
  order.status === "UNPAID" && !order.depositRequested && now > deadlineOf(order);

export function resolvePreOrder(order: DemoPreOrder, now: number): ResolvedPreOrder {
  return {
    ...order,
    status: isExpired(order, now) ? "EXPIRED" : order.status,
    minutesAgo: Math.max(0, Math.floor((now - orderedAtMs(order)) / 60_000)),
    deadline: deadlineOf(order),
  };
}

/** `undefined` while unknown (server render and hydration), then every demo order. */
export function useDemoOrders(): ResolvedPreOrder[] | undefined {
  const raw = useSyncExternalStore<string | null | undefined>(subscribe, readRaw, () => undefined);
  const now = useNow();
  return useMemo(
    () =>
      raw === undefined || now === undefined
        ? undefined
        : merge(parse(raw)).map((order) => resolvePreOrder(order, now)),
    [raw, now],
  );
}

/** The most recent payable order placed in the room, if any. */
export function latestRoomOrder(orders: readonly ResolvedPreOrder[] | undefined) {
  return orders?.find((order) => isRoomOrder(order) && order.status === "UNPAID");
}

const pad = (value: number) => String(value).padStart(2, "0");

function newOrder(now: Date, settings: StoreSettings): DemoPreOrder {
  const day = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  return {
    // Same shape as the source's order numbers; the digits are just this browser's clock.
    id: `P${day}${String(now.getTime()).slice(-10)}`,
    label: DEMO_TIME_DEAL.label,
    status: "UNPAID",
    orderedAt: now.toISOString(),
    // Saved once, from the setting in force at order time.
    paymentDeadline: paymentDeadline(now, settings.paymentDeadline).toISOString(),
    shipping: { fee: settings.shipping.fee, freeFrom: settings.shipping.freeFrom },
    items: [],
    timeDeal: { startedAt: DEMO_TIME_DEAL.startedAt, title: DEMO_TIME_DEAL.title },
  };
}

export const demoOrders = {
  /**
   * Mirrors the source's pre-order upsert. With the store's 주문서 합치기 setting on, the item
   * joins the room order that is unpaid, not expired and has no deposit check requested yet
   * (keeping that order's deadline); otherwise the add starts a new order sheet. An order whose
   * buyer already asked for a deposit check is never changed: the buyer may have paid, and the
   * seller must be able to match the deposit against the order amount. Returns the order id.
   */
  addItem(product: Product, option: string, requested: number, settings: StoreSettings): string {
    const now = new Date();
    const quantity = Math.min(Math.max(1, requested), maxOrderQuantity(settings));
    const stored = parse(readRaw());
    const open = settings.mergeOrders
      ? stored.find(
          (order) =>
            isRoomOrder(order) &&
            order.status === "UNPAID" &&
            !order.depositRequested &&
            !isExpired(order, now.getTime()),
        )
      : undefined;
    const order = open ?? newOrder(now, settings);
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

  update(
    id: string,
    patch: Partial<Pick<DemoPreOrder, "request" | "addressConfirmed" | "depositRequested" | "status">>,
  ) {
    const stored = parse(readRaw());
    const current = stored.find((order) => order.id === id);
    if (current) {
      write(stored.map((order) => (order === current ? { ...current, ...patch } : order)));
      return;
    }
    const builtIn = DEMO_PRE_ORDERS.find((order) => order.id === id);
    if (builtIn) write([...stored, { ...builtIn, ...patch }]);
  },

  /** The seller confirmed the deposit (seller admin). Unknown ids are ignored. */
  markPaid(id: string) {
    this.update(id, { status: "PAID" });
  },
};
