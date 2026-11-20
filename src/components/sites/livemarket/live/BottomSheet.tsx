"use client";

import { useEffect, useId, type ReactNode } from "react";
import { Icon } from "../Icon";
import styles from "./sheet.module.css";

type BottomSheetProps = {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  bodyClassName?: string;
  panelClassName?: string;
};

export function BottomSheet({
  title,
  subtitle,
  onClose,
  children,
  footer,
  bodyClassName,
  panelClassName,
}: BottomSheetProps) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <>
      <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
      <div className={`${styles.panel} ${panelClassName ?? ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={styles.handle} />
        <div className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {subtitle}
          <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
            <Icon name="close-x" width={22} />
          </button>
        </div>
        <div className={`${styles.body} ${bodyClassName ?? ""}`}>{children}</div>
        {footer}
      </div>
    </>
  );
}
