"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "seed-color-mode";
type Mode = "dark-only" | "light-only";

/**
 * 헤더용 라이트/다크 테마 토글.
 * <html data-seed-color-mode> 값을 바꾸면 Seed 시맨틱 토큰이 모드별 팔레트로
 * 자동 전환된다. SSR 기본값은 항상 dark-only 이고, 저장된 선택은 마운트 후
 * (하이드레이션 이후) 클라이언트에서 적용한다 → 하이드레이션 불일치 없음.
 *
 * 헤더 배경은 항상 흰색이라 버튼 색은 (테마 토큰이 아닌) 고정색을 쓴다.
 */
export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("dark-only");

  useEffect(() => {
    // 저장된 테마를 읽어 상태 + <html> 속성에 반영 (없으면 dark-only 유지)
    let saved: Mode = "dark-only";
    try {
      const m = localStorage.getItem(STORAGE_KEY);
      if (m === "light-only" || m === "dark-only") saved = m;
    } catch {
      // localStorage 사용 불가 시 기본값 유지
    }
    setMode(saved);
    document.documentElement.setAttribute("data-seed-color-mode", saved);
  }, []);

  const toggle = () => {
    const next: Mode = mode === "dark-only" ? "light-only" : "dark-only";
    setMode(next);
    document.documentElement.setAttribute("data-seed-color-mode", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage 사용 불가 시 무시 (세션 한정 적용)
    }
  };

  const isDark = mode === "dark-only";
  const label = isDark ? "라이트 모드로 전환" : "다크 모드로 전환";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:border-[#0e299c] hover:text-[#0e299c] cursor-pointer"
    >
      {isDark ? <Moon size={14} /> : <Sun size={14} />}
      <span className="hidden sm:inline">{isDark ? "다크" : "라이트"}</span>
    </button>
  );
}
