"use client";

import Image from "next/image";
import { useState } from "react";
import { DEMO_OPTIONS, formatKRW, productPrice } from "../data/demo-account";
import type { Product } from "../data/nandapick";
import { BottomSheet } from "../live/BottomSheet";
import styles from "./order.module.css";

const MAX_QUANTITY = 99;

/** Color / size / quantity picker opened by "주문서 담기". The options are fake (see DEMO_OPTIONS). */
export function OptionSheet({
  product,
  onSubmit,
  onClose,
}: {
  product: Product;
  onSubmit: (option: string, quantity: number) => void;
  onClose: () => void;
}) {
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const ready = color !== null && size !== null;
  const total = productPrice(product) * quantity;

  return (
    <BottomSheet
      title="옵션 선택"
      onClose={onClose}
      bodyClassName={styles.optionBody}
      footer={
        <div className={styles.optionFooter}>
          <div className={styles.totalRow}>
            <span>합계</span>
            <p>
              <span className={styles.totalCount}>총 {quantity}개</span>
              <strong>{formatKRW(total)}</strong>
            </p>
          </div>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!ready}
            onClick={() => {
              if (color && size) onSubmit(`${color}/${size}`, quantity);
            }}
          >
            {ready ? "주문서 담기" : "옵션을 선택해주세요"}
          </button>
        </div>
      }
    >
      <div className={styles.optionProduct}>
        <Image src={product.image} alt={product.name} width={64} height={64} />
        <div>
          <p className={styles.optionName}>{product.name}</p>
          <p className={styles.optionPrice}>{product.price}</p>
        </div>
      </div>

      <ChipGroup label="컬러" values={DEMO_OPTIONS.colors} selected={color} onSelect={setColor} />
      <ChipGroup label="사이즈" values={DEMO_OPTIONS.sizes} selected={size} onSelect={setSize} />

      <div className={styles.optionGroup}>
        <p className={styles.optionLabel}>수량</p>
        <div className={styles.stepper}>
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            disabled={quantity <= 1}
            aria-label="수량 줄이기"
          >
            −
          </button>
          <span aria-live="polite">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.min(MAX_QUANTITY, value + 1))}
            disabled={quantity >= MAX_QUANTITY}
            aria-label="수량 늘리기"
          >
            +
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

function ChipGroup({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string;
  values: readonly string[];
  selected: string | null;
  onSelect: (value: string) => void;
}) {
  return (
    <div className={styles.optionGroup}>
      <p className={styles.optionLabel}>{label}</p>
      <div className={styles.chips} role="radiogroup" aria-label={label}>
        {values.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={value === selected}
            className={`${styles.optionChip} ${value === selected ? styles.optionChipActive : ""}`}
            onClick={() => onSelect(value)}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
