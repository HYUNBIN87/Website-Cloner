"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { AdminShell } from "../admin/AdminShell";
import { NumberField, SelectField, TextField } from "../admin/fields";
import { formatDateTime, formatKRW } from "../data/demo-account";
import { OPERATOR_ADMIN_ROUTES, useOperatorView, type OperatorView } from "../data/operator-admin";
import {
  OVERDUE_ACTION_TEXT,
  approvedSellers,
  invoiceFor,
  monthOf,
  platform,
  sellerHoldings,
  type InvoiceMonth,
  type OverdueAction,
  type PlatformSeller,
  type StockMove,
} from "../data/platform";
import order from "../order/order.module.css";
import orders from "../pages/orders.module.css";
import { SELLER_ADMIN_ROUTES } from "../seller-admin/SellerAdminShell";
import styles from "../seller-admin/seller-admin.module.css";

/*
 * Operator admin draft (/operator-admin). Like the seller admin it is not a clone of the source
 * admin: the screens follow docs/platform/business-model.md, reuse the consumer screens' parts,
 * and keep fake data in this browser's localStorage. There is no operator login.
 */

const NAV = [
  { href: OPERATOR_ADMIN_ROUTES.products, label: "공급 상품" },
  { href: OPERATOR_ADMIN_ROUTES.handovers, label: "공급 출고" },
  { href: OPERATOR_ADMIN_ROUTES.recoveries, label: "회수" },
  { href: OPERATOR_ADMIN_ROUTES.invoices, label: "월 청구서" },
  { href: OPERATOR_ADMIN_ROUTES.plans, label: "이용료 플랜" },
  { href: OPERATOR_ADMIN_ROUTES.sellers, label: "셀러 승인" },
] as const;

export function OperatorAdminShell({ children }: { children: ReactNode }) {
  return (
    <AdminShell
      label="운영자 어드민"
      title="라이브마켓 운영"
      nav={NAV}
      link={{ href: SELLER_ADMIN_ROUTES.orders, label: "셀러 어드민" }}
    >
      {children}
    </AdminShell>
  );
}

function Card({ title, note, children }: { title: ReactNode; note?: string; children: ReactNode }) {
  return (
    <section className={order.card}>
      <h3 className={order.cardTitle}>{title}</h3>
      {note && <p className={styles.hint}>{note}</p>}
      {children}
    </section>
  );
}

const Intro = ({ children }: { children: ReactNode }) => <p className={styles.intro}>{children}</p>;
const ErrorText = ({ children }: { children: ReactNode }) =>
  children ? (
    <p className={styles.error} role="alert">
      {children}
    </p>
  ) : null;

const sellerName = (view: OperatorView, id: string) =>
  view.state.sellers.find((seller) => seller.id === id)?.storeName ?? id;
const productName = (view: OperatorView, id: string) =>
  view.state.products.find((entry) => entry.id === id)?.name ?? id;

// ---------------------------------------------------------------------------
// 1. 공급 상품 관리
// ---------------------------------------------------------------------------

/** /operator-admin: supply products with 공급가 (hidden from buyers), 최저 판매가 and 재고. */
export function SupplyProductsPage() {
  const view = useOperatorView();
  const [draft, setDraft] = useState({ name: "", supplyPrice: 0, minPrice: 0, stock: 0 });
  const [error, setError] = useState<string | null>(null);
  if (!view) return null;
  const { state } = view;

  return (
    <>
      <Intro>
        운영자가 셀러에게 공급하는 상품입니다. 공급가는 셀러에게만 보이고 고객 화면에는 나오지 않습니다. 값을 고치면 바로
        저장됩니다.
      </Intro>
      {state.products.map((entry) => {
        const held = approvedSellers(state)
          .flatMap((seller) => sellerHoldings(state, seller.id, view.demoShipped))
          .filter((row) => row.product.id === entry.id)
          .reduce((total, row) => total + row.holding, 0);
        return (
          <section key={entry.id} className={order.card}>
            <div className={styles.stockHead}>
              <Image src={entry.image} alt={entry.name} width={56} height={56} />
              <div>
                <p className={styles.stockName}>{entry.name}</p>
                <span className={order.meta}>
                  운영자 재고 {entry.stock}개 · 셀러 보유 합계 {held}개
                </span>
              </div>
            </div>
            <div className={styles.grid3}>
              <NumberField
                label="공급가 (원, 고객 비공개)"
                value={entry.supplyPrice}
                onChange={(supplyPrice) => platform.updateProduct(entry.id, { supplyPrice })}
              />
              <NumberField
                label="최저 판매가 (원)"
                value={entry.minPrice}
                onChange={(minPrice) => platform.updateProduct(entry.id, { minPrice })}
              />
              <NumberField
                label="운영자 재고 (개)"
                value={entry.stock}
                onChange={(stock) => platform.updateProduct(entry.id, { stock })}
              />
            </div>
            {entry.minPrice < entry.supplyPrice && (
              <p className={styles.warning}>
                <span aria-hidden="true">⚠️</span> 최저 판매가가 공급가보다 낮습니다. 셀러가 팔수록 손해를 봅니다.
              </p>
            )}
          </section>
        );
      })}

      <Card title="상품 등록" note="사진 등록은 초안에 없어 기본 아이콘으로 표시됩니다.">
        <form
          className={styles.shipForm}
          onSubmit={(event) => {
            event.preventDefault();
            const result = platform.addProduct(draft);
            setError(result);
            if (!result) setDraft({ name: "", supplyPrice: 0, minPrice: 0, stock: 0 });
          }}
        >
          <TextField label="상품명" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
          <div className={styles.grid3}>
            <NumberField
              label="공급가 (원)"
              value={draft.supplyPrice}
              onChange={(supplyPrice) => setDraft({ ...draft, supplyPrice })}
            />
            <NumberField
              label="최저 판매가 (원)"
              value={draft.minPrice}
              onChange={(minPrice) => setDraft({ ...draft, minPrice })}
            />
            <NumberField label="재고 (개)" value={draft.stock} onChange={(stock) => setDraft({ ...draft, stock })} />
          </div>
          <ErrorText>{error}</ErrorText>
          <button type="submit" className={order.primaryButton}>
            상품 등록
          </button>
        </form>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// 2. 공급 출고 기록 (+ 셀러별 보유 재고)   3. 회수 처리
// ---------------------------------------------------------------------------

function MoveList({ view, moves, verb }: { view: OperatorView; moves: readonly StockMove[]; verb: string }) {
  const newestFirst = [...moves].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return (
    <Card title={`${verb} 내역`}>
      {newestFirst.length === 0 && <p className={styles.hint}>기록이 없습니다.</p>}
      {newestFirst.map((move) => (
        <div key={move.id} className={order.line}>
          <span>
            {formatDateTime(move.at)} · {sellerName(view, move.sellerId)} · {productName(view, move.productId)}
          </span>
          <strong>{move.quantity}개</strong>
        </div>
      ))}
    </Card>
  );
}

/** 셀러별 보유 재고 = 넘긴 수량 − 발송 수량 − 회수 수량, per seller and supply product. */
function HoldingsBySeller({ view }: { view: OperatorView }) {
  return (
    <>
      {approvedSellers(view.state).map((seller) => {
        const rows = sellerHoldings(view.state, seller.id, view.demoShipped);
        return (
          <Card key={seller.id} title={`${seller.storeName} 보유 재고`}>
            {rows.length === 0 && <p className={styles.hint}>넘긴 공급 상품이 없습니다.</p>}
            {rows.map((row) => (
              <div key={row.product.id} className={styles.holding}>
                <p className={styles.holdingName}>{row.product.name}</p>
                <dl className={styles.stats}>
                  <div>
                    <dt>넘긴 수량</dt>
                    <dd>{row.handed}</dd>
                  </div>
                  <div>
                    <dt>발송 수량</dt>
                    <dd>{row.shipped.total}</dd>
                  </div>
                  <div>
                    <dt>회수 수량</dt>
                    <dd>{row.recovered}</dd>
                  </div>
                  <div className={styles.statMain}>
                    <dt>보유 재고</dt>
                    <dd>{row.holding}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </Card>
        );
      })}
    </>
  );
}

/** /operator-admin/handovers: record what was handed to which seller. */
export function HandoversPage() {
  const view = useOperatorView();
  const [sellerId, setSellerId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  if (!view) return null;
  const sellers = approvedSellers(view.state);
  const seller = sellerId || sellers[0]?.id || "";
  const item = productId || view.state.products[0]?.id || "";

  return (
    <>
      <Intro>
        셀러에게 넘긴 공급 상품을 기록합니다. 넘긴 만큼 운영자 재고가 줄고, 셀러 어드민 &quot;공급 재고&quot;의 받은 수량이
        늘어납니다. 넘긴 것만으로는 청구하지 않습니다.
      </Intro>
      <Card title="공급 출고 기록">
        <form
          className={styles.shipForm}
          onSubmit={(event) => {
            event.preventDefault();
            const error = platform.addHandover(seller, item, quantity);
            setMessage(
              error
                ? { error: true, text: error }
                : { error: false, text: `${sellerName(view, seller)}에 ${productName(view, item)} ${quantity}개 출고를 기록했습니다.` },
            );
          }}
        >
          <SelectField label="셀러" value={seller} onChange={setSellerId}>
            {sellers.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.storeName}
              </option>
            ))}
          </SelectField>
          <SelectField label="공급 상품" value={item} onChange={setProductId}>
            {view.state.products.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name} (운영자 재고 {entry.stock}개)
              </option>
            ))}
          </SelectField>
          <NumberField label="수량 (개)" min={1} value={quantity} onChange={setQuantity} />
          {message && (message.error ? <ErrorText>{message.text}</ErrorText> : <p className={styles.saveNotice}>{message.text}</p>)}
          <button type="submit" className={order.primaryButton}>
            출고 기록
          </button>
        </form>
      </Card>
      <HoldingsBySeller view={view} />
      <MoveList view={view} moves={view.state.handovers} verb="출고" />
    </>
  );
}

/** /operator-admin/recoveries: record unsold units taken back from a seller. */
export function RecoveriesPage() {
  const view = useOperatorView();
  const [sellerId, setSellerId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  if (!view) return null;
  const sellers = approvedSellers(view.state);
  const seller = sellerId || sellers[0]?.id || "";
  const holdings = sellerHoldings(view.state, seller, view.demoShipped).filter((row) => row.holding > 0);
  const row = holdings.find((entry) => entry.product.id === productId) ?? holdings[0];

  return (
    <>
      <Intro>
        안 팔린 공급 상품을 셀러에게서 돌려받은 기록입니다. 회수한 만큼 셀러 어드민 &quot;공급 재고&quot;의 회수 수량이 늘고
        남은 수량이 줄며, 운영자 재고로 돌아옵니다. 셀러가 보유한 수량까지만 회수할 수 있습니다.
      </Intro>
      <Card title="회수 처리">
        <form
          className={styles.shipForm}
          onSubmit={(event) => {
            event.preventDefault();
            if (!row) return;
            const error = platform.addRecovery(seller, row.product.id, quantity, row.holding);
            setMessage(
              error
                ? { error: true, text: error }
                : { error: false, text: `${sellerName(view, seller)}에서 ${row.product.name} ${quantity}개 회수를 기록했습니다.` },
            );
          }}
        >
          <SelectField
            label="셀러"
            value={seller}
            onChange={(value) => {
              setSellerId(value);
              setProductId("");
            }}
          >
            {sellers.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.storeName}
              </option>
            ))}
          </SelectField>
          {row ? (
            <>
              <SelectField label="공급 상품" value={row.product.id} onChange={setProductId}>
                {holdings.map((entry) => (
                  <option key={entry.product.id} value={entry.product.id}>
                    {entry.product.name} (보유 {entry.holding}개)
                  </option>
                ))}
              </SelectField>
              <NumberField label="수량 (개)" min={1} value={quantity} onChange={setQuantity} />
            </>
          ) : (
            <p className={styles.hint}>이 셀러가 보유한 공급 상품이 없습니다.</p>
          )}
          {message && (message.error ? <ErrorText>{message.text}</ErrorText> : <p className={styles.saveNotice}>{message.text}</p>)}
          <button type="submit" className={order.primaryButton} disabled={!row}>
            회수 기록
          </button>
        </form>
      </Card>
      <MoveList view={view} moves={view.state.recoveries} verb="회수" />
    </>
  );
}

// ---------------------------------------------------------------------------
// 4. 셀러별 월 청구서
// ---------------------------------------------------------------------------

/** /operator-admin/invoices: 월 청구 금액 = 월 이용료 + 공급 대금 − 취소·반품분, with 수금 체크. */
export function InvoicesPage() {
  const view = useOperatorView();
  const [which, setWhich] = useState<InvoiceMonth>("lastMonth");
  if (!view) return null;
  const { state, now } = view;
  const month = monthOf(now, which);
  const closed = which === "lastMonth";
  // A seller is billed for a month only if they were already approved before it ended.
  const monthEnd = closed ? monthOf(now, "thisMonth").start : Number.POSITIVE_INFINITY;
  const invoices = approvedSellers(state)
    .filter((seller) => !seller.decidedAt || Date.parse(seller.decidedAt) < monthEnd)
    .map((seller) => ({
      seller,
      invoice: invoiceFor(state, seller.id, which, now, view.demoShipped),
      collectedAt: state.collected[`${seller.id}:${month.key}`],
    }));
  const billed = invoices.reduce((total, entry) => total + entry.invoice.total, 0);
  const collected = invoices.filter((entry) => entry.collectedAt).reduce((total, entry) => total + entry.invoice.total, 0);

  return (
    <>
      <Intro>
        월 청구 금액 = 월 이용료 + 공급 대금(발송 수량 × 공급가) − 취소·반품분. 고객 결제는 셀러 계좌로 들어가므로, 셀러가
        따로 납부한 것을 확인하고 수금 체크를 합니다.
      </Intro>
      <div className={styles.filters} role="tablist" aria-label="청구 월">
        {(["lastMonth", "thisMonth"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={which === key}
            className={`${styles.filter} ${which === key ? styles.filterActive : ""}`}
            onClick={() => setWhich(key)}
          >
            {monthOf(now, key).label} {key === "lastMonth" ? "(확정)" : "(예정)"}
          </button>
        ))}
      </div>

      <Card title={`${month.label} 합계`}>
        <div className={order.line}>
          <span>청구 {closed ? "금액" : "예정 금액"}</span>
          <span>{formatKRW(billed)}</span>
        </div>
        {closed && (
          <>
            <div className={order.line}>
              <span>수금 완료</span>
              <span>{formatKRW(collected)}</span>
            </div>
            <div className={`${order.line} ${order.totalLine}`}>
              <span>미수금</span>
              <strong>{formatKRW(billed - collected)}</strong>
            </div>
          </>
        )}
      </Card>

      {invoices.map(({ seller, invoice, collectedAt }) => (
        <section key={seller.id} className={order.card}>
          <div className={order.statusRow}>
            <h3 className={order.cardTitle}>{seller.storeName}</h3>
            {closed && (
              <span
                className={orders.chip}
                style={
                  collectedAt
                    ? { color: "#00BC7C", background: "rgba(0, 188, 124, 0.08)" }
                    : { color: "#DC2626", background: "rgba(220, 38, 38, 0.08)" }
                }
              >
                {collectedAt ? "수금 완료" : "미수금"}
              </span>
            )}
          </div>
          <div className={order.line}>
            <span>월 이용료 ({invoice.plan?.name ?? "플랜 없음"} 플랜)</span>
            <span>{formatKRW(invoice.monthlyFee)}</span>
          </div>
          {invoice.lines.length === 0 ? (
            <div className={order.line}>
              <span>공급 대금</span>
              <span>{formatKRW(0)}</span>
            </div>
          ) : (
            invoice.lines.map((line) => (
              <div key={line.name} className={order.line}>
                <span>
                  {line.name} {line.quantity}개 × {formatKRW(line.supplyPrice)}
                </span>
                <span>{formatKRW(line.amount)}</span>
              </div>
            ))
          )}
          <div className={order.line}>
            <span>취소·반품분</span>
            <span>− {formatKRW(invoice.returns)}</span>
          </div>
          <div className={`${order.line} ${order.totalLine}`}>
            <span>{closed ? "청구 금액" : "청구 예정 금액"}</span>
            <strong>{formatKRW(invoice.total)}</strong>
          </div>
          {closed ? (
            <>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={Boolean(collectedAt)}
                  onChange={(event) => platform.setCollected(seller.id, month.key, event.target.checked)}
                />
                <span>수금 완료{collectedAt ? ` (${formatDateTime(collectedAt)} 체크)` : ""}</span>
              </label>
              {!collectedAt && invoice.plan && (
                <p className={styles.hint}>
                  결제일 {monthOf(now, "thisMonth").label} {invoice.plan.billingDay}일 · 미납 시 결제일{" "}
                  {invoice.plan.overdueGraceDays}일 뒤 {OVERDUE_ACTION_TEXT[invoice.plan.overdueAction]}
                </p>
              )}
            </>
          ) : (
            <p className={styles.hint}>월이 끝나면 확정됩니다. 셀러 어드민 &quot;매출&quot;의 청구 예정 금액과 같은 값입니다.</p>
          )}
        </section>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// 5. 이용료 플랜
// ---------------------------------------------------------------------------

/** /operator-admin/plans: monthly fee, due day and what happens when a seller does not pay. */
export function PlansPage() {
  const view = useOperatorView();
  if (!view) return null;
  const { state } = view;

  return (
    <>
      <Intro>
        플랜별 월 이용료, 결제일, 미납 시 처리입니다. 값을 고치면 바로 저장되고 청구서에 반영됩니다. 미납 시 처리는 표시만
        하고, 초안에서 실제로 스토어를 제한하지는 않습니다.
      </Intro>
      {state.plans.map((plan) => (
        <section key={plan.id} className={order.card}>
          <h3 className={order.cardTitle}>
            {plan.name || "이름 없는 플랜"}{" "}
            <span>셀러 {state.sellers.filter((seller) => seller.planId === plan.id && seller.status === "APPROVED").length}곳</span>
          </h3>
          <TextField label="플랜 이름" value={plan.name} onChange={(name) => platform.updatePlan(plan.id, { name })} />
          <NumberField
            label="월 이용료 (원)"
            value={plan.monthlyFee}
            onChange={(monthlyFee) => platform.updatePlan(plan.id, { monthlyFee })}
          />
          <NumberField
            label="결제일 (매월 N일, 1~28)"
            min={1}
            max={28}
            value={plan.billingDay}
            onChange={(billingDay) => platform.updatePlan(plan.id, { billingDay })}
          />
          <fieldset className={styles.step}>
            <legend>미납 시 처리</legend>
            <NumberField
              label="결제일 뒤 며칠 후"
              value={plan.overdueGraceDays}
              onChange={(overdueGraceDays) => platform.updatePlan(plan.id, { overdueGraceDays })}
            />
            <SelectField
              label="처리"
              value={plan.overdueAction}
              onChange={(value) => platform.updatePlan(plan.id, { overdueAction: value as OverdueAction })}
            >
              {(Object.keys(OVERDUE_ACTION_TEXT) as OverdueAction[]).map((key) => (
                <option key={key} value={key}>
                  {OVERDUE_ACTION_TEXT[key]}
                </option>
              ))}
            </SelectField>
          </fieldset>
        </section>
      ))}
      <button type="button" className={styles.secondaryButton} onClick={() => platform.addPlan()}>
        + 플랜 추가
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------
// 6. 셀러 승인
// ---------------------------------------------------------------------------

const SELLER_STATUS = {
  PENDING: { text: "승인 대기", color: "rgb(20, 48, 112)", background: "rgba(20, 48, 112, 0.08)" },
  APPROVED: { text: "승인됨", color: "#00BC7C", background: "rgba(0, 188, 124, 0.08)" },
  REJECTED: { text: "반려", color: "rgb(185, 28, 28)", background: "rgba(185, 28, 28, 0.08)" },
} as const;

/** /operator-admin/sellers: review applications, approve or reject, and assign a fee plan. */
export function SellersPage() {
  const view = useOperatorView();
  if (!view) return null;
  const { state } = view;
  const byStatus = (status: PlatformSeller["status"]) =>
    state.sellers.filter((seller) => seller.status === status).sort((a, b) => Date.parse(b.appliedAt) - Date.parse(a.appliedAt));

  const card = (seller: PlatformSeller) => {
    const status = SELLER_STATUS[seller.status];
    return (
      <section key={seller.id} className={order.card}>
        <div className={order.statusRow}>
          <h3 className={order.cardTitle}>{seller.storeName}</h3>
          <span className={orders.chip} style={{ color: status.color, background: status.background }}>
            {status.text}
          </span>
        </div>
        <dl className={order.info}>
          <div>
            <dt>대표자</dt>
            <dd>
              {seller.ownerName} · {seller.phone}
            </dd>
          </div>
          <div>
            <dt>판매 품목</dt>
            <dd>{seller.category}</dd>
          </div>
          <div>
            <dt>신청</dt>
            <dd>{formatDateTime(seller.appliedAt)}</dd>
          </div>
          {seller.decidedAt && (
            <div>
              <dt>{seller.status === "REJECTED" ? "반려" : "승인"}</dt>
              <dd>{formatDateTime(seller.decidedAt)}</dd>
            </div>
          )}
        </dl>
        {seller.status !== "REJECTED" && (
          <SelectField label="이용료 플랜" value={seller.planId} onChange={(planId) => platform.setSellerPlan(seller.id, planId)}>
            {state.plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} (월 {formatKRW(plan.monthlyFee)})
              </option>
            ))}
          </SelectField>
        )}
        {seller.status === "PENDING" && (
          <div className={styles.saveActions}>
            <button type="button" className={styles.secondaryButton} onClick={() => platform.decideSeller(seller.id, "REJECTED")}>
              반려
            </button>
            <button type="button" className={order.primaryButton} onClick={() => platform.decideSeller(seller.id, "APPROVED")}>
              승인
            </button>
          </div>
        )}
      </section>
    );
  };

  const pending = byStatus("PENDING");
  return (
    <>
      <Intro>
        가입 신청한 셀러를 승인하거나 반려하고 이용료 플랜을 지정합니다. 승인된 셀러만 공급 출고와 청구 대상이 됩니다.
      </Intro>
      <h2 className={styles.groupTitle}>승인 대기 {pending.length}건</h2>
      {pending.length === 0 && <p className={styles.hint}>대기 중인 신청이 없습니다.</p>}
      {pending.map(card)}
      <h2 className={styles.groupTitle}>승인된 셀러 {byStatus("APPROVED").length}곳</h2>
      {byStatus("APPROVED").map(card)}
      {byStatus("REJECTED").length > 0 && <h2 className={styles.groupTitle}>반려</h2>}
      {byStatus("REJECTED").map(card)}
    </>
  );
}
