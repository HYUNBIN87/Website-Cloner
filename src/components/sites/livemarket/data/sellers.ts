// Snapshot of the seller-search result observed on livemarket.pro (2026-11-20).
// The source searches by exact seller name through its API; the clone matches locally.
// Seller name and avatar are fake placeholders: no real personal data in the clone.
export type SellerSearchEntry = {
  name: string;
  slug: string;
  followers: number;
  avatar: string;
};

export const SELLERS: SellerSearchEntry[] = [
  {
    name: "데모샵",
    slug: "nandapick",
    followers: 162,
    avatar: "/sites/livemarket/img/demo-store-avatar.png",
  },
];

export const SOURCE_ORIGIN = "https://livemarket.pro";
