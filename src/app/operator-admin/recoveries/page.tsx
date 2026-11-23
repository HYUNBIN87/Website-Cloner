import type { Metadata } from "next";
import { RecoveriesPage } from "@/components/sites/livemarket/operator-admin/OperatorPages";

export const metadata: Metadata = {
  title: "회수 처리 | 운영자 어드민",
};

export default function Page() {
  return <RecoveriesPage />;
}
