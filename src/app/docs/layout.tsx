import Link from "next/link";
import DocsSidebar from "./DocsSidebar";
import DocsMobileMenu from "./DocsMobileMenu";

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

          {/* 데스크탑: 관리자 로그인 */}
          <Link
            href="/admin/login"
            className="hidden md:block text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            관리자 로그인 →
          </Link>

          {/* 모바일: 햄버거 */}
          <DocsMobileMenu />
        </div>
      </header>

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

      {/* 푸터 */}
      <footer className="border-t border-gray-100 bg-gray-50 px-6 py-6 text-center">
        <p className="text-gray-700 text-xs font-semibold mb-1.5">모두보고</p>
        <p className="text-gray-400 text-xs leading-relaxed">
          대표 전형진 · 사업자등록번호 342-08-03101<br />
          경기도 용인시 기흥구 동백중앙로 191, 8층 에프 826호
        </p>
        <p className="text-gray-400 text-xs leading-relaxed mt-1.5">
          TEL 02-3402-1070 · MOBILE 010-8782-1285<br />
          oper2068@kakao.com · oper2068@announcego.com
        </p>
        <p className="text-gray-300 text-xs mt-2">© 2026 모두보고. All rights reserved.</p>
      </footer>
    </div>
  );
}
