import Link from "next/link";
import { getCompaniesSummaryFromDB } from "@/lib/db";

export default async function ReportListPage() {
  const companies = await getCompaniesSummaryFromDB();

  return (
    <div className="min-h-screen bg-[#F0F4FA]">
      <div className="px-4 py-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0e299c]">보고서 목록</h1>
          <Link
            href="/report/new"
            className="bg-[#0e299c] text-white text-sm font-medium px-4 py-2 rounded-xl"
          >
            + 새 보고서
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {companies.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-10">
              등록된 보고서가 없습니다.
            </p>
          )}
          {companies.map(({ company, latestMonth, reportCount, status }) => (
            <Link
              key={company}
              href={`/report/${encodeURIComponent(company)}`}
              className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="font-bold text-base text-gray-900">{company}</p>
                <p className="text-sm text-gray-400 mt-1">
                  최근 {latestMonth} · 총 {reportCount}건
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    status === "완료"
                      ? "bg-blue-50 text-[#0e299c]"
                      : "bg-orange-50 text-orange-500"
                  }`}
                >
                  {status}
                </span>
                <span className="text-gray-300">›</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
