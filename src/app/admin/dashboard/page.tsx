import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import { getDashboardRawDataFromDB } from "@/lib/db";
import { MonthlyBarChart } from "./DashboardCharts";
import type { MonthlyTrendItem } from "./DashboardCharts";
import MonthSelector from "./MonthSelector";
import { AlertTriangle, Building2, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

const fmtAmount = (v: number) => {
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (v >= 10000000) return `${(v / 10000000).toFixed(0)}천만`;
  if (v >= 1000000) return `${(v / 1000000).toFixed(0)}백만`;
  if (v >= 10000) return `${(v / 10000).toFixed(0)}만`;
  return `${v.toLocaleString()}`;
};

function getLast6Months(currentMonth: string): string[] {
  const [year, month] = currentMonth.split("-").map(Number);
  const result: string[] = [];
  for (let i = 5; i >= 0; i--) {
    let m = month - i;
    let y = year;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    result.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return result;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const reports = await getDashboardRawDataFromDB();

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { month: qMonth } = await searchParams;
  const currentMonth =
    qMonth && /^\d{4}-\d{2}$/.test(qMonth) ? qMonth : defaultMonth;
  const today = now.getTime();

  // KPI 계산
  const totalCompanies = new Set(reports.map((r) => r.company)).size;
  const thisMonth = reports.filter((r) => r.month === currentMonth);
  const thisMonthTotal = thisMonth
    .flatMap((r) => r.report_categories as { amount: string }[])
    .reduce((s, c) => s + Number(c.amount || 0), 0);

  // 월별 트렌드 (최근 6개월)
  const last6 = getLast6Months(currentMonth);
  const monthlyTrend: MonthlyTrendItem[] = last6.map((m) => {
    const total = reports
      .filter((r) => r.month === m)
      .flatMap((r) => r.report_categories as { amount: string }[])
      .reduce((s, c) => s + Number(c.amount || 0), 0);
    return { month: m, label: `${Number(m.split("-")[1])}월`, total };
  });

  // 만료 임박 계약 (30일 이내)
  const expiringItems = reports
    .flatMap((r) =>
      (r.validity_items as { subject: string; expiry_date: string }[]).map(
        (v) => ({
          company: r.company,
          subject: v.subject,
          expiryDate: v.expiry_date,
          daysLeft: Math.ceil(
            (new Date(v.expiry_date).getTime() - today) / 86400000,
          ),
        }),
      ),
    )
    .filter((v) => v.daysLeft >= 0 && v.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const [selYear, selMonthNum] = currentMonth.split("-").map(Number);
  const currentLabel = `${selYear}년 ${selMonthNum}월`;

  return (
    <div className="min-h-screen bg-[#F0F4FA]">
      <div className="px-4 py-6 flex flex-col gap-5 pb-12">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0e299c]">
              관리자 대시보드
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">{currentLabel} 기준</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/alimtalk-logs"
              className="text-sm text-[#3C1E1E] bg-[#FEE500] px-3 py-2 rounded-xl shadow-sm font-medium"
            >
              알림톡 조회
            </Link>
            <Link
              href="/admin/category-colors"
              className="text-sm text-gray-500 bg-white px-3 py-2 rounded-xl shadow-sm"
            >
              색상 설정
            </Link>
            <Link
              href="/report"
              className="text-sm text-gray-500 bg-white px-3 py-2 rounded-xl shadow-sm"
            >
              보고서 목록
            </Link>
          </div>
        </div>

        {/* 월 선택 */}
        <MonthSelector value={currentMonth} />
        {/* KPI 카드 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Building2 size={16} className="text-[#0e299c]" />
              <span className="text-xs text-gray-500">전체 상호수</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {totalCompanies}
              <span className="text-sm font-normal text-gray-400 ml-1">개</span>
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-[#0e299c]" />
              <span className="text-xs text-gray-500">이번 달 광고비</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {thisMonthTotal > 0 ? fmtAmount(thisMonthTotal) : "-"}
              {thisMonthTotal > 0 && (
                <span className="text-sm font-normal text-gray-400 ml-1">
                  원
                </span>
              )}
            </p>
          </div>
        </div>

        {/* 만료 임박 계약 */}
        {expiringItems.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-amber-500" />
              <span className="text-sm font-bold text-amber-700">
                만료 임박 계약 ({expiringItems.length}건)
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {expiringItems.slice(0, 5).map(
                (
                  item: {
                    company: string;
                    subject: string;
                    daysLeft: number;
                  },
                  i: number,
                ) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-gray-700">
                        {item.company}
                      </span>
                      <span className="text-xs text-gray-400 ml-1.5">
                        {item.subject}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.daysLeft <= 7 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}
                    >
                      D-{item.daysLeft}
                    </span>
                  </div>
                ),
              )}
              {expiringItems.length > 5 && (
                <p className="text-xs text-amber-600 text-center mt-1">
                  +{expiringItems.length - 5}건 더 있음
                </p>
              )}
            </div>
          </div>
        )}

        {/* 월별 광고비 트렌드 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 mb-1">월별 광고비</h2>
          <p className="text-xs text-gray-400 mb-4">
            월별 광고비를 확인할 수 있어요
          </p>
          <MonthlyBarChart data={monthlyTrend} />
        </div>
      </div>
    </div>
  );
}
