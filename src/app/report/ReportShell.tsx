"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";

// SSR에서는 useLayoutEffect 경고가 나므로 클라이언트에서만 레이아웃 이펙트 사용
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * 보고서 영역 공통 레이아웃 셸.
 * 흰 카드 프레임 + 스크롤 연동으로 최상단에 도킹되는 헤더(타이틀/검색/액션).
 *
 * - title: 헤더 좌측 타이틀 (목록 = "보고서 목록", 회사 페이지 = 상호명 등 동적)
 * - search: (선택) 헤더 가운데 검색 영역
 * - actions: (선택) 헤더 우측 버튼들
 * - sidebar: (선택) 본문 좌측 사이드바
 * - children: 본문 콘텐츠
 */
export default function ReportShell({
  title,
  search,
  actions,
  sidebar,
  children,
}: {
  title: React.ReactNode;
  search?: React.ReactNode;
  actions?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [dockStart, setDockStart] = useState(Number.MAX_SAFE_INTEGER);

  // 헤더가 최상단에 도킹되는 스크롤 지점을 측정 (페인트 직전에 측정해 깜빡임 방지)
  useIsoLayoutEffect(() => {
    const measure = () => {
      const el = sentinelRef.current;
      if (!el) return;
      setDockStart(el.getBoundingClientRect().top + window.scrollY);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // 도킹 직전 64px 구간에서 스크롤에 비례해 배경/위치를 연속 보간
  const DOCK = 64;
  const { scrollY } = useScroll();
  const dockProgress = useTransform(
    scrollY,
    [Math.max(0, dockStart - DOCK), dockStart],
    [0, 1],
    { clamp: true }
  );
  const headerY = useTransform(dockProgress, [0, 1], [10, 0]);
  const headerPad = useTransform(dockProgress, [0, 1], [8, 12]);

  return (
    <div className="flex-1 overflow-x-clip bg-[#F0F4FA] py-6 px-4">
      <div className="max-w-[1200px] mx-auto bg-white rounded-2xl shadow-sm px-4 py-6 md:px-8 md:py-8">
        <div className="relative flex flex-col gap-8">
          {/* sticky 감지용 센티넬 (레이아웃에 영향 없음) */}
          <div
            ref={sentinelRef}
            aria-hidden
            className="absolute left-0 top-0 h-px w-full"
          />

          {/* 상단 헤더: 스크롤 위치에 연동해 최상단으로 부드럽게 도킹 */}
          <header className="sticky top-0 z-30">
            <motion.div
              aria-hidden
              style={{ opacity: dockProgress }}
              className="pointer-events-none absolute inset-y-0 left-[calc(50%-50vw)] w-screen border-b border-gray-100 bg-white/95 shadow-[0_4px_20px_rgba(14,41,156,0.08)] backdrop-blur-sm"
            />
            <motion.div
              style={{
                y: headerY,
                paddingTop: headerPad,
                paddingBottom: headerPad,
              }}
              className="relative flex w-full flex-col gap-3 md:flex-row md:items-center md:gap-6"
            >
              {/* 모바일: 타이틀 + 액션 한 줄 / 데스크탑: 타이틀만 (액션은 우측으로) */}
              <div className="flex items-center justify-between gap-3">
                <h1 className="min-w-0 truncate text-xl font-bold text-[#0e299c] md:min-w-48 md:shrink-0 md:overflow-visible md:whitespace-normal md:break-keep md:text-2xl">
                  {title}
                </h1>
                {actions && (
                  <div className="flex items-center gap-2 shrink-0 md:hidden">
                    {actions}
                  </div>
                )}
              </div>
              {search ? (
                <div className="relative md:flex-1">{search}</div>
              ) : (
                <div className="hidden md:block md:flex-1" />
              )}
              {actions && (
                <div className="hidden items-center gap-2 md:flex md:shrink-0">
                  {actions}
                </div>
              )}
            </motion.div>
          </header>

          {/* 본문: 모바일=세로 스택(상단 탭) / 데스크탑=좌측 사이드바 + 콘텐츠 */}
          <div className="flex flex-col gap-4 md:flex-row md:gap-8">
            {sidebar && (
              <aside className="w-full md:w-48 md:shrink-0 md:sticky md:top-20 md:self-start">
                {sidebar}
              </aside>
            )}
            <main className="flex-1 min-w-0">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
