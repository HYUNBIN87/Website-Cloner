"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "../Icon";
import type { Product } from "../data/nandapick";
import styles from "./overlays.module.css";

/** "{store} 스토어" product list opened from the room's product button. */
export function RoomProductSheet({
  storeName,
  products,
  onAdd,
  onReplay,
  onClose,
}: {
  storeName: string;
  products: readonly Product[];
  onAdd: (product: Product) => void;
  onReplay: (product: Product) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const visible = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return keyword ? products.filter((product) => product.name.toLowerCase().includes(keyword)) : products;
  }, [products, query]);

  return (
    <>
      <div className={styles.sheetOverlay} onClick={onClose} aria-hidden="true" />
      <div className={styles.productSheet} role="dialog" aria-modal="true" aria-label={`${storeName} 스토어`}>
        <div className={styles.handle} />
        <div className={styles.sheetHeader}>
          <div className={styles.sheetTitleRow}>
            <div className={styles.sheetTitle}>
              <h3>{storeName} 스토어</h3>
              <p>
                전체 <strong>{products.length}</strong>개
              </p>
            </div>
            <button type="button" className={styles.sheetClose} onClick={onClose} aria-label="닫기">
              <Icon name="close-x" width={22} />
            </button>
          </div>
          <div className={styles.field}>
            <div className={styles.fieldIcon}>
              <Icon name="search-input" width={20} />
            </div>
            <input
              type="text"
              value={query}
              placeholder="상품명을 검색하세요"
              aria-label="상품명을 검색하세요"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className={styles.sheetNote}>
            <Icon name="notice-amber" width={14} />
            <span>담으면 장바구니 대신 주문서로 접수 · 신중히 담아주세요</span>
          </div>
        </div>

        <div className={styles.sheetList}>
          {visible.length === 0 && <p className={styles.sheetEmpty}>검색 결과가 없어요</p>}
          {visible.map((product) => (
            <div
              key={product.id}
              className={`${styles.productRow} ${product.pinned ? styles.productRowPinned : ""}`}
            >
              {product.pinned && (
                <span className={styles.rowPin} aria-hidden="true">
                  📌
                </span>
              )}
              <div className={styles.rowThumb}>
                <Image src={product.image} alt={product.name} width={72} height={72} />
              </div>
              <div className={styles.rowInfo}>
                <p className={styles.rowName}>{product.name}</p>
                <p className={styles.rowPrice}>{product.price}</p>
              </div>
              <button type="button" className={styles.rowAdd} onClick={() => onAdd(product)}>
                주문서 담기
              </button>
              {product.replay ? (
                <button type="button" className={styles.rowReplay} onClick={() => onReplay(product)}>
                  <Icon name="play-navy" width={12} />
                  <span>{product.replay} 다시보기</span>
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
