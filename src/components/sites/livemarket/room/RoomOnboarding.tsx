"use client";

import { Fragment, useState } from "react";
import { fillOnboardingText, type StoreSettings } from "../data/store-settings";
import styles from "./overlays.module.css";

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
  settings,
  onDone,
}: {
  timeDealId: string;
  /** The three steps (emoji, title, text) come from the store's 입장 안내 setting. */
  settings: StoreSettings;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const steps = settings.onboarding;
  const last = steps.length - 1;
  const current = steps[step];

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
          {steps.map((item, index) => {
            const state = index === step ? styles.stepDotActive : index < step ? styles.stepDotDone : "";
            return (
              <Fragment key={index}>
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
          {current.title !== null && (
            <>
              <div className={styles.stepHead}>
                <span className={styles.stepEmoji}>{current.emoji}</span>
                <p className={styles.stepTitle}>{current.title}</p>
              </div>
              <span className={styles.stepDivider} />
            </>
          )}
          <p className={styles.stepText}>
            {/* `**bold**` in the setting text becomes the highlighted phrase. */}
            {fillOnboardingText(current.text, settings)
              .split("**")
              .map((part, index) => (index % 2 === 1 ? <strong key={index}>{part}</strong> : part))}
          </p>
        </div>

        <div className={styles.stepActions}>
          {step > 0 && (
            <button type="button" className={styles.prevButton} onClick={() => setStep(step - 1)}>
              이전
            </button>
          )}
          <button type="button" className={styles.nextButton} onClick={next}>
            확인했어요 · {step === last ? "입장하기" : `${step + 1}/${steps.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}
