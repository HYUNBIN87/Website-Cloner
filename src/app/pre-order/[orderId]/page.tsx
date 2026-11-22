import type { Metadata } from "next";
import { PreOrderDetailPage } from "@/components/sites/livemarket/pages/PreOrderDetailPage";

export const metadata: Metadata = {
  title: "주문서 상세 | 라이브마켓",
};

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <PreOrderDetailPage orderId={orderId} />;
}
