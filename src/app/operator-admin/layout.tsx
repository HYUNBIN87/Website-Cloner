import type { ReactNode } from "react";
import { OperatorAdminShell } from "@/components/sites/livemarket/operator-admin/OperatorPages";

export default function OperatorAdminLayout({ children }: { children: ReactNode }) {
  return <OperatorAdminShell>{children}</OperatorAdminShell>;
}
