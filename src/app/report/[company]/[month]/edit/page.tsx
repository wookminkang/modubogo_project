import { notFound, redirect } from "next/navigation";
import { getReportFromDB } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import EditForm from "./EditForm";

interface Props {
  params: Promise<{ company: string; month: string }>;
}

export default async function ReportEditPage({ params }: Props) {
  const { company, month } = await params;

  const admin = await isAdmin();
  if (!admin) redirect('/admin/login');

  const decoded = decodeURIComponent(company);
  const report = await getReportFromDB(decoded, month);

  if (!report) notFound();

  return (
    <EditForm
      reportId={report.id}
      company={decoded}
      month={month}
      defaultValues={{
        company: report.company,
        month: report.month,
        reporter: report.reporter,
        email: report.email,
        password: report.password ?? '',
        categories: report.categories.map((c: { category: string; channel: string; agency: string; period: string; amount: string; sort_order?: number }) => ({ ...c, sort_order: String(c.sort_order ?? 0) })),
        validity: report.validity.map((v: { category: string; subject: string; expiryDate: string; sort_order?: number }) => ({ ...v, sort_order: String(v.sort_order ?? 0) })),
        contracts: report.contracts.map((ct: { category: string; name: string; keyword: string; link: string; sort_order?: number }) => ({ ...ct, sort_order: String(ct.sort_order ?? 0) })),
      }}
    />
  );
}
