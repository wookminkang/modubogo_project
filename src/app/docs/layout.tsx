import Link from "next/link";
import DocsSidebar from "./DocsSidebar";
import DocsMobileNav from "./DocsMobileNav";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-[#0e299c] font-bold text-base">
              모두보고<span className="text-red-400">.</span>
            </span>
            <span className="text-[11px] font-medium text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded-md tracking-wide">
              Docs
            </span>
          </Link>
          <Link
            href="/admin/login"
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            관리자 로그인 →
          </Link>
        </div>
      </header>

      {/* 모바일 수평 탭 nav */}
      <div className="md:hidden sticky top-14 z-10 bg-white border-b border-gray-100">
        <DocsMobileNav />
      </div>

      <div className="max-w-6xl mx-auto flex">
        {/* 데스크탑 사이드바 */}
        <aside className="hidden md:block w-56 shrink-0 border-r border-gray-100 min-h-[calc(100vh-56px)]">
          <div className="sticky top-14 py-8 px-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-4 px-3">
              가이드
            </p>
            <DocsSidebar />
          </div>
        </aside>

        {/* 본문 */}
        <main className="flex-1 min-w-0 px-4 py-6 md:px-12 md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
