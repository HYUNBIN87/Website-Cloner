import Image from "next/image";
import { Icon } from "../Icon";
import { SOURCE_ROUTES } from "../data/routes";
import { DemoLoginButton } from "./DemoLoginButton";
import styles from "./pages.module.css";

/**
 * /auth/login. Kakao OAuth is out of scope for the clone, so the button continues on the
 * source login page with the same return path.
 */
export function LoginPage({ previousPath }: { previousPath: string }) {
  return (
    <div className={styles.plainPage}>
      <div className={styles.plainColumn}>
        <main>
          <section className={styles.loginMain}>
            <section className={styles.loginBox}>
              <h1 className={styles.loginLabel}>로그인</h1>
              <h1 className={styles.loginBrand}>라이브마켓</h1>
              <div className={styles.loginLogo}>
                <Image
                  src="/sites/livemarket/img/live_market_circle_icon.png"
                  alt="라이브마켓"
                  width={64}
                  height={64}
                  priority
                />
              </div>
              <a href={SOURCE_ROUTES.kakaoLogin(previousPath)} className={styles.kakaoButton}>
                <div className={styles.kakaoInner}>
                  <Icon name="kakao" width={20} />
                  <p>카카오로 계속하기</p>
                </div>
              </a>
              <DemoLoginButton previousPath={previousPath} />
            </section>
          </section>
        </main>
      </div>
    </div>
  );
}
