/**
 * Live video setting for the livemarket clone.
 *
 * Leave the ID empty to show the "LIVE 영상 영역" placeholder in the live room,
 * the profile-live player, and the replay clips. Put a YouTube video ID here
 * (the part after `v=` or `/live/` in the URL, e.g. "dQw4w9WgXcQ") to embed the
 * real broadcast instead. The env var NEXT_PUBLIC_LIVEMARKET_YOUTUBE_VIDEO_ID
 * overrides this value without a code change (restart `npm run dev` / rebuild).
 */
const YOUTUBE_VIDEO_ID = "";

export const LIVE_VIDEO = {
  youtubeVideoId: (process.env.NEXT_PUBLIC_LIVEMARKET_YOUTUBE_VIDEO_ID ?? YOUTUBE_VIDEO_ID).trim(),
  /** Accessible title of the embedded player. */
  title: "데모샵 라이브",
} as const;

export const HAS_LIVE_VIDEO = LIVE_VIDEO.youtubeVideoId.length > 0;
