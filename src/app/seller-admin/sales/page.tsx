import type { Metadata } from "next";
import { SalesPage } from "@/components/sites/livemarket/seller-admin/SalesPage";

export const metadata: Metadata = {
  title: "내 매출 | 셀러 어드민",
};

export default function Page() {
  return <SalesPage />;
}
