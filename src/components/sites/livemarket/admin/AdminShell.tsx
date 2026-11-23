"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import pages from "../pages/pages.module.css";
import styles from "../seller-admin/seller-admin.module.css";

export type AdminNavEntry = { href: string; label: string };

/**
 * Frame shared by the seller admin and operator admin drafts: the consumer screens' 500px
 * column with a header, the "fake data" note and a scrollable menu.
 */
export function AdminShell({
  label,
  title,
  nav,
  link,
  children,
}: {
  /** Small line above the title, e.g. "셀러 어드민". */
  label: string;
  title: string;
  nav: readonly AdminNavEntry[];
  /** Shortcut on the right of the header. */
  link: AdminNavEntry;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className={pages.plainPage}>
      <div className={pages.plainColumn}>
        <header className={styles.header}>
          <div>
            <p className={styles.headerLabel}>{label}</p>
            <h1 className={styles.headerStore}>{title}</h1>
          </div>
          <Link href={link.href} className={styles.headerLink}>
            {link.label}
          </Link>
        </header>
        <p className={styles.demoNote}>초안입니다. 모든 데이터는 가짜이고 이 브라우저에만 저장됩니다.</p>
        <nav className={styles.nav} aria-label={`${label} 메뉴`}>
          {nav.map((entry) => {
            const active = pathname === entry.href;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {entry.label}
              </Link>
            );
          })}
        </nav>
        <main className={styles.body}>{children}</main>
      </div>
    </div>
  );
}
