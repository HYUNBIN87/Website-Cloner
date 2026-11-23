import { NANDAPICK } from "./nandapick";

/**
 * Per-store settings a seller will later edit in the admin. For now the values live in this
 * file. Everything reads them through `getStoreSettings` / `useStoreSettings` below, so moving
 * to an admin-backed source only means changing those two functions.
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
