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

  // 지역 정보는 company_settings.region 에서 가져온다.
  // (컬럼이 아직 없으면 select 가 에러를 반환하므로 방어적으로 처리)
  const regionMap = new Map<string, string>();
  const { data: settings } = await supabase
    .from("company_settings")
    .select("company, region");
  if (settings) {
    for (const s of settings as { company: string; region: string | null }[]) {
      if (s.region) regionMap.set(s.company, s.region);
    }
  }

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
    .map(([company, data]) => ({ company, ...data, region: regionMap.get(company) ?? null }))
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
  region?: string;
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

  // 지역(region)은 회사 단위 속성이라 company_settings 에 저장한다.
  // region 컬럼이 아직 없어도 보고서 저장은 실패하지 않도록 에러를 삼킨다.
  if (data.region !== undefined) {
    const { error: regionErr } = await supabase
      .from("company_settings")
      .upsert(
        { company: data.company, region: data.region || null },
        { onConflict: "company" }
      );
    if (regionErr) {
      console.error(
        "region 저장 실패 (company_settings.region 컬럼을 확인하세요):",
        regionErr
      );
    }
  }

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
  dable_api_key?: string;
  dable_account?: string;
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

/** 회사의 월별 알림톡 발송 성공 횟수 (month → count) */
export async function getAlimtalkCountsByMonth(
  company: string
): Promise<Record<string, number>> {
  const { data } = await supabase
    .from("alimtalk_logs")
    .select("month")
    .eq("company", company)
    .eq("status", "success");
  const counts: Record<string, number> = {};
  for (const row of (data as { month: string }[] | null) ?? []) {
    if (row.month) counts[row.month] = (counts[row.month] ?? 0) + 1;
  }
  return counts;
}

export async function getDashboardRawDataFromDB() {
  const { data } = await supabase
    .from("reports")
    .select(`id, company, month, status, reporter, report_categories(category, amount), validity_items(category, subject, expiry_date)`)
    .order("month", { ascending: false });
  return data ?? [];
}

/**
 * 회사+월의 진료일정 배너 URL 조회.
 * holiday_banners 테이블이 아직 없으면 에러를 무시하고 null 반환.
 */
export async function getHolidayBannerUrl(
  company: string,
  month: string
): Promise<string | null> {
  const { data } = await supabase
    .from("holiday_banners")
    .select("banner_url")
    .eq("company", company)
    .eq("month", month)
    .maybeSingle();
  return (data?.banner_url as string | undefined) ?? null;
}

export interface HolidayScheduleRow {
  date: string;
  holiday_name: string;
  status: string; // open(정상) | closed(휴무) | morning(오전진료)
  short_start: string | null;
  short_end: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
  note: string | null;
}

/** 회사+월의 저장된 공휴일 진료여부 조회 (monthPrefix = 'YYYY-MM') */
export async function getHolidaySchedules(
  company: string,
  monthPrefix: string
): Promise<HolidayScheduleRow[]> {
  const { data } = await supabase
    .from("holiday_schedules")
    .select(
      "date, holiday_name, status, short_start, short_end, lunch_start, lunch_end, note"
    )
    .eq("company", company)
    .gte("date", `${monthPrefix}-01`)
    .lte("date", `${monthPrefix}-31`);
  return (data as HolidayScheduleRow[] | null) ?? [];
}

export interface HolidayScheduleSnapshotItem {
  date: string;
  holiday_name: string;
  status: string; // morning | open | closed
  short_start: string;
  short_end: string;
  lunch_start: string;
  lunch_end: string;
  noLunch: boolean;
}

export interface HolidaySubmissionRow {
  id: number;
  submitted_at: string;
  schedule: HolidayScheduleSnapshotItem[];
}

/** 회사+월의 원장 제출(등록/수정) 이력 — 오래된 순 */
export async function getHolidaySubmissions(
  company: string,
  monthPrefix: string
): Promise<HolidaySubmissionRow[]> {
  const { data } = await supabase
    .from("holiday_submissions")
    .select("id, submitted_at, schedule")
    .eq("company", company)
    .eq("month", monthPrefix)
    .order("submitted_at", { ascending: true });
  return (data as HolidaySubmissionRow[] | null) ?? [];
}

export interface HolidayReplyCompany {
  company: string;
  responded: number; // 응답한 공휴일 수
  lastSubmittedAt: string | null; // 최근 회신 시각
}

/**
 * 특정 월에 회신(진료일정 제출)한 회사 목록.
 * holiday_schedules(회사별 응답 공휴일 수) + holiday_submissions(최근 회신 시각)을 합산.
 * 최근 회신순 정렬.
 */
export async function getHolidayReplyCompanies(
  monthPrefix: string
): Promise<HolidayReplyCompany[]> {
  const [{ data: sched }, { data: subs }] = await Promise.all([
    supabase
      .from("holiday_schedules")
      .select("company, date")
      .gte("date", `${monthPrefix}-01`)
      .lte("date", `${monthPrefix}-31`),
    supabase
      .from("holiday_submissions")
      .select("company, submitted_at")
      .eq("month", monthPrefix)
      .order("submitted_at", { ascending: false }),
  ]);

  const respondedMap = new Map<string, Set<string>>();
  for (const r of (sched as { company: string; date: string }[] | null) ?? []) {
    if (!respondedMap.has(r.company)) respondedMap.set(r.company, new Set());
    respondedMap.get(r.company)!.add(r.date);
  }

  const lastMap = new Map<string, string>();
  for (const s of (subs as { company: string; submitted_at: string }[] | null) ??
    []) {
    if (!lastMap.has(s.company)) lastMap.set(s.company, s.submitted_at); // 최신순이라 first=최신
  }

  const companies = new Set<string>([
    ...respondedMap.keys(),
    ...lastMap.keys(),
  ]);

  return Array.from(companies)
    .map((company) => ({
      company,
      responded: respondedMap.get(company)?.size ?? 0,
      lastSubmittedAt: lastMap.get(company) ?? null,
    }))
    .sort((a, b) => {
      if (a.lastSubmittedAt && b.lastSubmittedAt)
        return b.lastSubmittedAt.localeCompare(a.lastSubmittedAt);
      if (a.lastSubmittedAt) return -1;
      if (b.lastSubmittedAt) return 1;
      return a.company.localeCompare(b.company, "ko");
    });
}
