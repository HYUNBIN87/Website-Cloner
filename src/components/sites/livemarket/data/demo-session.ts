"use client";

import { useSyncExternalStore } from "react";
import { DEMO_USER } from "./demo-account";

/**
 * The clone has no real authentication. A "demo login" stores a flag in this browser's
 * localStorage so the logged-in screens (/following, /order/list, /my) can be viewed with
 * fake data. Nothing is sent anywhere.
 */
const STORAGE_KEY = "livemarket-clone-demo-session";

export type DemoSession = { nickname: string };

const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function write(value: DemoSession | null) {
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked: the session simply does not persist.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function parse(raw: string | null): DemoSession | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<DemoSession>;
    return { nickname: typeof value.nickname === "string" ? value.nickname : DEMO_USER.nickname };
  } catch {
    return null;
  }
}

/** `undefined` while the session is unknown (server render and hydration), then the session or null. */
export function useDemoSession(): DemoSession | null | undefined {
  const raw = useSyncExternalStore<string | null | undefined>(subscribe, readRaw, () => undefined);
  return raw === undefined ? undefined : parse(raw);
}

export const demoSession = {
  signIn: () => write({ nickname: DEMO_USER.nickname }),
  signOut: () => write(null),
  setNickname: (nickname: string) => write({ nickname }),
};

/** Same rule as the source's helper text: 2-24 chars; letters, digits, Hangul and '-', '_', '.'. */
export function isValidNickname(value: string) {
  return /^[0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ._-]{2,24}$/.test(value);
}
