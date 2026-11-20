"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./overlays.module.css";

/** Opened from the store avatar in the room: "{store}님 스토어에 놀러 갈까요?" */
export function StoreVisitModal({
  storeName,
  avatar,
  followers,
  storeHref,
  onClose,
}: {
  storeName: string;
  avatar: string;
  followers: number;
  storeHref: string;
  onClose: () => void;
}) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.storeModal}
        role="dialog"
        aria-modal="true"
        aria-label={`${storeName}님 스토어에 놀러 갈까요?`}
        onClick={(event) => event.stopPropagation()}
      >
        <span className={styles.storeAvatar}>
          <Image src={avatar} alt={storeName} width={64} height={64} />
        </span>
        <div className={styles.storeCopy}>
          <h3>{storeName}님 스토어에 놀러 갈까요?</h3>
          <p>{"이 셀러가 준비한 상품이 스토어에 모여 있어요.\n구경만 해도 좋으니 잠깐 둘러봐요 👀"}</p>
        </div>
        <span className={styles.storeFollowers}>이미 단골 {followers}명이 찾는 가게예요</span>
        <div className={styles.storeActions}>
          <button type="button" className={styles.storeLater} onClick={onClose}>
            다음에요
          </button>
          <Link href={storeHref} className={styles.storeGo}>
            구경하러 가기
          </Link>
        </div>
      </div>
    </div>
  );
}
