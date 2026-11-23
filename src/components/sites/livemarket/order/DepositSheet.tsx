"use client";

import { useEffect, useState } from "react";
import { DEMO_ADDRESS, formatKRW } from "../data/demo-account";
import type { StoreSettings } from "../data/store-settings";
import { BottomSheet } from "../live/BottomSheet";
import styles from "./order.module.css";

/**
 * "입금 후 결제완료까지": opened by 무통장입금. Amount, deposit account, the depositor-name
 * rule (right vs wrong example) and the optional 입금완료 확인요청. The account is fake.
 */
export function DepositSheet({
  total,
  account,
  nickname,
  requested,
  onRequest,
  onClose,
}: {
  total: number;
  account: StoreSettings["bankAccount"];
  nickname: string;
  requested: boolean;
  onRequest: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<"done" | "failed" | null>(null);
  const realName = DEMO_ADDRESS.ordererName;

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText(`${account.bank} ${account.number}`);
      setCopied("done");
    } catch {
      setCopied("failed");
    }
  };

  return (
    <BottomSheet title="입금 후 결제완료까지" onClose={onClose} bodyClassName={styles.depositBody}>
      <div className={styles.depositTotal}>
        <span>최종 결제금액</span>
        <strong>{formatKRW(total)}</strong>
      </div>

      <section className={styles.depositSection}>
        <h3>계좌정보</h3>
        <dl className={styles.accountInfo}>
          <div>
            <dt>예금주</dt>
            <dd>{account.holder}</dd>
          </div>
          <div>
            <dt>입금계좌</dt>
            <dd>
              {account.bank} {account.number}
            </dd>
          </div>
        </dl>
        <button type="button" className={styles.blackButton} onClick={copyAccount}>
          {copied === "done"
            ? "입금계좌를 복사했어요"
            : copied === "failed"
              ? "복사하지 못했어요"
              : "입금계좌 복사하기"}
        </button>
      </section>

      <section className={styles.depositSection}>
        <h3>입금시 주문자명</h3>
        <div className={styles.nameExamples}>
          <div className={styles.nameGood}>
            <span>⭕ 올바른 예</span>
            <strong>{realName}</strong>
          </div>
          <div className={styles.nameBad}>
            <span>❌ 잘못된 예</span>
            <strong>
              <s>
                {realName}
                {nickname}
              </s>
            </strong>
          </div>
        </div>
        <p className={styles.nameRule}>
          입금자명은 주문자명 그대로 입력해주세요. 닉네임이나 특수문자를 붙이면 안 돼요.
        </p>
      </section>

      <button type="button" className={styles.requestButton} disabled={requested} onClick={onRequest}>
        <span>{requested ? "입금 확인 요청됨" : "입금완료 확인요청"}</span>
        {!requested && <span className={styles.optionalBadge}>필수아님</span>}
      </button>
      {requested && <p className={styles.requested}>셀러가 입금을 확인하면 결제완료로 바뀌어요.</p>}
    </BottomSheet>
  );
}
