import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import NewReportForm from "./NewReportForm";

export default async function ReportNewPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  return <NewReportForm />;
}
