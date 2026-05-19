import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function ReportViewPage() {
  return (
    <article className="flex flex-col gap-0">
      <header className="pb-8 border-b border-gray-100">
        <p className="text-xs font-semibold text-[#0e299c] uppercase tracking-widest mb-2">모두보고 Docs</p>
        <h1 className="text-[2rem] font-bold text-gray-900 leading-tight">보고서 뷰</h1>
        <p className="mt-4 text-gray-500 text-sm leading-7">
          클라이언트가 링크를 통해 접속하면 확인할 수 있는 보고서 화면입니다.
        </p>
      </header>

      {[
        {
          title: "요약 지표",
          items: [
            "해당 월 총 광고비",
            "운영 중인 외주업체 수",
            "네이버 비즈머니 잔액 (API 연동 시)",
          ],
        },
        {
          title: "광고 집행 현황",
          items: [
            "카테고리(검색광고, 디스플레이, 소셜 등)별 채널·외주업체·집행비 상세 내역",
            "계약 기간이 여러 달에 걸친 경우 월별 분할 금액 표시",
          ],
        },
        {
          title: "차트 시각화",
          items: [
            "월별 광고비 트렌드 — 최근 6개월 막대 그래프",
            "전월 대비 비교 — 카테고리별 증감 현황",
            "카테고리별 비중 — 도넛 차트",
          ],
        },
        {
          title: "계약·심의 현황",
          items: [
            "외주업체 계약 정보 및 광고 리포트 링크",
            "광고 심의 유효기간 및 D-day 표시",
            "만료 60일 이내 항목은 상단에 별도 경보 표시",
          ],
        },
        {
          title: "공유 및 연락",
          items: [
            "보고서 링크 복사 기능",
            "전화·카카오톡·웹사이트 바로가기",
          ],
        },
      ].map((section, i) => (
        <section key={section.title} className={i === 0 ? "mt-8" : "mt-8"}>
          <h2 className="text-base font-semibold text-gray-900 mb-3">{section.title}</h2>
          <ul className="flex flex-col gap-2 pl-0">
            {section.items.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600 leading-6">
                <span className="mt-2 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          {i < 4 && <div className="mt-8 border-t border-gray-50" />}
        </section>
      ))}

      <div className="mt-14 pt-6 border-t border-gray-100 flex justify-between items-center">
        <Link href="/docs/background" className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={14} />
          서비스 배경
        </Link>
        <Link href="/docs/report-manage" className="flex items-center gap-2 text-sm text-[#0e299c] font-medium hover:underline">
          보고서 관리
          <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}
