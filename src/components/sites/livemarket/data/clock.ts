"use client";

import { useSyncExternalStore } from "react";

/** Coarse shared clock, so deadline-driven UI (기한 만료, "N분 전 주문") updates without a reload. */
const TICK_MS = 15_000;

let current = 0;
let start = 0;

function read() {
  if (!current) {
    current = Date.now();
    start = current;
  }
  return current;
}

function subscribe(listener: () => void) {
  read();
  current = Date.now();
  const id = setInterval(() => {
    current = Date.now();
    listener();
  }, TICK_MS);
  return () => clearInterval(id);
}

/** Epoch ms, refreshed every 15 s. `undefined` during server render and hydration. */
export function useNow(): number | undefined {
  return useSyncExternalStore<number | undefined>(subscribe, read, () => undefined);
}

/** When this page was opened; the built-in demo orders are dated relative to it. */
export const sessionStart = () => start || (read(), start);
