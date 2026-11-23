import { NANDAPICK } from "./nandapick";

/**
 * Per-store settings a seller will later edit in the admin. For now the values live in this
 * file. Everything reads them through `getStoreSettings` / `useStoreSettings` below, so moving
 * to an admin-backed source only means changing those two functions.
 */

/** How long a buyer has to pay an order sheet. */
export type PaymentDeadlinePolicy =
  /** 주문 후 N분 이내 */
  | { type: "MINUTES_AFTER_ORDER"; minutes: number }
  /** 주문 다음 날 같은 시각까지 */
  | { type: "NEXT_DAY_SAME_TIME" };

export type ShippingSettings = {
  method: string;
  fee: number;
  /** 조건부 무료: item total from which shipping is free. `null` = never free. */
  freeFrom: number | null;
  /** 도서산간 추가 배송비. `null` = no surcharge. */
  remoteAreaFee: number | null;
};

export type StoreSettings = {
  paymentDeadline: PaymentDeadlinePolicy;
  shipping: ShippingSettings;
  /** Deposit account for 무통장입금. */
  bankAccount: { bank: string; number: string; holder: string };
};

/** Demo store values. The bank account is invented, like every other personal detail. */
const DEMO_STORE_SETTINGS: Record<string, StoreSettings> = {
  [NANDAPICK.slug]: {
    paymentDeadline: { type: "MINUTES_AFTER_ORDER", minutes: 30 },
    shipping: { method: "택배", fee: 4000, freeFrom: 100000, remoteAreaFee: 3000 },
    bankAccount: { bank: "예시은행", number: "000-000-000000", holder: "데모상점" },
  },
};

/** The single place store settings are read from. */
export function getStoreSettings(slug: string = NANDAPICK.slug): StoreSettings {
  return DEMO_STORE_SETTINGS[slug] ?? DEMO_STORE_SETTINGS[NANDAPICK.slug];
}

/** Component-side reader. It is a hook so it can later subscribe to admin-edited settings. */
export function useStoreSettings(slug?: string): StoreSettings {
  return getStoreSettings(slug);
}

const policyMinutes = (policy: Extract<PaymentDeadlinePolicy, { type: "MINUTES_AFTER_ORDER" }>) =>
  Math.max(1, Math.floor(policy.minutes));

/** When an order placed at `orderedAt` stops being payable. */
export function paymentDeadline(orderedAt: Date, policy: PaymentDeadlinePolicy): Date {
  if (policy.type === "NEXT_DAY_SAME_TIME") {
    const next = new Date(orderedAt);
    next.setDate(next.getDate() + 1);
    return next;
  }
  return new Date(orderedAt.getTime() + policyMinutes(policy) * 60_000);
}

/** "30분", "1시간 30분", "24시간" — the window as a duration. */
export function paymentWindowText(policy: PaymentDeadlinePolicy): string {
  if (policy.type === "NEXT_DAY_SAME_TIME") return "24시간";
  const minutes = policyMinutes(policy);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}분`;
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
}

/** "주문 후 30분 이내" / "주문 다음 날 같은 시각까지" */
export function paymentDeadlineRuleText(policy: PaymentDeadlinePolicy): string {
  return policy.type === "NEXT_DAY_SAME_TIME"
    ? "주문 다음 날 같은 시각까지"
    : `주문 후 ${paymentWindowText(policy)} 이내`;
}

export function shippingFeeFor(itemsTotal: number, shipping: ShippingSettings): number {
  return shipping.freeFrom !== null && itemsTotal >= shipping.freeFrom ? 0 : shipping.fee;
}
