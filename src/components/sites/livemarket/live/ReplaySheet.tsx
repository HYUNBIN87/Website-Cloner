"use client";

import Image from "next/image";
import { useState } from "react";
import { NANDAPICK, replayToSeconds, type Product } from "../data/nandapick";
import { BottomSheet } from "./BottomSheet";
import { LiveVideo } from "./LiveVideo";
import { HAS_LIVE_VIDEO } from "../data/live-video";
import sheet from "./sheet.module.css";

const store = NANDAPICK;

export function SellerSubtitle() {
  return (
    <div className={sheet.subtitle}>
      <span className={sheet.subAvatar}>
        <Image src={store.avatar} alt={store.name} width={18} height={18} />
      </span>
      <p>{store.name}</p>
    </div>
  );
}

/** Replay clip of the live from the product's timestamp (3 minutes), muted until tapped. */
export function ReplaySheet({
  product,
  loginUrl,
  onAdd,
  onClose,
}: {
  product: Product;
  loginUrl: string;
  /** When given, 주문서 담기 opens the order flow instead of going to login. */
  onAdd?: (product: Product) => void;
  onClose: () => void;
}) {
  const [muted, setMuted] = useState(true);
  const [copied, setCopied] = useState(false);
  const start = product.replay ? replayToSeconds(product.replay) : 0;
  const params = { autoplay: 1, mute: muted ? 1 : 0, start, end: start + 180 };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <BottomSheet
      title={product.name}
      subtitle={<p className={sheet.subtitle}>{product.replay}부터</p>}
      onClose={onClose}
      bodyClassName={sheet.clipBody}
      footer={
        <div className={sheet.footer}>
          {onAdd ? (
            <button type="button" className={sheet.footerAdd} onClick={() => onAdd(product)}>
              + 주문서 담기
            </button>
          ) : (
            <a href={loginUrl} className={sheet.footerAdd}>
              + 주문서 담기
            </a>
          )}
          <button
            type="button"
            className={sheet.footerCopy}
            onClick={copyLink}
            aria-label={copied ? "링크가 복사되었습니다" : "링크 복사"}
          >
            {copied ? "✓" : "⧉"}
          </button>
        </div>
      }
    >
      <div className={sheet.clip}>
        <LiveVideo params={params} caption={product.replay ? `${product.replay}부터 다시보기` : undefined} />
        {HAS_LIVE_VIDEO && muted && (
          <button type="button" className={sheet.muted} onClick={() => setMuted(false)}>
            <span className={sheet.mutedIcon} aria-hidden="true">
              🔇
            </span>
            <strong>소리가 꺼져 있어요</strong>
            <span>여기를 눌러 소리를 켜주세요!</span>
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
