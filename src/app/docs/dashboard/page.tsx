import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  return (
    <article className="flex flex-col gap-0">
      <header className="pb-8 border-b border-gray-100">
        <p className="text-xs font-semibold text-[#0e299c] uppercase tracking-widest mb-2">모두보고 Docs</p>
        <h1 className="text-[2rem] font-bold text-gray-900 leading-tight">관리자 대시보드</h1>
        <p className="mt-4 text-gray-500 text-sm leading-7">
          전사 광고 현황을 한눈에 파악하고 만료 임박 계약을 관리합니다.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-gray-900 mb-3">KPI 모니터링</h2>
        <ul className="flex flex-col gap-2">
          {[
            "전체 관리 중인 회사(상호) 수",
            "선택 월 기준 전사 총 광고비",
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
        <h2 className="text-base font-semibold text-gray-900 mb-3">만료 임박 계약 알림</h2>
        <ul className="flex flex-col gap-2">
          {[
            "D-30 이내 계약을 상단에 표시",
            "D-7 이내는 빨간색, 그 외는 주황색으로 강조",
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
        <h2 className="text-base font-semibold text-gray-900 mb-3">월별 광고비 트렌드</h2>
        <ul className="flex flex-col gap-2">
          {[
            "최근 6개월 전사 광고비 추이 차트",
            "조회 월 변경 가능",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600 leading-6">
              <span className="mt-2 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-14 pt-6 border-t border-gray-100 flex justify-between items-center">
        <Link href="/docs/report-manage" className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={14} />
          보고서 관리
        </Link>
        <Link href="/docs/alimtalk" className="flex items-center gap-2 text-sm text-[#0e299c] font-medium hover:underline">
          알림톡 발송
          <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}
