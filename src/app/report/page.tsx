import { redirect } from "next/navigation";
import { getCompaniesSummaryFromDB } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import CompanyList from "./CompanyList";

export const dynamic = "force-dynamic";

export default async function ReportListPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");
  const companies = await getCompaniesSummaryFromDB();

  return <CompanyList companies={companies} />;
}
