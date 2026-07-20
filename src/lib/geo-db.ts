import { supabase } from "./supabase";

// GEO 노출 체크리스트 쿼리 레이어. 스키마는 sql/geo_check.sql 참고.
//
// db.ts 와 다른 점 하나: db.ts 는 "테이블/컬럼이 없어도 앱이 안 깨지게" read/write 모두
// 조용히 폴백하지만, 여기서는 **write 경로만 throw** 한다. 실행 결과 저장이 조용히
// 실패하면 "분명 실행했는데 결과가 안 보인다"는 최악의 디버깅 상황이 되기 때문.
// read 경로는 db.ts 관례대로 null/[] 폴백을 유지한다.

// ── 타입 ────────────────────────────────────────────────────

export type GeoTarget = {
  id: string;
  name: string;
  aliases: string[];
  /** 공식 홈페이지 도메인들. 답변에 이름이 없어도 이 도메인이 인용되면 노출로 본다. */
  siteDomains: string[];
  company: string | null;
  region: string | null;
  memo: string | null;
  active: boolean;
  createdAt: string;
};

export type GeoKeyword = {
  id: string;
  targetId: string;
  keyword: string;
  /** 지역 / 암종 / 프로그램 등. 체크리스트에서 색 배지로 묶어 보여준다. */
  category: string | null;
  /** 비고. 회차와 무관하게 키워드에 붙는 메모. */
  memo: string | null;
  active: boolean;
  sortOrder: number;
};

export type GeoRunStatus = "running" | "done" | "partial" | "failed";

export type GeoRun = {
  id: string;
  targetId: string;
  status: GeoRunStatus;
  model: string | null;
  totalCount: number;
  foundCount: number;
  failedCount: number;
  startedBy: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type GeoCitation = { url: string; title: string };
export type GeoVerdict = "recommended" | "mentioned" | "negative" | "absent";
export type GeoMatchBy = "code" | "llm" | "both" | "site" | "none";

export type GeoRunResult = {
  id: string;
  runId: string;
  keywordId: string | null;
  keywordText: string;
  status: "pending" | "done" | "error";
  found: boolean | null;
  verdict: GeoVerdict | null;
  rank: number | null;
  matchedText: string | null;
  matchBy: GeoMatchBy | null;
  needsReview: boolean;
  /** 답변 본문에 이름이 없어도 공식 홈페이지가 출처로 인용됐는지. 이것도 노출로 친다. */
  siteCited: boolean;
  answerText: string | null;
  citations: GeoCitation[];
  error: string | null;
};

/** 실행 1건 + 그 결과 행 전부. 체크리스트 화면과 진행률 폴링이 모두 이걸 쓴다. */
export type GeoRunDetail = { run: GeoRun; results: GeoRunResult[] };

// ── 매퍼 (snake_case → camelCase) ───────────────────────────

type RawTarget = {
  id: string; name: string; aliases: string[] | null; company: string | null;
  region: string | null; memo: string | null; active: boolean; created_at: string;
  site_domains?: string[] | null;
};
type RawKeyword = {
  id: string; target_id: string; keyword: string; active: boolean; sort_order: number;
  category?: string | null; memo?: string | null;
};
type RawRun = {
  id: string; target_id: string; status: GeoRunStatus; model: string | null;
  total_count: number; found_count: number; failed_count: number;
  started_by: string | null; started_at: string; finished_at: string | null;
};
type RawResult = {
  id: string; run_id: string; keyword_id: string | null; keyword_text: string;
  status: "pending" | "done" | "error"; found: boolean | null; verdict: GeoVerdict | null;
  rank: number | null; matched_text: string | null; match_by: GeoMatchBy | null;
  needs_review: boolean; answer_text: string | null; citations: GeoCitation[] | null;
  error: string | null; site_cited?: boolean | null;
};

function mapTarget(t: RawTarget): GeoTarget {
  return {
    id: t.id, name: t.name, aliases: t.aliases ?? [], siteDomains: t.site_domains ?? [],
    company: t.company, region: t.region, memo: t.memo, active: t.active,
    createdAt: t.created_at,
  };
}
function mapKeyword(k: RawKeyword): GeoKeyword {
  return {
    id: k.id, targetId: k.target_id, keyword: k.keyword,
    category: k.category ?? null, memo: k.memo ?? null,
    active: k.active, sortOrder: k.sort_order ?? 0,
  };
}
function mapRun(r: RawRun): GeoRun {
  return {
    id: r.id, targetId: r.target_id, status: r.status, model: r.model,
    totalCount: r.total_count ?? 0, foundCount: r.found_count ?? 0,
    failedCount: r.failed_count ?? 0, startedBy: r.started_by,
    startedAt: r.started_at, finishedAt: r.finished_at,
  };
}
function mapResult(r: RawResult): GeoRunResult {
  return {
    id: r.id, runId: r.run_id, keywordId: r.keyword_id, keywordText: r.keyword_text,
    status: r.status, found: r.found, verdict: r.verdict, rank: r.rank,
    matchedText: r.matched_text, matchBy: r.match_by, needsReview: r.needs_review ?? false,
    siteCited: r.site_cited ?? false,
    answerText: r.answer_text, citations: r.citations ?? [], error: r.error,
  };
}

/** write 실패는 조용히 넘기지 않는다 (파일 상단 주석 참고). */
function assertOk(error: { message: string } | null, what: string): void {
  if (error) throw new Error(`${what} 실패: ${error.message}`);
}

// ── 대상 ────────────────────────────────────────────────────

export async function listGeoTargets(): Promise<GeoTarget[]> {
  const { data, error } = await supabase
    .from("geo_targets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as RawTarget[]).map(mapTarget);
}

export async function getGeoTarget(id: string): Promise<GeoTarget | null> {
  const { data, error } = await supabase
    .from("geo_targets")
    .select("*")
    .eq("id", id)
    .limit(1);
  if (error || !data?.[0]) return null;
  return mapTarget(data[0] as RawTarget);
}

export async function insertGeoTarget(input: {
  name: string; aliases: string[]; siteDomains?: string[];
  company?: string | null; region?: string | null; memo?: string | null;
}): Promise<string> {
  const { data, error } = await supabase
    .from("geo_targets")
    .insert({
      name: input.name,
      aliases: input.aliases,
      site_domains: input.siteDomains ?? [],
      company: input.company ?? null,
      region: input.region ?? null,
      memo: input.memo ?? null,
    })
    .select("id")
    .single();
  assertOk(error, "대상 등록");
  return (data as { id: string }).id;
}

export async function updateGeoTarget(
  id: string,
  patch: {
    name?: string; aliases?: string[]; siteDomains?: string[];
    region?: string | null; memo?: string | null;
  },
): Promise<void> {
  const { siteDomains, ...rest } = patch;
  const { error } = await supabase
    .from("geo_targets")
    .update({
      ...rest,
      ...(siteDomains !== undefined ? { site_domains: siteDomains } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  assertOk(error, "대상 수정");
}

export async function deleteGeoTarget(id: string): Promise<void> {
  const { error } = await supabase.from("geo_targets").delete().eq("id", id);
  assertOk(error, "대상 삭제");
}

// ── 키워드 ──────────────────────────────────────────────────

export async function listGeoKeywords(targetId: string): Promise<GeoKeyword[]> {
  const { data, error } = await supabase
    .from("geo_keywords")
    .select("*")
    .eq("target_id", targetId)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return (data as RawKeyword[]).map(mapKeyword);
}

export async function insertGeoKeywords(
  targetId: string,
  keywords: string[],
  startOrder: number,
  category?: string | null,
): Promise<number> {
  if (!keywords.length) return 0;
  const rows = keywords.map((keyword, i) => ({
    target_id: targetId,
    keyword,
    category: category ?? null,
    sort_order: startOrder + i,
  }));
  const { error } = await supabase.from("geo_keywords").insert(rows);
  assertOk(error, "키워드 등록");
  return rows.length;
}

export async function setGeoKeywordActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("geo_keywords").update({ active }).eq("id", id);
  assertOk(error, "키워드 상태 변경");
}

/** 분류·비고 수정. 체크리스트 표에서 바로 고칠 수 있게 한다. */
export async function updateGeoKeywordMeta(
  id: string,
  patch: { category?: string | null; memo?: string | null },
): Promise<void> {
  const { error } = await supabase.from("geo_keywords").update(patch).eq("id", id);
  assertOk(error, "키워드 정보 수정");
}

export async function deleteGeoKeyword(id: string): Promise<void> {
  const { error } = await supabase.from("geo_keywords").delete().eq("id", id);
  assertOk(error, "키워드 삭제");
}

// ── 실행 ────────────────────────────────────────────────────

export async function insertGeoRun(input: {
  targetId: string; model: string; totalCount: number; startedBy: string | null;
}): Promise<string> {
  const { data, error } = await supabase
    .from("geo_runs")
    .insert({
      target_id: input.targetId,
      model: input.model,
      total_count: input.totalCount,
      started_by: input.startedBy,
      status: "running",
    })
    .select("id")
    .single();
  assertOk(error, "실행 생성");
  return (data as { id: string }).id;
}

/** 실행 시작 시 키워드 수만큼 pending 행을 미리 깔아둔다.
 *  중간에 함수가 강제 종료돼도 완료분은 남고 남은 pending 이 그대로 보이게 하기 위함. */
export async function insertPendingResults(
  runId: string,
  keywords: { id: string; keyword: string }[],
): Promise<GeoRunResult[]> {
  const rows = keywords.map((k) => ({
    run_id: runId,
    keyword_id: k.id,
    keyword_text: k.keyword,
    status: "pending" as const,
  }));
  const { data, error } = await supabase.from("geo_run_results").insert(rows).select("*");
  assertOk(error, "결과 행 생성");
  return (data as RawResult[]).map(mapResult);
}

export async function updateGeoRunResult(
  id: string,
  patch: {
    status: "done" | "error";
    found?: boolean | null;
    verdict?: GeoVerdict | null;
    rank?: number | null;
    matchedText?: string | null;
    matchBy?: GeoMatchBy | null;
    needsReview?: boolean;
    siteCited?: boolean;
    answerText?: string | null;
    citations?: GeoCitation[];
    error?: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from("geo_run_results")
    .update({
      status: patch.status,
      found: patch.found ?? null,
      verdict: patch.verdict ?? null,
      rank: patch.rank ?? null,
      matched_text: patch.matchedText ?? null,
      match_by: patch.matchBy ?? null,
      needs_review: patch.needsReview ?? false,
      site_cited: patch.siteCited ?? false,
      answer_text: patch.answerText ?? null,
      citations: patch.citations ?? [],
      error: patch.error ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  assertOk(error, "결과 저장");
}

export async function finishGeoRun(
  runId: string,
  summary: { status: GeoRunStatus; foundCount: number; failedCount: number },
): Promise<void> {
  const { error } = await supabase
    .from("geo_runs")
    .update({
      status: summary.status,
      found_count: summary.foundCount,
      failed_count: summary.failedCount,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);
  assertOk(error, "실행 마감");
}

export async function getGeoRun(runId: string): Promise<GeoRun | null> {
  const { data, error } = await supabase
    .from("geo_runs")
    .select("*")
    .eq("id", runId)
    .limit(1);
  if (error || !data?.[0]) return null;
  return mapRun(data[0] as RawRun);
}

export async function getGeoRunDetail(runId: string): Promise<GeoRunDetail | null> {
  const run = await getGeoRun(runId);
  if (!run) return null;
  const { data, error } = await supabase
    .from("geo_run_results")
    .select("*")
    .eq("run_id", runId)
    .order("created_at", { ascending: true });
  if (error || !data) return { run, results: [] };
  return { run, results: (data as RawResult[]).map(mapResult) };
}

/** 대상의 실행 이력 (최신순). 노출률 추이·직전 회차 대비 델타 계산에 쓴다. */
export async function listGeoRuns(targetId: string, limit = 20): Promise<GeoRun[]> {
  const { data, error } = await supabase
    .from("geo_runs")
    .select("*")
    .eq("target_id", targetId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as RawRun[]).map(mapRun);
}

/** 대상의 가장 최근 실행 상세. 체크리스트 화면 초기 렌더에 사용. */
export async function getLatestGeoRunDetail(targetId: string): Promise<GeoRunDetail | null> {
  const runs = await listGeoRuns(targetId, 1);
  if (!runs[0]) return null;
  return getGeoRunDetail(runs[0].id);
}

// ── 날짜 기준 조회 ──────────────────────────────────────────
// 점검은 "하루에 한 번"이 기본 단위다. 같은 날 여러 번 돌렸다면 그날의 최신 실행을 그날의 결과로 본다.

/** ISO 시각 → 한국 기준 YYYY-MM-DD. (서버 타임존이 UTC 여도 날짜가 밀리지 않게) */
export function kstDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

/** 오늘(한국 기준) YYYY-MM-DD. */
export function todayKst(): string {
  return kstDate(new Date());
}

/** 점검 기록이 있는 날짜들 (최신순, 중복 제거). 달력 네비게이션의 점 표시에 쓴다. */
export async function listGeoRunDates(targetId: string): Promise<string[]> {
  const runs = await listGeoRuns(targetId, 200);
  return [...new Set(runs.map((r) => kstDate(r.startedAt)))];
}

/** 특정 날짜(한국 기준)의 점검 결과. 그날 실행이 없으면 null. */
export async function getGeoRunDetailForDate(
  targetId: string,
  date: string,
): Promise<GeoRunDetail | null> {
  const runs = await listGeoRuns(targetId, 200);
  const run = runs.find((r) => kstDate(r.startedAt) === date); // listGeoRuns 가 최신순이라 첫 매치가 그날의 최신
  if (!run) return null;
  return getGeoRunDetail(run.id);
}
