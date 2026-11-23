"use client";

import { useLiveVideoId } from "../data/broadcasts";
import { LIVE_VIDEO } from "../data/live-video";
import styles from "./live-video.module.css";

export function youtubeEmbed(videoId: string, params: Record<string, string | number>) {
  const query = new URLSearchParams(
    Object.entries({ playsinline: 1, modestbranding: 1, rel: 0, controls: 0, ...params }).map(
      ([key, value]) => [key, String(value)],
    ),
  );
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${query.toString()}`;
}

/**
 * The YouTube embed of the live broadcast (seller admin, 방송 관리), or a "LIVE 영상 영역"
 * placeholder when it has no video ID and none is configured in data/live-video.ts. The iframe is styled by the parent container's `iframe` rule;
 * the placeholder fills the nearest positioned ancestor.
 */
export function LiveVideo({
  params,
  caption,
  reloadKey,
}: {
  params: Record<string, string | number>;
  caption?: string;
  reloadKey?: string | number;
}) {
  const videoId = useLiveVideoId();
  if (!videoId) {
    return (
      <div className={styles.placeholder} role="img" aria-label="LIVE 영상 영역">
        <span className={styles.label}>LIVE 영상 영역</span>
        {caption && <span className={styles.caption}>{caption}</span>}
      </div>
    );
  }

  const src = youtubeEmbed(videoId, params);
  return (
    <iframe
      key={`${reloadKey ?? ""}|${src}`}
      src={src}
      title={LIVE_VIDEO.title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />
  );
}
