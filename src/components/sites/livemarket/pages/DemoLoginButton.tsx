"use client";

import { useRouter } from "next/navigation";
import { demoSession } from "../data/demo-session";
import styles from "./pages.module.css";

/**
 * Clone-only entry to the logged-in screens. It signs in a fake account stored in this
 * browser and returns to the requested page; it is not part of the source login page.
 */
export function DemoLoginButton({ previousPath }: { previousPath: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={styles.demoLogin}
      onClick={() => {
        demoSession.signIn();
        router.replace(previousPath);
      }}
    >
      데모 계정으로 둘러보기 (가짜 데이터)
    </button>
  );
}
