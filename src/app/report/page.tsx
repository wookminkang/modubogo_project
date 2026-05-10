import Link from "next/link";
import { redirect } from "next/navigation";
import { getCompaniesSummaryFromDB } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import CompanyList from "./CompanyList";

export const dynamic = 'force-dynamic';

export default async function ReportListPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");
  const companies = await getCompaniesSummaryFromDB();

  return (
    <div className="min-h-screen bg-[#F0F4FA]">
      <div className="px-4 py-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0e299c]">보고서 목록</h1>
          <Link
            href="/report/new"
            className="bg-[#0e299c] text-white text-sm font-medium px-4 py-2 rounded-xl shadow-sm"
          >
            + 새 보고서
          </Link>
        </div>

        <CompanyList companies={companies} />
      </div>
    </div>
  );
}
