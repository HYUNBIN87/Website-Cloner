import type { Metadata } from "next";
import { SellerBroadcastsPage } from "@/components/sites/livemarket/seller-admin/SellerBroadcastsPage";

export const metadata: Metadata = {
  title: "방송 관리 | 셀러 어드민",
};

export default function Page() {
  return <SellerBroadcastsPage />;
}
