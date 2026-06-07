import { redirect } from "next/navigation";
import { getCompaniesSummaryFromDB } from "@/lib/db";
import { getAdminUser } from "@/lib/admin";
import CompanyList from "./CompanyList";

export const dynamic = "force-dynamic";

export default async function ReportListPage() {
  const me = await getAdminUser();
  if (!me) redirect("/admin/login");
  const companies = await getCompaniesSummaryFromDB();

  return <CompanyList companies={companies} isSuper={me.role === "super"} />;
}
