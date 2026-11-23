import type { Metadata } from "next";
import { PlansPage } from "@/components/sites/livemarket/operator-admin/OperatorPages";

export const metadata: Metadata = {
  title: "이용료 플랜 | 운영자 어드민",
};

export default function Page() {
  return <PlansPage />;
}
