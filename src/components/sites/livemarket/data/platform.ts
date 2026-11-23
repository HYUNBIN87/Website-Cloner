"use client";

import { useMemo } from "react";
import { createLocalStore, parseJson } from "./local-store";
import { NANDAPICK } from "./nandapick";

/*
 * Platform data shared by the operator admin (/operator-admin) and the seller admin
 * (/seller-admin): supply products, what was handed to and recovered from each seller, fee
 * plans, sellers and collected invoices. See docs/platform/business-model.md.
 *
 * Everything is FAKE (sellers, names, phone numbers, prices, quantities) and lives only in this
 * browser's localStorage. Both admins read this one store, so their numbers agree.
 */

export type SupplyProduct = {
  id: string;
  /** Order items are matched to supply products by name (demo order items carry no product id). */
  name: string;
  image: string;
  /** 공급가: what a seller owes the operator per shipped unit. Never shown to buyers. */
  supplyPrice: number;
  /** 최저 판매가 */
  minPrice: number;
  /** 재고: units the operator still holds and can hand to sellers. */
  stock: number;
};

/** 공급 출고 (handover to a seller) or 회수 (unsold units taken back). */
export type StockMove = { id: string; sellerId: string; productId: string; quantity: number; at: string };

export type OverdueAction = "NOTICE" | "SUSPEND";

export const OVERDUE_ACTION_TEXT: Record<OverdueAction, string> = {
  NOTICE: "안내만 보냄",
  SUSPEND: "스토어 이용 제한",
};

export type FeePlan = {
  id: string;
  name: string;
  /** 월 이용료 (원) */
  monthlyFee: number;
  /** 결제일: day of the month the previous month's invoice is due (1 to 28). */
  billingDay: number;
  /** 미납 시 처리: what happens `overdueGraceDays` after the due date. Not enforced in the draft. */
  overdueGraceDays: number;
  overdueAction: OverdueAction;
};

export type SellerStatus = "PENDING" | "APPROVED" | "REJECTED";

export type PlatformSeller = {
  id: string;
  storeName: string;
  ownerName: string;
  phone: string;
  /** What the applicant says they sell. */
  category: string;
  status: SellerStatus;
  planId: string;
  appliedAt: string;
  decidedAt?: string;
};

export type PlatformState = {
  products: SupplyProduct[];
  handovers: StockMove[];
  recoveries: StockMove[];
  plans: FeePlan[];
  sellers: PlatformSeller[];
  /** `${sellerId}:${yyyy-MM}` → ISO time the operator ticked 수금 완료. */
  collected: Record<string, string>;
};

/** The demo store of the consumer screens and the seller admin. */
export const DEMO_SELLER_ID = NANDAPICK.slug;

const product = (index: number, supplyPrice: number, minPrice: number, stock: number): SupplyProduct => ({
  id: `sp-${index + 1}`,
  name: NANDAPICK.products[index].name,
  image: NANDAPICK.products[index].image,
  supplyPrice,
  minPrice,
  stock,
});

const DEFAULT_STATE: PlatformState = {
  products: [product(0, 5000, 7000, 120), product(1, 5000, 7000, 80), product(2, 12000, 16000, 45)],
  handovers: [
    { id: "h-1", sellerId: DEMO_SELLER_ID, productId: "sp-1", quantity: 25, at: "2026-11-03T10:00:00" },
    { id: "h-2", sellerId: DEMO_SELLER_ID, productId: "sp-2", quantity: 30, at: "2026-11-03T10:00:00" },
    { id: "h-3", sellerId: "yesi-market", productId: "sp-1", quantity: 30, at: "2026-10-12T14:00:00" },
    { id: "h-4", sellerId: "yesi-market", productId: "sp-3", quantity: 15, at: "2026-10-12T14:00:00" },
    { id: "h-5", sellerId: "sample-store", productId: "sp-2", quantity: 20, at: "2026-11-05T09:30:00" },
    { id: "h-6", sellerId: DEMO_SELLER_ID, productId: "sp-3", quantity: 20, at: "2026-11-10T11:00:00" },
    { id: "h-7", sellerId: DEMO_SELLER_ID, productId: "sp-1", quantity: 15, at: "2026-11-17T16:00:00" },
  ],
  recoveries: [
    { id: "r-1", sellerId: DEMO_SELLER_ID, productId: "sp-2", quantity: 5, at: "2026-11-18T15:00:00" },
    { id: "r-2", sellerId: "yesi-market", productId: "sp-3", quantity: 3, at: "2026-11-02T13:00:00" },
  ],
  plans: [
    { id: "basic", name: "베이직", monthlyFee: 50000, billingDay: 10, overdueGraceDays: 7, overdueAction: "NOTICE" },
    { id: "pro", name: "프로", monthlyFee: 120000, billingDay: 10, overdueGraceDays: 14, overdueAction: "SUSPEND" },
  ],
  sellers: [
    { id: DEMO_SELLER_ID, storeName: NANDAPICK.name, ownerName: "홍길동", phone: "010-0000-0000", category: "의류", status: "APPROVED", planId: "basic", appliedAt: "2026-09-20T09:00:00", decidedAt: "2026-09-21T10:00:00" },
    { id: "yesi-market", storeName: "예시마켓", ownerName: "김예시", phone: "010-0000-0011", category: "잡화", status: "APPROVED", planId: "pro", appliedAt: "2026-09-25T09:00:00", decidedAt: "2026-09-26T10:00:00" },
    { id: "sample-store", storeName: "샘플상회", ownerName: "이샘플", phone: "010-0000-0012", category: "의류", status: "APPROVED", planId: "basic", appliedAt: "2026-10-28T09:00:00", decidedAt: "2026-10-29T10:00:00" },
    { id: "virtual-shop", storeName: "가상스토어", ownerName: "박가상", phone: "010-0000-0013", category: "생활용품", status: "PENDING", planId: "basic", appliedAt: "2026-11-21T13:20:00" },
    { id: "test-shop", storeName: "테스트샵", ownerName: "최테스트", phone: "010-0000-0014", category: "식품", status: "PENDING", planId: "basic", appliedAt: "2026-11-22T18:05:00" },
  ],
  collected: { "yesi-market:2026-10": "2026-11-09T10:00:00" },
};

/**
 * Units the other (fake) sellers shipped. They have no order data in the clone, so these are
 * fixed. The demo store's shipped units are counted from its real demo orders instead.
 */
const OTHER_SELLERS_SHIPPED: Record<string, Record<string, { thisMonth: number; lastMonth: number }>> = {
  "yesi-market": { "sp-1": { thisMonth: 9, lastMonth: 12 }, "sp-3": { thisMonth: 4, lastMonth: 5 } },
  "sample-store": { "sp-2": { thisMonth: 6, lastMonth: 0 } },
};

export type ShippedUnits = { thisMonth: number; lastMonth: number; total: number };
const NO_UNITS: ShippedUnits = { thisMonth: 0, lastMonth: 0, total: 0 };

/** `demoSellerShipped`: the demo store's shipped units per product name, from its orders. */
export function shippedUnits(
  sellerId: string,
  item: SupplyProduct,
  demoSellerShipped: ReadonlyMap<string, ShippedUnits>,
): ShippedUnits {
  if (sellerId === DEMO_SELLER_ID) return demoSellerShipped.get(item.name) ?? NO_UNITS;
  const fixed = OTHER_SELLERS_SHIPPED[sellerId]?.[item.id];
  return fixed ? { ...fixed, total: fixed.thisMonth + fixed.lastMonth } : NO_UNITS;
}

const store = createLocalStore("livemarket-clone-platform");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Saved state is used only if it has the expected top-level shape; otherwise the defaults. */
function toState(value: unknown): PlatformState {
  if (
    isRecord(value) &&
    Array.isArray(value.products) &&
    Array.isArray(value.handovers) &&
    Array.isArray(value.recoveries) &&
    Array.isArray(value.plans) &&
    Array.isArray(value.sellers) &&
    isRecord(value.collected)
  ) {
    return value as PlatformState;
  }
  return DEFAULT_STATE;
}

const current = () => toState(parseJson(store.read()));

/** The platform state outside React (event handlers and other stores). Client only. */
export const getPlatformState = (): PlatformState => current();
const update = (change: (state: PlatformState) => PlatformState) => store.write(change(current()));

/** `undefined` during server render and hydration. */
export function usePlatform(): PlatformState | undefined {
  const raw = store.useRaw();
  return useMemo(() => (raw === undefined ? undefined : toState(parseJson(raw))), [raw]);
}

const sum = (moves: readonly StockMove[], sellerId: string, productId: string) =>
  moves
    .filter((move) => move.sellerId === sellerId && move.productId === productId)
    .reduce((total, move) => total + move.quantity, 0);

/** 넘긴 수량 */
export const handedTo = (state: PlatformState, sellerId: string, productId: string) =>
  sum(state.handovers, sellerId, productId);
/** 회수 수량 */
export const recoveredFrom = (state: PlatformState, sellerId: string, productId: string) =>
  sum(state.recoveries, sellerId, productId);

export const planOf = (state: PlatformState, sellerId: string): FeePlan | undefined => {
  const seller = state.sellers.find((entry) => entry.id === sellerId);
  return state.plans.find((plan) => plan.id === seller?.planId) ?? state.plans[0];
};

export const approvedSellers = (state: PlatformState) => state.sellers.filter((seller) => seller.status === "APPROVED");

export type Holding = {
  product: SupplyProduct;
  handed: number;
  shipped: ShippedUnits;
  recovered: number;
  /** 셀러 보유 재고 = 넘긴 수량 − 발송 수량 − 회수 수량 */
  holding: number;
};

/** One row per supply product ever handed to the seller. */
export function sellerHoldings(
  state: PlatformState,
  sellerId: string,
  demoSellerShipped: ReadonlyMap<string, ShippedUnits>,
): Holding[] {
  return state.products
    .map((item) => {
      const handed = handedTo(state, sellerId, item.id);
      const shipped = shippedUnits(sellerId, item, demoSellerShipped);
      const recovered = recoveredFrom(state, sellerId, item.id);
      return { product: item, handed, shipped, recovered, holding: handed - shipped.total - recovered };
    })
    .filter((row) => row.handed > 0);
}

export type InvoiceMonth = "thisMonth" | "lastMonth";

export type Invoice = {
  /** "2026-11" */
  monthKey: string;
  /** "2026년 11월" */
  monthLabel: string;
  plan: FeePlan | undefined;
  monthlyFee: number;
  lines: { name: string; quantity: number; supplyPrice: number; amount: number }[];
  /** 공급 대금 = Σ 발송 수량 × 공급가 */
  supplyCost: number;
  /** 취소·반품분. Always 0 in the draft: there is no return flow yet. */
  returns: number;
  /** 월 청구 금액 = 월 이용료 + 공급 대금 − 취소·반품분 */
  total: number;
};

export function monthOf(now: number, which: InvoiceMonth) {
  const date = new Date(now);
  const first = new Date(date.getFullYear(), date.getMonth() + (which === "lastMonth" ? -1 : 0), 1);
  return {
    key: `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}`,
    label: `${first.getFullYear()}년 ${first.getMonth() + 1}월`,
    start: first.getTime(),
  };
}

/** The seller's invoice for the month. Supply cost uses the current supply price. */
export function invoiceFor(
  state: PlatformState,
  sellerId: string,
  which: InvoiceMonth,
  now: number,
  demoSellerShipped: ReadonlyMap<string, ShippedUnits>,
): Invoice {
  const month = monthOf(now, which);
  const plan = planOf(state, sellerId);
  const lines = state.products
    .map((item) => {
      const quantity = shippedUnits(sellerId, item, demoSellerShipped)[which];
      return { name: item.name, quantity, supplyPrice: item.supplyPrice, amount: quantity * item.supplyPrice };
    })
    .filter((line) => line.quantity > 0);
  const supplyCost = lines.reduce((total, line) => total + line.amount, 0);
  const monthlyFee = plan?.monthlyFee ?? 0;
  return {
    monthKey: month.key,
    monthLabel: month.label,
    plan,
    monthlyFee,
    lines,
    supplyCost,
    returns: 0,
    total: monthlyFee + supplyCost,
  };
}

const whole = (value: number, min = 0) => (Number.isFinite(value) ? Math.max(min, Math.floor(value)) : min);
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

/** Writes of the operator admin. Each returns an error message, or `null` when it was applied. */
export const platform = {
  addProduct(input: { name: string; supplyPrice: number; minPrice: number; stock: number }): string | null {
    const name = input.name.trim();
    if (!name) return "상품명을 입력해주세요.";
    if (current().products.some((item) => item.name === name)) return "같은 이름의 공급 상품이 이미 있습니다.";
    if (input.minPrice < input.supplyPrice) return "최저 판매가는 공급가보다 낮을 수 없습니다.";
    update((state) => ({
      ...state,
      products: [
        ...state.products,
        {
          id: newId("sp"),
          name,
          // No image upload in the draft: new products use the platform icon.
          image: "/sites/livemarket/img/live_market_icon.png",
          supplyPrice: whole(input.supplyPrice),
          minPrice: whole(input.minPrice),
          stock: whole(input.stock),
        },
      ],
    }));
    return null;
  },

  updateProduct(id: string, patch: Partial<Pick<SupplyProduct, "supplyPrice" | "minPrice" | "stock">>) {
    update((state) => ({
      ...state,
      products: state.products.map((item) =>
        item.id === id
          ? {
              ...item,
              ...Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, whole(value ?? 0)])),
            }
          : item,
      ),
    }));
  },

  /** 공급 출고: moves units from the operator's stock to the seller. */
  addHandover(sellerId: string, productId: string, quantity: number): string | null {
    const state = current();
    const item = state.products.find((entry) => entry.id === productId);
    const amount = whole(quantity);
    if (!item || !state.sellers.some((seller) => seller.id === sellerId && seller.status === "APPROVED")) {
      return "셀러와 상품을 선택해주세요.";
    }
    if (amount < 1) return "수량을 1개 이상 입력해주세요.";
    if (amount > item.stock) return `운영자 재고(${item.stock}개)보다 많이 넘길 수 없습니다.`;
    store.write({
      ...state,
      products: state.products.map((entry) => (entry.id === productId ? { ...entry, stock: entry.stock - amount } : entry)),
      handovers: [...state.handovers, { id: newId("h"), sellerId, productId, quantity: amount, at: new Date().toISOString() }],
    });
    return null;
  },

  /** 회수: unsold units come back from the seller into the operator's stock. */
  addRecovery(sellerId: string, productId: string, quantity: number, holding: number): string | null {
    const state = current();
    const amount = whole(quantity);
    if (!state.products.some((entry) => entry.id === productId)) return "셀러와 상품을 선택해주세요.";
    if (amount < 1) return "수량을 1개 이상 입력해주세요.";
    if (amount > holding) return `셀러 보유 재고(${holding}개)보다 많이 회수할 수 없습니다.`;
    store.write({
      ...state,
      products: state.products.map((entry) => (entry.id === productId ? { ...entry, stock: entry.stock + amount } : entry)),
      recoveries: [...state.recoveries, { id: newId("r"), sellerId, productId, quantity: amount, at: new Date().toISOString() }],
    });
    return null;
  },

  updatePlan(id: string, patch: Partial<Omit<FeePlan, "id">>) {
    update((state) => ({
      ...state,
      plans: state.plans.map((plan) => {
        if (plan.id !== id) return plan;
        const next = { ...plan, ...patch };
        return {
          ...next,
          monthlyFee: whole(next.monthlyFee),
          billingDay: Math.min(28, whole(next.billingDay, 1)),
          overdueGraceDays: whole(next.overdueGraceDays),
        };
      }),
    }));
  },

  addPlan() {
    update((state) => ({
      ...state,
      plans: [
        ...state.plans,
        { id: newId("plan"), name: "새 플랜", monthlyFee: 0, billingDay: 10, overdueGraceDays: 7, overdueAction: "NOTICE" },
      ],
    }));
  },

  decideSeller(id: string, status: "APPROVED" | "REJECTED") {
    update((state) => ({
      ...state,
      sellers: state.sellers.map((seller) =>
        seller.id === id ? { ...seller, status, decidedAt: new Date().toISOString() } : seller,
      ),
    }));
  },

  setSellerPlan(id: string, planId: string) {
    update((state) => ({
      ...state,
      sellers: state.sellers.map((seller) => (seller.id === id ? { ...seller, planId } : seller)),
    }));
  },

  /** 수금 체크 for one seller and month ("2026-10"). */
  setCollected(sellerId: string, monthKey: string, collected: boolean) {
    update((state) => {
      const next = { ...state.collected };
      if (collected) next[`${sellerId}:${monthKey}`] = new Date().toISOString();
      else delete next[`${sellerId}:${monthKey}`];
      return { ...state, collected: next };
    });
  },

  /** Back to the built-in fake data. */
  reset() {
    store.write(null);
  },
};
