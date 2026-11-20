import { NANDAPICK, type Product } from "./nandapick";

/**
 * FAKE chat data for the live room clone.
 * The source room shows real buyers' nicknames and purchase messages (delivered over Socket.IO).
 * None of that is copied: every nickname and message below is invented. Purchase lines reuse the
 * product names and prices from the store snapshot, which are not personal data.
 */
export type ChatMessage = {
  id: string;
  nickname: string;
  avatar: string;
  text: string;
};

const FAKE_NICKNAMES = [
  "달빛여우",
  "초코쿠키",
  "봄날햇살",
  "고양이집사",
  "쇼핑요정",
  "민트라떼",
  "user_8821",
  "하늘별",
  "모카빵",
  "새벽러너",
  "구름솜",
  "데모유저7",
] as const;

const FAKE_CHATS = [
  "넹",
  "라지 있나요?",
  "감사합니다",
  "ㄱㄱㄱ",
  "무배 기준 있나요?",
  "색상 더 보여주세요",
  "사이즈 문의드려요",
  "오늘 물건 좋네요",
  "합배송 되나요?",
  "블랙 M 남았나요?",
] as const;

const OPTIONS = ["블랙/M", "블랙/L", "화이트/M", "화이트/L", "네이비/L", "L", "M"] as const;

/** 프로필 기본 이미지: platform default avatars, not anyone's photo. */
const AVATARS = [1, 2, 3, 4, 5].map((n) => `/sites/livemarket/img/profile_default_${n}.png`);

function priceToNumber(price: string) {
  return Number(price.replace(/[^0-9]/g, "")) || 0;
}

function purchaseText(product: Product, option: string, count: number) {
  const total = (priceToNumber(product.price) * count).toLocaleString("ko-KR");
  return `구매 성공! [ ${product.name} | ${option} - ${count}개 총 ${total}원 ]`;
}

/** Deterministic pseudo-random so server and client render the same seed messages. */
function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648;
    return value / 2147483648;
  };
}

function makeMessage(random: () => number, id: string): ChatMessage {
  const userIndex = Math.floor(random() * FAKE_NICKNAMES.length);
  const isPurchase = random() < 0.55;
  const products = NANDAPICK.products;
  const text = isPurchase
    ? purchaseText(
        products[Math.floor(random() * products.length)],
        OPTIONS[Math.floor(random() * OPTIONS.length)],
        1 + Math.floor(random() * 2),
      )
    : FAKE_CHATS[Math.floor(random() * FAKE_CHATS.length)];
  return {
    id,
    nickname: FAKE_NICKNAMES[userIndex],
    avatar: AVATARS[userIndex % AVATARS.length],
    text,
  };
}

export function seedMessages(count = 16): ChatMessage[] {
  const random = seeded(20261120);
  return Array.from({ length: count }, (_, index) => makeMessage(random, `seed-${index}`));
}

/** Simulates the next realtime message (the source receives these over its chat socket). */
export function nextFakeMessage(sequence: number): ChatMessage {
  return makeMessage(Math.random, `live-${sequence}`);
}
