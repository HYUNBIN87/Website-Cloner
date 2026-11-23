"use client";

import { useMemo } from "react";
import { useNow } from "./clock";
import { usePlatform, type PlatformState, type ShippedUnits } from "./platform";
import { demoSellerShipped, useSellerOrders } from "./seller-admin";

export type OperatorView = {
  state: PlatformState;
  now: number;
  /**
   * The demo store's shipped units per product name, counted from the same orders its seller
   * admin shows. This is what keeps the two admins' numbers equal.
   */
  demoShipped: ReadonlyMap<string, ShippedUnits>;
};

/** Everything the operator admin screens read. `undefined` during server render and hydration. */
export function useOperatorView(): OperatorView | undefined {
  const state = usePlatform();
  const orders = useSellerOrders();
  const now = useNow();
  return useMemo(
    () =>
      state === undefined || orders === undefined || now === undefined
        ? undefined
        : { state, now, demoShipped: demoSellerShipped(orders, now) },
    [state, orders, now],
  );
}

export const OPERATOR_ADMIN_ROUTES = {
  products: "/operator-admin",
  handovers: "/operator-admin/handovers",
  recoveries: "/operator-admin/recoveries",
  invoices: "/operator-admin/invoices",
  plans: "/operator-admin/plans",
  sellers: "/operator-admin/sellers",
} as const;
