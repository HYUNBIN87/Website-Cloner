import type { Metadata, Viewport } from "next";
import { gmarketSans, pretendard } from "@/components/sites/livemarket/fonts";
import "./globals.css";
import "@/components/sites/livemarket/base.css";

export const metadata: Metadata = {
  title: "라이브마켓 - 라이브 셀러를 위한 주문·정산 자동화 플랫폼",
  description: "라이브 셀러를 위한 주문·정산 자동화 플랫폼",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${pretendard.variable} ${gmarketSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
