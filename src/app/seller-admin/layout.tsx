import type { ReactNode } from "react";
import { SellerAdminShell } from "@/components/sites/livemarket/seller-admin/SellerAdminShell";

export default function SellerAdminLayout({ children }: { children: ReactNode }) {
  return <SellerAdminShell>{children}</SellerAdminShell>;
}
