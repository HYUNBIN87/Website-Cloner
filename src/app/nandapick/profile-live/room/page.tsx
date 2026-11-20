import type { Metadata } from "next";
import { LiveRoom } from "@/components/sites/livemarket/room/LiveRoom";

export const metadata: Metadata = {
  title: "데모샵의 라이브마켓! 지금, 단골을 맺어주세요!",
};

export default function NandapickLiveRoomPage() {
  return <LiveRoom />;
}
