import { notFound, redirect } from "next/navigation";
import { getReportFromDB, getCategoryColorsFromDB, getCompanySettings, resolveCompanyParam } from "@/lib/db";
import { getDesignFileSignedUrl } from "@/lib/design-storage";
import type { DesignFileMeta } from "@/lib/design-fields";
import { isAdmin } from "@/lib/admin";
import EditForm from "./EditForm";

interface Props {
  params: Promise<{ company: string; month: string }>;
}

export default async function ReportEditPage({ params }: Props) {
  const { company, month } = await params;

  const admin = await isAdmin();
  if (!admin) redirect('/admin/login');

  const decoded = await resolveCompanyParam(company);
  const [report, dbColors, settings] = await Promise.all([
    getReportFromDB(decoded, month),
    getCategoryColorsFromDB(),
    getCompanySettings(decoded),
  ]);
  const categoryOptions = Object.keys(dbColors).sort((a, b) => a.localeCompare(b, "ko"));

  if (!report) notFound();

  // 첨부파일 + 미리보기 signed URL (이미지 썸네일·PDF 인라인·다운로드에 공통 사용)
  const files = ((report.files as { files?: DesignFileMeta[] } | undefined)?.files) ?? [];
  const signed = await Promise.all(
    files.map(async (m) => [m.path, await getDesignFileSignedUrl(m.path)] as const),
  );
  const fileUrls: Record<string, string> = {};
  for (const [path, url] of signed) if (url) fileUrls[path] = url;

  return (
    <EditForm
      reportId={report.id}
      company={decoded}
      month={month}
      categoryOptions={categoryOptions}
      initialFiles={files}
      initialFileUrls={fileUrls}
      defaultValues={{
        company: report.company,
        month: report.month,
        reporter: report.reporter,
        email: report.email,
        password: report.password ?? '',
        hospital_type: report.hospital_type ?? '',
        region: settings?.region ?? '',
        categories: report.categories.map((c: { category: string; channel: string; agency: string; period: string; amount: string; sort_order?: number }) => ({ ...c, sort_order: String(c.sort_order ?? 0) })),
        validity: report.validity.map((v: { category: string; subject: string; expiryDate: string; sort_order?: number }) => ({ ...v, sort_order: String(v.sort_order ?? 0) })),
        contracts: report.contracts.map((ct: { category: string; name: string; keyword: string; link: string; sort_order?: number }) => ({ ...ct, sort_order: String(ct.sort_order ?? 0) })),
      }}
    />
  );
}
