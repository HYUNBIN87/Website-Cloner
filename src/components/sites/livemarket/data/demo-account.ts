import { NANDAPICK } from "./nandapick";
import { SELLERS } from "./sellers";

/*
 * Fake account shown on the logged-in screens. The layout follows the logged-in pages observed
 * on livemarket.pro (2026-11-20), but every value here is invented: no name, phone number,
 * address, order number or nickname from the real account is used.
 */

export const DEMO_USER = {
  nickname: "데모유저",
  avatar: "/sites/livemarket/img/profile_default_1.png",
} as const;

export const DEMO_ADDRESS = {
  name: "홍길동",
  phone: "010-0000-0000",
  postalCode: "00000",
  address: "서울특별시 중구 예시로 123 (예시동, 데모아파트)",
  detailAddress: "101동 101호",
  ordererName: "홍길동",
  ordererPhone: "010-0000-0000",
} as const;

export const DEMO_FOLLOWING = SELLERS.map((seller) => ({
  name: seller.name,
  avatar: seller.avatar,
  href: `/${seller.slug}`,
}));

/** Pre-order statuses and colors from the source's customer order list. */
export type PreOrderStatus = "UNPAID" | "PAID" | "EXPIRED" | "CANCELED";

export const PRE_ORDER_STATUS: Record<PreOrderStatus, { text: string; color: string; tint: string }> = {
  UNPAID: { text: "미결제", color: "#DC2626", tint: "rgba(220, 38, 38, 0.08)" },
  PAID: { text: "결제완료", color: "#00BC7C", tint: "rgba(0, 188, 124, 0.08)" },
  EXPIRED: { text: "기한 만료", color: "#FFA726", tint: "rgba(255, 167, 38, 0.08)" },
  CANCELED: { text: "주문서 취소", color: "rgb(185, 28, 28)", tint: "rgba(185, 28, 28, 0.08)" },
};

export type DemoPreOrderItem = {
  name: string;
  image: string;
  option: string;
  additionalPrice?: number;
  quantity: number;
  amount: number;
};

export type DemoPreOrder = {
  id: string;
  /** "🔴 yy.MM.dd HH:mm 라이브" or "⏰ yy.MM.dd HH:mm 타임딜", as the source labels them. */
  label: string;
  status: PreOrderStatus;
  minutesAgo: number;
  items: DemoPreOrderItem[];
  /** 타임딜 회차. Absent for orders placed in a regular live. */
  round?: number;
  /** "yy.MM.dd HH:mm" — shown while the order is unpaid. */
  paymentDeadline?: string;
  /** 배송 요청사항 typed by the buyer. */
  request?: string;
  /** The buyer pressed "여기로 주문" on the address confirmation popup. */
  addressConfirmed?: boolean;
  /** The buyer pressed "입금완료 확인요청". */
  depositRequested?: boolean;
};

/** Fake time deal running in the demo live room. */
export const DEMO_TIME_DEAL = { id: "demo-time-deal", round: 3 } as const;

export const DEMO_SHIPPING = { method: "택배", fee: 4000 } as const;

/** Unpaid orders must be paid within 30 minutes, as the store notice says. */
export const PAYMENT_WINDOW_MINUTES = 30;

/** Fake deposit account: the bank, number and holder are all invented. */
export const DEMO_BANK_ACCOUNT = {
  bank: "예시은행",
  number: "000-000-000000",
  holder: "데모상점",
} as const;

/** Fake color/size options: the store snapshot has no option data. */
export const DEMO_OPTIONS = {
  colors: ["블랙", "화이트", "네이비", "그레이"],
  sizes: ["M", "L", "XL"],
} as const;

export const productPrice = (product: { price: string }) => Number(product.price.replace(/[^0-9]/g, "")) || 0;

export function orderTotals(order: DemoPreOrder) {
  const items = order.items.reduce((sum, entry) => sum + entry.amount, 0);
  return { items, shipping: DEMO_SHIPPING.fee, total: items + DEMO_SHIPPING.fee };
}

const product = (index: number) => NANDAPICK.products[index];
const price = (index: number) => Number(product(index).price.replace(/[^0-9]/g, ""));
const item = (index: number, option: string, quantity = 1, additionalPrice = 0): DemoPreOrderItem => ({
  name: product(index).name,
  image: product(index).image,
  option,
  additionalPrice: additionalPrice || undefined,
  quantity,
  amount: (price(index) + additionalPrice) * quantity,
});

export const DEMO_PRE_ORDERS: DemoPreOrder[] = [
  {
    id: "P202611200000000001",
    label: "🔴 26.11.20 08:00 라이브",
    status: "UNPAID",
    minutesAgo: 12,
    items: [item(0, "화이트/L", 2), item(1, "블랙/M")],
    paymentDeadline: "26.11.20 08:42",
    addressConfirmed: true,
  },
  {
    id: "P202611200000000002",
    label: "⏰ 26.11.19 12:00 타임딜",
    status: "CANCELED",
    minutesAgo: 3 * 60,
    items: [item(7, "차콜/L")],
    round: 1,
  },
  {
    id: "P202611190000000003",
    label: "⏰ 26.11.19 20:00 타임딜",
    status: "PAID",
    minutesAgo: 14 * 60,
    items: [item(3, "그레이/XL", 1, 2000)],
    round: 2,
  },
  {
    id: "P202611180000000004",
    label: "🔴 26.11.18 10:00 라이브",
    status: "EXPIRED",
    minutesAgo: 2 * 24 * 60,
    items: [item(13, "아이보리/M")],
  },
];

export function formatOrderedAgo(minutesAgo: number) {
  if (minutesAgo < 1) return "방금 전 주문";
  if (minutesAgo < 60) return `${minutesAgo}분 전 주문`;
  if (minutesAgo < 24 * 60) return `${Math.floor(minutesAgo / 60)}시간 전 주문`;
  return `${Math.floor(minutesAgo / (24 * 60))}일 전 주문`;
}

export const formatKRW = (value: number) => `${value.toLocaleString("ko-KR")}원`;
