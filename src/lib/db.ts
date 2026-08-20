import { supabase } from "./supabase";
import { generateCompanyNanoid } from "./nanoid";
import { pad } from "./utils";

/**
 * 'YYYY-MM' → 다음 달 1일 'YYYY-MM-DD'.
 * 월별 date 범위 조회의 상한(미만 비교)용 — `${month}-31` 같은 하드코딩은
 * 30일까지인 달에서 "date out of range" 에러를 내므로 쓰지 않는다.
 */
export function nextMonthStart(monthPrefix: string): string {
  const [y, m] = monthPrefix.split("-").map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`;
}

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
 * 전 병원 경량 목록(개수 집계용) — 회사명/지역/유형만.
 * 유형은 회사 단위(company_settings.hospital_type) 우선, 없으면 보고서 최신 기준으로 폴백한다
 * (getHospitalListPaged 와 동일 규칙 → 목록 탭 필터와 개수가 일치).
 */
export async function getAllHospitalsLite(): Promise<
  { company: string; region: string | null; hospitalType: string | null }[]
> {
  const { data } = await supabase
    .from("company_settings")
    .select("company, region")
    .order("company", { ascending: true });
  const rows = (data ?? []) as { company: string; region: string | null }[];
  if (rows.length === 0) return [];
  const companies = rows.map((r) => r.company);

  // 회사 단위 유형 (컬럼 없으면 에러→무시되고 보고서로 폴백)
  const settingsType = new Map<string, string>();
  const { data: st } = await supabase
    .from("company_settings")
    .select("company, hospital_type")
    .in("company", companies);
  for (const s of (st ?? []) as { company: string; hospital_type?: string | null }[]) {
    if (s.hospital_type) settingsType.set(s.company, s.hospital_type);
  }

  // 보고서 기준 유형 (폴백)
  const reportType = new Map<string, string>();
  const { data: rt } = await supabase
    .from("reports")
    .select("company, hospital_type, month")
    .in("company", companies)
    .order("month", { ascending: false });
  for (const t of (rt ?? []) as {
    company: string;
    hospital_type: string | null;
    month: string;
  }[]) {
    if (t.hospital_type && !reportType.has(t.company)) {
      reportType.set(t.company, t.hospital_type);
    }
  }

  return rows.map((r) => ({
    company: r.company,
    region: r.region,
    hospitalType: settingsType.get(r.company) ?? reportType.get(r.company) ?? null,
  }));
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

// ── 네이버 플레이스 리뷰 히스토리 ────────────────────────────
// naver_review_history 테이블은 외부 크론이 매일 아침 플레이스 리뷰 수를
// 스냅샷으로 적재한다. 연결 키는 회사명(name == company_settings.company).
// 테이블이 없거나 적재 전이면 빈 배열을 반환(폴백)한다.

export interface NaverReviewSnapshot {
  captured_date: string; // "YYYY-MM-DD"
  visitor_reviews: number;
  blog_reviews: number;
}

// 네이버 리뷰 기능(버튼·페이지)의 노출 여부는 **스냅샷 데이터 유무**로 판단한다.
// (예전엔 병원명 하드코딩 Set 이었는데, 상호명을 바꾸면 기능이 조용히 사라졌다)

/** 회사명 기준 네이버 리뷰 일자별 스냅샷 (최신순). 없으면 빈 배열. */
export async function getNaverReviewHistory(
  company: string,
): Promise<NaverReviewSnapshot[]> {
  const { data, error } = await supabase
    .from("naver_review_history")
    .select("captured_date, visitor_reviews, blog_reviews")
    .eq("name", company)
    .order("captured_date", { ascending: false });
  if (error) return []; // 테이블 미생성 등
  return (data ?? []) as NaverReviewSnapshot[];
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
 * 병원 상호명 변경 — company 를 키로 쓰는 모든 테이블을 함께 갱신한다.
 *
 * company_settings.company 는 PK 이면서 reports·ledger_entries 등에 텍스트로 복사돼
 * 있는 느슨한 키(FK 아님)라, 중간에 실패하면 한 병원의 데이터가 두 이름으로 쪼개진다.
 * supabase-js 로는 여러 update 를 한 트랜잭션에 묶을 수 없어 Postgres 함수에 위임한다.
 * (SQL: sql/rename_company.sql — 미실행 시 아래 안내 메시지로 실패)
 *
 * nanoid 는 그대로 두므로 nanoid 기반 공유 링크(/report/{nanoid} 등)는 계속 살아있다.
 * 반면 **이름 기반 URL 은 끊긴다** (/report/{옛상호명}).
 */
export async function renameCompany(from: string, to: string): Promise<void> {
  const { error } = await supabase.rpc("rename_company", {
    old_name: from,
    new_name: to,
  });
  if (!error) return;

  // 함수 자체가 없는 경우(마이그레이션 미실행)를 구분해 안내한다.
  const missing =
    error.code === "PGRST202" || /function .*rename_company/i.test(error.message);
  throw new Error(
    missing
      ? "상호명 변경 준비가 필요해요. Supabase 에서 sql/rename_company.sql 을 실행해주세요."
      : `상호명 변경 실패: ${error.message}`,
  );
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
 * 회사명 → 비어있지 않은 recipient1~5 배열. (진료일정 허브의 번호 설정 상태 표시용)
 */
export async function getHolidayRecipients(): Promise<Map<string, string[]>> {
  // select("*") 로 조회해 recipient4/5 컬럼이 아직 없어도(SQL 미실행) 안전하게 폴백.
  const { data } = await supabase.from("company_settings").select("*");
  const map = new Map<string, string[]>();
  for (const r of data ?? []) {
    const nums = [
      r.recipient1,
      r.recipient2,
      r.recipient3,
      r.recipient4,
      r.recipient5,
    ]
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
  recipient4?: string;
  recipient5?: string;
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

// ── 보고서 첨부파일 (reports.files jsonb) ───────────────────────
// 컬럼(files)이 없으면 조회는 빈 값으로 폴백(SQL: sql/report_files.sql).

/** 보고서의 첨부 메타 조회. 컬럼/행 없으면 {files:[]}. */
export async function getReportFilesById(
  reportId: number | string,
): Promise<DesignFiles> {
  const { data, error } = await supabase
    .from("reports")
    .select("files")
    .eq("id", reportId)
    .single();
  if (error || !data) return {};
  return ((data as { files?: DesignFiles }).files ?? {}) as DesignFiles;
}

/** 보고서 첨부 메타 저장(파일 실체는 Storage). */
export async function updateReportFiles(
  reportId: number | string,
  files: DesignFiles,
): Promise<void> {
  const { error } = await supabase
    .from("reports")
    .update({ files })
    .eq("id", reportId);
  if (error) throw new Error(`첨부 저장 실패: ${error.message}`);
}

/** 입금·소진(ledger) 광고 배너 설정 — 회사 단위. */
export interface LedgerAdSettings {
  enabled: boolean;
  url: string;
}

/**
 * 광고 배너 설정 조회. 컬럼(ledger_ad_enabled/ledger_ad_url)이 없거나 행이 없으면
 * 무해하게 기본값(미노출)으로 폴백한다. (SQL: sql/ledger_ad.sql)
 */
export async function getLedgerAdSettings(
  company: string,
): Promise<LedgerAdSettings> {
  const { data, error } = await supabase
    .from("company_settings")
    .select("ledger_ad_enabled, ledger_ad_url")
    .eq("company", company)
    .single();
  if (error || !data) return { enabled: false, url: "" };
  const row = data as { ledger_ad_enabled?: boolean; ledger_ad_url?: string };
  return { enabled: !!row.ledger_ad_enabled, url: row.ledger_ad_url ?? "" };
}

/** 광고 배너 설정 저장(회사 단위 upsert). 컬럼이 없으면 에러를 던진다(SQL 미실행). */
export async function updateLedgerAdSettings(
  company: string,
  settings: LedgerAdSettings,
): Promise<void> {
  const { error } = await supabase.from("company_settings").upsert(
    {
      company,
      ledger_ad_enabled: settings.enabled,
      ledger_ad_url: settings.url || null,
    },
    { onConflict: "company" },
  );
  if (error) throw error;
}

/**
 * 병원(회사)과 연관된 모든 데이터를 삭제한다.
 * 보고서 자식(카테고리/심의/계약) → 보고서 → 회사 단위 테이블 → company_settings 순.
 * 회사 단위 테이블 일부는 없을 수 있으므로 best-effort(에러 무시)로 처리하고,
 * 핵심 레코드(company_settings) 삭제 실패만 에러로 던진다.
 */
export async function deleteHospitalCompletely(company: string): Promise<void> {
  // 1) 보고서 id → 자식 테이블 삭제
  const { data: reps } = await supabase
    .from("reports")
    .select("id")
    .eq("company", company);
  const reportIds = (reps ?? []).map((r) => r.id);
  if (reportIds.length > 0) {
    await Promise.all([
      supabase.from("report_categories").delete().in("report_id", reportIds),
      supabase.from("validity_items").delete().in("report_id", reportIds),
      supabase.from("contract_items").delete().in("report_id", reportIds),
    ]);
  }

  // 2) 회사 단위 테이블 (테이블/컬럼이 없으면 무시)
  await supabase.from("reports").delete().eq("company", company);
  for (const t of [
    "alimtalk_logs",
    "holiday_schedules",
    "holiday_submissions",
    "ledger_entries",
    "hospital_notes",
  ]) {
    await supabase.from(t).delete().eq("company", company);
  }

  // 3) 핵심 레코드
  const { error } = await supabase
    .from("company_settings")
    .delete()
    .eq("company", company);
  if (error) throw new Error(`병원 삭제 실패: ${error.message}`);
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
  // alimtalk_logs 는 보고서/진료일정/입금소진 알림톡 공용 테이블이므로,
  // 보고서 목록의 발송 횟수는 report_url 에 '/report/' 가 포함된 '보고서 알림톡'만 센다.
  // (진료일정 '/holiday/', 입금소진 '/ledger/' 발송이 섞여 잘못 집계되는 것 방지)
  const { data } = await supabase
    .from("alimtalk_logs")
    .select("month")
    .eq("company", company)
    .eq("status", "success")
    .ilike("report_url", "%/report/%");
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
    .lt("date", nextMonthStart(monthPrefix));
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
      .lt("date", nextMonthStart(monthPrefix)),
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
 * 입금·소진 내역이 1건이라도 입력된 회사 목록.
 * /ledger 허브에서 내역이 설정된 병원만 노출할 때 사용한다.
 */
export async function getLedgerCompanies(): Promise<string[]> {
  const { data, error } = await supabase.from("ledger_entries").select("company");
  if (error) return []; // 테이블 미생성 등
  return [...new Set((data ?? []).map((d) => (d as { company: string }).company))];
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

// ── 직원 업무일지 (work_logs) ────────────────────────────────────
// 직원당 하루 1건, 자유 텍스트. employees(비밀번호 보유)와 달리 비밀정보가
// 없어 anon 클라이언트(supabase)로 접근한다. 테이블 없으면 조회는 폴백.

export interface WorkLog {
  id: string;
  employee_id: string;
  log_date: string; // 'YYYY-MM-DD'
  content: string;
  updated_at: string;
}

/** 특정 직원의 특정 날짜 업무일지 (없으면 null). */
export async function getWorkLogForDate(
  employeeId: string,
  logDate: string,
): Promise<WorkLog | null> {
  const { data, error } = await supabase
    .from("work_logs")
    .select("id, employee_id, log_date, content, updated_at")
    .eq("employee_id", employeeId)
    .eq("log_date", logDate)
    .maybeSingle();
  if (error || !data) return null;
  return data as WorkLog;
}

/** 특정 직원의 특정 월 업무일지 (해당 월 전체, 날짜순). 테이블 없으면 빈 배열. */
export async function getWorkLogsForMonth(
  employeeId: string,
  month: string, // 'YYYY-MM'
): Promise<WorkLog[]> {
  const start = `${month}-01`;
  const end = new Date(
    new Date(`${start}T00:00:00Z`).setUTCMonth(
      new Date(`${start}T00:00:00Z`).getUTCMonth() + 1,
    ),
  )
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabase
    .from("work_logs")
    .select("id, employee_id, log_date, content, updated_at")
    .eq("employee_id", employeeId)
    .gte("log_date", start)
    .lt("log_date", end)
    .order("log_date", { ascending: true });
  if (error) return [];
  return (data ?? []) as WorkLog[];
}

/**
 * [관리자] 전체 직원 업무일지 (필터: 직원/월). 최신순, 테이블 없으면 빈 배열.
 * employees 는 RLS 로 anon 키 접근이 막혀있어 여기서 join 하지 않는다 — 호출부에서
 * employee.ts 의 listEmployees()(service-role) 결과와 employee_id 로 매칭해 이름을 붙일 것.
 */
export async function getAllWorkLogsForAdmin(filters?: {
  employeeId?: string;
  month?: string; // 'YYYY-MM'
}): Promise<WorkLog[]> {
  let query = supabase
    .from("work_logs")
    .select("id, employee_id, log_date, content, updated_at")
    .order("log_date", { ascending: false });

  if (filters?.employeeId) query = query.eq("employee_id", filters.employeeId);
  if (filters?.month) {
    const start = `${filters.month}-01`;
    const end = new Date(
      new Date(`${start}T00:00:00Z`).setUTCMonth(
        new Date(`${start}T00:00:00Z`).getUTCMonth() + 1,
      ),
    )
      .toISOString()
      .slice(0, 10);
    query = query.gte("log_date", start).lt("log_date", end);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as WorkLog[];
}

/** 직원 본인 업무일지 upsert (employee_id, log_date 유니크). */
export async function upsertWorkLog(
  employeeId: string,
  logDate: string,
  content: string,
): Promise<void> {
  const { error } = await supabase.from("work_logs").upsert(
    {
      employee_id: employeeId,
      log_date: logDate,
      content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "employee_id,log_date" },
  );
  if (error) throw new Error(`업무일지 저장 실패: ${error.message}`);
}

// ── 직원 휴가신청 (leave_requests) ────────────────────────────────
// work_logs 와 동일 컨벤션: 비밀정보 없어 anon 클라이언트, RLS 없음, 테이블 없으면 폴백.
// employees 는 RLS 로 anon 접근이 막혀있어 여기서 join 하지 않는다 — 관리자 화면에서
// employee.ts 의 listEmployees()(service-role) 결과와 employee_id 로 매칭해 이름을 붙일 것.

export type LeaveUnit = "full" | "half_am" | "half_pm";

export interface LeaveRequest {
  id: string;
  employee_id: string;
  start_date: string; // 'YYYY-MM-DD'
  end_date: string; // 'YYYY-MM-DD'
  reason: string;
  unit: LeaveUnit;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

/** 특정 직원의 휴가신청 전체 (최신순). 테이블 없으면 빈 배열. */
export async function getLeaveRequestsByEmployee(
  employeeId: string,
): Promise<LeaveRequest[]> {
  const { data, error } = await supabase
    .from("leave_requests")
    .select("id, employee_id, start_date, end_date, reason, unit, status, created_at")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as LeaveRequest[];
}

/** [관리자] 전체 휴가신청 (필터: 직원/상태, 대기중 우선 그다음 최신순). 테이블 없으면 빈 배열. */
export async function getAllLeaveRequestsForAdmin(filters?: {
  employeeId?: string;
  status?: LeaveRequest["status"];
}): Promise<LeaveRequest[]> {
  let query = supabase
    .from("leave_requests")
    .select("id, employee_id, start_date, end_date, reason, unit, status, created_at")
    .order("created_at", { ascending: false });

  if (filters?.employeeId) query = query.eq("employee_id", filters.employeeId);
  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) return [];
  const rows = (data ?? []) as LeaveRequest[];
  return rows.sort((a, b) =>
    a.status === b.status ? 0 : a.status === "pending" ? -1 : b.status === "pending" ? 1 : 0,
  );
}

// ───────────────────────── 직원 개인 투두 (employee_todos) ─────────────────────────

export interface EmployeeTodo {
  id: string;
  employee_id: string;
  title: string;
  memo: string;
  status: TaskStatus; // tasks 와 동일 3단계 (todo/in_progress/done)
  priority: TaskPriority;
  due_date: string | null; // 'YYYY-MM-DD'
  created_at: string;
  completed_at: string | null;
}

const TODO_SELECT =
  "id, employee_id, title, memo, status, priority, due_date, created_at, completed_at";

/** 본인 투두 전체. 정렬은 tasks 와 동일 규칙(상태→우선순위→최신). 테이블 없으면 빈 배열. */
export async function getTodosByEmployee(employeeId: string): Promise<EmployeeTodo[]> {
  const { data, error } = await supabase
    .from("employee_todos")
    .select(TODO_SELECT)
    .eq("employee_id", employeeId);
  if (error) return [];
  const rows = (data ?? []) as EmployeeTodo[];
  const statusOrder: Record<TaskStatus, number> = { todo: 0, in_progress: 1, done: 2 };
  const prioOrder: Record<TaskPriority, number> = { high: 0, normal: 1, low: 2 };
  return rows.sort(
    (a, b) =>
      statusOrder[a.status] - statusOrder[b.status] ||
      prioOrder[a.priority] - prioOrder[b.priority] ||
      b.created_at.localeCompare(a.created_at),
  );
}

export async function createEmployeeTodo(
  employeeId: string,
  input: { title: string; memo: string; priority: TaskPriority; dueDate: string | null },
): Promise<void> {
  const { error } = await supabase.from("employee_todos").insert({
    employee_id: employeeId,
    title: input.title,
    memo: input.memo,
    priority: input.priority,
    due_date: input.dueDate,
  });
  if (error) throw new Error(`투두 등록 실패: ${error.message}`);
}

/** 본인 것만 — employee_id 를 쿼리 조건으로 강제 (tasks 상태 전환과 동일 원칙). */
export async function updateEmployeeTodo(
  id: string,
  employeeId: string,
  patch: Partial<{
    title: string;
    memo: string;
    priority: TaskPriority;
    due_date: string | null;
    status: TaskStatus;
    completed_at: string | null;
  }>,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("employee_todos")
    .update(patch)
    .eq("id", id)
    .eq("employee_id", employeeId)
    .select("id");
  if (error) throw new Error(`투두 수정 실패: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

export async function deleteEmployeeTodo(id: string, employeeId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("employee_todos")
    .delete()
    .eq("id", id)
    .eq("employee_id", employeeId)
    .select("id");
  if (error) throw new Error(`투두 삭제 실패: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

// ───────────────────────── 팀 캘린더 일정 (team_events) ─────────────────────────

export type TeamEventCategory = "meeting" | "client" | "important" | "etc";

export interface TeamEvent {
  id: string;
  title: string;
  event_date: string; // 'YYYY-MM-DD'
  start_time: string | null; // 'HH:mm'
  end_time: string | null;
  category: TeamEventCategory;
  memo: string;
  created_by: string; // employees.id
  created_at: string;
  updated_at: string;
}

const TEAM_EVENT_SELECT =
  "id, title, event_date, start_time, end_time, category, memo, created_by, created_at, updated_at";

/** 특정 월(YYYY-MM)의 팀 일정 전체 (날짜→시작시간 순). 테이블 없으면 빈 배열. */
export async function getTeamEventsForMonth(month: string): Promise<TeamEvent[]> {
  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const end = `${month}-${pad(new Date(y, m, 0).getDate())}`;
  const { data, error } = await supabase
    .from("team_events")
    .select(TEAM_EVENT_SELECT)
    .gte("event_date", start)
    .lte("event_date", end)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as TeamEvent[];
}

export interface TeamEventInput {
  title: string;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  category: TeamEventCategory;
  memo: string;
}

export async function createTeamEvent(createdBy: string, input: TeamEventInput): Promise<void> {
  const { error } = await supabase.from("team_events").insert({
    title: input.title,
    event_date: input.eventDate,
    start_time: input.startTime,
    end_time: input.endTime,
    category: input.category,
    memo: input.memo,
    created_by: createdBy,
  });
  if (error) throw new Error(`팀 일정 등록 실패: ${error.message}`);
}

/** 작성자 본인 것만 수정 — created_by 를 쿼리 조건으로 강제 (타인 일정은 매칭 0건). */
export async function updateTeamEvent(
  id: string,
  createdBy: string,
  input: TeamEventInput,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("team_events")
    .update({
      title: input.title,
      event_date: input.eventDate,
      start_time: input.startTime,
      end_time: input.endTime,
      category: input.category,
      memo: input.memo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("created_by", createdBy)
    .select("id");
  if (error) throw new Error(`팀 일정 수정 실패: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

/** 작성자 본인 것만 삭제. */
export async function deleteTeamEvent(id: string, createdBy: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("team_events")
    .delete()
    .eq("id", id)
    .eq("created_by", createdBy)
    .select("id");
  if (error) throw new Error(`팀 일정 삭제 실패: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

/** 휴가신청 등록. */
export async function createLeaveRequest(
  employeeId: string,
  startDate: string,
  endDate: string,
  reason: string,
  unit: LeaveUnit,
): Promise<void> {
  const { error } = await supabase.from("leave_requests").insert({
    employee_id: employeeId,
    start_date: startDate,
    end_date: endDate,
    reason,
    unit,
    status: "pending",
  });
  if (error) throw new Error(`휴가신청 등록 실패: ${error.message}`);
}

/** [관리자] 휴가신청 승인/거절/되돌리기(대기중으로). */
export async function updateLeaveRequestStatus(
  id: string,
  status: LeaveRequest["status"],
): Promise<void> {
  const { error } = await supabase
    .from("leave_requests")
    .update({
      status,
      decided_at: status === "pending" ? null : new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(`휴가신청 처리 실패: ${error.message}`);
}

/** 본인 휴가신청 취소(철회). 대기중인 건만 취소 가능(승인/거절된 건 보호). */
export async function deleteLeaveRequest(
  id: string,
  employeeId: string,
): Promise<void> {
  const { error } = await supabase
    .from("leave_requests")
    .delete()
    .eq("id", id)
    .eq("employee_id", employeeId)
    .eq("status", "pending");
  if (error) throw new Error(`휴가신청 취소 실패: ${error.message}`);
}

// ── 직원 업무 할당 (tasks) ────────────────────────────────────
// leave_requests 와 동일 컨벤션: 비밀정보 없어 anon 클라이언트, RLS 없음, 테이블 없으면 폴백.
// 권한 방향은 반대 — 관리자가 생성/배정하고 직원은 상태만 전환한다.
// employees join 금지(RLS) — 관리자 화면은 listEmployees()(service-role)로 이름 매칭.

export type TaskPriority = "high" | "normal" | "low";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface TaskRow {
  id: string;
  employee_id: string;
  title: string;
  body: string;
  priority: TaskPriority;
  status: TaskStatus;
  /** 직원이 남기는 자유 메모 (sql/tasks_employee_memo.sql). 빈 문자열 = 없음 */
  employee_memo: string;
  created_at: string;
  completed_at: string | null;
}

const TASK_SELECT =
  "id, employee_id, title, body, priority, status, employee_memo, created_at, completed_at";

// 공통 정렬: 상태(대기→처리중→완료) → 우선순위(높음→낮음) → 최신 배정순
const TASK_STATUS_RANK: Record<TaskStatus, number> = {
  todo: 0,
  in_progress: 1,
  done: 2,
};
const TASK_PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 0,
  normal: 1,
  low: 2,
};

function sortTasks(rows: TaskRow[]): TaskRow[] {
  return rows.sort(
    (a, b) =>
      TASK_STATUS_RANK[a.status] - TASK_STATUS_RANK[b.status] ||
      TASK_PRIORITY_RANK[a.priority] - TASK_PRIORITY_RANK[b.priority] ||
      b.created_at.localeCompare(a.created_at),
  );
}

/** 특정 직원에게 배정된 업무 전체. 테이블 없으면 빈 배열. */
export async function getTasksByEmployee(
  employeeId: string,
): Promise<TaskRow[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("employee_id", employeeId);
  if (error) return [];
  return sortTasks((data ?? []) as TaskRow[]);
}

/** 특정 시각 이후 배정된(새) 업무 수. seenAt 이 null 이면 전체가 새 업무. 테이블 없으면 0. */
export async function countTasksAssignedAfter(
  employeeId: string,
  seenAt: string | null,
): Promise<number> {
  let query = supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", employeeId);
  if (seenAt) query = query.gt("created_at", seenAt);

  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

/** [관리자] 전체 업무 (필터: 직원). 상태 필터·카운트는 호출부 메모리에서. 테이블 없으면 빈 배열. */
export async function getAllTasksForAdmin(filters?: {
  employeeId?: string;
}): Promise<TaskRow[]> {
  let query = supabase.from("tasks").select(TASK_SELECT);
  if (filters?.employeeId) query = query.eq("employee_id", filters.employeeId);

  const { data, error } = await query;
  if (error) return [];
  return sortTasks((data ?? []) as TaskRow[]);
}

/** [관리자] 업무 등록. */
export async function createTask(input: {
  employeeId: string;
  title: string;
  body: string;
  priority: TaskPriority;
  assignedBy: string;
}): Promise<void> {
  const { error } = await supabase.from("tasks").insert({
    employee_id: input.employeeId,
    title: input.title,
    body: input.body,
    priority: input.priority,
    assigned_by: input.assignedBy,
    status: "todo",
  });
  if (error) throw new Error(`업무 등록 실패: ${error.message}`);
}

/** [관리자] 업무 수정 (담당자/제목/내용/우선순위 — 상태는 직원 소유라 건드리지 않음). */
export async function updateTask(
  id: string,
  input: {
    employeeId: string;
    title: string;
    body: string;
    priority: TaskPriority;
  },
): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({
      employee_id: input.employeeId,
      title: input.title,
      body: input.body,
      priority: input.priority,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(`업무 수정 실패: ${error.message}`);
}

/** 직원 본인 업무 상태 전환. 소유권을 쿼리 조건에 밀어넣어 타인 업무는 매칭 0건. */
export async function updateTaskStatus(
  id: string,
  employeeId: string,
  status: TaskStatus,
): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({
      status,
      completed_at: status === "done" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("employee_id", employeeId);
  if (error) throw new Error(`업무 상태 변경 실패: ${error.message}`);
}

/** 직원 본인 업무 메모 저장. 상태 전환과 동일하게 소유권을 쿼리 조건에 밀어넣는다. */
export async function updateTaskEmployeeMemo(
  id: string,
  employeeId: string,
  memo: string,
): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({ employee_memo: memo, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("employee_id", employeeId);
  if (error) throw new Error(`업무 메모 저장 실패: ${error.message}`);
}

/** [관리자] 업무 삭제. */
export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(`업무 삭제 실패: ${error.message}`);
}

// ── 외주 디자이너 작업 요청서 (design_requests) ─────────────────
// 관리자가 브리프를 작성하고 디자이너는 공개 링크(/design/{nanoid})로 읽는다.
// 브리프 텍스트/선택 값은 content(jsonb), 첨부 리소스 메타는 files(jsonb).
// 테이블이 없으면 목록/조회는 무해하게 빈 값으로 폴백(SQL: sql/design_requests.sql).
import type { DesignContent, DesignFiles } from "./design-fields";

export interface DesignRequest {
  id: string;
  nanoid: string;
  title: string | null;
  status: "draft" | "sent";
  content: DesignContent;
  files: DesignFiles;
  designer_id: string | null;
  created_at: string;
  updated_at: string;
}

/** 외주 파트너 구분 — 같은 designers 테이블을 role 로 나눠 쓴다. */
export type PartnerRole = "designer" | "developer";

export interface Designer {
  id: string;
  name: string;
  contact: string | null;
  memo: string | null;
  active: boolean;
  role: PartnerRole;
  /** 첨부 메타 — { files: DesignFileMeta[] } */
  files: DesignFiles;
  created_at: string;
}

/** [관리자] 신규 요청서 생성 → nanoid 발급 후 draft 행 삽입. */
export async function createDesignRequest(): Promise<DesignRequest> {
  const nanoid = generateCompanyNanoid();
  const { data, error } = await supabase
    .from("design_requests")
    .insert({ nanoid, status: "draft" })
    .select()
    .single();
  if (error) throw new Error(`요청서 생성 실패: ${error.message}`);
  return data as DesignRequest;
}

/** [관리자] 요청서 목록 — 최신순. 테이블 없으면 빈 배열. */
export async function listDesignRequests(): Promise<DesignRequest[]> {
  const { data, error } = await supabase
    .from("design_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data as DesignRequest[] | null) ?? [];
}

/** 공개 링크(nanoid) → 요청서. 없으면 null. */
export async function getDesignRequestByNanoid(
  nanoid: string,
): Promise<DesignRequest | null> {
  const { data } = await supabase
    .from("design_requests")
    .select("*")
    .eq("nanoid", nanoid)
    .limit(1)
    .maybeSingle();
  return (data as DesignRequest | null) ?? null;
}

/** [관리자] 브리프 저장 — content/files/title/status 갱신. */
export async function saveDesignRequest(
  nanoid: string,
  payload: {
    title: string | null;
    content: DesignContent;
    files: DesignFiles;
    status?: "draft" | "sent";
  },
): Promise<void> {
  const patch: Record<string, unknown> = {
    title: payload.title,
    content: payload.content,
    files: payload.files,
    updated_at: new Date().toISOString(),
  };
  if (payload.status) patch.status = payload.status;
  const { error } = await supabase
    .from("design_requests")
    .update(patch)
    .eq("nanoid", nanoid);
  if (error) throw new Error(`요청서 저장 실패: ${error.message}`);
}

/** [관리자] 상태만 변경 (draft ↔ sent). */
export async function updateDesignRequestStatus(
  nanoid: string,
  status: "draft" | "sent",
): Promise<void> {
  const { error } = await supabase
    .from("design_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("nanoid", nanoid);
  if (error) throw new Error(`상태 변경 실패: ${error.message}`);
}

/** [관리자] 요청서 삭제 (행만 — 파일 정리는 호출부에서 deleteDesignFiles 로). */
export async function deleteDesignRequest(nanoid: string): Promise<void> {
  const { error } = await supabase
    .from("design_requests")
    .delete()
    .eq("nanoid", nanoid);
  if (error) throw new Error(`삭제 실패: ${error.message}`);
}

// ── 외주 파트너 명단 (designers, role=designer|developer) ───────
// 테이블/컬럼이 없으면 조회는 빈 배열로 폴백(SQL: sql/designers.sql). 쓰기는 에러를 던진다.

/** role/files 컬럼이 없던 시절의 행도 안전하게 다루기 위한 정규화. */
function normalizeDesigner(row: Record<string, unknown>): Designer {
  return {
    ...(row as unknown as Designer),
    role: row.role === "developer" ? "developer" : "designer",
    files: (row.files as DesignFiles | null) ?? {},
  };
}

/** 파트너 명단(디자이너+개발자) — 활성 우선, 이름순. 테이블 없으면 빈 배열. */
export async function listDesigners(): Promise<Designer[]> {
  const { data, error } = await supabase
    .from("designers")
    .select("*")
    .order("active", { ascending: false })
    .order("name", { ascending: true });
  if (error) return [];
  return ((data as Record<string, unknown>[] | null) ?? []).map(normalizeDesigner);
}

/** 파트너 등록. */
export async function createDesigner(data: {
  name: string;
  contact?: string | null;
  memo?: string | null;
  role?: PartnerRole;
}): Promise<Designer> {
  const { data: row, error } = await supabase
    .from("designers")
    .insert({
      name: data.name,
      contact: data.contact || null,
      memo: data.memo || null,
      role: data.role ?? "designer",
    })
    .select()
    .single();
  if (error) throw new Error(`등록 실패: ${error.message}`);
  return normalizeDesigner(row as Record<string, unknown>);
}

/** 파트너 정보 수정. */
export async function updateDesigner(
  id: string,
  data: {
    name?: string;
    contact?: string | null;
    memo?: string | null;
    active?: boolean;
    files?: DesignFiles;
  },
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.contact !== undefined) patch.contact = data.contact || null;
  if (data.memo !== undefined) patch.memo = data.memo || null;
  if (data.active !== undefined) patch.active = data.active;
  if (data.files !== undefined) patch.files = data.files;
  const { error } = await supabase.from("designers").update(patch).eq("id", id);
  if (error) throw new Error(`수정 실패: ${error.message}`);
}

/** 파트너 1명 조회 (첨부 갱신용). 없으면 null. */
export async function getDesigner(id: string): Promise<Designer | null> {
  const { data } = await supabase
    .from("designers")
    .select("*")
    .eq("id", id)
    .limit(1)
    .maybeSingle();
  return data ? normalizeDesigner(data as Record<string, unknown>) : null;
}

/** 파트너 삭제 (요청서 배정은 FK on delete set null 로 자동 해제). */
export async function deleteDesigner(id: string): Promise<void> {
  const { error } = await supabase.from("designers").delete().eq("id", id);
  if (error) throw new Error(`삭제 실패: ${error.message}`);
}

/** 요청서에 담당 디자이너 배정(해제는 designerId=null). */
export async function assignDesigner(
  nanoid: string,
  designerId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("design_requests")
    .update({ designer_id: designerId, updated_at: new Date().toISOString() })
    .eq("nanoid", nanoid);
  if (error) throw new Error(`담당자 배정 실패: ${error.message}`);
}

// ── 외주 게시판 (outsource_posts) ──────────────────────────────
// 관리자용 내부 게시판. 첨부는 design-files 버킷 재사용(board/{id}/...).
// 테이블이 없으면 목록/조회는 빈 값으로 폴백(SQL: sql/outsource_posts.sql).

export interface OutsourcePost {
  id: string;
  title: string | null;
  content: string | null;
  author: string | null;
  files: DesignFiles;
  created_at: string;
  updated_at: string;
}

/** 게시글 목록 — 최신순. 테이블 없으면 빈 배열. */
export async function listOutsourcePosts(): Promise<OutsourcePost[]> {
  const { data, error } = await supabase
    .from("outsource_posts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data as OutsourcePost[] | null) ?? [];
}

/** 게시글 1건 조회. 없으면 null. */
export async function getOutsourcePost(
  id: string,
): Promise<OutsourcePost | null> {
  const { data } = await supabase
    .from("outsource_posts")
    .select("*")
    .eq("id", id)
    .limit(1)
    .maybeSingle();
  return (data as OutsourcePost | null) ?? null;
}

/** 게시글 생성(빈 초안). 작성자 이름을 기록하고 생성 행을 반환. */
export async function createOutsourcePost(
  author?: string | null,
): Promise<OutsourcePost> {
  const { data, error } = await supabase
    .from("outsource_posts")
    .insert({ author: author || null })
    .select()
    .single();
  if (error) throw new Error(`게시글 생성 실패: ${error.message}`);
  return data as OutsourcePost;
}

/** 게시글 저장 — 제목/내용/첨부 갱신. */
export async function saveOutsourcePost(
  id: string,
  payload: { title: string | null; content: string | null; files: DesignFiles },
): Promise<void> {
  const { error } = await supabase
    .from("outsource_posts")
    .update({
      title: payload.title,
      content: payload.content,
      files: payload.files,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(`게시글 저장 실패: ${error.message}`);
}

/** 게시글 삭제 (첨부 정리는 호출부에서 deleteBoardFiles 로). */
export async function deleteOutsourcePost(id: string): Promise<void> {
  const { error } = await supabase
    .from("outsource_posts")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`게시글 삭제 실패: ${error.message}`);
}

// ── 외주비 정산 (outsource_payments) ───────────────────────────
// 외주 파트너에게 지급하는 비용 장부(구글시트식). /ledger 의 광고비 소진과는 별개.
// 테이블이 없으면 목록은 빈 배열로 폴백(SQL: sql/outsource_payments.sql).

export interface OutsourcePayment {
  id: string;
  partner_id: string | null;
  partner_name: string | null;
  task_name: string | null;
  amount: number | null;
  pay_date: string | null;
  paid: boolean;
  memo: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** 시트에서 넘어오는 저장 단위 (id 는 클라이언트가 발급한 uuid). */
export interface OutsourcePaymentInput {
  id: string;
  partner_id: string | null;
  partner_name: string | null;
  task_name: string;
  amount: number | null;
  pay_date: string | null;
  paid: boolean;
  memo: string;
  sort_order: number;
}

/** 정산 내역 — 시트 행 순서대로. 테이블 없으면 빈 배열. */
export async function listOutsourcePayments(): Promise<OutsourcePayment[]> {
  const { data, error } = await supabase
    .from("outsource_payments")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data as OutsourcePayment[] | null) ?? [];
}

/**
 * 정산 내역 저장 — 넘어온 행은 upsert, 목록에서 사라진 행은 삭제.
 *
 * ledger_entries 처럼 전량 delete→insert 하지 않는 이유: 이 테이블은 회사 단위로
 * 쪼개지지 않아 delete 가 곧 전체 삭제라, 뒤이은 insert 가 실패하면 장부가 통째로 날아간다.
 */
export async function saveOutsourcePayments(
  entries: OutsourcePaymentInput[],
): Promise<void> {
  const now = new Date().toISOString();
  const rows = entries.map((e) => ({
    id: e.id,
    partner_id: e.partner_id,
    partner_name: e.partner_name,
    task_name: e.task_name || null,
    amount: e.amount,
    pay_date: e.pay_date,
    paid: e.paid,
    memo: e.memo || null,
    sort_order: e.sort_order,
    updated_at: now,
  }));

  if (rows.length) {
    const { error } = await supabase
      .from("outsource_payments")
      .upsert(rows, { onConflict: "id" });
    if (error) throw new Error(`정산 저장 실패: ${error.message}`);
  }

  // 시트에서 제거된 행 정리 (남길 id 목록에 없는 행 삭제)
  const keepIds = rows.map((r) => r.id);
  const del = supabase.from("outsource_payments").delete();
  const { error: delErr } = keepIds.length
    ? await del.not("id", "in", `(${keepIds.join(",")})`)
    : await del.neq("id", "00000000-0000-0000-0000-000000000000");
  if (delErr) throw new Error(`정산 저장 실패: ${delErr.message}`);
}
