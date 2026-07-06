import { supabase } from "./supabase";
import { generateCompanyNanoid } from "./nanoid";

// ── 회사 URL 식별자(nanoid) ─────────────────────────────────
// URL 단축용. company_settings.nanoid 컬럼이 없으면 모든 함수가 무해하게
// null/0 을 반환하므로(폴백) 컬럼 추가 전에도 앱이 깨지지 않는다.

/** nanoid → 회사명 (없으면 null). 라우트에서 파라미터 해석에 사용. */
export async function getCompanyByNanoid(id: string): Promise<string | null> {
  const { data } = await supabase
    .from("company_settings")
    .select("company")
    .eq("nanoid", id)
    .limit(1);
  return (data?.[0]?.company as string | undefined) ?? null;
}

/** URL 파라미터(nanoid 또는 회사명) → 회사명. 라우트 페이지에서 사용. */
export async function resolveCompanyParam(param: string): Promise<string> {
  const raw = decodeURIComponent(param);
  const byNanoid = await getCompanyByNanoid(raw);
  return byNanoid ?? raw; // nanoid 매칭되면 회사명, 아니면 그대로(이름 URL 폴백)
}

/** 회사명 → nanoid. 없으면 생성해 저장(컬럼 없으면 null). 링크 생성에 사용. */
export async function ensureCompanyNanoid(
  company: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("company_settings")
    .select("nanoid")
    .eq("company", company)
    .limit(1);
  if (error) return null; // 컬럼 미존재 등
  const existing = (data?.[0] as { nanoid?: string | null } | undefined)?.nanoid;
  if (existing) return existing;

  const id = generateCompanyNanoid();
  const { error: e2 } = await supabase
    .from("company_settings")
    .update({ nanoid: id })
    .eq("company", company);
  return e2 ? null : id;
}

/** nanoid 없는 기존 회사 전부에 nanoid 발급 (백필). 처리한 개수 반환. */
export async function backfillCompanyNanoids(): Promise<number> {
  const { data, error } = await supabase
    .from("company_settings")
    .select("company, nanoid");
  if (error || !data) return 0;
  let count = 0;
  for (const row of data as { company: string; nanoid: string | null }[]) {
    if (row.nanoid) continue;
    const { error: e } = await supabase
      .from("company_settings")
      .update({ nanoid: generateCompanyNanoid() })
      .eq("company", row.company);
    if (!e) count++;
  }
  return count;
}

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
  const nanoidMap = new Map<string, string>();
  const { data: settings } = await supabase
    .from("company_settings")
    .select("company, region, nanoid");
  if (settings) {
    for (const s of settings as {
      company: string;
      region: string | null;
      nanoid: string | null;
    }[]) {
      if (s.region) regionMap.set(s.company, s.region);
      if (s.nanoid) nanoidMap.set(s.company, s.nanoid);
    }
  }

  // 회사 단위 유형(company_settings.hospital_type) — 탈퇴 등 판별에 우선 사용.
  // 컬럼이 없으면 select 가 에러(→null)라 별도 조회로 두어 region/nanoid 조회에 영향 없게 한다.
  const typeMap = new Map<string, string>();
  const { data: typeSettings } = await supabase
    .from("company_settings")
    .select("company, hospital_type");
  for (const s of (typeSettings ?? []) as {
    company: string;
    hospital_type: string | null;
  }[]) {
    if (s.hospital_type) typeMap.set(s.company, s.hospital_type);
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
    .map(([company, data]) => ({
      company,
      ...data,
      region: regionMap.get(company) ?? null,
      nanoid: nanoidMap.get(company) ?? null,
      // 회사 단위 유형 우선, 없으면 보고서 기준(reports.hospital_type)
      hospitalType: typeMap.get(company) ?? data.hospitalType,
    }))
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
    .select("company, region, nanoid")
    .order("company", { ascending: true })
    .range(offset, offset + limit - 1);
  const rows = (data ?? []) as {
    company: string;
    region: string | null;
    nanoid: string | null;
  }[];
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
    nanoid: r.nanoid,
    hospitalType:
      settingsTypeMap.get(r.company) ?? reportTypeMap.get(r.company) ?? null,
  })) as {
    company: string;
    region: string | null;
    nanoid: string | null;
    hospitalType: string | null;
  }[];
}

// ── 병원 운영 메모(히스토리) ─────────────────────────────────
// hospital_notes 테이블이 없으면 조회는 빈 배열을 반환(폴백)하므로
// 테이블 생성 전에도 앱이 깨지지 않는다. 쓰기는 에러를 그대로 던진다.

export interface HospitalNote {
  id: number;
  company: string;
  content: string;
  author: string | null;
  created_at: string;
}

const NOTE_COLS = "id, company, content, author, created_at";

/** 병원 운영 메모 목록 (최신순). 테이블 없으면 빈 배열. */
export async function getHospitalNotes(company: string): Promise<HospitalNote[]> {
  const { data, error } = await supabase
    .from("hospital_notes")
    .select(NOTE_COLS)
    .eq("company", company)
    .order("created_at", { ascending: false });
  if (error) return []; // 테이블 미생성 등
  return (data ?? []) as HospitalNote[];
}

/** 메모 추가. 생성된 행을 반환한다. */
export async function addHospitalNote(
  company: string,
  content: string,
  author?: string | null,
): Promise<HospitalNote> {
  const { data, error } = await supabase
    .from("hospital_notes")
    .insert({ company, content, author: author ?? null })
    .select(NOTE_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as HospitalNote;
}

/** 메모 삭제. */
export async function deleteHospitalNote(id: number): Promise<void> {
  const { error } = await supabase.from("hospital_notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
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

// ── 신규 광고주 준비자료 제출 폼 (intake_submissions) ──────────────
// (generateCompanyNanoid 는 파일 상단에서 이미 import)
import type { IntakeFiles } from "./intake-fields";

export interface IntakeSubmission {
  id: string;
  nanoid: string;
  company: string | null;
  status: "pending" | "submitted";
  billing_email: string | null;
  medical_staff: string | null;
  inpatient_rooms: string | null;
  equipment_list: string | null;
  strengths: string | null;
  required_text: string | null;
  files: IntakeFiles;
  created_at: string;
  submitted_at: string | null;
}

/** 텍스트(서술형) 항목만 모은 입력 페이로드 */
export type IntakeTextPayload = Pick<
  IntakeSubmission,
  | "billing_email"
  | "medical_staff"
  | "inpatient_rooms"
  | "equipment_list"
  | "strengths"
  | "required_text"
>;

/** 신규 준비자료 폼 생성. nanoid 발급 후 pending 행 삽입. */
export async function createIntake(company?: string): Promise<IntakeSubmission> {
  const nanoid = generateCompanyNanoid();
  const { data, error } = await supabase
    .from("intake_submissions")
    .insert({ nanoid, company: company?.trim() || null, status: "pending" })
    .select()
    .single();
  if (error) throw new Error(`준비자료 폼 생성 실패: ${error.message}`);
  return data as IntakeSubmission;
}

/** 공개 링크(nanoid) → 제출 행. 없으면 null. */
export async function getIntakeByNanoid(
  nanoid: string,
): Promise<IntakeSubmission | null> {
  const { data } = await supabase
    .from("intake_submissions")
    .select("*")
    .eq("nanoid", nanoid)
    .limit(1)
    .maybeSingle();
  return (data as IntakeSubmission | null) ?? null;
}

/** 관리자 목록 — 최신순 */
export async function listIntakes(): Promise<IntakeSubmission[]> {
  const { data, error } = await supabase
    .from("intake_submissions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data as IntakeSubmission[] | null) ?? [];
}

/** 광고주 제출 저장 — 텍스트 + 파일 메타 반영, status=submitted */
export async function saveIntakeSubmission(
  nanoid: string,
  payload: {
    company: string | null;
    text: IntakeTextPayload;
    files: IntakeFiles;
  },
): Promise<void> {
  const { error } = await supabase
    .from("intake_submissions")
    .update({
      company: payload.company,
      ...payload.text,
      files: payload.files,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("nanoid", nanoid);
  if (error) throw new Error(`제출 저장 실패: ${error.message}`);
}

/** 폼 삭제 (행만 제거 — 파일 정리는 호출부에서 deleteIntakeFiles 로) */
export async function deleteIntake(nanoid: string): Promise<void> {
  const { error } = await supabase
    .from("intake_submissions")
    .delete()
    .eq("nanoid", nanoid);
  if (error) throw new Error(`삭제 실패: ${error.message}`);
}

// ── 입금·소진 관리내역 (ledger_entries) ─────────────────────────
// ledger_entries 테이블이 없으면 조회는 빈 배열([])을 반환(폴백)하므로
// 테이블 생성(sql/ledger_entries.sql) 전에도 앱이 깨지지 않는다. 쓰기는 에러를 던진다.

export interface LedgerEntry {
  id: string;
  company: string;
  deposit_date: string | null; // 'YYYY-MM-DD'
  vendor: string;
  deposit_amount: number | null;
  spend_amount: number | null;
  contract_note: string;
  sort_order: number;
}

/** 입력용(신규 저장) 행. id 없이 내용만. */
export type LedgerEntryInput = Omit<LedgerEntry, "id" | "company">;

const LEDGER_COLS =
  "id, company, deposit_date, vendor, deposit_amount, spend_amount, contract_note, sort_order";

/** 회사의 입금·소진 거래내역 (정렬순). 테이블 없으면 빈 배열. */
export async function getLedgerEntries(
  company: string,
): Promise<LedgerEntry[]> {
  const { data, error } = await supabase
    .from("ledger_entries")
    .select(LEDGER_COLS)
    .eq("company", company)
    .order("sort_order", { ascending: true });
  if (error) return []; // 테이블 미생성 등
  return (data ?? []) as LedgerEntry[];
}

/**
 * 회사의 거래내역을 전량 교체 저장한다(보고서 자식 테이블과 동일한 delete→insert 방식).
 * 빈 배열이면 전부 삭제만 수행한다.
 */
export async function replaceLedgerEntries(
  company: string,
  entries: LedgerEntryInput[],
): Promise<void> {
  const { error: delErr } = await supabase
    .from("ledger_entries")
    .delete()
    .eq("company", company);
  if (delErr) throw new Error(`거래내역 저장 실패: ${delErr.message}`);

  if (entries.length === 0) return;

  const rows = entries.map((e, i) => ({
    company,
    deposit_date: e.deposit_date || null,
    vendor: e.vendor ?? "",
    deposit_amount: e.deposit_amount ?? null,
    spend_amount: e.spend_amount ?? null,
    contract_note: e.contract_note ?? "",
    sort_order: Number(e.sort_order) || i,
  }));

  const { error: insErr } = await supabase.from("ledger_entries").insert(rows);
  if (insErr) throw new Error(`거래내역 저장 실패: ${insErr.message}`);
}
