"use client";

import { useSyncExternalStore } from "react";

/** A JSON value kept under one localStorage key of this browser. Nothing is sent anywhere. */
export function createLocalStore(key: string) {
  const listeners = new Set<() => void>();

  const read = (): string | null => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  /** `null` removes the saved value. */
  const write = (value: unknown) => {
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage blocked: the value simply does not persist.
    }
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  };

  /** Raw saved text. `undefined` during server render and hydration, `null` when nothing is saved. */
  const useRaw = () => useSyncExternalStore<string | null | undefined>(subscribe, read, () => undefined);

  return { read, write, useRaw };
}

export function parseJson(raw: string | null | undefined): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}
