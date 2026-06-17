"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const TABS = [
  { href: "/hospital", label: "병원목록" },
  { href: "/report", label: "보고서" },
  { href: "/holiday", label: "진료일정" },
];

/**
 * 앱 공통 상단 헤더.
 * showNav=true(관리자)일 때만 카테고리 탭(병원목록/보고서/진료일정)을 노출한다.
 * 공개 페이지(원장/광고주)에는 탭을 숨긴다.
 */
export default function Header({ showNav = false }: { showNav?: boolean }) {
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
            <span className="text-sm text-gray-400">광고 운영보고 시스템</span>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
