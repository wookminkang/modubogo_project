import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import { getDashboardRawDataFromDB } from "@/lib/db";
import { MonthlyBarChart, CategoryDonutChart } from "./DashboardCharts";
import type { MonthlyTrendItem, CategoryItem } from "./DashboardCharts";
import { AlertTriangle, Building2, CheckCircle2, Clock, TrendingUp } from "lucide-react";

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
    while (m <= 0) { m += 12; y -= 1; }
    result.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return result;
}

export default async function DashboardPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const reports = await getDashboardRawDataFromDB();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const today = now.getTime();

  // KPI 계산
  const totalCompanies = new Set(reports.map((r) => r.company)).size;
  const thisMonth = reports.filter((r) => r.month === currentMonth);
  const completedCount = thisMonth.filter((r) => r.status === "완료").length;
  const inProgressCount = thisMonth.filter((r) => r.status === "작성중").length;
  const thisMonthTotal = thisMonth.flatMap((r) => r.report_categories as { category: string; amount: string }[]).reduce((s, c) => s + Number(c.amount || 0), 0);

  // 월별 트렌드 (최근 6개월)
  const last6 = getLast6Months(currentMonth);
  const monthlyTrend: MonthlyTrendItem[] = last6.map((m) => {
    const total = reports
      .filter((r) => r.month === m)
      .flatMap((r) => r.report_categories as { amount: string }[])
      .reduce((s, c) => s + Number(c.amount || 0), 0);
    return { month: m, label: `${Number(m.split("-")[1])}월`, total };
  });

  // 이번 달 카테고리별 비율
  const catMap = new Map<string, number>();
  thisMonth.flatMap((r) => r.report_categories as { category: string; amount: string }[]).forEach((c) => {
    catMap.set(c.category, (catMap.get(c.category) ?? 0) + Number(c.amount || 0));
  });
  const categoryData: CategoryItem[] = Array.from(catMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // 만료 임박 계약 (30일 이내)
  const expiringItems = reports
    .flatMap((r) =>
      (r.validity_items as { category: string; subject: string; expiry_date: string }[]).map((v) => ({
        company: r.company,
        subject: v.subject,
        expiryDate: v.expiry_date,
        daysLeft: Math.ceil((new Date(v.expiry_date).getTime() - today) / 86400000),
      }))
    )
    .filter((v) => v.daysLeft >= 0 && v.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // 상호별 현황 테이블
  const companyNames = Array.from(new Set(reports.map((r) => r.company)));
  const companySummary = companyNames.map((company) => {
    const all = reports.filter((r) => r.company === company);
    const latest = all[0];
    const thisMonthRep = all.find((r) => r.month === currentMonth);
    const adSpend = thisMonthRep
      ? (thisMonthRep.report_categories as { amount: string }[]).reduce((s, c) => s + Number(c.amount || 0), 0)
      : null;
    return {
      company,
      latestMonth: latest.month,
      reportCount: all.length,
      thisMonthAdSpend: adSpend,
      status: latest.status as string,
    };
  }).sort((a, b) => b.latestMonth.localeCompare(a.latestMonth));

  const currentLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;

  return (
    <div className="min-h-screen bg-[#F0F4FA]">
      <div className="px-4 py-6 flex flex-col gap-5 pb-12">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0e299c]">관리자 대시보드</h1>
            <p className="text-sm text-gray-400 mt-0.5">{currentLabel} 기준</p>
          </div>
          <Link
            href="/report"
            className="text-sm text-gray-500 bg-white px-3 py-2 rounded-xl shadow-sm"
          >
            보고서 목록
          </Link>
        </div>

        {/* KPI 카드 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Building2 size={16} className="text-[#0e299c]" />
              <span className="text-xs text-gray-500">전체 상호수</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalCompanies}<span className="text-sm font-normal text-gray-400 ml-1">개</span></p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-[#0e299c]" />
              <span className="text-xs text-gray-500">이번 달 광고비</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {thisMonthTotal > 0 ? fmtAmount(thisMonthTotal) : "-"}
              {thisMonthTotal > 0 && <span className="text-sm font-normal text-gray-400 ml-1">원</span>}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span className="text-xs text-gray-500">완료</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{completedCount}<span className="text-sm font-normal text-gray-400 ml-1">건</span></p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-amber-500" />
              <span className="text-xs text-gray-500">작성중</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{inProgressCount}<span className="text-sm font-normal text-gray-400 ml-1">건</span></p>
          </div>
        </div>

        {/* 만료 임박 계약 */}
        {expiringItems.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-amber-500" />
              <span className="text-sm font-bold text-amber-700">만료 임박 계약 ({expiringItems.length}건)</span>
            </div>
            <div className="flex flex-col gap-2">
              {expiringItems.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-gray-700">{item.company}</span>
                    <span className="text-xs text-gray-400 ml-1.5">{item.subject}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.daysLeft <= 7 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                    D-{item.daysLeft}
                  </span>
                </div>
              ))}
              {expiringItems.length > 5 && (
                <p className="text-xs text-amber-600 text-center mt-1">+{expiringItems.length - 5}건 더 있음</p>
              )}
            </div>
          </div>
        )}

        {/* 월별 광고비 트렌드 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 mb-1">월별 광고비 트렌드</h2>
          <p className="text-xs text-gray-400 mb-4">최근 6개월 전체 상호 합산</p>
          <MonthlyBarChart data={monthlyTrend} />
        </div>

        {/* 카테고리별 비율 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 mb-1">이번 달 카테고리별 광고비</h2>
          <p className="text-xs text-gray-400 mb-2">전체 상호 합산 기준</p>
          <CategoryDonutChart data={categoryData} />
        </div>

        {/* 상호별 현황 테이블 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-sm font-bold text-gray-800">상호별 현황</h2>
            <p className="text-xs text-gray-400">이번 달 광고비 미입력 시 — 표시</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-100">
                  <th className="text-left px-4 py-2.5 text-gray-500 font-medium">상호명</th>
                  <th className="text-right px-3 py-2.5 text-gray-500 font-medium">이번달 광고비</th>
                  <th className="text-center px-3 py-2.5 text-gray-500 font-medium">상태</th>
                  <th className="text-center px-3 py-2.5 text-gray-500 font-medium">보기</th>
                </tr>
              </thead>
              <tbody>
                {companySummary.map(({ company, thisMonthAdSpend, status }) => (
                  <tr key={company} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[120px] truncate">{company}</td>
                    <td className="px-3 py-3 text-right text-gray-700">
                      {thisMonthAdSpend != null ? `₩${fmtAmount(thisMonthAdSpend)}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${status === "완료" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Link
                        href={`/report/${encodeURIComponent(company)}`}
                        className="text-[#0e299c] font-medium underline underline-offset-2"
                      >
                        보기
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
