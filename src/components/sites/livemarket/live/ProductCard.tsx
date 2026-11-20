import Image from "next/image";
import { Icon } from "../Icon";
import type { Product } from "../data/nandapick";
import { LOGIN_URL } from "../data/nandapick";
import styles from "./product.module.css";

type ProductCardProps = {
  product: Product;
  layout: "grid" | "list";
  onReplay: (product: Product) => void;
};

function ReplayButton({ product, onReplay }: Pick<ProductCardProps, "product" | "onReplay">) {
  if (!product.replay) return null;
  return (
    <button type="button" className={styles.replay} onClick={() => onReplay(product)}>
      <span>
        <Icon name="play" width={14} />
      </span>
      <span className={styles.replayText}>{product.replay} 다시보기</span>
    </button>
  );
}

function Prices({ product }: { product: Product }) {
  return (
    <div className={styles.prices}>
      {product.stock && <p className={styles.stock}>{product.stock}</p>}
      <p className={styles.price}>{product.price}</p>
    </div>
  );
}

function AddButton() {
  return (
    <a href={LOGIN_URL} className={styles.addButton}>
      + 주문서 담기
    </a>
  );
}

export function ProductCard({ product, layout, onReplay }: ProductCardProps) {
  const className = `${styles.card} ${product.pinned ? styles.pinned : ""}`;
  const pin = product.pinned ? (
    <span className={styles.pin} aria-hidden="true">
      📌
    </span>
  ) : null;
  const badge = product.soonSoldOut ? <div className={styles.soonBadge}>곧 품절!</div> : null;

  if (layout === "list") {
    return (
      <div className={className}>
        {pin}
        <div className={styles.row}>
          <div className={styles.thumbWrap}>
            <div className={styles.thumb}>
              <Image src={product.image} alt={`${product.name}-image`} width={88} height={88} />
            </div>
            {badge}
          </div>
          <div className={styles.rowInfo}>
            <p className={styles.name}>{product.name}</p>
            <ReplayButton product={product} onReplay={onReplay} />
            <div className={styles.rowBottom}>
              <Prices product={product} />
              <AddButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {pin}
      <div className={styles.imageBox}>
        <Image
          src={product.image}
          alt={`${product.name}-image`}
          fill
          sizes="(max-width: 500px) 45vw, 192px"
        />
        {badge}
      </div>
      <div className={styles.info}>
        <p className={styles.name}>{product.name}</p>
        <ReplayButton product={product} onReplay={onReplay} />
        <Prices product={product} />
        <AddButton />
      </div>
    </div>
  );
}
