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

/**
 * 병원 목록을 offset 기반으로 페이지 단위 조회한다. (무한 스크롤용)
 * Supabase `.range()` 는 양끝 포함이므로 offset ~ offset+limit-1 까지 가져온다.
 */
export async function getHospitalListPaged(offset: number, limit: number) {
  const { data } = await supabase
    .from("company_settings")
    .select("company, region")
    .order("company", { ascending: true })
    .range(offset, offset + limit - 1);
  const rows = (data ?? []) as { company: string; region: string | null }[];
  if (rows.length === 0) return [];
  const companies = rows.map((r) => r.company);

  // 1) 회사 단위 유형 (company_settings.hospital_type) — 컬럼이 없으면 에러→무시되고 보고서로 폴백
  const settingsTypeMap = new Map<string, string>();
  const { data: settingTypes } = await supabase
    .from("company_settings")
    .select("company, hospital_type")
    .in("company", companies);
  (settingTypes ?? []).forEach((s: { company: string; hospital_type?: string | null }) => {
    if (s.hospital_type) settingsTypeMap.set(s.company, s.hospital_type);
  });

  // 2) 보고서 기준 유형 (폴백) — reports.hospital_type 최신 보고서
  const reportTypeMap = new Map<string, string>();
  const { data: typeRows } = await supabase
    .from("reports")
    .select("company, hospital_type, month")
    .in("company", companies)
    .order("month", { ascending: false });
  (typeRows ?? []).forEach((t) => {
    if (t.hospital_type && !reportTypeMap.has(t.company)) {
      reportTypeMap.set(t.company, t.hospital_type);
    }
  });

  return rows.map((r) => ({
    company: r.company,
    region: r.region,
    hospitalType:
      settingsTypeMap.get(r.company) ?? reportTypeMap.get(r.company) ?? null,
  })) as { company: string; region: string | null; hospitalType: string | null }[];
}

/**
 * 병원 기본 정보(병원명 + 지역)를 등록/수정한다.
 * company 가 PK 이므로 onConflict 로 upsert. region 만 갱신하며 다른 컬럼은 건드리지 않는다.
 */
export async function upsertHospitalInfo(data: { company: string; region?: string | null }) {
  const { error } = await supabase
    .from("company_settings")
    .upsert(
      { company: data.company, region: data.region || null },
      { onConflict: "company" },
    );
  if (error) throw error;
}

export async function getCompanySettings(company: string) {
  const { data } = await supabase
    .from("company_settings")
    .select("*")
    .eq("company", company)
    .single();
  return data ?? null;
}

/**
 * 병원의 유형(카테고리). 회사 단위(company_settings.hospital_type) 우선,
 * 없으면 보고서(reports.hospital_type 최신) 기준으로 폴백.
 */
export async function getCompanyHospitalType(
  company: string,
): Promise<string | null> {
  const { data: s } = await supabase
    .from("company_settings")
    .select("hospital_type")
    .eq("company", company)
    .limit(1);
  const fromSettings = (s?.[0] as { hospital_type?: string | null } | undefined)
    ?.hospital_type;
  if (fromSettings) return fromSettings;

  const { data } = await supabase
    .from("reports")
    .select("hospital_type")
    .eq("company", company)
    .order("month", { ascending: false })
    .limit(1);
  return (data?.[0]?.hospital_type as string | undefined) ?? null;
}

/**
 * 병원 유형(카테고리)을 저장한다.
 * 회사 단위 컬럼(company_settings.hospital_type)에 저장하고,
 * 컬럼이 아직 없으면(에러) 해당 병원의 보고서(reports.hospital_type)로 폴백 저장한다.
 */
export async function updateCompanyHospitalType(
  company: string,
  hospitalType: string,
) {
  const { error } = await supabase
    .from("company_settings")
    .update({ hospital_type: hospitalType })
    .eq("company", company);
  if (!error) return;

  // company_settings.hospital_type 컬럼이 없을 때 폴백: 보고서 일괄 갱신
  const { error: e2 } = await supabase
    .from("reports")
    .update({ hospital_type: hospitalType })
    .eq("company", company);
  if (e2) throw e2;
}

/**
 * 전 병원의 알림톡 설정 수신번호를 한 번에 조회한다.
 * 회사명 → 비어있지 않은 recipient1~3 배열. (진료일정 허브의 번호 설정 상태 표시용)
 */
export async function getHolidayRecipients(): Promise<Map<string, string[]>> {
  const { data } = await supabase
    .from("company_settings")
    .select("company, recipient1, recipient2, recipient3");
  const map = new Map<string, string[]>();
  for (const r of data ?? []) {
    const nums = [r.recipient1, r.recipient2, r.recipient3]
      .map((n) => (typeof n === "string" ? n.trim() : ""))
      .filter(Boolean);
    if (nums.length > 0) map.set(r.company, nums);
  }
  return map;
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
  responded: number; // 응답한 날짜 수(공휴일+임의 휴무 전체)
  respondedDates: string[]; // 응답한 날짜 목록 (공휴일/임의 구분은 호출부에서 공휴일 교집합으로 계산)
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
      respondedDates: Array.from(respondedMap.get(company) ?? []),
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

export interface HolidaySendCompany {
  company: string;
  lastSentAt: string; // 가장 최근 발송 시각
  recipients: string[]; // 가장 최근 발송의 수신 번호
  status: "success" | "failed"; // 가장 최근 발송 결과
  sendCount: number; // 해당 월 총 발송 횟수
}

/**
 * 특정 월에 "진료일정 알림톡"을 발송한 회사 목록.
 * alimtalk_logs 는 보고서 알림톡과 공용 테이블이라, report_url 에 '/holiday/' 가
 * 포함된 건만 진료일정 발송으로 간주한다 (별도 type 컬럼 없이 구분).
 * 회사별로 가장 최근 발송 1건을 대표값으로, 총 발송 횟수를 함께 반환. 최근 발송순 정렬.
 */
export async function getHolidaySends(
  monthPrefix: string
): Promise<HolidaySendCompany[]> {
  const { data } = await supabase
    .from("alimtalk_logs")
    .select("company, recipients, status, sent_at, report_url")
    .eq("month", monthPrefix)
    .ilike("report_url", "%/holiday/%")
    .order("sent_at", { ascending: false });

  type Row = {
    company: string;
    recipients: string[] | null;
    status: "success" | "failed";
    sent_at: string;
  };

  const map = new Map<string, HolidaySendCompany>();
  for (const r of (data as Row[] | null) ?? []) {
    const existing = map.get(r.company);
    if (!existing) {
      // 최신순 정렬이라 첫 등장이 가장 최근 발송
      map.set(r.company, {
        company: r.company,
        lastSentAt: r.sent_at,
        recipients: r.recipients ?? [],
        status: r.status,
        sendCount: 1,
      });
    } else {
      existing.sendCount += 1;
    }
  }

  return Array.from(map.values());
}
