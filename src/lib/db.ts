import { supabase } from "./supabase";

type RawCategory = { category: string; channel: string; agency: string; period: string; amount: string; sort_order: number };
type RawValidity = { category: string; subject: string; expiry_date: string; sort_order: number };
type RawContract = { category: string; name: string; keyword: string; link: string; sort_order: number };

function mapCategory(c: RawCategory) {
  return { category: c.category, channel: c.channel, agency: c.agency, period: c.period, amount: c.amount, sort_order: c.sort_order ?? 0 };
}
function mapValidity(v: RawValidity) {
  return { category: v.category, subject: v.subject, expiryDate: v.expiry_date, sort_order: v.sort_order ?? 0 };
}
function mapContract(ct: RawContract) {
  return { category: ct.category, name: ct.name, keyword: ct.keyword, link: ct.link, sort_order: ct.sort_order ?? 0 };
}
function byOrder<T extends { sort_order: number }>(a: T, b: T) {
  return a.sort_order - b.sort_order;
}

export async function getReportFromDB(company: string, month: string) {
  const { data: report } = await supabase
    .from("reports")
    .select(`*, report_categories(*), validity_items(*), contract_items(*)`)
    .eq("company", company)
    .eq("month", month)
    .single();

  if (!report) return null;

  return {
    ...report,
    categories: (report.report_categories ?? []).map(mapCategory).sort(byOrder),
    validity: (report.validity_items ?? []).map(mapValidity).sort(byOrder),
    contracts: (report.contract_items ?? []).map(mapContract).sort(byOrder),
  };
}

export async function getReportsByCompanyFromDB(company: string) {
  const { data: reports } = await supabase
    .from("reports")
    .select(`*, report_categories(*), validity_items(*), contract_items(*)`)
    .eq("company", company)
    .order("month", { ascending: false });

  if (!reports) return [];

  return reports.map((report) => ({
    ...report,
    categories: (report.report_categories ?? []).map(mapCategory).sort(byOrder),
    validity: (report.validity_items ?? []).map(mapValidity).sort(byOrder),
    contracts: (report.contract_items ?? []).map(mapContract).sort(byOrder),
  }));
}

export async function getCompaniesSummaryFromDB() {
  const { data: reports } = await supabase
    .from("reports")
    .select("company, month, status, hospital_type")
    .order("month", { ascending: false });

  if (!reports) return [];

  const map = new Map<string, { latestMonth: string; reportCount: number; status: string; hospitalType: string | null }>();
  for (const r of reports) {
    const existing = map.get(r.company);
    if (!existing || r.month > existing.latestMonth) {
      map.set(r.company, {
        latestMonth: r.month,
        reportCount: (existing?.reportCount ?? 0) + 1,
        status: r.status,
        hospitalType: r.hospital_type ?? null,
      });
    } else {
      existing.reportCount += 1;
    }
  }
  return Array.from(map.entries())
    .map(([company, data]) => ({ company, ...data }))
    .sort((a, b) => a.company.localeCompare(b.company, "ko"));
}

export async function upsertReport(data: {
  id?: number;
  company: string;
  month: string;
  status: string;
  reporter: string;
  email: string;
  password?: string;
  hospital_type?: string;
  categories: { category: string; channel: string; agency: string; period: string; amount: string; sort_order: string }[];
  validity: { category: string; subject: string; expiryDate: string; sort_order: string }[];
  contracts: { category: string; name: string; keyword: string; link: string; sort_order: string }[];
}) {
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
        password: data.password || null,
        hospital_type: data.hospital_type || null,
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error || !report) throw error;

  const reportId = report.id;

  await Promise.all([
    supabase.from("report_categories").delete().eq("report_id", reportId),
    supabase.from("validity_items").delete().eq("report_id", reportId),
    supabase.from("contract_items").delete().eq("report_id", reportId),
  ]);

  await Promise.all([
    supabase.from("report_categories").insert(
      data.categories.map((c) => ({
        report_id: reportId,
        category: c.category,
        channel: c.channel,
        agency: c.agency,
        period: c.period,
        amount: c.amount,
        sort_order: Number(c.sort_order) || 0,
      }))
    ),
    supabase.from("validity_items").insert(
      data.validity.map((v) => ({
        report_id: reportId,
        category: v.category,
        subject: v.subject,
        expiry_date: v.expiryDate,
        sort_order: Number(v.sort_order) || 0,
      }))
    ),
    supabase.from("contract_items").insert(
      data.contracts.map((ct) => ({
        report_id: reportId,
        category: ct.category,
        name: ct.name,
        keyword: ct.keyword,
        link: ct.link,
        sort_order: Number(ct.sort_order) || 0,
      }))
    ),
  ]);

  return report;
}

export async function getHospitalList() {
  const { data } = await supabase
    .from("company_settings")
    .select("company")
    .order("company", { ascending: true });
  return (data ?? []) as { company: string }[];
}

export async function getCompanySettings(company: string) {
  const { data } = await supabase
    .from("company_settings")
    .select("*")
    .eq("company", company)
    .single();
  return data ?? null;
}

export async function upsertCompanySettings(data: {
  company: string;
  naver_ad_api_key?: string;
  naver_ad_secret_key?: string;
  naver_ad_customer_id?: string;
  recipient1?: string;
  recipient2?: string;
  recipient3?: string;
}) {
  const { error } = await supabase
    .from("company_settings")
    .upsert(data, { onConflict: "company" });
  if (error) throw error;
}

export async function deleteReport(id: number) {
  const { error } = await supabase.from("reports").delete().eq("id", id);
  if (error) throw error;
}

export async function logAlimtalk(data: {
  company: string;
  month: string;
  recipients: string[];
  status: "success" | "failed";
  error_message?: string;
  report_url?: string;
}) {
  await supabase.from("alimtalk_logs").insert(data);
}

export async function getCategoryColorsFromDB(): Promise<Record<string, { bgHex: string; textHex: string }>> {
  const { data } = await supabase.from("category_colors").select("*");
  if (!data || data.length === 0) return {};
  return Object.fromEntries(data.map((d) => [d.category, { bgHex: d.bg_hex, textHex: d.text_hex }]));
}

export async function upsertCategoryColor(category: string, bgHex: string, textHex: string) {
  const { error } = await supabase
    .from("category_colors")
    .upsert({ category, bg_hex: bgHex, text_hex: textHex }, { onConflict: "category" });
  if (error) throw error;
}

export async function getAlimtalkLogs() {
  const { data } = await supabase
    .from("alimtalk_logs")
    .select("*")
    .order("sent_at", { ascending: false });
  return data ?? [];
}

export async function getDashboardRawDataFromDB() {
  const { data } = await supabase
    .from("reports")
    .select(`id, company, month, status, reporter, report_categories(category, amount), validity_items(category, subject, expiry_date)`)
    .order("month", { ascending: false });
  return data ?? [];
}
