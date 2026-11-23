"use client";

import { useMemo, useSyncExternalStore } from "react";
import { NANDAPICK } from "./nandapick";

/**
 * Per-store settings. The defaults live in this file; the seller admin draft
 * (/seller-admin/settings) saves edited values to this browser's localStorage, and
 * `getStoreSettings` / `useStoreSettings` below return the saved values over the defaults.
 * Every screen reads settings through those two functions, so moving to a server-backed
 * source only means changing them.
 *
 * The item list and the screens each item drives are documented in
 * docs/research/livemarket/store-settings.md. Keep the two in sync.
 */

/** How long a buyer has to pay an order sheet. */
export type PaymentDeadlinePolicy =
  /** 주문 후 N분 이내 */
  | { type: "MINUTES_AFTER_ORDER"; minutes: number }
  /** 주문 다음 날 같은 시각까지 */
  | { type: "NEXT_DAY_SAME_TIME" };

export type ShippingSettings = {
  method: string;
  /** 기본 배송비 */
  fee: number;
  /** 무료배송 기준 금액: item total from which shipping is free. `null` = never free. */
  freeFrom: number | null;
  /** 도서산간 추가 배송비. `null` = no surcharge. */
  remoteAreaFee: number | null;
};

export type StoreAddress = { postalCode: string; address: string; detailAddress: string };

/**
 * One step of the "라이브 입장 전 필독" sheet. `text` may use `**bold**` and the placeholders
 * `{notice}`, `{cancelChances}` and `{paymentWindow}`, which are filled from the other settings.
 */
export type OnboardingStep = { emoji: string; title: string | null; text: string };

export type StoreSettings = {
  /** 결제 기한. Applied when an order is placed; the deadline is then stored on the order. */
  paymentDeadline: PaymentDeadlinePolicy;
  shipping: ShippingSettings;
  /** 취소찬스 횟수 */
  cancelChances: number;
  /** 입금 계좌 for 무통장입금. */
  bankAccount: { bank: string; number: string; holder: string };
  /** 1회 주문 최대 수량 */
  maxQuantityPerOrder: number;
  /**
   * 주문서 합치기: add further orders to the same unpaid order sheet. Only until the buyer requests
   * a deposit check; after that, new items always go to a new order sheet.
   */
  mergeOrders: boolean;
  /** 스토어 공지 */
  notice: string;
  /** 입장 안내 3단계 */
  onboarding: readonly [OnboardingStep, OnboardingStep, OnboardingStep];
  /** 스토어 소개글 */
  intro: string;
  /** SNS 링크 */
  socials: { instagram: string; youtube: string; tiktok: string; band: string };
  /** 고객센터 연락처 (link opened by 1:1 문의 / 고객센터). */
  customerCenterUrl: string;
  /** 발송지 */
  shipFrom: StoreAddress;
  /** 반품지 */
  returnTo: StoreAddress;
};

/** Demo store values. Every value is invented: no real account, address, contact or notice text. */
const DEMO_STORE_SETTINGS: Record<string, StoreSettings> = {
  [NANDAPICK.slug]: {
    paymentDeadline: { type: "NEXT_DAY_SAME_TIME" },
    shipping: { method: "택배", fee: 4000, freeFrom: 100000, remoteAreaFee: 3000 },
    cancelChances: 5,
    bankAccount: { bank: "예시은행", number: "000-000-000000", holder: "데모상점" },
    maxQuantityPerOrder: 10,
    mergeOrders: true,
    notice:
      "⚠️ 입금 계좌는 주문서에 표시된 예시은행 계좌입니다. 입금 시 닉네임이 아닌 성함 그대로 입금해주세요!\n⚠️ 창고방송 특성상 단순 변심, 사이즈, 색상 교환/반품은 되지 않습니다. 신중구매 부탁드립니다.\n⚠️ 주문 후 결제 마감 시각 전까지 반드시 입금해주세요.\n⚠️ 모두 주문서에 담은 뒤 한 번에 결제해 주세요.",
    onboarding: [
      { emoji: "📢", title: null, text: "{notice}" },
      {
        emoji: "🍀",
        title: "취소 찬스",
        text: "결제하기 전이라면 담아둔 상품을 **최대 {cancelChances}회** 취소할 수 있어요.",
      },
      {
        emoji: "⏰",
        title: "결제 마감",
        text: "상품을 담은 뒤 **{paymentWindow}** 안에 결제하지 않으면 주문서가 만료돼 결제할 수 없어요.",
      },
    ],
    intro:
      "📺 특가 라이브방송 📺 데모샵 입니다.\n👉 믿고 보는 <데모샵>, 합리적인 가격과 솔직한 리뷰!\n👉 채팅으로 함께 소통하며 즐기는 생생한 라이브 🎥\n단골맺기는 사랑입니다~💕\n라이브에서 만나요💙☝💙 ",
    socials: {
      instagram: "https://www.instagram.com/",
      youtube: "https://www.youtube.com/",
      tiktok: "https://www.tiktok.com/",
      band: "https://band.us/",
    },
    customerCenterUrl: "https://pf.kakao.com/",
    shipFrom: { postalCode: "00000", address: "경기도 예시시 데모구 물류로 45", detailAddress: "데모물류센터 1층" },
    returnTo: { postalCode: "00000", address: "경기도 예시시 데모구 물류로 45", detailAddress: "데모물류센터 반품 접수처" },
  },
};

export function defaultStoreSettings(slug: string = NANDAPICK.slug): StoreSettings {
  return DEMO_STORE_SETTINGS[slug] ?? DEMO_STORE_SETTINGS[NANDAPICK.slug];
}

/** Seller-edited settings, per store slug. Only in this browser; nothing is sent anywhere. */
const STORAGE_KEY = "livemarket-clone-store-settings";
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
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

function parseSaved(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown, fallback: string) => (typeof value === "string" ? value : fallback);
const wholeNumber = (value: unknown, fallback: number, min = 0) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.floor(value)) : fallback;
const optionalAmount = (value: unknown, fallback: number | null) =>
  value === null ? null : wholeNumber(value, fallback ?? 0);

function texts<T extends Record<string, string>>(value: unknown, fallback: T): T {
  const source = isRecord(value) ? value : {};
  return Object.fromEntries(Object.keys(fallback).map((key) => [key, text(source[key], fallback[key])])) as T;
}

/** Saved values are untrusted (hand-edited storage, older shapes): every field falls back to the default. */
export function normalizeStoreSettings(value: unknown, defaults: StoreSettings): StoreSettings {
  if (!isRecord(value)) return defaults;
  const deadline = isRecord(value.paymentDeadline) ? value.paymentDeadline : {};
  const shipping = isRecord(value.shipping) ? value.shipping : {};
  const steps = Array.isArray(value.onboarding) ? value.onboarding : [];
  const step = (index: 0 | 1 | 2): OnboardingStep => {
    const saved: unknown = steps[index];
    const fallback = defaults.onboarding[index];
    if (!isRecord(saved)) return fallback;
    return {
      emoji: text(saved.emoji, fallback.emoji),
      title: saved.title === null ? null : text(saved.title, fallback.title ?? ""),
      text: text(saved.text, fallback.text),
    };
  };
  return {
    paymentDeadline:
      deadline.type === "MINUTES_AFTER_ORDER"
        ? { type: "MINUTES_AFTER_ORDER", minutes: wholeNumber(deadline.minutes, 30, 1) }
        : deadline.type === "NEXT_DAY_SAME_TIME"
          ? { type: "NEXT_DAY_SAME_TIME" }
          : defaults.paymentDeadline,
    shipping: {
      method: text(shipping.method, defaults.shipping.method),
      fee: wholeNumber(shipping.fee, defaults.shipping.fee),
      freeFrom: "freeFrom" in shipping ? optionalAmount(shipping.freeFrom, defaults.shipping.freeFrom) : defaults.shipping.freeFrom,
      remoteAreaFee:
        "remoteAreaFee" in shipping
          ? optionalAmount(shipping.remoteAreaFee, defaults.shipping.remoteAreaFee)
          : defaults.shipping.remoteAreaFee,
    },
    cancelChances: wholeNumber(value.cancelChances, defaults.cancelChances),
    bankAccount: texts(value.bankAccount, defaults.bankAccount),
    maxQuantityPerOrder: wholeNumber(value.maxQuantityPerOrder, defaults.maxQuantityPerOrder, 1),
    mergeOrders: typeof value.mergeOrders === "boolean" ? value.mergeOrders : defaults.mergeOrders,
    notice: text(value.notice, defaults.notice),
    onboarding: [step(0), step(1), step(2)],
    intro: text(value.intro, defaults.intro),
    socials: texts(value.socials, defaults.socials),
    customerCenterUrl: text(value.customerCenterUrl, defaults.customerCenterUrl),
    shipFrom: texts(value.shipFrom, defaults.shipFrom),
    returnTo: texts(value.returnTo, defaults.returnTo),
  };
}

function resolveSettings(raw: string | null, slug: string): StoreSettings {
  const defaults = defaultStoreSettings(slug);
  const saved = parseSaved(raw)[slug];
  return saved === undefined ? defaults : normalizeStoreSettings(saved, defaults);
}

/** The single place store settings are read from (outside React). On the server: the defaults. */
export function getStoreSettings(slug: string = NANDAPICK.slug): StoreSettings {
  return resolveSettings(typeof window === "undefined" ? null : readRaw(), slug);
}

/** Component-side reader; re-renders when the seller saves new settings. */
export function useStoreSettings(slug: string = NANDAPICK.slug): StoreSettings {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => resolveSettings(raw, slug), [raw, slug]);
}

const noSubscription = () => () => {};

/** False during server render and hydration, when `useStoreSettings` still returns the defaults. */
export function useStoreSettingsLoaded(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}

function writeSaved(next: Record<string, unknown>) {
  try {
    if (Object.keys(next).length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: the settings simply do not persist.
  }
  listeners.forEach((listener) => listener());
}

/** Writes used by the seller admin's 스토어 설정 screen. */
export const storeSettings = {
  save(settings: StoreSettings, slug: string = NANDAPICK.slug) {
    writeSaved({ ...parseSaved(readRaw()), [slug]: normalizeStoreSettings(settings, defaultStoreSettings(slug)) });
  },
  /** Back to the defaults in this file. */
  reset(slug: string = NANDAPICK.slug) {
    const next = parseSaved(readRaw());
    delete next[slug];
    writeSaved(next);
  },
};

const policyMinutes = (policy: Extract<PaymentDeadlinePolicy, { type: "MINUTES_AFTER_ORDER" }>) =>
  Math.max(1, Math.floor(policy.minutes));

/** When an order placed at `orderedAt` stops being payable. Called once, when the order is placed. */
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

export function shippingFeeFor(itemsTotal: number, shipping: ShippingSettings): number {
  return shipping.freeFrom !== null && itemsTotal >= shipping.freeFrom ? 0 : shipping.fee;
}

export const maxOrderQuantity = (settings: StoreSettings) => Math.max(1, Math.floor(settings.maxQuantityPerOrder));

export const formatStoreAddress = (value: StoreAddress) =>
  `(${value.postalCode}) ${value.address} ${value.detailAddress}`.trim();

/** Fills an onboarding step's placeholders from the other settings. */
export function fillOnboardingText(text: string, settings: StoreSettings): string {
  const values: Record<string, string> = {
    notice: settings.notice,
    cancelChances: String(settings.cancelChances),
    paymentWindow: paymentWindowText(settings.paymentDeadline),
  };
  return text.replace(/\{(notice|cancelChances|paymentWindow)\}/g, (_, key: string) => values[key]);
}
