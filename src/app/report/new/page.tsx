import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { getCategoryColorsFromDB } from "@/lib/db";
import NewReportForm from "./NewReportForm";

export default async function ReportNewPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const dbColors = await getCategoryColorsFromDB();
  const categoryOptions = Object.keys(dbColors).sort((a, b) => a.localeCompare(b, "ko"));

  return <NewReportForm categoryOptions={categoryOptions} />;
}
