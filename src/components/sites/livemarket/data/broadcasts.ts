"use client";

import { useMemo } from "react";
import { LIVE_VIDEO } from "./live-video";
import { createLocalStore, parseJson } from "./local-store";
import { NANDAPICK } from "./nandapick";

/*
 * Broadcasts of the demo store: lives and time deals the seller creates in the seller admin
 * (/seller-admin/broadcasts). The broadcast that is 진행 중 is the one the live room shows, and
 * new orders take their time-deal label and title from it.
 *
 * Fake data, saved only in this browser's localStorage. The secret-room password is checked in
 * the browser, so it keeps nobody out for real: that needs a server.
 */

export type BroadcastKind = "LIVE" | "TIME_DEAL";
export type BroadcastStatus = "SCHEDULED" | "LIVE" | "ENDED";
/** 입장 조건 of a secret room. */
export type EntryCondition = "PASSWORD" | "FOLLOWERS";

export const BROADCAST_KIND_TEXT: Record<BroadcastKind, string> = { LIVE: "라이브", TIME_DEAL: "타임딜" };
export const BROADCAST_STATUS: Record<BroadcastStatus, { text: string; color: string; tint: string }> = {
  SCHEDULED: { text: "예정", color: "rgb(20, 48, 112)", tint: "rgba(20, 48, 112, 0.08)" },
  LIVE: { text: "진행 중", color: "#DC2626", tint: "rgba(220, 38, 38, 0.08)" },
  ENDED: { text: "종료", color: "rgb(54, 70, 58)", tint: "rgb(232, 232, 232)" },
};
export const ENTRY_CONDITION_TEXT: Record<EntryCondition, string> = { PASSWORD: "비밀번호", FOLLOWERS: "단골만" };

export type Broadcast = {
  id: string;
  kind: BroadcastKind;
  title: string;
  /** Local date-time, "2026-11-20T08:00". */
  startAt: string;
  /** Empty: the "LIVE 영상 영역" placeholder (or the video of data/live-video.ts) is shown. */
  youtubeVideoId: string;
  /** Ids of the store products sold in this broadcast. */
  productIds: number[];
  status: BroadcastStatus;
  /** 비밀 라이브방: when enabled, entering the room needs the password or a 단골 login. */
  secret: { enabled: boolean; condition: EntryCondition; password: string };
};

export type BroadcastInput = Omit<Broadcast, "id" | "status">;

const ALL_SNAPSHOT_PRODUCTS = NANDAPICK.products.map((entry) => entry.id);
const OPEN_ROOM = { enabled: false, condition: "PASSWORD" as const, password: "" };

/** The broadcast the clone showed before broadcasts could be managed; it starts out 진행 중. */
export const DEFAULT_LIVE_BROADCAST: Broadcast = {
  id: "demo-time-deal",
  kind: "TIME_DEAL",
  title: "1120♡굿모닝♡",
  startAt: "2026-11-20T08:00",
  youtubeVideoId: "",
  productIds: ALL_SNAPSHOT_PRODUCTS,
  status: "LIVE",
  secret: OPEN_ROOM,
};

const ended = (id: string, kind: BroadcastKind, title: string, startAt: string): Broadcast => ({
  id,
  kind,
  title,
  startAt,
  youtubeVideoId: "",
  productIds: ALL_SNAPSHOT_PRODUCTS,
  status: "ENDED",
  secret: OPEN_ROOM,
});

/** Earlier broadcasts the built-in demo orders belong to. */
export const PAST_BROADCASTS = {
  live1118: ended("bc-1118-live", "LIVE", "1118 수요 라이브", "2026-11-18T10:00"),
  noon1119: ended("bc-1119-noon", "TIME_DEAL", "1119 점심 타임딜", "2026-11-19T12:00"),
  evening1119: ended("bc-1119-evening", "TIME_DEAL", "1119 저녁 타임딜", "2026-11-19T20:00"),
} as const;

const DEFAULT_BROADCASTS: Broadcast[] = [
  {
    id: "bc-1124-evening",
    kind: "TIME_DEAL",
    title: "1124 저녁 타임딜",
    startAt: "2026-11-24T20:00",
    youtubeVideoId: "",
    productIds: ALL_SNAPSHOT_PRODUCTS.slice(0, 6),
    status: "SCHEDULED",
    secret: { enabled: true, condition: "FOLLOWERS", password: "" },
  },
  DEFAULT_LIVE_BROADCAST,
  PAST_BROADCASTS.evening1119,
  PAST_BROADCASTS.noon1119,
  PAST_BROADCASTS.live1118,
];

const pad = (value: number) => String(value).padStart(2, "0");

/** "🔴 26.11.20 08:00 라이브" / "⏰ 26.11.20 08:00 타임딜", as the order list labels orders. */
export function broadcastLabel(broadcast: Pick<Broadcast, "kind" | "startAt">) {
  const date = new Date(broadcast.startAt);
  const stamp = `${pad(date.getFullYear() % 100)}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return broadcast.kind === "LIVE" ? `🔴 ${stamp} 라이브` : `⏰ ${stamp} 타임딜`;
}

/**
 * What an order keeps from the broadcast it was placed in. It is copied onto the order, so
 * renaming or rescheduling the broadcast later does not rewrite existing orders.
 */
export function orderBroadcastInfo(broadcast: Broadcast) {
  return {
    broadcastId: broadcast.id,
    label: broadcastLabel(broadcast),
    timeDeal: broadcast.kind === "TIME_DEAL" ? { startedAt: broadcast.startAt, title: broadcast.title } : undefined,
  };
}

const store = createLocalStore("livemarket-clone-broadcasts");

function toBroadcasts(value: unknown): Broadcast[] {
  if (!Array.isArray(value)) return DEFAULT_BROADCASTS;
  return value.filter(
    (entry): entry is Broadcast =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as Broadcast).id === "string" &&
      typeof (entry as Broadcast).title === "string" &&
      typeof (entry as Broadcast).startAt === "string" &&
      Array.isArray((entry as Broadcast).productIds) &&
      typeof (entry as Broadcast).secret === "object" &&
      (entry as Broadcast).secret !== null,
  );
}

const current = () => toBroadcasts(parseJson(store.read()));

/** Every broadcast. `undefined` during server render and hydration. */
export function useBroadcasts(): Broadcast[] | undefined {
  const raw = store.useRaw();
  return useMemo(() => (raw === undefined ? undefined : toBroadcasts(parseJson(raw))), [raw]);
}

/** The 진행 중 broadcast: `undefined` while unknown (hydration), `null` when nothing is live. */
export function useLiveBroadcast(): Broadcast | null | undefined {
  const broadcasts = useBroadcasts();
  return broadcasts === undefined ? undefined : (broadcasts.find((entry) => entry.status === "LIVE") ?? null);
}

/** YouTube video of the live broadcast, else the one configured in data/live-video.ts. "" = placeholder. */
export function useLiveVideoId(): string {
  const live = useLiveBroadcast();
  return live?.youtubeVideoId || LIVE_VIDEO.youtubeVideoId;
}

/** An 11-character YouTube video id (what follows `v=` or `/live/` in the URL). */
export const isValidYoutubeId = (value: string) => /^[A-Za-z0-9_-]{11}$/.test(value);

function validate(input: BroadcastInput): string | null {
  if (!input.title.trim()) return "방송 제목을 입력해주세요.";
  if (Number.isNaN(Date.parse(input.startAt))) return "시작 일시를 입력해주세요.";
  if (input.youtubeVideoId && !isValidYoutubeId(input.youtubeVideoId)) {
    return "유튜브 영상 ID는 11자입니다 (주소의 v= 뒤 또는 /live/ 뒤 부분).";
  }
  if (input.productIds.length === 0) return "판매할 상품을 1개 이상 골라주세요.";
  if (input.secret.enabled && input.secret.condition === "PASSWORD" && input.secret.password.trim().length < 4) {
    return "비밀번호를 4자 이상 입력해주세요.";
  }
  return null;
}

const clean = (input: BroadcastInput): BroadcastInput => ({
  ...input,
  title: input.title.trim(),
  youtubeVideoId: input.youtubeVideoId.trim(),
  secret: { ...input.secret, password: input.secret.password.trim() },
});

/** Writes of the 방송 관리 screen. Each returns an error message, or `null` when applied. */
export const broadcasts = {
  create(input: BroadcastInput): string | null {
    const next = clean(input);
    const error = validate(next);
    if (error) return error;
    store.write([{ ...next, id: `bc-${Date.now().toString(36)}`, status: "SCHEDULED" }, ...current()]);
    return null;
  },

  update(id: string, input: BroadcastInput): string | null {
    const next = clean(input);
    const error = validate(next);
    if (error) return error;
    store.write(current().map((entry) => (entry.id === id ? { ...entry, ...next } : entry)));
    return null;
  },

  /** 예정 → 진행 중. Only one broadcast can be live: the room shows a single broadcast. */
  start(id: string): string | null {
    const list = current();
    if (list.some((entry) => entry.status === "LIVE" && entry.id !== id)) {
      return "진행 중인 방송이 있습니다. 먼저 종료해주세요.";
    }
    store.write(list.map((entry) => (entry.id === id ? { ...entry, status: "LIVE" } : entry)));
    return null;
  },

  /** 진행 중 → 종료. */
  end(id: string) {
    store.write(current().map((entry) => (entry.id === id ? { ...entry, status: "ENDED" } : entry)));
  },

  /** Removes a broadcast that has not started. */
  remove(id: string) {
    store.write(current().filter((entry) => entry.id !== id || entry.status !== "SCHEDULED"));
  },
};

/** The room password is remembered per broadcast for this browser tab only. */
const PASS_KEY = "livemarket-clone-room-pass";

export const roomPass = {
  has(broadcastId: string) {
    try {
      return window.sessionStorage.getItem(PASS_KEY) === broadcastId;
    } catch {
      return false;
    }
  },
  remember(broadcastId: string) {
    try {
      window.sessionStorage.setItem(PASS_KEY, broadcastId);
    } catch {
      // Not remembered: the password is asked again on the next visit.
    }
  },
};
