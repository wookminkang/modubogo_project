import Link from "next/link";
import { getReportsByCompany, getTotalAmount } from "@/lib/mockData";
import { notFound } from "next/navigation";

interface CompanyReportListPageProps {
  params: Promise<{ company: string }>;
}

export default async function CompanyReportListPage({
  params,
}: CompanyReportListPageProps) {
  const { company } = await params;
  const decoded = decodeURIComponent(company);
  const reports = getReportsByCompany(decoded);

  if (reports.length === 0) notFound();

  return (
    <div className="min-h-screen bg-[#F0F4FA]">
      <div className="px-4 py-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/report" className="text-sm text-gray-400 mb-1 block">
              ← 전체 목록
            </Link>
            <h1 className="text-2xl font-bold text-[#0e299c]">{decoded}</h1>
          </div>
          <Link
            href="/report/new"
            className="bg-[#0e299c] text-white text-sm font-medium px-4 py-2 rounded-xl"
          >
            + 새 보고서
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {reports.map((report) => {
            const total = getTotalAmount(report.categories);
            return (
              <Link
                key={report.id}
                href={`/report/${encodeURIComponent(decoded)}/${report.month}`}
                className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-base text-gray-900">
                    {report.month}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    ₩{total.toLocaleString()} · {report.categories.length}건
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      report.status === "완료"
                        ? "bg-blue-50 text-[#0e299c]"
                        : "bg-orange-50 text-orange-500"
                    }`}
                  >
                    {report.status}
                  </span>
                  <span className="text-gray-300">›</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
