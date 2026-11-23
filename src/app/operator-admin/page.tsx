import type { Metadata } from "next";
import { SupplyProductsPage } from "@/components/sites/livemarket/operator-admin/OperatorPages";

export const metadata: Metadata = {
  title: "공급 상품 관리 | 운영자 어드민",
};

export default function Page() {
  return <SupplyProductsPage />;
}
