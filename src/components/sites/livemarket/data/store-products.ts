"use client";

import { useMemo } from "react";
import { createLocalStore, parseJson } from "./local-store";
import { NANDAPICK, type Product } from "./nandapick";
import { DEMO_SELLER_ID, getPlatformState } from "./platform";

/*
 * Products the seller listed in the store from the seller admin (/seller-admin/products), on
 * top of the built-in snapshot products. Saved only in this browser's localStorage.
 *
 * A listing of a supply product stores a reference to it, never the supply price: the consumer
 * screens get plain `Product` objects with name, price and image only.
 */

export type StoreListing = {
  id: number;
  name: string;
  /** 판매가 (원) */
  price: number;
  image: string;
  /** Set when the listing sells an operator-supplied product. */
  supplyProductId?: string;
};

const store = createLocalStore("livemarket-clone-store-products");
const DEFAULT_IMAGE = "/sites/livemarket/img/live_market_icon.png";
/** Listing ids start above the snapshot's product ids. */
const FIRST_LISTING_ID = 1001;

function toListings(value: unknown): StoreListing[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is StoreListing =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as StoreListing).id === "number" &&
      typeof (entry as StoreListing).name === "string" &&
      typeof (entry as StoreListing).price === "number" &&
      typeof (entry as StoreListing).image === "string",
  );
}

const current = () => toListings(parseJson(store.read()));

/** The seller's own listings, newest first. `undefined` during server render and hydration. */
export function useStoreListings(): StoreListing[] | undefined {
  const raw = store.useRaw();
  return useMemo(() => (raw === undefined ? undefined : toListings(parseJson(raw))), [raw]);
}

const toProduct = (listing: StoreListing): Product => ({
  id: listing.id,
  name: listing.name,
  replay: null,
  price: `${listing.price.toLocaleString("ko-KR")}원`,
  stock: null,
  soonSoldOut: false,
  pinned: false,
  image: listing.image,
  sourceImage: "",
});

/**
 * Every product of the store as the consumer screens show them: the snapshot products with the
 * seller's listings placed right after the pinned ones. Server render and hydration get the
 * snapshot only.
 */
export function useStoreProducts(): readonly Product[] {
  const listings = useStoreListings();
  return useMemo(() => {
    if (!listings || listings.length === 0) return NANDAPICK.products;
    const afterPinned = NANDAPICK.products.findLastIndex((entry) => entry.pinned) + 1;
    return [
      ...NANDAPICK.products.slice(0, afterPinned),
      ...listings.map(toProduct),
      ...NANDAPICK.products.slice(afterPinned),
    ];
  }, [listings]);
}

const validPrice = (price: number) => Number.isFinite(price) && price >= 1;
const nameTaken = (name: string, listings: readonly StoreListing[], exceptId?: number) =>
  NANDAPICK.products.some((entry) => entry.name === name) ||
  listings.some((entry) => entry.name === name && entry.id !== exceptId);
const nextId = (listings: readonly StoreListing[]) =>
  Math.max(FIRST_LISTING_ID - 1, ...listings.map((entry) => entry.id)) + 1;

/** The supply product, only if the operator handed it to this store. */
function receivedSupplyProduct(productId: string) {
  const state = getPlatformState();
  const received = state.handovers.some((move) => move.sellerId === DEMO_SELLER_ID && move.productId === productId);
  return received ? state.products.find((entry) => entry.id === productId) : undefined;
}

const belowMinimum = (minPrice: number) =>
  `판매가는 최저 판매가(${minPrice.toLocaleString("ko-KR")}원) 이상이어야 합니다.`;

/** Writes of the 스토어 상품 관리 screen. Each returns an error message, or `null` when applied. */
export const storeProducts = {
  /** Lists a supply product the store received. The price may not go below its 최저 판매가. */
  addSupplyProduct(productId: string, price: number): string | null {
    const item = receivedSupplyProduct(productId);
    const listings = current();
    if (!item) return "운영자에게 받은 공급 상품을 선택해주세요.";
    if (nameTaken(item.name, listings)) return "이미 스토어에 등록된 상품입니다.";
    if (!validPrice(price)) return "판매가를 입력해주세요.";
    if (price < item.minPrice) return belowMinimum(item.minPrice);
    store.write([
      { id: nextId(listings), name: item.name, price: Math.floor(price), image: item.image, supplyProductId: item.id },
      ...listings,
    ]);
    return null;
  },

  /** Lists a product of the seller's own (not supplied by the operator). */
  addOwnProduct(input: { name: string; price: number }): string | null {
    const name = input.name.trim();
    const listings = current();
    if (!name) return "상품명을 입력해주세요.";
    if (nameTaken(name, listings)) return "같은 이름의 상품이 이미 스토어에 있습니다.";
    if (getPlatformState().products.some((entry) => entry.name === name)) {
      return "공급 상품과 같은 이름입니다. 공급 상품은 위에서 등록해주세요.";
    }
    if (!validPrice(input.price)) return "판매가를 입력해주세요.";
    store.write([{ id: nextId(listings), name, price: Math.floor(input.price), image: DEFAULT_IMAGE }, ...listings]);
    return null;
  },

  updatePrice(id: number, price: number): string | null {
    const listings = current();
    const listing = listings.find((entry) => entry.id === id);
    if (!listing) return "상품을 찾을 수 없습니다.";
    if (!validPrice(price)) return "판매가를 입력해주세요.";
    if (listing.supplyProductId) {
      const item = getPlatformState().products.find((entry) => entry.id === listing.supplyProductId);
      if (item && price < item.minPrice) return belowMinimum(item.minPrice);
    }
    store.write(listings.map((entry) => (entry.id === id ? { ...entry, price: Math.floor(price) } : entry)));
    return null;
  },

  /** 판매 중지: the product leaves the store's product lists. Existing orders keep their items. */
  remove(id: number) {
    store.write(current().filter((entry) => entry.id !== id));
  },
};
