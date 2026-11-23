import type { Metadata } from "next";
import { HandoversPage } from "@/components/sites/livemarket/operator-admin/OperatorPages";

export const metadata: Metadata = {
  title: "공급 출고 기록 | 운영자 어드민",
};

export default function Page() {
  return <HandoversPage />;
}
