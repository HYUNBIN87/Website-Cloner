"use client";

import { useState } from "react";
import { SelectField, TextField } from "../admin/fields";
import {
  BROADCAST_KIND_TEXT,
  BROADCAST_STATUS,
  ENTRY_CONDITION_TEXT,
  broadcasts,
  useBroadcasts,
  type Broadcast,
  type BroadcastInput,
  type BroadcastKind,
  type BroadcastStatus,
  type EntryCondition,
} from "../data/broadcasts";
import { formatDateTime, formatKRW } from "../data/demo-account";
import type { Product } from "../data/nandapick";
import { useSellerOrders, type SellerOrder } from "../data/seller-admin";
import { useStoreProducts } from "../data/store-products";
import order from "../order/order.module.css";
import orders from "../pages/orders.module.css";
import styles from "./seller-admin.module.css";

const STATUS_ORDER: readonly BroadcastStatus[] = ["LIVE", "SCHEDULED", "ENDED"];

/**
 * /seller-admin/broadcasts: 방송 관리. The seller creates lives and time deals, picks the store
 * products sold in each, starts and ends them, and sets the secret-room entry condition. The
 * broadcast that is 진행 중 is what the live room shows, and new orders take their label and
 * time-deal title from it. Fake data in this browser's localStorage.
 */
export function SellerBroadcastsPage() {
  const list = useBroadcasts();
  const sellerOrders = useSellerOrders();
  const products = useStoreProducts();
  const [message, setMessage] = useState<string | null>(null);
  if (!list || !sellerOrders) return null;

  const sorted = [...list].sort(
    (a, b) =>
      STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || Date.parse(b.startAt) - Date.parse(a.startAt),
  );

  return (
    <>
      <p className={styles.intro}>
        라이브와 타임딜 방송을 만들고 관리합니다. &quot;진행 중&quot;인 방송이 손님의 라이브 방에 나오고, 그 방송에서 들어온
        주문서에 방송 종류·시작 일시·제목이 표시됩니다. 진행 중인 방송은 한 번에 하나만 둘 수 있습니다.
      </p>

      <section className={order.card}>
        <h3 className={order.cardTitle}>방송 만들기</h3>
        <BroadcastForm
          key={list.length}
          products={products}
          initial={{
            kind: "TIME_DEAL",
            title: "",
            startAt: "",
            youtubeVideoId: "",
            productIds: [],
            secret: { enabled: false, condition: "PASSWORD", password: "" },
          }}
          submitLabel="방송 만들기"
          onSubmit={(input) => broadcasts.create(input)}
        />
      </section>

      {message && (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}
      {sorted.map((entry) => (
        <BroadcastCard
          key={entry.id}
          broadcast={entry}
          products={products}
          orders={sellerOrders.filter((item) => item.broadcastId === entry.id)}
          onError={setMessage}
        />
      ))}
    </>
  );
}

function BroadcastCard({
  broadcast,
  products,
  orders: placed,
  onError,
}: {
  broadcast: Broadcast;
  products: readonly Product[];
  orders: readonly SellerOrder[];
  onError: (message: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const status = BROADCAST_STATUS[broadcast.status];
  const sold = products.filter((entry) => broadcast.productIds.includes(entry.id));
  const paid = placed.filter((entry) => entry.status === "PAID" || entry.status === "SHIPPED");
  const { secret } = broadcast;

  return (
    <section className={order.card}>
      <div className={order.statusRow}>
        <span className={orders.chip} style={{ color: status.color, background: status.tint }}>
          {status.text}
        </span>
        <span className={order.meta}>{BROADCAST_KIND_TEXT[broadcast.kind]}</span>
      </div>
      <h3 className={order.cardTitle}>{broadcast.title}</h3>
      <dl className={order.info}>
        <div>
          <dt>시작 일시</dt>
          <dd>{formatDateTime(broadcast.startAt)}</dd>
        </div>
        <div>
          <dt>유튜브 영상</dt>
          <dd>{broadcast.youtubeVideoId || "없음 (LIVE 영상 영역 표시)"}</dd>
        </div>
        <div>
          <dt>판매 상품</dt>
          <dd>
            {sold.length}개
            {sold.length > 0 && ` · ${sold.slice(0, 3).map((entry) => entry.name).join(", ")}${sold.length > 3 ? " 외" : ""}`}
          </dd>
        </div>
        <div>
          <dt>비밀 라이브방</dt>
          <dd>{secret.enabled ? `켜짐 · 입장 조건: ${ENTRY_CONDITION_TEXT[secret.condition]}` : "꺼짐 (누구나 입장)"}</dd>
        </div>
      </dl>

      <dl className={styles.stats}>
        <div>
          <dt>주문 수</dt>
          <dd>{placed.length}</dd>
        </div>
        <div>
          <dt>결제완료</dt>
          <dd>{paid.length}</dd>
        </div>
        <div className={`${styles.statMain} ${styles.statWide}`}>
          <dt>매출 (결제완료 상품 금액)</dt>
          <dd>{formatKRW(paid.reduce((total, entry) => total + entry.totals.items, 0))}</dd>
        </div>
      </dl>

      {editing ? (
        <BroadcastForm
          products={products}
          initial={broadcast}
          submitLabel="저장"
          onCancel={() => setEditing(false)}
          onSubmit={(input) => {
            const error = broadcasts.update(broadcast.id, input);
            if (!error) setEditing(false);
            return error;
          }}
        />
      ) : (
        broadcast.status !== "ENDED" && (
          <div className={styles.saveActions}>
            <button type="button" className={styles.secondaryButton} onClick={() => setEditing(true)}>
              수정
            </button>
            {broadcast.status === "SCHEDULED" && (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  onError(null);
                  broadcasts.remove(broadcast.id);
                }}
              >
                삭제
              </button>
            )}
            {broadcast.status === "SCHEDULED" ? (
              <button type="button" className={order.primaryButton} onClick={() => onError(broadcasts.start(broadcast.id))}>
                방송 시작
              </button>
            ) : (
              <button
                type="button"
                className={order.primaryButton}
                onClick={() => {
                  onError(null);
                  broadcasts.end(broadcast.id);
                }}
              >
                방송 종료
              </button>
            )}
          </div>
        )
      )}
    </section>
  );
}

function BroadcastForm({
  products,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  products: readonly Product[];
  initial: BroadcastInput;
  submitLabel: string;
  /** Returns an error message, or `null` when saved. */
  onSubmit: (input: BroadcastInput) => string | null;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState<BroadcastInput>({
    kind: initial.kind,
    title: initial.title,
    startAt: initial.startAt,
    youtubeVideoId: initial.youtubeVideoId,
    productIds: initial.productIds,
    secret: initial.secret,
  });
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<BroadcastInput>) => setDraft((current) => ({ ...current, ...patch }));
  const chosen = new Set(draft.productIds);
  const toggle = (id: number) =>
    set({ productIds: chosen.has(id) ? draft.productIds.filter((entry) => entry !== id) : [...draft.productIds, id] });

  return (
    <form
      className={styles.shipForm}
      onSubmit={(event) => {
        event.preventDefault();
        setError(onSubmit(draft));
      }}
    >
      <SelectField label="방송 종류" value={draft.kind} onChange={(kind) => set({ kind: kind as BroadcastKind })}>
        {(Object.keys(BROADCAST_KIND_TEXT) as BroadcastKind[]).map((kind) => (
          <option key={kind} value={kind}>
            {BROADCAST_KIND_TEXT[kind]}
          </option>
        ))}
      </SelectField>
      <TextField label="제목" value={draft.title} onChange={(title) => set({ title })} />
      <label className={styles.field}>
        <span>시작 일시</span>
        <input type="datetime-local" value={draft.startAt} onChange={(event) => set({ startAt: event.target.value })} />
      </label>
      <TextField
        label="유튜브 영상 ID (선택, 11자)"
        value={draft.youtubeVideoId}
        placeholder="주소의 v= 뒤 또는 /live/ 뒤 부분"
        onChange={(youtubeVideoId) => set({ youtubeVideoId })}
      />

      <fieldset className={styles.step}>
        <legend>
          판매할 상품 {draft.productIds.length}/{products.length}
        </legend>
        <div className={styles.saveActions}>
          <button type="button" className={styles.linkButton} onClick={() => set({ productIds: products.map((entry) => entry.id) })}>
            전체 선택
          </button>
          <button type="button" className={styles.linkButton} onClick={() => set({ productIds: [] })}>
            전체 해제
          </button>
        </div>
        <div className={styles.productPicker}>
          {products.map((entry) => (
            <label key={entry.id} className={styles.check}>
              <input type="checkbox" checked={chosen.has(entry.id)} onChange={() => toggle(entry.id)} />
              <span>
                {entry.name} <span className={styles.nickname}>{entry.price}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.step}>
        <legend>비밀 라이브방</legend>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={draft.secret.enabled}
            onChange={(event) => set({ secret: { ...draft.secret, enabled: event.target.checked } })}
          />
          <span>비밀 라이브방으로 열기 (입장 조건을 통과한 손님만 입장)</span>
        </label>
        {draft.secret.enabled && (
          <>
            <SelectField
              label="입장 조건"
              value={draft.secret.condition}
              onChange={(condition) => set({ secret: { ...draft.secret, condition: condition as EntryCondition } })}
            >
              {(Object.keys(ENTRY_CONDITION_TEXT) as EntryCondition[]).map((condition) => (
                <option key={condition} value={condition}>
                  {ENTRY_CONDITION_TEXT[condition]}
                </option>
              ))}
            </SelectField>
            {draft.secret.condition === "PASSWORD" ? (
              <TextField
                label="비밀번호 (4자 이상)"
                value={draft.secret.password}
                onChange={(password) => set({ secret: { ...draft.secret, password } })}
              />
            ) : (
              <p className={styles.hint}>로그인한 단골만 입장합니다. 초안에서는 데모 계정이 이 스토어의 단골입니다.</p>
            )}
          </>
        )}
      </fieldset>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.saveActions}>
        {onCancel && (
          <button type="button" className={styles.secondaryButton} onClick={onCancel}>
            취소
          </button>
        )}
        <button type="submit" className={order.primaryButton}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
