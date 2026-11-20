"use client";

import Image from "next/image";
import Link from "next/link";
import { DEMO_FOLLOWING } from "../data/demo-account";
import { useDemoSession } from "../data/demo-session";
import { PlatformShell } from "../shell/PlatformShell";
import styles from "./pages.module.css";

/** /following: the empty state while logged out, the favorite-store list with the demo login. */
export function FollowingPage() {
  const session = useDemoSession();

  return (
    <PlatformShell active="following">
      {session ? (
        <main className={styles.followingMainLoggedIn}>
          <ul className={styles.followList}>
            {DEMO_FOLLOWING.map((store) => (
              <li key={store.href}>
                <Link href={store.href} className={styles.followCard}>
                  <div className={styles.followStore}>
                    <span className={styles.followAvatar}>
                      <Image src={store.avatar} alt="" width={48} height={48} />
                    </span>
                    <p className={styles.followName}>{store.name}</p>
                  </div>
                  <div className={styles.visitButton}>
                    <span>스토어 방문</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </main>
      ) : (
        <main className={styles.followingMain}>
          {session === undefined ? (
            <div className={styles.emptyState} aria-hidden="true" />
          ) : (
            <div className={styles.emptyState}>
              <Image
                src="/sites/livemarket/img/empty_following.png"
                alt="empty_following"
                width={100}
                height={100}
              />
              <p className={styles.emptyTitle}>내 단골가게가 없어요!</p>
              <p className={styles.emptyText}>로그인 후 단골가게를 등록해보세요!</p>
            </div>
          )}
        </main>
      )}
    </PlatformShell>
  );
}
