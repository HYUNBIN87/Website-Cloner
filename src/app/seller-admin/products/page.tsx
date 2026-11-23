import type { Metadata } from "next";
import { SellerProductsPage } from "@/components/sites/livemarket/seller-admin/SellerProductsPage";

export const metadata: Metadata = {
  title: "스토어 상품 관리 | 셀러 어드민",
};

export default function Page() {
  return <SellerProductsPage />;
}
