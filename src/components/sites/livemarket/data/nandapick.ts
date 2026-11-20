import snapshot from "./nandapick-products.json";
import { ROUTES } from "./routes";

export type Product = {
  id: number;
  name: string;
  replay: string | null;
  price: string;
  stock: string | null;
  soonSoldOut: boolean;
  pinned: boolean;
  image: string;
  sourceImage: string;
};

// Store profile layout/content observed on https://livemarket.pro/nandapick/profile-live (2026-11-20).
// Personal data (seller name, avatar, contacts, address, SNS/Kakao handles) is replaced with fake values.
export const NANDAPICK = {
  slug: "nandapick",
  name: "데모샵",
  avatar: "/sites/livemarket/img/demo-store-avatar.png",
  liveTitle: "1120♡굿모닝♡",
  notice: snapshot.notice,
  intro:
    "📺 특가 라이브방송 📺 데모샵 입니다.\n👉 믿고 보는 <데모샵>, 합리적인 가격과 솔직한 리뷰!\n👉 채팅으로 함께 소통하며 즐기는 생생한 라이브 🎥\n단골맺기는 사랑입니다~💕\n라이브에서 만나요💙☝💙 ",
  socials: {
    instagram: "https://www.instagram.com/",
    youtube: "https://www.youtube.com/",
    tiktok: "https://www.tiktok.com/",
    band: "https://band.us/",
  },
  customerCenter: "https://pf.kakao.com/",
  business: {
    company: "데모상점(DEMO SHOP)",
    ceo: "홍길동",
    registration: "000-00-00000",
    address: "서울특별시 중구 예시로 123(예시동)",
    mailOrder: ".",
    email: "demo@example.com",
  },
  products: snapshot.products as Product[],
} as const;

/** Login-gated actions are out of scope; they go to the source login page like the original. */
export const LOGIN_URL = ROUTES.login(ROUTES.profileLive);
export const ROOM_LOGIN_URL = ROUTES.login(ROUTES.room);
export const SECRET_ROOM_URL = ROUTES.room;

export function replayToSeconds(replay: string): number {
  return replay
    .split(":")
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0);
}
