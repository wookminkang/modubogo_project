import { notFound } from "next/navigation";
import { getReportFromDB } from "@/lib/db";
import EditForm from "./EditForm";

interface Props {
  params: Promise<{ company: string; month: string }>;
}

export default async function ReportEditPage({ params }: Props) {
  const { company, month } = await params;
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
        categories: report.categories,
        validity: report.validity,
        contracts: report.contracts,
      }}
    />
  );
}
