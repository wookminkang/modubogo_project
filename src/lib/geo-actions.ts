"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser, isAdmin } from "./admin";
import { matchHospital, citesOwnSite } from "./geo-match";
import { askChatGpt, judgeAnswer, COLLECT_MODEL } from "./geo-openai";
import type { JudgeResult } from "./geo-openai";
import type { CodeMatch } from "./geo-match";
import * as db from "./geo-db";
import type { GeoMatchBy, GeoRunDetail, GeoRunStatus } from "./geo-db";

// GEO 노출 체크 서버 액션. site-analysis-actions.ts 의 패턴을 따른다
// (isAdmin 가드 → 입력 검증 → 판별 유니온 반환 → try/catch 로 에러 문자열화).

export type GeoResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** 한 번에 등록/실행할 수 있는 키워드 상한. */
const MAX_KEYWORDS = 30;
/** 동시 실행 수. web_search 는 자체 레이트리밋이 있어 올릴수록 429 로 오히려 느려진다. */
const CONCURRENCY = 4;
/** 키워드 1건 제한시간. 하나가 물고 늘어져 전체를 죽이지 않게 한다. */
const PER_KEYWORD_MS = 60_000;
/** 전역 예산. Vercel maxDuration 300초보다 여유를 두고 마감한다. */
const BUDGET_MS = 260_000;

function fail(e: unknown, prefix: string): { ok: false; error: string } {
  const detail = e instanceof Error ? e.message : String(e);
  return { ok: false, error: `${prefix}: ${detail}` };
}

async function guard(): Promise<string | null> {
  return (await isAdmin()) ? null : "권한이 없습니다. 관리자로 로그인해 주세요.";
}

// ── 대상 ────────────────────────────────────────────────────

export async function createGeoTarget(input: {
  name: string;
  aliases: string[];
  siteDomains?: string[];
  region?: string;
  memo?: string;
}): Promise<GeoResult<{ id: string }>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "병원명을 입력해 주세요." };

  try {
    const id = await db.insertGeoTarget({
      name,
      aliases: cleanList(input.aliases),
      siteDomains: cleanList(input.siteDomains ?? []),
      region: input.region?.trim() || null,
      memo: input.memo?.trim() || null,
    });
    revalidatePath("/geo-check");
    return { ok: true, data: { id } };
  } catch (e) {
    return fail(e, "대상을 등록하지 못했습니다");
  }
}

export async function updateGeoTarget(
  id: string,
  patch: { name?: string; aliases?: string[]; siteDomains?: string[]; region?: string; memo?: string },
): Promise<GeoResult<null>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  try {
    await db.updateGeoTarget(id, {
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.aliases !== undefined ? { aliases: cleanList(patch.aliases) } : {}),
      ...(patch.siteDomains !== undefined ? { siteDomains: cleanList(patch.siteDomains) } : {}),
      ...(patch.region !== undefined ? { region: patch.region.trim() || null } : {}),
      ...(patch.memo !== undefined ? { memo: patch.memo.trim() || null } : {}),
    });
    revalidatePath(`/geo-check/${id}`);
    revalidatePath("/geo-check");
    return { ok: true, data: null };
  } catch (e) {
    return fail(e, "대상을 수정하지 못했습니다");
  }
}

export async function deleteGeoTarget(id: string): Promise<GeoResult<null>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  try {
    await db.deleteGeoTarget(id);
    revalidatePath("/geo-check");
    return { ok: true, data: null };
  } catch (e) {
    return fail(e, "대상을 삭제하지 못했습니다");
  }
}

// ── 키워드 ──────────────────────────────────────────────────

/** 줄바꿈으로 붙여넣은 여러 키워드를 한 번에 등록한다. */
export async function addGeoKeywords(
  targetId: string,
  raw: string,
  category?: string,
): Promise<GeoResult<{ added: number }>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  const keywords = cleanList(raw.split("\n"));
  if (!keywords.length) return { ok: false, error: "등록할 키워드가 없습니다." };

  try {
    const existing = await db.listGeoKeywords(targetId);
    if (existing.length + keywords.length > MAX_KEYWORDS) {
      return {
        ok: false,
        error: `키워드는 대상당 최대 ${MAX_KEYWORDS}개까지 등록할 수 있습니다. (현재 ${existing.length}개)`,
      };
    }
    // 이미 등록된 키워드는 건너뛴다.
    const dup = new Set(existing.map((k) => k.keyword));
    const fresh = keywords.filter((k) => !dup.has(k));
    if (!fresh.length) return { ok: false, error: "이미 등록된 키워드입니다." };

    const startOrder = existing.reduce((m, k) => Math.max(m, k.sortOrder), -1) + 1;
    const added = await db.insertGeoKeywords(
      targetId, fresh, startOrder, category?.trim() || null,
    );
    revalidatePath(`/geo-check/${targetId}`);
    return { ok: true, data: { added } };
  } catch (e) {
    return fail(e, "키워드를 등록하지 못했습니다");
  }
}

/** 체크리스트 표에서 분류·비고를 바로 고친다. */
export async function updateGeoKeywordMeta(
  targetId: string,
  keywordId: string,
  patch: { category?: string; memo?: string },
): Promise<GeoResult<null>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  try {
    await db.updateGeoKeywordMeta(keywordId, {
      ...(patch.category !== undefined ? { category: patch.category.trim() || null } : {}),
      ...(patch.memo !== undefined ? { memo: patch.memo.trim() || null } : {}),
    });
    revalidatePath(`/geo-check/${targetId}`);
    return { ok: true, data: null };
  } catch (e) {
    return fail(e, "키워드 정보를 수정하지 못했습니다");
  }
}

export async function toggleGeoKeyword(
  targetId: string,
  keywordId: string,
  active: boolean,
): Promise<GeoResult<null>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  try {
    await db.setGeoKeywordActive(keywordId, active);
    revalidatePath(`/geo-check/${targetId}`);
    return { ok: true, data: null };
  } catch (e) {
    return fail(e, "키워드 상태를 바꾸지 못했습니다");
  }
}

export async function deleteGeoKeyword(
  targetId: string,
  keywordId: string,
): Promise<GeoResult<null>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  try {
    await db.deleteGeoKeyword(keywordId);
    revalidatePath(`/geo-check/${targetId}`);
    return { ok: true, data: null };
  } catch (e) {
    return fail(e, "키워드를 삭제하지 못했습니다");
  }
}

// ── 실행 ────────────────────────────────────────────────────

/**
 * 실행을 만들고 결과 행을 pending 으로 미리 깔아둔 뒤 runId 를 즉시 반환한다.
 * 클라이언트는 이 runId 로 진행률 폴링을 시작한 다음 executeGeoRun 을 부른다.
 */
export async function startGeoRun(
  targetId: string,
): Promise<GeoResult<{ runId: string; total: number }>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  if (!process.env.OPENAI_API_KEY) {
    return {
      ok: false,
      error: "OPENAI_API_KEY 환경변수가 설정되지 않았습니다. .env.local 에 키를 추가한 뒤 서버를 재시작하세요.",
    };
  }

  try {
    const target = await db.getGeoTarget(targetId);
    if (!target) return { ok: false, error: "대상을 찾을 수 없습니다." };

    const keywords = (await db.listGeoKeywords(targetId)).filter((k) => k.active);
    if (!keywords.length) return { ok: false, error: "활성 키워드가 없습니다. 먼저 키워드를 등록해 주세요." };
    if (keywords.length > MAX_KEYWORDS) {
      return { ok: false, error: `활성 키워드가 ${MAX_KEYWORDS}개를 넘습니다. 일부를 비활성화해 주세요.` };
    }

    const admin = await getAdminUser();
    const runId = await db.insertGeoRun({
      targetId,
      model: COLLECT_MODEL,
      totalCount: keywords.length,
      startedBy: admin?.name ?? null,
    });
    await db.insertPendingResults(
      runId,
      keywords.map((k) => ({ id: k.id, keyword: k.keyword })),
    );

    return { ok: true, data: { runId, total: keywords.length } };
  } catch (e) {
    return fail(e, "실행을 시작하지 못했습니다");
  }
}

export type ExecuteSummary = {
  found: number;
  done: number;
  total: number;
  failed: number;
  status: GeoRunStatus;
};

/** pending 결과 행을 채운다. 이미 done 인 행은 건드리지 않으므로 재실행에도 그대로 쓴다. */
export async function executeGeoRun(runId: string): Promise<GeoResult<ExecuteSummary>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  try {
    const detail = await db.getGeoRunDetail(runId);
    if (!detail) return { ok: false, error: "실행을 찾을 수 없습니다." };

    const target = await db.getGeoTarget(detail.run.targetId);
    if (!target) return { ok: false, error: "대상을 찾을 수 없습니다." };

    const queue = detail.results.filter((r) => r.status !== "done");
    const deadline = Date.now() + BUDGET_MS;
    let cursor = 0;
    let budgetHit = false;

    async function worker() {
      for (;;) {
        const i = cursor++;
        if (i >= queue.length) return;
        if (Date.now() > deadline) {
          budgetHit = true;
          return;
        }
        const row = queue[i];
        try {
          const outcome = await checkOne(row.keywordText, target!);
          await db.updateGeoRunResult(row.id, { status: "done", ...outcome });
        } catch (e) {
          await db.updateGeoRunResult(row.id, {
            status: "error",
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker()),
    );

    // 최종 집계는 DB 를 다시 읽어서 만든다 (부분 실패·중간 종료를 그대로 반영).
    const after = await db.getGeoRunDetail(runId);
    const rows = after?.results ?? [];
    const found = rows.filter((r) => r.found === true).length;
    const failed = rows.filter((r) => r.status === "error").length;
    const pending = rows.filter((r) => r.status === "pending").length;
    const done = rows.filter((r) => r.status === "done").length;

    const status: GeoRunStatus =
      pending > 0 || budgetHit ? "partial" : failed === rows.length ? "failed" : "done";

    await db.finishGeoRun(runId, { status, foundCount: found, failedCount: failed });
    revalidatePath(`/geo-check/${detail.run.targetId}`);

    return { ok: true, data: { found, done, total: rows.length, failed, status } };
  } catch (e) {
    return fail(e, "실행 중 오류가 발생했습니다");
  }
}

/** 실패·미완료 행만 다시 돌린다. 이미 성공한 키워드에는 API 비용을 다시 쓰지 않는다. */
export async function retryGeoRun(runId: string): Promise<GeoResult<ExecuteSummary>> {
  return executeGeoRun(runId);
}

/**
 * 진행률 폴링용 조회.
 * ★ 여기에 revalidatePath 를 넣으면 실행 중인 액션과 큐잉되어 폴링이 멈춘다. 절대 금지.
 */
export async function getRunProgress(runId: string): Promise<GeoResult<GeoRunDetail>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  const detail = await db.getGeoRunDetail(runId);
  if (!detail) return { ok: false, error: "실행을 찾을 수 없습니다." };
  return { ok: true, data: detail };
}

// ── 판정 ────────────────────────────────────────────────────

type CheckOutcome = {
  found: boolean;
  verdict: db.GeoVerdict;
  rank: number | null;
  matchedText: string | null;
  matchBy: GeoMatchBy;
  needsReview: boolean;
  siteCited: boolean;
  answerText: string;
  citations: db.GeoCitation[];
};

/** 키워드 1개: 답변 수집 → 코드 판정 + LLM 판정 → 병합. */
async function checkOne(keyword: string, target: db.GeoTarget): Promise<CheckOutcome> {
  const signal = AbortSignal.timeout(PER_KEYWORD_MS);

  // 1) 수집 — 키워드 원문만. 병원명은 절대 넘기지 않는다.
  const collected = await askChatGpt(keyword, target.region, signal);

  // 2) 판정 — 코드와 LLM 을 모두 돌려 서로 교차 검증한다.
  const code = matchHospital(collected.answer, target.name, target.aliases);
  const judge = await judgeAnswer(collected.answer, target.name, target.aliases, signal);
  // 3) 본문에 이름이 없어도 공식 홈페이지가 출처로 인용됐으면 그것도 노출로 친다.
  const site = citesOwnSite(collected.citations, target.siteDomains);

  return {
    ...merge(code, judge, site.cited),
    answerText: collected.answer,
    citations: collected.citations,
  };
}

/**
 * 코드 판정과 LLM 판정을 합친다.
 *
 * 최종 O/X 는 둘 중 하나라도 등장이라 하면 O(OR)로 본다. 다만 인용문이 환각으로
 * 확인된 LLM 판정은 근거로 치지 않는다. 두 판정이 엇갈리거나 fuzzy 매칭이면
 * needsReview 를 세워 화면에 ⚠ 로 띄운다 — 자동으로 한쪽을 버리기보다
 * 사람이 보고 별칭을 추가하는 쪽이 정확도가 빨리 올라간다.
 */
function merge(code: CodeMatch, judge: JudgeResult, siteCited: boolean) {
  const llmFound = judge.mentioned && !judge.quoteHallucinated;
  const found = code.found || llmFound || siteCited;

  const matchBy: GeoMatchBy =
    code.found && llmFound ? "both"
      : code.found ? "code"
      : llmFound ? "llm"
      : siteCited ? "site"
      : "none";

  // 본문에는 없는데 홈페이지만 인용된 경우는 정상이므로 검토 대상이 아니다.
  const needsReview =
    code.found !== judge.mentioned || code.strength === "fuzzy" || judge.quoteHallucinated;

  // verdict 는 LLM 만 구분할 수 있다(추천 vs 단순 언급 vs 부정적 언급).
  // 코드만 찾은 경우엔 최소한 "언급됨"으로 둔다.
  const verdict: db.GeoVerdict = llmFound
    ? judge.verdict
    : code.found || siteCited
      ? "mentioned"
      : "absent";

  return {
    found,
    verdict,
    rank: llmFound ? judge.rank : null,
    matchedText: code.matchedText ?? (llmFound ? judge.matchedText : null),
    matchBy,
    needsReview,
    siteCited,
  };
}

/** 줄 단위 입력 정리: 공백 제거 → 빈 줄 제거 → 중복 제거. */
function cleanList(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const v = item.trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}
