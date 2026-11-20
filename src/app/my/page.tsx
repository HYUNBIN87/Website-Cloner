import type { Metadata } from "next";
import { MyPage } from "@/components/sites/livemarket/pages/MyPage";

export const metadata: Metadata = {
  title: "내 정보 | 라이브마켓",
};

export default function Page() {
  return <MyPage />;
}
