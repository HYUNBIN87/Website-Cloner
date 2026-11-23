"use client";

import Image from "next/image";
import { useState } from "react";
import { NumberField, SelectField, TextField } from "../admin/fields";
import { useNow } from "../data/clock";
import { formatKRW } from "../data/demo-account";
import { NANDAPICK } from "../data/nandapick";
import { usePlatform, type SupplyProduct } from "../data/platform";
import { supplyStock, useSellerOrders, type SupplyStockRow } from "../data/seller-admin";
import { storeProducts, useStoreListings, type StoreListing } from "../data/store-products";
import order from "../order/order.module.css";
import orders from "../pages/orders.module.css";
import styles from "./seller-admin.module.css";

const SUPPLY_CHIP = { color: "rgb(20, 48, 112)", background: "rgba(20, 48, 112, 0.08)" };
const OWN_CHIP = { color: "rgb(54, 70, 58)", background: "rgb(232, 232, 232)" };

/**
 * /seller-admin/products: 스토어 상품 관리. The seller lists supply products received from the
 * operator (at or above their 최저 판매가) and products of their own; listed products appear in the
 * store's and the live room's product lists. 공급가 is shown here for the seller only: it is
 * never part of what the consumer screens receive.
 */
export function SellerProductsPage() {
  const state = usePlatform();
  const sellerOrders = useSellerOrders();
  const listings = useStoreListings();
  const now = useNow();
  if (!state || !sellerOrders || !listings || now === undefined) return null;

  const stock = supplyStock(sellerOrders, state, now);
  const stockByName = new Map(stock.map((row) => [row.name, row]));
  const supplyByName = new Map(state.products.map((entry) => [entry.name, entry]));
  const inStore = new Set([...NANDAPICK.products.map((entry) => entry.name), ...listings.map((entry) => entry.name)]);
  // Supply products the store received and does not sell yet.
  const available = state.products.filter((entry) => stockByName.has(entry.name) && !inStore.has(entry.name));

  return (
    <>
      <p className={styles.intro}>
        스토어에서 팔 상품을 등록합니다. 등록한 상품은 스토어 상품 목록과 라이브 방 상품 목록에 바로 나타납니다. 공급가는 이
        화면에서 셀러에게만 보이고 고객 화면에는 나오지 않습니다.
      </p>

      <SupplyForm key={available.map((entry) => entry.id).join()} available={available} stockByName={stockByName} />
      <OwnForm />

      <h2 className={styles.groupTitle}>내가 등록한 상품 {listings.length}개</h2>
      {listings.length === 0 && <p className={styles.hint}>아직 등록한 상품이 없습니다.</p>}
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          supply={listing.supplyProductId ? state.products.find((entry) => entry.id === listing.supplyProductId) : undefined}
        />
      ))}

      <h2 className={styles.groupTitle}>기본 상품 {NANDAPICK.products.length}개</h2>
      <section className={order.card}>
        <p className={styles.hint}>처음부터 스토어에 있던 상품입니다. 초안에서는 수정하거나 판매 중지할 수 없습니다.</p>
        {NANDAPICK.products.map((entry) => {
          const supply = supplyByName.get(entry.name);
          return (
            <div key={entry.id} className={order.line}>
              <span>
                {entry.name}
                {supply && stockByName.has(entry.name) && (
                  <span className={styles.supplyBadge}>공급 · 공급가 {formatKRW(supply.supplyPrice)}</span>
                )}
              </span>
              <strong>{entry.price}</strong>
            </div>
          );
        })}
      </section>
    </>
  );
}

/** What the seller keeps per unit of a supplied product. */
const Margin = ({ price, supply }: { price: number; supply: SupplyProduct }) => (
  <p className={styles.hint}>
    셀러에게만 보이는 정보 · 공급가 {formatKRW(supply.supplyPrice)} · 최저 판매가 {formatKRW(supply.minPrice)} · 개당 내 몫{" "}
    <strong>{formatKRW(price - supply.supplyPrice)}</strong>
  </p>
);

function SupplyForm({
  available,
  stockByName,
}: {
  available: readonly SupplyProduct[];
  stockByName: ReadonlyMap<string, SupplyStockRow>;
}) {
  const [productId, setProductId] = useState(available[0]?.id ?? "");
  const [price, setPrice] = useState(available[0]?.minPrice ?? 0);
  const [error, setError] = useState<string | null>(null);
  const item = available.find((entry) => entry.id === productId);

  return (
    <section className={order.card}>
      <h3 className={order.cardTitle}>공급 상품 등록</h3>
      {!item ? (
        <p className={styles.hint}>
          등록할 수 있는 공급 상품이 없습니다. 운영자에게 받은 공급 상품이 모두 이미 스토어에 있거나, 받은 상품이 없습니다.
        </p>
      ) : (
        <form
          className={styles.shipForm}
          onSubmit={(event) => {
            event.preventDefault();
            setError(storeProducts.addSupplyProduct(item.id, price));
          }}
        >
          <SelectField
            label="운영자에게 받은 공급 상품"
            value={item.id}
            onChange={(value) => {
              setProductId(value);
              setPrice(available.find((entry) => entry.id === value)?.minPrice ?? 0);
              setError(null);
            }}
          >
            {available.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name} (남은 수량 {stockByName.get(entry.name)?.remaining ?? 0}개)
              </option>
            ))}
          </SelectField>
          <NumberField label={`판매가 (원, 최저 ${formatKRW(item.minPrice)})`} value={price} onChange={setPrice} />
          <Margin price={price} supply={item} />
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <button type="submit" className={order.primaryButton}>
            상품 등록
          </button>
        </form>
      )}
    </section>
  );
}

function OwnForm() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className={order.card}>
      <h3 className={order.cardTitle}>자체 상품 등록</h3>
      <p className={styles.hint}>
        운영자에게 공급받지 않은 내 상품입니다. 공급 대금이 청구되지 않습니다. 사진 등록은 초안에 없어 기본 아이콘으로
        표시됩니다.
      </p>
      <form
        className={styles.shipForm}
        onSubmit={(event) => {
          event.preventDefault();
          const result = storeProducts.addOwnProduct({ name, price });
          setError(result);
          if (!result) {
            setName("");
            setPrice(0);
          }
        }}
      >
        <TextField label="상품명" value={name} onChange={setName} />
        <NumberField label="판매가 (원)" value={price} onChange={setPrice} />
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button type="submit" className={order.primaryButton}>
          상품 등록
        </button>
      </form>
    </section>
  );
}

function ListingCard({ listing, supply }: { listing: StoreListing; supply: SupplyProduct | undefined }) {
  const [price, setPrice] = useState(listing.price);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const chip = listing.supplyProductId ? SUPPLY_CHIP : OWN_CHIP;

  return (
    <section className={order.card}>
      <div className={styles.stockHead}>
        <Image src={listing.image} alt={listing.name} width={56} height={56} />
        <div>
          <p className={styles.stockName}>{listing.name}</p>
          <div className={orders.statusLeft}>
            <span className={orders.chip} style={chip}>
              {listing.supplyProductId ? "공급 상품" : "자체 상품"}
            </span>
            <span className={order.meta}>판매가 {formatKRW(listing.price)}</span>
          </div>
        </div>
      </div>
      {supply && <Margin price={listing.price} supply={supply} />}
      <form
        className={styles.shipForm}
        onSubmit={(event) => {
          event.preventDefault();
          const error = storeProducts.updatePrice(listing.id, price);
          setMessage(error ? { error: true, text: error } : { error: false, text: "판매가를 바꿨어요." });
        }}
      >
        <NumberField
          label={supply ? `판매가 (원, 최저 ${formatKRW(supply.minPrice)})` : "판매가 (원)"}
          value={price}
          onChange={setPrice}
        />
        {message &&
          (message.error ? (
            <p className={styles.error} role="alert">
              {message.text}
            </p>
          ) : (
            <p className={styles.saveNotice}>{message.text}</p>
          ))}
        <div className={styles.saveActions}>
          <button type="button" className={styles.secondaryButton} onClick={() => storeProducts.remove(listing.id)}>
            판매 중지
          </button>
          <button type="submit" className={order.primaryButton} disabled={price === listing.price}>
            판매가 변경
          </button>
        </div>
      </form>
    </section>
  );
}
