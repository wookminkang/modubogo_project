"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const TABS = [
  { href: "/hospital", label: "병원목록" },
  { href: "/report", label: "보고서" },
  { href: "/holiday", label: "진료일정" },
  { href: "/admin/intakes", label: "준비자료" },
];

export interface HeaderUser {
  name: string;
  role: "super" | "staff";
}

/**
 * 앱 공통 상단 헤더.
 * showNav=true(관리자)일 때만 카테고리 탭(병원목록/보고서/진료일정)을 노출한다.
 * user 가 있으면(로그인) 유저 정보 + 대시보드 버튼을 우측에 노출한다.
 * 공개 페이지(원장/광고주)에는 탭/유저 정보를 숨긴다.
 */
export default function Header({
  showNav = false,
  user = null,
}: {
  showNav?: boolean;
  user?: HeaderUser | null;
}) {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 w-full bg-white border-b border-gray-100 z-15">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-3">
        <Link
          href={showNav ? "/report" : "#"}
          className="shrink-0 text-base font-bold text-[#0e299c] tracking-tight"
        >
          모두보고<span className="text-red-500">.</span>
        </Link>

        <div className="flex items-center gap-4">
          {showNav ? (
            <nav className="flex h-14 items-stretch gap-6">
              {TABS.map((tab) => {
                const active = pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`relative flex h-full items-center text-sm font-semibold transition-colors ${
                      active
                        ? "text-[#0e299c]"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    {tab.label}
                    {active && (
                      <span className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-[#0e299c]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          ) : (
            !user && (
              <span className="text-sm text-gray-400">광고 운영보고 시스템</span>
            )
          )}

          {user && (
            /* 로그인 역할 배지 — 클릭 시 대시보드로 이동 */
            <Link
              href="/admin/dashboard"
              title="대시보드로 이동"
              className="inline-flex shrink-0 items-center rounded-full bg-[#0e299c]/10 px-2.5 py-1 text-xs font-bold text-[#0e299c] transition-colors hover:bg-[#0e299c]/15"
            >
              {user.role === "super" ? "슈퍼관리자" : "관리자"}
            </Link>
          )}

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
