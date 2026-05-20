import Link from "next/link";
import { NAV } from "./nav";
import { ArrowRight } from "lucide-react";
import DocsBanner from "./DocsBanner";

const SECTIONS = [
  { href: "/docs/background", desc: "왜 만들었는지, 어떤 문제를 해결하는지" },
  { href: "/docs/report-view", desc: "클라이언트가 보는 보고서 화면" },
  { href: "/docs/report-manage", desc: "관리자가 보고서를 작성·수정하는 방법" },
  { href: "/docs/dashboard", desc: "전사 광고비 현황 및 만료 알림" },
  { href: "/docs/alimtalk", desc: "카카오 알림톡으로 보고서 전달" },
  { href: "/docs/naver", desc: "광고비 자동 수집 및 잔액 조회" },
  { href: "/docs/colors", desc: "카테고리별 태그 색상 커스터마이징" },
  { href: "/docs/security", desc: "관리자 인증, 보고서 비밀번호" },
];

export default function DocsIndexPage() {
  const next = NAV[1];
  return (
    <article className="flex flex-col gap-0">
      {/* 배너 */}
      <DocsBanner />

      {/* 헤더 */}
      <header className="mt-8 pb-8 border-b border-gray-100">
        <p className="text-xs font-semibold text-[#0e299c] uppercase tracking-widest mb-2">모두보고 Docs</p>
        <h1 className="text-[2rem] font-bold text-gray-900 leading-tight">서비스 소개</h1>
        <p className="mt-4 text-gray-500 text-sm leading-7">
          모두보고는 광고 에이전시가 클라이언트에게 월별 광고 운영 현황을 보고하는 웹 서비스입니다.
          기존의 엑셀·PDF 방식을 웹 기반으로 자동화하고 시각화하여 클라이언트 경험을 높입니다.
        </p>
      </header>

      {/* 주요 기능 */}
      <section className="mt-8">
        <h2 className="text-base font-semibold text-gray-900 mb-4">주요 기능</h2>
        <div className="rounded-xl border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-2.5 px-4 text-gray-500 font-medium text-xs uppercase tracking-wide">구분</th>
                <th className="text-left py-2.5 px-4 text-gray-500 font-medium text-xs uppercase tracking-wide">기능</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                ["보고서 뷰", "월별 광고 현황 조회, 차트 시각화, 계약·심의 현황"],
                ["보고서 관리", "보고서 작성·수정·삭제, 이전 데이터 불러오기"],
                ["대시보드", "전사 광고비 현황, 만료 임박 계약 알림"],
                ["알림톡", "카카오 알림톡으로 보고서 발송 및 이력 관리"],
                ["네이버 광고 연동", "네이버 광고 API로 광고비 자동 수집"],
                ["색상 관리", "카테고리별 태그 색상 커스터마이징"],
              ].map(([label, desc]) => (
                <tr key={label} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-[#0e299c] whitespace-nowrap text-sm">{label}</td>
                  <td className="py-3 px-4 text-gray-600 text-sm">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 섹션 목록 */}
      <section className="mt-10">
        <h2 className="text-base font-semibold text-gray-900 mb-4">이 문서에서 다루는 내용</h2>
        <div className="flex flex-col gap-2">
          {SECTIONS.map((s) => {
            const nav = NAV.find((n) => n.href === s.href);
            return (
              <Link
                key={s.href}
                href={s.href}
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 hover:border-[#0e299c]/30 hover:bg-blue-50/30 transition-colors group"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-[#0e299c] transition-colors">{nav?.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-[#0e299c] transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* 하단 네비게이션 */}
      <div className="mt-14 pt-6 border-t border-gray-100 flex justify-end">
        <Link
          href={next.href}
          className="flex items-center gap-2 text-sm text-[#0e299c] font-medium hover:underline"
        >
          {next.label}
          <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}
