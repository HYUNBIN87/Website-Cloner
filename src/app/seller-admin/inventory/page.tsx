import type { Metadata } from "next";
import { SupplyInventoryPage } from "@/components/sites/livemarket/seller-admin/SupplyInventoryPage";

export const metadata: Metadata = {
  title: "내 공급 재고 | 셀러 어드민",
};

export default function Page() {
  return <SupplyInventoryPage />;
}
