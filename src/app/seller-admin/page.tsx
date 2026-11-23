import type { Metadata } from "next";
import { SellerOrdersPage } from "@/components/sites/livemarket/seller-admin/SellerOrdersPage";

export const metadata: Metadata = {
  title: "주문 목록 | 셀러 어드민",
};

export default function Page() {
  return <SellerOrdersPage mode="all" />;
}
