import dayjs from "@/lib/dayjs";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getReport, getReportsByCompany, getTotalAmount } from "@/lib/mockData";
import MonthCompareChart from "@/components/MonthCompareChart";
import CategoryDonutChart from "@/components/CategoryDonutChart";

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
  const maxAmount = Math.max(...categories.map((c) => Number(c.amount)));
  const maxCategory = categories.find((c) => Number(c.amount) === maxAmount);
  const uniqueAgencies = new Set(categories.map((c) => c.agency)).size;

  // YTD: 같은 회사 올해 전체 합산
  const year = month.slice(0, 4);
  const allReports = getReportsByCompany(decoded).filter((r) => r.month.startsWith(year));
  const ytd = allReports.reduce((sum, r) => sum + getTotalAmount(r.categories), 0);

  // 전월 비교
  const prevMonthStr = dayjs(month, "YYYY-MM").subtract(1, "month").format("YYYY-MM");
  const prevReport = getReport(decoded, prevMonthStr);
  const prevTotal = prevReport ? getTotalAmount(prevReport.categories) : 0;
  const prevCategories = prevReport?.categories ?? [];

  // 월별 추이 차트
  const chartData = allReports
    .map((r) => ({ month: r.month.slice(5), payment: getTotalAmount(r.categories) }))
    .sort((a, b) => a.month.localeCompare(b.month));
  const chartMax = Math.max(...chartData.map((d) => d.payment));
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
          이번 달 진행 중인 광고 항목과<br />매체 운영 현황을 정리한 보고서예요.
        </p>
        <div className="mt-4 flex gap-2">
          <Link href={`/report/${company}`} className="text-xs text-blue-300 bg-white/10 px-3 py-1.5 rounded-lg">
            ← 목록
          </Link>
          <Link href={`/report/${company}/${month}/edit`} className="text-xs text-white bg-white/20 px-3 py-1.5 rounded-lg">
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
        {/* 요약 통계 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-400 mb-2">{month} 집행 합계</p>
            <p className="text-2xl font-bold text-[#0e299c]">
              {total.toLocaleString()}
              <span className="text-sm ml-1 font-normal text-gray-400">원</span>
            </p>
            <p className="text-sm text-gray-400 mt-2">{categories.length}건 집행</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-400 mb-2">결제처</p>
            <p className="text-2xl font-bold text-[#0e299c]">
              {uniqueAgencies}
              <span className="text-sm ml-1 font-normal text-gray-400">곳</span>
            </p>
            <p className="text-sm text-gray-400 mt-2">집행사 수</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-400 mb-2">최대 결제 항목</p>
            <p className="text-2xl font-bold text-[#0e299c]">
              {maxAmount.toLocaleString()}
              <span className="text-sm ml-1 font-normal text-gray-400">원</span>
            </p>
            <p className="text-sm text-gray-400 mt-2">{maxCategory?.channel ?? "-"}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-400 mb-2">YTD 누적</p>
            <p className="text-2xl font-bold text-[#0e299c]">
              {ytd.toLocaleString()}
              <span className="text-sm ml-1 font-normal text-gray-400">원</span>
            </p>
            <p className="text-sm text-gray-400 mt-2">올해 누적 집행액</p>
          </div>
        </div>

        {/* 월별 집행 추이 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-base font-semibold text-[#0e299c]">월별 집행 추이</p>
          <div className="flex items-end gap-3 h-[140px] mt-16">
            {chartData.map((item) => {
              const height = Math.round((item.payment / chartMax) * 140);
              const isCurrent = item.month === currentMonthNum;
              return (
                <div key={item.month} className="w-24 flex flex-col items-center gap-2 relative">
                  <p className="absolute -top-6 text-xs font-medium text-gray-500 whitespace-nowrap">
                    {item.payment.toLocaleString()}원
                  </p>
                  <div
                    className={`w-full rounded-t-lg ${isCurrent ? "bg-[#0e299c]" : "bg-gray-200"}`}
                    style={{ height: `${height}px` }}
                  />
                  <p className={`text-sm font-semibold ${isCurrent ? "text-[#0e299c]" : "text-gray-400"}`}>
                    {item.month}월
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 카테고리별 분포 */}
        <CategoryDonutChart categories={categories} total={total} />

        {/* 카테고리별 집행 내역 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-base font-semibold text-[#0e299c] mb-4">카테고리별 집행 내역</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-400 text-left">
                <th className="pb-3 pr-2 font-normal">#</th>
                <th className="pb-3 pr-2 font-normal">구분</th>
                <th className="pb-3 pr-2 font-normal">채널</th>
                <th className="pb-3 pr-2 font-normal">집행사</th>
                <th className="pb-3 text-right font-normal">금액</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((item, index) => (
                <tr key={index} className="border-b last:border-0">
                  <td className="py-3 pr-2 text-gray-400">{index + 1}</td>
                  <td className="py-3 pr-2 text-gray-800">{item.category}</td>
                  <td className="py-3 pr-2 text-gray-800">{item.channel}</td>
                  <td className="py-3 pr-2 text-gray-400">{item.agency}</td>
                  <td className="py-3 text-right font-semibold text-[#0e299c]">
                    ₩{Number(item.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t">
                <td colSpan={4} className="pt-3 text-gray-400">합계</td>
                <td className="pt-3 text-right font-bold text-[#0e299c]">
                  ₩{total.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 전월 대비 비교 */}
        <MonthCompareChart
          currentMonth={month}
          prevMonth={prevMonthStr}
          currentCategories={categories}
          prevCategories={prevCategories}
          currentTotal={total}
          prevTotal={prevTotal}
        />

        {/* 유효기간 */}
        {report.validity.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-base font-semibold text-[#0e299c] mb-4">유효기간</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-400 text-left">
                  <th className="pb-3 pr-2 font-normal">구분</th>
                  <th className="pb-3 pr-2 font-normal">주제</th>
                  <th className="pb-3 pr-2 font-normal">유효기간</th>
                  <th className="pb-3 text-right font-normal">D-day</th>
                </tr>
              </thead>
              <tbody>
                {report.validity.map((item, index) => {
                  const diff = dayjs(item.expiryDate).diff(dayjs(), "day");
                  const dday = diff === 0 ? "D-day" : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
                  const ddayColor = diff < 0 ? "text-red-500" : diff <= 7 ? "text-orange-500" : "text-[#0e299c]";
                  return (
                    <tr key={index} className="border-b last:border-0">
                      <td className="py-3 pr-2 text-gray-800">{item.category}</td>
                      <td className="py-3 pr-2 text-gray-800">{item.subject}</td>
                      <td className="py-3 pr-2 text-gray-400">{item.expiryDate}</td>
                      <td className={`py-3 text-right font-bold ${ddayColor}`}>{dday}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
