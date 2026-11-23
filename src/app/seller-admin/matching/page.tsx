import type { Metadata } from "next";
import { DepositMatchingPage } from "@/components/sites/livemarket/seller-admin/DepositMatchingPage";

export const metadata: Metadata = {
  title: "입금 자동매칭 | 셀러 어드민",
};

export default function Page() {
  return <DepositMatchingPage />;
}
