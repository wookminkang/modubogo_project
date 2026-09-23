"use client";

import { useEffect, useState } from "react";
import { Text } from "seed-design/ui/text";

/**
 * GEO 병원 정보 폼(퍼널)의 공통 디자인 규칙.
 *
 * 화면마다 크기·굵기·간격을 따로 정하면 금세 제각각이 된다. 제목·보조설명·라벨·입력칸을
 * 여기 모아 두고 모든 화면이 이것만 쓴다. 색은 하드코딩하지 않고 Seed 토큰(`--seed-color-*`)을 쓴다.
 *
 * 글자 크기는 Seed `textStyle` 토큰으로 통일 (t3=13 t4=14 t5=16 t7=20 t9=24px)
 *   화면 제목   t9Bold       ScreenHeading
 *   보조 설명   t5Regular    ScreenHeading subtitle (fg.neutralSubtle)
 *   문항 라벨   t5Bold       FieldLabel
 *   도움말      t4Regular    FieldLabel hint (fg.neutralSubtle)
 *   입력 글자   16px         INPUT (16px 미만이면 iOS 가 입력 칸을 누를 때 화면을 확대한다)
 *
 * 입력칸은 Seed TextField 대신 아래 INPUT 한 줄로 맞춘다 — 이 폼은 칸 종류가
 * (글자·여러 칸·시각 선택) 여럿이라, 전부 같은 높이·모서리·배경이어야 한 벌로 보인다.
 */

const FOCUS = "focus:border-[var(--seed-color-stroke-brand-solid)] focus:bg-[var(--seed-color-bg-layer-default)]";

/** 모든 입력칸 공통 — 테두리 없는 회색 바탕, 포커스에서만 브랜드 테두리 */
export const INPUT =
  `w-full rounded-[14px] border border-transparent bg-[var(--seed-color-bg-neutral-weak)] px-4 py-[13px] text-base text-[var(--seed-color-fg-neutral)] outline-none transition-colors placeholder:text-[var(--seed-color-fg-neutral-subtle)] ${FOCUS}`;

/** 누르는 칸(시각 선택) — INPUT 과 똑같은 모양에 값만 진하게 */
export const INPUT_BUTTON = `${INPUT} flex items-center justify-between gap-2 text-left font-semibold`;

/**
 * 묶음 상자 (요일 한 줄, 의료진 한 명, 확인 화면의 단계별 요약, 안내 박스).
 *
 * 배경색 규칙은 하나뿐이다: **바탕은 흰색, 입력칸만 회색.**
 * 묶음마다 회색을 깔면 그 안의 회색 입력칸이 배경에 묻히고, 흰 입력칸을 섞으면
 * 화면마다 칸 색이 달라 보인다. 그래서 묶음은 얇은 테두리로만 구분한다.
 */
export const CARD =
  "rounded-[14px] border border-[var(--seed-color-stroke-neutral-muted)] bg-[var(--seed-color-bg-layer-default)]";

/** 알려주는 상자 — 입력이 아니라 읽는 곳이라 브랜드색을 옅게 깐다 */
export const NOTE = "rounded-[14px] bg-[var(--seed-color-bg-brand-weak)]";

/** 잘못됐다고 알리는 상자 — NOTE 와 같은 모양에 색만 critical */
export const ERROR_BOX = "rounded-[14px] bg-[var(--seed-color-bg-critical-weak)]";

/** 고르는 카드 — 문항의 보기를 큼직하게 */
export const CHOICE = "rounded-[14px] border px-4 py-[18px] text-base font-semibold transition-colors";
export const CHOICE_OFF =
  "border-transparent bg-[var(--seed-color-bg-neutral-weak)] text-[var(--seed-color-fg-neutral)]";
export const CHOICE_ON =
  "border-[var(--seed-color-stroke-brand-solid)] bg-[var(--seed-color-bg-brand-weak)] text-[var(--seed-color-fg-brand)]";

/** 문항 사이 간격 — 한 화면 안에서 항상 같은 값 */
export const FIELD_GAP = "flex flex-col gap-7";

/** 화면 제목 블록. 제목 아래 보조 설명, 그 아래 문항까지 32px */
export function ScreenHeading({
  title,
  subtitle,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 pt-7 pb-8">
      <Text as="h1" textStyle="t9Bold" className="leading-[1.35] tracking-[-0.01em]">
        {title}
      </Text>
      {subtitle && (
        <Text as="p" textStyle="t5Regular" color="fg.neutralSubtle" className="leading-[1.55]">
          {subtitle}
        </Text>
      )}
    </div>
  );
}

/** 문항 라벨 — 필수는 별표 하나로, 선택은 회색 글씨로. 도움말은 아랫줄에 */
export function FieldLabel({
  label,
  required,
  hint,
}: {
  label: string;
  required: boolean;
  hint?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-1.5">
        <Text as="span" textStyle="t5Bold">
          {label}
        </Text>
        {required ? (
          <span aria-label="필수" className="text-[var(--seed-color-fg-brand)]">
            *
          </span>
        ) : (
          <Text as="span" textStyle="t3Regular" color="fg.neutralSubtle">
            선택
          </Text>
        )}
      </div>
      {hint && (
        <Text as="p" textStyle="t4Regular" color="fg.neutralSubtle" className="leading-[1.5]">
          {hint}
        </Text>
      )}
    </div>
  );
}

/** 휴대폰인지 — 시각 선택을 바텀시트로 올릴지, 칸 아래로 펼칠지 가른다 */
export function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return mobile;
}
