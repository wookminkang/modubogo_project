import { supabase } from "./supabase";

export async function getReportFromDB(company: string, month: string) {
  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("company", company)
    .eq("month", month)
    .single();

  if (!report) return null;

  const [{ data: categories }, { data: validity }, { data: contracts }] =
    await Promise.all([
      supabase.from("report_categories").select("*").eq("report_id", report.id),
      supabase.from("validity_items").select("*").eq("report_id", report.id),
      supabase.from("contract_items").select("*").eq("report_id", report.id),
    ]);

  return {
    ...report,
    categories: (categories ?? []).map((c) => ({
      category: c.category,
      channel: c.channel,
      agency: c.agency,
      period: c.period,
      amount: c.amount,
    })),
    validity: (validity ?? []).map((v) => ({
      category: v.category,
      subject: v.subject,
      expiryDate: v.expiry_date,
    })),
    contracts: (contracts ?? []).map((ct) => ({
      category: ct.category,
      name: ct.name,
      keyword: ct.keyword,
      link: ct.link,
    })),
  };
}

export async function getReportsByCompanyFromDB(company: string) {
  const { data: reports } = await supabase
    .from("reports")
    .select("*")
    .eq("company", company)
    .order("month", { ascending: false });

  if (!reports) return [];

  const results = await Promise.all(
    reports.map(async (report) => {
      const [{ data: categories }, { data: validity }, { data: contracts }] =
        await Promise.all([
          supabase.from("report_categories").select("*").eq("report_id", report.id),
          supabase.from("validity_items").select("*").eq("report_id", report.id),
          supabase.from("contract_items").select("*").eq("report_id", report.id),
        ]);

      return {
        ...report,
        categories: (categories ?? []).map((c) => ({
          category: c.category,
          channel: c.channel,
          agency: c.agency,
          period: c.period,
          amount: c.amount,
        })),
        validity: (validity ?? []).map((v) => ({
          category: v.category,
          subject: v.subject,
          expiryDate: v.expiry_date,
        })),
        contracts: (contracts ?? []).map((ct) => ({
          category: ct.category,
          name: ct.name,
          keyword: ct.keyword,
          link: ct.link,
        })),
      };
    })
  );

  return results;
}

export async function getCompaniesSummaryFromDB() {
  const { data: reports } = await supabase
    .from("reports")
    .select("company, month, status")
    .order("month", { ascending: false });

  if (!reports) return [];

  const map = new Map<string, { latestMonth: string; reportCount: number; status: string }>();
  for (const r of reports) {
    const existing = map.get(r.company);
    if (!existing || r.month > existing.latestMonth) {
      map.set(r.company, {
        latestMonth: r.month,
        reportCount: (existing?.reportCount ?? 0) + 1,
        status: r.status,
      });
    } else {
      existing.reportCount += 1;
    }
  }
  return Array.from(map.entries()).map(([company, data]) => ({ company, ...data }));
}

export async function upsertReport(data: {
  id?: number;
  company: string;
  month: string;
  status: string;
  reporter: string;
  email: string;
  categories: { category: string; channel: string; agency: string; period: string; amount: string }[];
  validity: { category: string; subject: string; expiryDate: string }[];
  contracts: { category: string; name: string; keyword: string; link: string }[];
}) {
  // 보고서 upsert
  const { data: report, error } = await supabase
    .from("reports")
    .upsert(
      {
        ...(data.id ? { id: data.id } : {}),
        company: data.company,
        month: data.month,
        status: data.status,
        reporter: data.reporter,
        email: data.email,
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error || !report) throw error;

  const reportId = report.id;

  // 기존 하위 데이터 삭제 후 재삽입
  await Promise.all([
    supabase.from("report_categories").delete().eq("report_id", reportId),
    supabase.from("validity_items").delete().eq("report_id", reportId),
    supabase.from("contract_items").delete().eq("report_id", reportId),
  ]);

  await Promise.all([
    supabase.from("report_categories").insert(
      data.categories.map((c) => ({ report_id: reportId, ...c }))
    ),
    supabase.from("validity_items").insert(
      data.validity.map((v) => ({
        report_id: reportId,
        category: v.category,
        subject: v.subject,
        expiry_date: v.expiryDate,
      }))
    ),
    supabase.from("contract_items").insert(
      data.contracts.map((ct) => ({ report_id: reportId, ...ct }))
    ),
  ]);

  return report;
}

export async function deleteReport(id: number) {
  const { error } = await supabase.from("reports").delete().eq("id", id);
  if (error) throw error;
}
