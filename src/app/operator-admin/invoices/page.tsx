import type { Metadata } from "next";
import { InvoicesPage } from "@/components/sites/livemarket/operator-admin/OperatorPages";

export const metadata: Metadata = {
  title: "셀러별 월 청구서 | 운영자 어드민",
};

export default function Page() {
  return <InvoicesPage />;
}
