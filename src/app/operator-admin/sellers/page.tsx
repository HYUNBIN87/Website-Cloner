import type { Metadata } from "next";
import { SellersPage } from "@/components/sites/livemarket/operator-admin/OperatorPages";

export const metadata: Metadata = {
  title: "셀러 승인 | 운영자 어드민",
};

export default function Page() {
  return <SellersPage />;
}
