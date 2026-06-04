import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CompanyReports from "./CompanyReports";

interface CompanyReportListPageProps {
  params: Promise<{ company: string }>;
}

export default async function CompanyReportListPage({
  params,
}: CompanyReportListPageProps) {
  const { company } = await params;
  const decoded = decodeURIComponent(company);

  return (
    <div className="flex-1 overflow-x-clip bg-[#F0F4FA] py-6 px-4">
      <div className="max-w-[1200px] mx-auto bg-white rounded-2xl shadow-sm px-4 py-6 md:px-8 md:py-8">
        <Link
          href="/report"
          className="mb-5 inline-flex items-center gap-1.5 text-base font-semibold text-gray-600 transition-colors hover:text-[#0e299c]"
        >
          <ArrowLeft size={18} />
          보고서 목록으로 이동
        </Link>
        <CompanyReports company={decoded} />
      </div>
    </div>
  );
}
