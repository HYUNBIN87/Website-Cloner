import { SOURCE_ORIGIN } from "./sellers";

/** Local routes covered by the clone. Anything else links to the source origin. */
export const ROUTES = {
  home: "/",
  following: "/following",
  orderList: "/order/list",
  my: "/my",
  preOrder: (orderId: string) => `/pre-order/${encodeURIComponent(orderId)}`,
  profileLive: "/nandapick/profile-live",
  room: "/nandapick/profile-live/room",
  /** Mirrors the source: gated actions send visitors to /auth/login with the page to return to. */
  login: (previousPath?: string) =>
    previousPath
      ? `/auth/login?previousPath=${encodeURIComponent(previousPath)}&entryPoint=default`
      : "/auth/login",
} as const;

/** Out-of-scope destinations stay on the source site. */
export const SOURCE_ROUTES = {
  search: `${SOURCE_ORIGIN}/search`,
  sellerLogin: `${SOURCE_ORIGIN}/auth/seller-login`,
  sellerApplication: `${SOURCE_ORIGIN}/seller-application`,
  /** Kakao OAuth starts on the source; the clone cannot sign anyone in. */
  kakaoLogin: (previousPath: string) =>
    `${SOURCE_ORIGIN}/auth/login?previousPath=${encodeURIComponent(previousPath)}&entryPoint=default`,
} as const;
