"use client";

import Image from "next/image";
import Link from "next/link";
import { Icon } from "../Icon";
import { DEMO_USER } from "../data/demo-account";
import { useDemoSession } from "../data/demo-session";
import { ROUTES, SOURCE_ROUTES } from "../data/routes";
import styles from "./shell.module.css";

export type TabKey = "home" | "following" | "start" | "orders" | "my";

const TABS: {
  key: TabKey;
  href: string;
  label: string;
  icon: string;
  activeIcon: string;
}[] = [
  { key: "home", href: ROUTES.home, label: "라이브마켓", icon: "tab-live-inactive", activeIcon: "tab-live-active" },
  { key: "following", href: ROUTES.following, label: "내 단골가게", icon: "tab-store", activeIcon: "tab-store-active" },
  { key: "start", href: SOURCE_ROUTES.sellerApplication, label: "라방시작", icon: "tab-plus", activeIcon: "tab-plus" },
  { key: "orders", href: ROUTES.orderList, label: "주문내역", icon: "tab-chat", activeIcon: "tab-chat" },
  { key: "my", href: ROUTES.my, label: "내 정보", icon: "tab-profile", activeIcon: "tab-profile" },
];

export function BottomTabBar({ active }: { active: TabKey }) {
  const session = useDemoSession();

  return (
    <nav className={styles.tabBar} aria-label="하단 메뉴">
      <div className={styles.tabs}>
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          const isMy = tab.key === "my";
          // Logged out, the source links 내 정보 to /auth/login; logged in, to /my with the profile photo.
          const href = isMy && !session ? ROUTES.login() : tab.href;
          return (
            <Link
              key={tab.key}
              href={href}
              className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <div className={styles.tabIcon}>
                {isMy && session ? (
                  <span className={styles.tabAvatar}>
                    <Image src={DEMO_USER.avatar} alt="" width={18} height={18} />
                  </span>
                ) : (
                  <Icon name={isActive ? tab.activeIcon : tab.icon} width={isActive ? 25 : 24} />
                )}
              </div>
              <span className={styles.tabLabel}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
