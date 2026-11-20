"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Icon } from "../Icon";
import { BottomSheet } from "../live/BottomSheet";
import { DEMO_ADDRESS, DEMO_USER } from "../data/demo-account";
import { demoSession, isValidNickname, useDemoSession } from "../data/demo-session";
import { ROUTES } from "../data/routes";
import styles from "./my.module.css";

type Sheet = "address" | "coupon" | null;

/**
 * /my with the demo login. Logged out, it sends visitors to /auth/login like the source.
 * Every value shown is fake (see data/demo-account.ts); edits stay in this browser.
 */
export function MyPage() {
  const router = useRouter();
  const session = useDemoSession();
  const leaving = useRef(false);

  useEffect(() => {
    if (session === null && !leaving.current) router.replace(ROUTES.login(ROUTES.my));
  }, [session, router]);

  if (!session) return <div className={styles.page} />;

  const logOut = () => {
    leaving.current = true;
    demoSession.signOut();
    router.push(ROUTES.home);
  };

  return <MyContent nickname={session.nickname} onLogOut={logOut} />;
}

function MyContent({ nickname, onLogOut }: { nickname: string; onLogOut: () => void }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const closeSheet = useCallback(() => setSheet(null), []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo);
  }, [photo]);

  useEffect(() => {
    if (!confirmLogout) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmLogout(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmLogout]);

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push(ROUTES.home);
  };

  const saveNickname = (event: FormEvent) => {
    event.preventDefault();
    const value = draft.trim();
    if (!isValidNickname(value)) {
      setInvalid(true);
      return;
    }
    demoSession.setNickname(value);
    setDraft("");
    setInvalid(false);
    setToast("닉네임이 변경되었어요");
  };

  const pickPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setPhoto(URL.createObjectURL(file));
    event.target.value = "";
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.topBar}>
          <div className={styles.topShade} />
          <div className={styles.backSlot}>
            <button type="button" className={styles.back} onClick={goBack} aria-label="뒤로 가기">
              <Icon name="caret-left" width={24} />
            </button>
          </div>
        </div>

        <div className={styles.stack}>
          <section className={styles.profile}>
            <button
              type="button"
              className={styles.avatarButton}
              onClick={() => fileInput.current?.click()}
              aria-label="프로필 사진 변경"
            >
              {photo ? (
                // A local object URL picked by the visitor; next/image cannot optimize it.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="프로필 이미지" className={styles.avatar} />
              ) : (
                <Image src={DEMO_USER.avatar} alt="프로필 이미지" width={96} height={96} className={styles.avatar} />
              )}
              <span className={styles.camera}>
                <Icon name="camera" width={16} />
              </span>
            </button>
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={pickPhoto} />
            <h2 className={styles.nickname}>{nickname}</h2>
          </section>

          <section className={styles.card}>
            <div className={styles.block}>
              <form className={styles.blockBody} onSubmit={saveNickname}>
                <h3 className={styles.blockTitle}>👤 닉네임</h3>
                <div>
                  <div className={`${styles.field} ${invalid ? styles.fieldInvalid : ""}`}>
                    <input
                      id="my-nickname"
                      value={draft}
                      placeholder={nickname}
                      maxLength={24}
                      aria-describedby="my-nickname-helper"
                      aria-invalid={invalid}
                      onChange={(event) => {
                        setDraft(event.target.value);
                        setInvalid(false);
                      }}
                    />
                    <div className={styles.saveSlot}>
                      <button type="submit" className={styles.save}>
                        저장
                      </button>
                    </div>
                  </div>
                  <p id="my-nickname-helper" className={`${styles.helper} ${invalid ? styles.helperError : ""}`}>
                    2-24자, 특수문자 &apos;-&apos;, &apos;_&apos;, &apos;.&apos; 사용가능
                  </p>
                </div>
              </form>
            </div>
            <div className={styles.divider} />
            <div className={styles.block}>
              <div className={styles.blockBody}>
                <h3 className={styles.blockTitle}>🚚 기본 배송지</h3>
                <button type="button" className={styles.rowButton} onClick={() => setSheet("address")}>
                  <div className={styles.addressText}>
                    <p className={styles.addressMain}>{DEMO_ADDRESS.address}</p>
                    <span className={styles.addressSub}>{DEMO_ADDRESS.phone}</span>
                    <span className={`${styles.addressSub} ${styles.addressFull}`}>
                      ({DEMO_ADDRESS.postalCode}) {DEMO_ADDRESS.address} {DEMO_ADDRESS.detailAddress}
                    </span>
                  </div>
                  <Icon name="caret-right" width={18} />
                </button>
              </div>
            </div>
            <div className={styles.divider} />
            <div className={styles.block}>
              <button type="button" className={styles.couponButton} onClick={() => setSheet("coupon")}>
                <div className={styles.couponHead}>
                  <h3 className={styles.blockTitle}>🎟️ 내 쿠폰함</h3>
                  <p className={styles.couponSub}>단골 셀러의 혜택 쿠폰을 기다려보세요</p>
                </div>
                <div className={styles.couponRow}>
                  <p>보유한 쿠폰 없음</p>
                  <Icon name="caret-right" width={18} />
                </div>
              </button>
            </div>
          </section>

          <div className={styles.logoutWrap}>
            {confirmLogout && (
              <>
                <div className={styles.popoverDismiss} onClick={() => setConfirmLogout(false)} aria-hidden="true" />
                <div className={styles.popover} role="alertdialog" aria-label="로그아웃 하시겠어요?">
                  <div className={styles.popoverBody}>
                    <button type="button" className={styles.popoverButton} onClick={onLogOut} autoFocus>
                      <span>로그아웃</span>
                    </button>
                  </div>
                  <span className={styles.popoverArrow} aria-hidden="true" />
                </div>
              </>
            )}
            <button
              type="button"
              className={styles.logout}
              onClick={() => setConfirmLogout((open) => !open)}
              aria-expanded={confirmLogout}
            >
              <Icon name="sign-out" width={18} />
              <p>로그아웃</p>
            </button>
          </div>
        </div>
      </main>

      {sheet === "address" && (
        <BottomSheet title="배송지 관리" onClose={closeSheet} panelClassName={styles.tallSheet} bodyClassName={styles.sheetBody}>
          <div className={styles.addressToolbar}>
            <p>저장된 배송지</p>
            <button
              type="button"
              className={styles.addButton}
              onClick={() => setToast("클론에서는 배송지를 추가할 수 없어요")}
            >
              <Icon name="plus-navy" width={14} />
              <span>배송지 추가</span>
            </button>
          </div>
          <ul className={styles.addressList}>
            <li className={styles.addressCard}>
              <div className={styles.addressCardTop}>
                <span className={styles.primaryChip}>
                  <span aria-hidden="true">⭐</span>기본 배송지
                </span>
              </div>
              <p className={styles.addressName}>{DEMO_ADDRESS.name}</p>
              <div className={styles.addressDetail}>
                <p className={styles.addressLine}>
                  ({DEMO_ADDRESS.postalCode}) {DEMO_ADDRESS.address} {DEMO_ADDRESS.detailAddress}
                </p>
                <span className={styles.addressSub}>연락처 · {DEMO_ADDRESS.phone}</span>
                <div className={styles.ordererRow}>
                  <span className={styles.ordererChip}>주문자</span>
                  <span className={styles.addressSub}>{DEMO_ADDRESS.ordererName}</span>
                  <span className={styles.addressSub}>· {DEMO_ADDRESS.ordererPhone}</span>
                </div>
              </div>
            </li>
          </ul>
        </BottomSheet>
      )}

      {sheet === "coupon" && (
        <BottomSheet title="내 쿠폰함" onClose={closeSheet} panelClassName={styles.tallSheet}>
          <div className={styles.couponEmpty}>
            <p className={styles.couponEmptyTitle}>사용 가능한 쿠폰이 없습니다</p>
            <p className={styles.couponEmptySub}>셀러가 발급한 쿠폰이 여기에 표시됩니다</p>
          </div>
        </BottomSheet>
      )}

      {toast && (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
