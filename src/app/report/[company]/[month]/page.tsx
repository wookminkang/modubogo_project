import dayjs from "@/lib/dayjs";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getReport, getReportsByCompany, getTotalAmount } from "@/lib/mockData";
import MonthCompareChart from "@/components/MonthCompareChart";
import CategoryDonutChart from "@/components/CategoryDonutChart";
import MonthlyTrendChart from "@/components/MonthlyTrendChart";
import CategoryTable from "@/components/CategoryTable";
import { CardTitle } from "@/components/CardTitle";
import ValidityTable from "@/components/ValidityTable";

interface ReportPageProps {
  params: Promise<{ company: string; month: string }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { company, month } = await params;
  const decoded = decodeURIComponent(company);

  const report = getReport(decoded, month);
  if (!report) notFound();

  const categories = report.categories;
  const total = getTotalAmount(categories);
  const uniqueAgencies = new Set(categories.map((c) => c.agency)).size;

  const year = month.slice(0, 4);
  const allReports = getReportsByCompany(decoded).filter((r) =>
    r.month.startsWith(year),
  );

  // 전월 비교
  const prevMonthStr = dayjs(month, "YYYY-MM")
    .subtract(1, "month")
    .format("YYYY-MM");
  const prevReport = getReport(decoded, prevMonthStr);
  const prevTotal = prevReport ? getTotalAmount(prevReport.categories) : 0;
  const prevCategories = prevReport?.categories ?? [];

  // 월별 추이 차트
  const chartData = allReports
    .map((r) => ({
      month: r.month.slice(5),
      payment: getTotalAmount(r.categories),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
  const currentMonthNum = month.slice(5);

  return (
    <div className="min-h-screen bg-[#F0F4FA]">
      {/* 헤더 */}
      <header className="bg-[#0e299c] text-white px-6 pt-10 pb-8">
        <p className="text-sm text-blue-300 mb-3">
          {dayjs().format("YYYY.MM.DD (ddd)")} · 광고 운영보고
        </p>
        <h1 className="text-4xl font-bold leading-tight mb-3">
          {decoded}
          <span className="inline-block w-2.5 h-2.5 bg-red-500 rounded-full ml-2 mb-1" />
        </h1>
        <p className="text-sm text-blue-200 leading-relaxed">
          이번 달 진행 중인 광고 항목과
          <br />
          매체 운영 현황을 정리한 보고서예요.
        </p>
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
        </div>
        <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between">
          <span className="text-sm text-blue-300">보고자</span>
          <span className="text-sm font-medium text-white">
            {report.reporter} · {report.email}
          </span>
        </div>
      </header>

      <div className="px-4 py-6 flex flex-col gap-5">
        <div>
          <CardTitle
            title={` ${total.toLocaleString()}원`}
            description={`${dayjs(month).format("YYYY.MM")}월 총 광고비`}
            right={
              <div className="flex flex-col text-right">
                <span>
                  외주업체{" "}
                  <b className="font-bold text-[#0e299c]">{uniqueAgencies}</b>곳
                </span>
              </div>
            }
          />
        </div>

        {/* 월별 광고 집행 현황 */}
        <MonthlyTrendChart data={chartData} currentMonth={currentMonthNum} />

        {/* 카테고리별 분포 */}
        <CategoryDonutChart categories={categories} total={total} />

        {/* 매체별 운영 현황 */}
        <CategoryTable categories={categories} total={total} />

        {/* 전월 대비 광고 비교 */}
        <MonthCompareChart
          currentMonth={month}
          prevMonth={prevMonthStr}
          currentCategories={categories}
          prevCategories={prevCategories}
          currentTotal={total}
          prevTotal={prevTotal}
        />

        {/* 광고 심의 및 운영 현황 */}
        <ValidityTable validity={report.validity} />
      </div>
    </div>
  );
}
