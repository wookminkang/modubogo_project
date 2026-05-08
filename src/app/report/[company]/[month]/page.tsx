import dayjs from "@/lib/dayjs";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getReportFromDB, getReportsByCompanyFromDB } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { logoutAdmin } from "@/lib/admin-actions";
import PasswordGate from "@/components/PasswordGate";
import ScrollToTop from "@/components/ScrollToTop";
import { getTotalAmount } from "@/lib/mockData";
import MonthCompareChart from "@/components/MonthCompareChart";
import CategoryDonutChart from "@/components/CategoryDonutChart";
import MonthlyTrendChart from "@/components/MonthlyTrendChart";
import CategoryTable from "@/components/CategoryTable";
import { CardTitle } from "@/components/CardTitle";
import ValidityTable from "@/components/ValidityTable";
import ContractTable from "@/components/ContractTable";
import Image from "next/image";

interface ReportPageProps {
  params: Promise<{ company: string; month: string }>;
  searchParams: Promise<{ auth_error?: string }>;
}

export default async function ReportPage({ params, searchParams }: ReportPageProps) {
  const { company, month } = await params;
  const { auth_error } = await searchParams;
  const decoded = decodeURIComponent(company);

  const [report, allReports, admin] = await Promise.all([
    getReportFromDB(decoded, month),
    getReportsByCompanyFromDB(decoded),
    isAdmin(),
  ]);
  if (!report) notFound();

  if (report.password) {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(`report_auth_${report.id}`);
    if (authCookie?.value !== report.password) {
      return <PasswordGate reportId={report.id} company={company} month={month} error={!!auth_error} />;
    }
  }

  const categories = report.categories;
  const total = getTotalAmount(categories);
  const uniqueAgencies = new Set(categories.map((c: { agency: string }) => c.agency)).size;

  const year = month.slice(0, 4);
  const yearReports = allReports.filter((r) => r.month.startsWith(year));

  // 전월 비교
  const prevMonthStr = dayjs(month, "YYYY-MM")
    .subtract(1, "month")
    .format("YYYY-MM");
  const prevReport = allReports.find((r) => r.month === prevMonthStr) ?? null;
  const prevTotal = prevReport ? getTotalAmount(prevReport.categories) : 0;
  const prevCategories = prevReport?.categories ?? [];

  // 월별 추이 차트
  const chartData = yearReports
    .map((r) => ({
      month: r.month.slice(5),
      payment: getTotalAmount(r.categories),
      categories: r.categories,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
  const currentMonthNum = month.slice(5);

  return (
    <div className="min-h-screen">
      <ScrollToTop />
      <div className="relative z-10 flex justify-center">
        <Image
          src="/images/test_ct_05.png"
          width={500}
          height={500}
          alt="모두보고 캐릭터 아이콘"
        />
      </div>

      {/* 헤더 */}
      <header className="relative top-[-30px] bg-[#0e299c] text-white px-6 pt-10 pb-8">
        <p className="text-sm text-blue-300 mb-3">
          {dayjs().format("YYYY.MM.DD (ddd)")} · 광고 운영보고
        </p>
        <h1 className="text-4xl font-bold leading-tight mb-1">
          {decoded}
          <span className="inline-block w-2.5 h-2.5 bg-red-500 rounded-full ml-2 mb-1" />
        </h1>
        <p className="text-sm text-blue-200 leading-relaxed">
          이번 달 진행 중인 광고 항목과
          <br />
          매체 운영 현황을 정리한 보고서예요.
        </p>
        {admin && (
          <div className="mt-4 flex gap-2">
            <Link
              href={`/report/${company}`}
              className="text-xs text-blue-300 bg-white/10 px-3 py-1.5 rounded-lg"
            >
              ← 목록
            </Link>
            <Link
              href={`/report/${company}/${month}/edit`}
              className="text-xs text-white bg-white/20 px-3 py-1.5 rounded-lg"
            >
              수정
            </Link>
            <form action={logoutAdmin}>
              <button type="submit" className="text-xs text-blue-300 bg-white/10 px-3 py-1.5 rounded-lg">
                로그아웃
              </button>
            </form>
          </div>
        )}
        <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between"></div>
        <div className="mt-3 flex items-center gap-3">
          <a
            href="tel:01087821285"
            className="flex items-center gap-1.5 text-xs text-blue-200 bg-white/10 px-3 py-1.5 rounded-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.62 5.1 2 2 0 0 1 3.6 2.87h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.5a16 16 0 0 0 6 6l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            010.8782.1285
          </a>
          <a
            href="http://pf.kakao.com/_UaWgn"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-blue-200 bg-white/10 px-3 py-1.5 rounded-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.533 1.523 4.77 3.85 6.106l-.977 3.546a.375.375 0 0 0 .548.415L9.5 18.35c.817.128 1.659.15 2.5.15 5.523 0 10-3.477 10-7.5S17.523 3 12 3z" />
            </svg>
            카카오톡
          </a>
          <a
            href="https://announcego.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-blue-200 bg-white/10 px-3 py-1.5 rounded-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            홈페이지
          </a>
        </div>
      </header>

      <div className="px-4 py-6 flex flex-col gap-5 bg-[#F0F4FA] relative top-[-20px]">
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-1">
          {/* 날짜 */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {dayjs(month).format("YYYY.MM")}월
          </div>

          {/* 총 광고비 + 외주업체 */}
          <div className="flex items-stretch">
            <div className="flex-1 flex flex-col gap-1">
              <p className="text-xs text-gray-400">총 광고비</p>
              <p className="text-2xl font-bold text-gray-900">
                {total.toLocaleString()}
                <span className="text-base font-normal text-gray-500 ml-1">
                  원
                </span>
              </p>
            </div>
            <div className="w-px bg-gray-100 mx-4" />
            <div className="flex items-center justify-between flex-1">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  외주업체
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {uniqueAgencies}
                  <span className="text-base font-normal text-gray-500 ml-1">
                    곳
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* 안내 문구 */}
          <div className="mt-4 flex items-start gap-1.5 bg-gray-50 rounded-xl px-3 py-2.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 flex-shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-xs text-gray-400 leading-relaxed">
              해당 금액은 전체 외주업체의 광고비 합계입니다.
            </p>
          </div>
        </div>

        {/* 월별 광고 집행 현황 */}
        <MonthlyTrendChart data={chartData} currentMonth={currentMonthNum} />

        {/* 전월 대비 광고 비교 */}
        <MonthCompareChart
          currentMonth={month}
          prevMonth={prevMonthStr}
          currentCategories={categories}
          prevCategories={prevCategories}
          currentTotal={total}
          prevTotal={prevTotal}
        />

        {/* 카테고리별 분포 */}
        <CategoryDonutChart categories={categories} total={total} />

        {/* 매체별 운영 현황 */}
        <CategoryTable categories={categories} total={total} />

        {/* 광고 계약·리포트 현황 */}
        <ContractTable contracts={report.contracts} />

        {/* 광고 심의 및 운영 현황 */}
        <ValidityTable validity={report.validity} />
      </div>
    </div>
  );
}
