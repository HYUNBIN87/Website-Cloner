"use client";

import { Fragment, useState } from "react";
import styles from "./overlays.module.css";

const STEPS = [
  { emoji: "📢", title: null },
  { emoji: "🍀", title: "취소 찬스" },
  { emoji: "⏰", title: "결제 마감" },
] as const;

/** Same storage key and shape the source uses to remember a completed onboarding per time deal. */
export const ONBOARDING_STORAGE_KEY = "profile-live-room-onboarding";

type Stored = { state: { completedTimeDealIds: string[] }; version: number };

export function hasCompletedOnboarding(timeDealId: string): boolean {
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Stored;
    return parsed.state.completedTimeDealIds.includes(timeDealId);
  } catch {
    return false;
  }
}

function markCompleted(timeDealId: string) {
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    const parsed: Stored = raw ? (JSON.parse(raw) as Stored) : { state: { completedTimeDealIds: [] }, version: 0 };
    if (!parsed.state.completedTimeDealIds.includes(timeDealId)) {
      parsed.state.completedTimeDealIds.push(timeDealId);
    }
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Storage can be unavailable (private mode); the onboarding simply shows again next time.
  }
}

export function RoomOnboarding({
  timeDealId,
  notice,
  onDone,
}: {
  timeDealId: string;
  notice: string;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const last = STEPS.length - 1;

  const next = () => {
    if (step < last) {
      setStep(step + 1);
      return;
    }
    markCompleted(timeDealId);
    onDone();
  };

  return (
    <div className={styles.onboardingOverlay}>
      <div className={styles.onboarding} role="dialog" aria-modal="true" aria-label="라이브 입장 전 필독">
        <div className={styles.badgeRow}>
          <div className={styles.mustRead}>
            <span aria-hidden="true">📌</span>
            <span>라이브 입장 전 필독</span>
          </div>
        </div>

        <div className={styles.stepper} aria-hidden="true">
          {STEPS.map((item, index) => {
            const state = index === step ? styles.stepDotActive : index < step ? styles.stepDotDone : "";
            return (
              <Fragment key={item.emoji}>
                {index > 0 && (
                  <div className={`${styles.stepLine} ${index <= step ? styles.stepLineDone : ""}`} />
                )}
                <span key={`${item.emoji}-${index === step}`} className={`${styles.stepDot} ${state}`}>
                  {index === step && <span className={styles.stepPulse} />}
                  <span>{item.emoji}</span>
                </span>
              </Fragment>
            );
          })}
        </div>

        <div className={styles.stepCard}>
          {step === 0 && <p className={styles.stepText}>{notice}</p>}
          {step === 1 && (
            <>
              <div className={styles.stepHead}>
                <span className={styles.stepEmoji}>🍀</span>
                <p className={styles.stepTitle}>취소 찬스</p>
              </div>
              <span className={styles.stepDivider} />
              <p className={styles.stepText}>
                결제하기 전이라면 담아둔 상품을 <strong>최대 5회</strong> 취소할 수 있어요.
              </p>
            </>
          )}
          {step === 2 && (
            <>
              <div className={styles.stepHead}>
                <span className={styles.stepEmoji}>⏰</span>
                <p className={styles.stepTitle}>결제 마감</p>
              </div>
              <span className={styles.stepDivider} />
              <p className={styles.stepText}>
                상품을 담은 뒤 <strong>24시간</strong> 안에 결제하지 않으면 주문서가 만료돼 결제할 수
                없어요.
              </p>
            </>
          )}
        </div>

        <div className={styles.stepActions}>
          {step > 0 && (
            <button type="button" className={styles.prevButton} onClick={() => setStep(step - 1)}>
              이전
            </button>
          )}
          <button type="button" className={styles.nextButton} onClick={next}>
            확인했어요 · {step === last ? "입장하기" : `${step + 1}/${STEPS.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}
