"use client";

// 하단 고정 영역 — 화면별 "다음 행동" 버튼을 담는 래퍼
export function StickyBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 rounded-b-2xl border-[var(--seed-color-stroke-neutral-subtle)] pt-3 pb-20 backdrop-blur">
      {children}
    </div>
  );
}
