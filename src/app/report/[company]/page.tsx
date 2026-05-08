import Link from "next/link";
import { getReportsByCompanyFromDB } from "@/lib/db";
import { getTotalAmount } from "@/lib/mockData";
import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import DeleteReportButton from "@/components/DeleteReportButton";
import CopyReportButton from "@/components/CopyReportButton";

interface CompanyReportListPageProps {
  params: Promise<{ company: string }>;
}

export default async function CompanyReportListPage({
  params,
}: CompanyReportListPageProps) {
  const { company } = await params;

  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const decoded = decodeURIComponent(company);
  const reports = await getReportsByCompanyFromDB(decoded);

  if (reports.length === 0) notFound();

  return (
    <div className="min-h-screen bg-[#F0F4FA]">
      <div className="px-4 py-6 flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div>
            <Link href="/report" className="text-sm text-gray-400 mb-1 block">
              ← 전체 목록
            </Link>
            <h1 className="text-2xl font-bold text-[#0e299c]">{decoded}</h1>
          </div>
          <div className="flex gap-2">
            <CopyReportButton company={decoded} className="flex-1" />
            <Link
              href="/report/new"
              className="flex-1 flex items-center justify-center bg-[#0e299c] text-white text-sm font-semibold h-11 rounded-xl"
            >
              + 새 보고서
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {reports.map((report) => {
            const total = getTotalAmount(report.categories);
            return (
              <div key={report.id} className="bg-white rounded-2xl shadow-sm flex items-center">
                <Link
                  href={`/report/${encodeURIComponent(decoded)}/${report.month}`}
                  className="flex-1 flex items-center justify-between px-5 py-5"
                >
                  <div>
                    <p className="font-bold text-base text-gray-900">
                      {report.month}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      ₩{total.toLocaleString()} · {report.categories.length}건
                    </p>
                  </div>
                  <span className="text-gray-300">›</span>
                </Link>
                <DeleteReportButton reportId={report.id} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
