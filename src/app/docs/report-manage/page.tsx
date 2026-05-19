import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function ReportManagePage() {
  return (
    <article className="flex flex-col gap-0">
      <header className="pb-8 border-b border-gray-100">
        <p className="text-xs font-semibold text-[#0e299c] uppercase tracking-widest mb-2">모두보고 Docs</p>
        <h1 className="text-[2rem] font-bold text-gray-900 leading-tight">보고서 관리</h1>
        <p className="mt-4 text-gray-500 text-sm leading-7">
          관리자가 보고서를 작성·수정·삭제하는 기능을 설명합니다.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-gray-900 mb-3">보고서 작성</h2>
        <ul className="flex flex-col gap-2">
          {[
            "회사명, 보고 월, 담당자 정보 입력",
            "광고 항목(카테고리·채널·외주업체·기간·금액) 추가",
            "계약 현황 및 심의 항목 추가",
            "이전 보고서 불러오기 — 동일 회사의 직전 보고서 데이터를 한 번에 로드",
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
        <h2 className="text-base font-semibold text-gray-900 mb-3">항목 관리</h2>
        <ul className="flex flex-col gap-2">
          {[
            "각 섹션(집행·계약·심의)별 항목 추가·삭제",
            "순서 변경 가능",
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
        <h2 className="text-base font-semibold text-gray-900 mb-3">보고서 목록</h2>
        <ul className="flex flex-col gap-2">
          {[
            "회사별 보고서 목록 조회",
            "월별 총 광고비 및 항목 수 미리보기",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600 leading-6">
              <span className="mt-2 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-14 pt-6 border-t border-gray-100 flex justify-between items-center">
        <Link href="/docs/report-view" className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={14} />
          보고서 뷰
        </Link>
        <Link href="/docs/dashboard" className="flex items-center gap-2 text-sm text-[#0e299c] font-medium hover:underline">
          관리자 대시보드
          <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}
