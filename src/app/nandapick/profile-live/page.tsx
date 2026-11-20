import type { Metadata } from "next";
import { ProfileLive } from "@/components/sites/livemarket/live/ProfileLive";

export const metadata: Metadata = {
  title: "데모샵의 라이브마켓! 지금, 단골을 맺어주세요!",
};

export default function NandapickProfileLivePage() {
  return <ProfileLive />;
}
