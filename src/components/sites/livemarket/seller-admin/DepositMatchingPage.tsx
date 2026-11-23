"use client";

import { useState } from "react";
import { SelectField, TextField } from "../admin/fields";
import { formatDateTime, formatKRW, formatOrderedAgo } from "../data/demo-account";
import { NANDAPICK } from "../data/nandapick";
import {
  BANK_CHOICES,
  SELLER_ORDER_STATUS,
  sellerAdmin,
  sellerBank,
  useSellerBank,
  useSellerData,
  type DepositMatch,
  type MatchResult,
  type SellerBank,
  type SellerOrder,
} from "../data/seller-admin";
import { useStoreSettings } from "../data/store-settings";
import order from "../order/order.module.css";
import orders from "../pages/orders.module.css";
import { OrderSheet } from "./SellerOrdersPage";
import styles from "./seller-admin.module.css";

const RESULT: Record<MatchResult, { text: string; color: string; tint: string }> = {
  MATCHED: { text: "매칭됨", color: "#00BC7C", tint: "rgba(0, 188, 124, 0.08)" },
  AMOUNT_MISMATCH: { text: "금액 불일치", color: "#DC2626", tint: "rgba(220, 38, 38, 0.08)" },
  UNMATCHED: { text: "미매칭", color: "#E08600", tint: "rgba(255, 167, 38, 0.12)" },
  CONFIRMED: { text: "확인 완료", color: "rgb(54, 70, 58)", tint: "rgb(232, 232, 232)" },
};

const CUSTOM = "__custom__";

/**
 * /seller-admin/matching: 입금 자동매칭. Bank deposits (fake) are matched to orders waiting for a
 * deposit by depositor name + amount; matched ones are confirmed in one go, and waiting orders
 * with no deposit are listed as 미입금. Only the UI and the matching logic exist: nothing reads a
 * real bank account (docs/platform/seller-admin.md).
 */
export function DepositMatchingPage() {
  const data = useSellerData();
  const savedBank = useSellerBank();
  const account = useStoreSettings(NANDAPICK.slug).bankAccount;
  const [openId, setOpenId] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  if (data === undefined || savedBank === undefined) return null;
  const { matches, unpaid } = data.matching;
  const matched = matches.filter((match) => match.result === "MATCHED");
  const count = (result: MatchResult) => matches.filter((match) => match.result === result).length;
  const open = data.orders.find((entry) => entry.id === openId);
  // Waiting orders that an unmatched deposit of the same amount points at.
  const hinted = new Set(matches.flatMap((match) => match.sameAmount.map((entry) => entry.id)));

  const confirmAll = () => {
    sellerAdmin.confirmDeposits(
      matched.flatMap((match) => (match.order ? [{ orderId: match.order.id, depositId: match.deposit.id }] : [])),
    );
    setDone(matched.length);
  };

  return (
    <>
      <p className={styles.intro}>
        통장 입금 내역을 미결제 주문과 입금자명 + 금액으로 맞춰 봅니다. 지금은 은행과 연결되어 있지 않아 입금 내역은 가짜
        데이터입니다.
      </p>

      <BankCard
        key={savedBank ? "saved" : "default"}
        initial={savedBank ?? { bank: account.bank, accountNumber: account.number }}
        saved={savedBank !== null}
      />

      <section className={order.card}>
        <h3 className={order.cardTitle}>
          자동 매칭 결과 <span>입금 {matches.length}건</span>
        </h3>
        <div className={styles.filters}>
          {(["MATCHED", "AMOUNT_MISMATCH", "UNMATCHED", "CONFIRMED"] as const).map((key) => (
            <span key={key} className={orders.chip} style={{ color: RESULT[key].color, background: RESULT[key].tint }}>
              {RESULT[key].text} {count(key)}
            </span>
          ))}
        </div>
        <button type="button" className={order.primaryButton} disabled={matched.length === 0} onClick={confirmAll}>
          {matched.length === 0 ? "매칭된 입금이 없습니다" : `매칭된 ${matched.length}건 한 번에 입금 확인`}
        </button>
        {done !== null && (
          <p className={styles.saveNotice} role="status">
            {done}건을 결제완료로 처리했습니다.
          </p>
        )}
        <p className={styles.hint}>
          매칭됨: 입금자명과 금액이 주문과 모두 같음 · 금액 불일치: 이름은 같고 금액이 다름 · 미매칭: 이름이 같은 주문이 없음.
          금액 불일치와 미매칭은 자동으로 처리하지 않습니다.
        </p>
      </section>

      <section className={order.card}>
        <h3 className={order.cardTitle}>입금 내역</h3>
        <div>
          {matches.map((match) => (
            <DepositRow key={match.deposit.id} match={match} onOpen={setOpenId} />
          ))}
        </div>
      </section>

      <section className={order.card}>
        <h3 className={order.cardTitle}>
          미입금 <span>{unpaid.length}건</span>
        </h3>
        <p className={styles.hint}>입금 내역에서 짝을 찾지 못한 미결제 주문입니다.</p>
        <div>
          {unpaid.length === 0 && <p className={styles.hint}>미입금 주문이 없습니다.</p>}
          {unpaid.map((entry) => (
            <div key={entry.id} className={styles.depositRow}>
              <div className={styles.depositHead}>
                <span className={styles.depositName}>
                  {entry.customer.name} <span className={styles.nickname}>({entry.customer.nickname})</span>
                </span>
                <span className={styles.depositAmount}>{formatKRW(entry.totals.total)}</span>
              </div>
              <div className={orders.statusLeft}>
                <span
                  className={orders.chip}
                  style={{ color: SELLER_ORDER_STATUS[entry.status].color, background: SELLER_ORDER_STATUS[entry.status].tint }}
                >
                  {SELLER_ORDER_STATUS[entry.status].text}
                </span>
                <span className={order.meta}>
                  {formatOrderedAgo(entry.minutesAgo)} · 마감 {formatDateTime(entry.deadline)}
                </span>
              </div>
              {entry.status === "DEPOSIT_REQUESTED" && (
                <p className={styles.hint}>고객은 입금했다고 요청했지만 같은 이름의 입금 내역이 없습니다.</p>
              )}
              {hinted.has(entry.id) && <p className={styles.hint}>같은 금액의 미매칭 입금이 있습니다. 입금 내역을 확인하세요.</p>}
              <button type="button" className={styles.linkButton} onClick={() => setOpenId(entry.id)}>
                주문서 {entry.id} 열기
              </button>
            </div>
          ))}
        </div>
      </section>

      {open && <OrderSheet order={open} onClose={() => setOpenId(null)} />}
    </>
  );
}

function OpenOrder({ order: entry, onOpen }: { order: SellerOrder; onOpen: (id: string) => void }) {
  return (
    <button type="button" className={styles.linkButton} onClick={() => onOpen(entry.id)}>
      {entry.customer.name} · {formatKRW(entry.totals.total)} · 주문서 {entry.id} 열기
    </button>
  );
}

function DepositRow({ match, onOpen }: { match: DepositMatch; onOpen: (id: string) => void }) {
  const { deposit, result, order: matchedOrder } = match;
  const meta = RESULT[result];
  const difference = matchedOrder ? deposit.amount - matchedOrder.totals.total : 0;

  return (
    <div className={styles.depositRow}>
      <div className={styles.depositHead}>
        <span className={styles.depositName}>{deposit.depositorName}</span>
        <span className={styles.depositAmount}>{formatKRW(deposit.amount)}</span>
      </div>
      <div className={orders.statusLeft}>
        <span className={orders.chip} style={{ color: meta.color, background: meta.tint }}>
          {meta.text}
        </span>
        <span className={order.meta}>{formatDateTime(deposit.at)} 입금</span>
      </div>
      {result === "AMOUNT_MISMATCH" && matchedOrder && (
        <p className={styles.hint}>
          주문 금액 {formatKRW(matchedOrder.totals.total)} · 입금 {formatKRW(deposit.amount)} ·{" "}
          <span className={styles.diff}>
            {difference < 0 ? `${formatKRW(-difference)} 부족` : `${formatKRW(difference)} 초과`}
          </span>
        </p>
      )}
      {result === "UNMATCHED" && (
        <p className={styles.hint}>
          {match.sameAmount.length > 0
            ? "입금자명이 같은 주문은 없지만, 금액이 같은 미결제 주문이 있습니다."
            : "입금자명이나 금액이 맞는 미결제 주문이 없습니다."}
        </p>
      )}
      {matchedOrder && <OpenOrder order={matchedOrder} onOpen={onOpen} />}
      {match.sameAmount.map((entry) => (
        <OpenOrder key={entry.id} order={entry} onOpen={onOpen} />
      ))}
    </div>
  );
}

/** Which bank account the deposits would be read from. Saved in this browser only. */
function BankCard({ initial, saved }: { initial: SellerBank; saved: boolean }) {
  const listed = (BANK_CHOICES as readonly string[]).includes(initial.bank);
  const [choice, setChoice] = useState(listed ? initial.bank : CUSTOM);
  const [custom, setCustom] = useState(listed ? "" : initial.bank);
  const [accountNumber, setAccountNumber] = useState(initial.accountNumber);
  const [notice, setNotice] = useState<string | null>(null);
  const bank = (choice === CUSTOM ? custom : choice).trim();

  return (
    <section className={order.card}>
      <h3 className={order.cardTitle}>
        입금 받는 은행 <span>{saved ? "저장됨" : "스토어 설정의 입금 계좌"}</span>
      </h3>
      <form
        className={styles.shipForm}
        onSubmit={(event) => {
          event.preventDefault();
          if (!bank || !accountNumber.trim()) {
            setNotice("은행과 계좌번호를 입력해주세요.");
            return;
          }
          sellerBank.save({ bank, accountNumber: accountNumber.trim() });
          setNotice("저장했어요. 은행 연동은 아직 없어 입금 내역은 가짜 데이터로 표시됩니다.");
        }}
      >
        <SelectField label="은행" value={choice} onChange={setChoice}>
          {BANK_CHOICES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
          <option value={CUSTOM}>직접 입력</option>
        </SelectField>
        {choice === CUSTOM && <TextField label="은행 이름" value={custom} onChange={setCustom} />}
        <TextField label="계좌번호" value={accountNumber} onChange={setAccountNumber} />
        {notice && (
          <p className={styles.hint} role="status">
            {notice}
          </p>
        )}
        <button type="submit" className={styles.secondaryButton}>
          은행 저장
        </button>
      </form>
    </section>
  );
}
