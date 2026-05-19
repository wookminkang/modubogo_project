import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function NaverPage() {
  return (
    <article className="flex flex-col gap-0">
      <header className="pb-8 border-b border-gray-100">
        <p className="text-xs font-semibold text-[#0e299c] uppercase tracking-widest mb-2">모두보고 Docs</p>
        <h1 className="text-[2rem] font-bold text-gray-900 leading-tight">네이버 광고 API 연동</h1>
        <p className="mt-4 text-gray-500 text-sm leading-7">
          네이버 광고 API를 통해 광고비를 자동으로 수집하고 잔액을 조회합니다.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-gray-900 mb-3">주요 기능</h2>
        <ul className="flex flex-col gap-2">
          {[
            "회사별 네이버 광고 API 키 등록",
            "해당 월 네이버 광고비를 자동으로 수집하여 보고서에 반영",
            "비즈머니 잔액 실시간 조회",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600 leading-6">
              <span className="mt-2 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 border-t border-gray-50" />

      <section className="mt-8">
        <h2 className="text-base font-semibold text-gray-900 mb-3">API 키 등록 방법</h2>
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-5 py-4">
          <p className="text-sm text-gray-600 leading-7">
            관리자 페이지 → 회사 설정에서 네이버 광고 API 액세스 키, 시크릿 키, 고객 ID를 입력하면
            해당 월의 광고비가 자동으로 보고서에 반영됩니다.
          </p>
        </div>
      </section>

      <div className="mt-14 pt-6 border-t border-gray-100 flex justify-between items-center">
        <Link href="/docs/alimtalk" className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={14} />
          알림톡 발송
        </Link>
        <Link href="/docs/colors" className="flex items-center gap-2 text-sm text-[#0e299c] font-medium hover:underline">
          카테고리 색상
          <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}
