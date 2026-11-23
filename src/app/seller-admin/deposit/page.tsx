import type { Metadata } from "next";
import { SellerOrdersPage } from "@/components/sites/livemarket/seller-admin/SellerOrdersPage";

export const metadata: Metadata = {
  title: "입금 확인 | 셀러 어드민",
};

export default function Page() {
  return <SellerOrdersPage mode="deposit" />;
}
