"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "../Icon";
import { SELLERS } from "../data/sellers";
import { PlatformShell } from "../shell/PlatformShell";
import styles from "./home.module.css";

function SellerSearch() {
  const [query, setQuery] = useState("");
  const keyword = query.trim();
  const match = keyword ? SELLERS.find((seller) => seller.name === keyword) : undefined;

  return (
    <div className={styles.searchArea}>
      <div className={styles.field}>
        <div className={styles.fieldIcon}>
          <Icon name="search-input" width={20} />
        </div>
        <input
          type="text"
          value={query}
          placeholder="셀러 이름 검색"
          aria-label="셀러 이름 검색"
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button
            type="button"
            className={styles.clearButton}
            aria-label="검색어 지우기"
            onClick={() => setQuery("")}
          >
            <span>
              <Icon name="clear-x" width={14} />
            </span>
          </button>
        )}
      </div>

      {keyword && match && (
        <Link href={`/${match.slug}`} className={styles.resultCard}>
          <div className={styles.avatarHalo}>
            <div className={styles.avatarRing}>
              <span className={styles.avatarFrame}>
                <Image src={match.avatar} alt={match.name} width={82} height={82} />
              </span>
            </div>
          </div>
          <h3 className={styles.resultName}>{match.name}</h3>
          <div className={styles.resultMeta}>
            <span className={styles.resultDomain}>livemarket.pro</span>
            <span className={styles.resultSlug}>/{match.slug}</span>
            <span className={styles.metaDot} />
            <p className={styles.resultFollowers}>팔로워 {match.followers}</p>
          </div>
          <div className={styles.enterButton}>
            <p>스토어 들어가기</p>
            <Icon name="arrow-right" width={18} />
          </div>
        </Link>
      )}

      {keyword && !match && (
        <div className={styles.notFound}>
          <Icon name="magnifier-empty" width={64} />
          <h3>
            <span className={styles.keyword}>&apos;{keyword}&apos;</span> 셀러를 못 찾았어요
          </h3>
          <p>셀러명이 정확히 일치해야 검색됩니다.</p>
          <p>
            Ex. 셀러명이 <span className={styles.keyword}>&apos;토마스&apos;</span>일 때,
          </p>
          <p>
            <span className={styles.keyword}>&apos;토마&apos;</span>만 입력하면 안 나와요!
          </p>
        </div>
      )}
    </div>
  );
}

export function LivemarketHome() {
  return (
    <PlatformShell active="home">
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>
            라이브마켓은
            <br />
            <span className={styles.highlight}>
              <span>
                <strong>셀러명을 알아야</strong> 볼 수 있어요!
              </span>
            </span>
          </h1>

          <SellerSearch />

          <div className={styles.bannerWrap}>
            <a
              href="https://business.livemarket.pro/"
              target="_blank"
              rel="noreferrer"
              className={styles.banner}
            >
              <div className={styles.bannerInner}>
                <div className={styles.bannerLogo}>
                  <Icon name="live-logo-filled" width={29} height={23} />
                </div>
                <p>by 라이브마켓 -</p>
                <strong>개설문의</strong>
              </div>
            </a>
          </div>
        </div>
      </main>
    </PlatformShell>
  );
}
