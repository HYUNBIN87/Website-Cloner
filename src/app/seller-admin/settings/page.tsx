import type { Metadata } from "next";
import { StoreSettingsPage } from "@/components/sites/livemarket/seller-admin/StoreSettingsPage";

export const metadata: Metadata = {
  title: "스토어 설정 | 셀러 어드민",
};

export default function Page() {
  return <StoreSettingsPage />;
}
