"use client";

import { useEffect, useState, type ReactNode } from "react";
import { NANDAPICK } from "../data/nandapick";
import {
  defaultStoreSettings,
  storeSettings,
  useStoreSettings,
  useStoreSettingsLoaded,
  type OnboardingStep,
  type StoreAddress,
  type StoreSettings,
} from "../data/store-settings";
import order from "../order/order.module.css";
import styles from "./seller-admin.module.css";

const slug = NANDAPICK.slug;

/**
 * /seller-admin/settings: the seller edits the values of store-settings.ts. Saving writes them
 * to this browser's localStorage, and every consumer screen reads them from there. The items
 * follow docs/research/livemarket/store-settings.md.
 */
export function StoreSettingsPage() {
  const loaded = useStoreSettingsLoaded();
  const saved = useStoreSettings(slug);
  // The form starts from the saved values, which are only known after hydration.
  return loaded ? <SettingsForm saved={saved} /> : null;
}

function SettingsForm({ saved }: { saved: StoreSettings }) {
  const [draft, setDraft] = useState(saved);
  const [notice, setNotice] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = (patch: Partial<StoreSettings>) => setDraft((current) => ({ ...current, ...patch }));

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(id);
  }, [notice]);

  const setStep = (index: number, patch: Partial<OnboardingStep>) => {
    const steps = draft.onboarding.map((step, at) => (at === index ? { ...step, ...patch } : step));
    set({ onboarding: [steps[0], steps[1], steps[2]] });
  };

  const save = () => {
    storeSettings.save(draft, slug);
    setNotice("저장했어요. 새 주문과 소비자 화면에 바로 반영됩니다.");
  };

  const reset = () => {
    storeSettings.reset(slug);
    setDraft(defaultStoreSettings(slug));
    setNotice("기본값으로 되돌렸어요.");
  };

  const deadline = draft.paymentDeadline;

  return (
    <form
      className={styles.settings}
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <Card title="결제 기한" note="저장한 뒤 들어오는 주문부터 적용됩니다. 이미 들어온 주문의 결제 마감은 바뀌지 않습니다.">
        <label className={styles.radio}>
          <input
            type="radio"
            name="deadline"
            checked={deadline.type === "NEXT_DAY_SAME_TIME"}
            onChange={() => set({ paymentDeadline: { type: "NEXT_DAY_SAME_TIME" } })}
          />
          <span>주문 다음 날 같은 시각까지</span>
        </label>
        <label className={styles.radio}>
          <input
            type="radio"
            name="deadline"
            checked={deadline.type === "MINUTES_AFTER_ORDER"}
            onChange={() => set({ paymentDeadline: { type: "MINUTES_AFTER_ORDER", minutes: 30 } })}
          />
          <span>주문 후 N분 이내</span>
        </label>
        {deadline.type === "MINUTES_AFTER_ORDER" && (
          <NumberField
            label="분"
            min={1}
            value={deadline.minutes}
            onChange={(minutes) => set({ paymentDeadline: { type: "MINUTES_AFTER_ORDER", minutes } })}
          />
        )}
      </Card>

      <Card title="배송비" note="이미 들어온 주문의 배송비는 주문할 때의 값 그대로입니다.">
        <TextField
          label="배송 방법"
          value={draft.shipping.method}
          onChange={(method) => set({ shipping: { ...draft.shipping, method } })}
        />
        <NumberField
          label="기본 배송비 (원)"
          value={draft.shipping.fee}
          onChange={(fee) => set({ shipping: { ...draft.shipping, fee } })}
        />
        <OptionalAmount
          label="무료배송 기준 금액 (원)"
          toggle="무료배송 사용"
          value={draft.shipping.freeFrom}
          fallback={100000}
          onChange={(freeFrom) => set({ shipping: { ...draft.shipping, freeFrom } })}
        />
        <OptionalAmount
          label="도서산간 추가 배송비 (원)"
          toggle="도서산간 추가 배송비 안내"
          value={draft.shipping.remoteAreaFee}
          fallback={3000}
          onChange={(remoteAreaFee) => set({ shipping: { ...draft.shipping, remoteAreaFee } })}
        />
      </Card>

      <Card title="주문">
        <NumberField label="취소찬스 횟수" value={draft.cancelChances} onChange={(cancelChances) => set({ cancelChances })} />
        <NumberField
          label="1회 주문 최대 수량"
          min={1}
          value={draft.maxQuantityPerOrder}
          onChange={(maxQuantityPerOrder) => set({ maxQuantityPerOrder })}
        />
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={draft.mergeOrders}
            onChange={(event) => set({ mergeOrders: event.target.checked })}
          />
          <span>주문서 합치기 (입금완료 확인요청 전의 추가 주문을 같은 주문서에 합침)</span>
        </label>
      </Card>

      <Card title="입금 계좌">
        <TextField label="은행" value={draft.bankAccount.bank} onChange={(bank) => set({ bankAccount: { ...draft.bankAccount, bank } })} />
        <TextField
          label="계좌번호"
          value={draft.bankAccount.number}
          onChange={(number) => set({ bankAccount: { ...draft.bankAccount, number } })}
        />
        <TextField
          label="예금주"
          value={draft.bankAccount.holder}
          onChange={(holder) => set({ bankAccount: { ...draft.bankAccount, holder } })}
        />
      </Card>

      <Card title="스토어 공지">
        <TextArea label="공지" rows={6} value={draft.notice} onChange={(value) => set({ notice: value })} />
      </Card>

      <Card
        title="입장 안내 3단계"
        note="본문에 {notice}(스토어 공지), {cancelChances}(취소찬스 횟수), {paymentWindow}(결제 기한)를 쓰면 설정값이 들어갑니다. **굵게**는 강조 표시됩니다."
      >
        {draft.onboarding.map((step, index) => (
          <fieldset key={index} className={styles.step}>
            <legend>{index + 1}단계</legend>
            <TextField label="이모지" value={step.emoji} onChange={(emoji) => setStep(index, { emoji })} />
            <TextField
              label="제목 (비우면 제목 없음)"
              value={step.title ?? ""}
              onChange={(title) => setStep(index, { title: title.trim() === "" ? null : title })}
            />
            <TextArea label="본문" rows={3} value={step.text} onChange={(value) => setStep(index, { text: value })} />
          </fieldset>
        ))}
      </Card>

      <Card title="스토어 소개 · 연락처">
        <TextArea label="소개글" rows={5} value={draft.intro} onChange={(intro) => set({ intro })} />
        {(["instagram", "youtube", "tiktok", "band"] as const).map((key) => (
          <TextField
            key={key}
            label={`SNS 링크 (${key})`}
            type="url"
            value={draft.socials[key]}
            onChange={(value) => set({ socials: { ...draft.socials, [key]: value } })}
          />
        ))}
        <TextField
          label="고객센터 연락처 (링크)"
          type="url"
          value={draft.customerCenterUrl}
          onChange={(customerCenterUrl) => set({ customerCenterUrl })}
        />
      </Card>

      <Card title="발송지 · 반품지">
        <AddressFields label="발송지" value={draft.shipFrom} onChange={(shipFrom) => set({ shipFrom })} />
        <AddressFields label="반품지" value={draft.returnTo} onChange={(returnTo) => set({ returnTo })} />
      </Card>

      <div className={styles.saveBar}>
        {notice && (
          <p className={styles.saveNotice} role="status">
            {notice}
          </p>
        )}
        <div className={styles.saveActions}>
          <button type="button" className={styles.secondaryButton} onClick={reset}>
            기본값으로 되돌리기
          </button>
          <button type="submit" className={order.primaryButton} disabled={!dirty}>
            {dirty ? "저장" : "저장됨"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Card({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className={order.card}>
      <h3 className={order.cardTitle}>{title}</h3>
      {note && <p className={styles.hint}>{note}</p>}
      {children}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "url";
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextArea({
  label,
  value,
  rows,
  onChange,
}: {
  label: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

/** Whole numbers only; anything else counts as the minimum. */
function NumberField({
  label,
  value,
  min = 0,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        step={1}
        value={value}
        onChange={(event) => {
          const next = Math.floor(Number(event.target.value));
          onChange(Number.isFinite(next) ? Math.max(min, next) : min);
        }}
      />
    </label>
  );
}

/** An amount that can be switched off (`null`). */
function OptionalAmount({
  label,
  toggle,
  value,
  fallback,
  onChange,
}: {
  label: string;
  toggle: string;
  value: number | null;
  fallback: number;
  onChange: (value: number | null) => void;
}) {
  return (
    <>
      <label className={styles.check}>
        <input type="checkbox" checked={value !== null} onChange={(event) => onChange(event.target.checked ? fallback : null)} />
        <span>{toggle}</span>
      </label>
      {value !== null && <NumberField label={label} value={value} onChange={onChange} />}
    </>
  );
}

function AddressFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: StoreAddress;
  onChange: (value: StoreAddress) => void;
}) {
  return (
    <fieldset className={styles.step}>
      <legend>{label}</legend>
      <TextField label="우편번호" value={value.postalCode} onChange={(postalCode) => onChange({ ...value, postalCode })} />
      <TextField label="주소" value={value.address} onChange={(address) => onChange({ ...value, address })} />
      <TextField
        label="상세 주소"
        value={value.detailAddress}
        onChange={(detailAddress) => onChange({ ...value, detailAddress })}
      />
    </fieldset>
  );
}
