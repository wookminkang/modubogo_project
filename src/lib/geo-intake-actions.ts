"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser, canAccessMenu } from "./admin";
import { generateCompanyNanoid } from "./nanoid";
import * as db from "./geo-intake-db";
import { sanitizeAnswers, validateSubmission } from "./geo-intake-fields";

// GEO 병원 정보 폼 서버 액션. geo-actions.ts 의 패턴을 따른다
// (권한 확인 → 입력 검증 → 판별 유니온 반환 → try/catch 로 에러 문자열화).
//
// 관리자 액션은 "GEO 병원조사"(geo-intake) 메뉴 권한까지 확인한다.
// 공개 제출(submitGeoIntake)은 인증이 없으므로 클라이언트 입력을 전부 다시 검증한다.

export type GeoIntakeResult<T> = { ok: true; data: T } | { ok: false; error: string };

function fail(e: unknown, prefix: string): { ok: false; error: string } {
  const detail = e instanceof Error ? e.message : String(e);
  return { ok: false, error: `${prefix}: ${detail}` };
}

async function guard(): Promise<{ name: string } | string> {
  const me = await getAdminUser();
  if (!me) return "권한이 없습니다. 관리자로 로그인해 주세요.";
  if (!canAccessMenu(me, "geo-intake")) return "GEO 병원조사 메뉴 권한이 없습니다.";
  return { name: me.name };
}

// ── 관리자 ──────────────────────────────────────────────────

/** 병원별 링크 생성 → 공개 링크용 nanoid 반환 */
export async function createGeoIntake(company: string): Promise<GeoIntakeResult<{ nanoid: string }>> {
  const me = await guard();
  if (typeof me === "string") return { ok: false, error: me };

  const name = company.trim().slice(0, 100);
  if (!name) return { ok: false, error: "병원명을 입력해 주세요." };

  try {
    const nanoid = generateCompanyNanoid();
    await db.insertGeoIntake({ nanoid, company: name, createdBy: me.name });
    revalidatePath("/geo-intakes");
    return { ok: true, data: { nanoid } };
  } catch (e) {
    return fail(e, "링크를 만들지 못했습니다");
  }
}

export async function deleteGeoIntake(nanoid: string): Promise<GeoIntakeResult<null>> {
  const me = await guard();
  if (typeof me === "string") return { ok: false, error: me };
  try {
    await db.deleteGeoIntake(nanoid);
    revalidatePath("/geo-intakes");
    return { ok: true, data: null };
  } catch (e) {
    return fail(e, "삭제하지 못했습니다");
  }
}

// ── 공개 (인증 없음) ────────────────────────────────────────

/**
 * 병원 담당자 제출. 링크만 있으면 누구나 호출할 수 있으므로 클라이언트 검증을 믿지 않는다:
 * 링크 존재·대기 상태 확인 → 정해진 문항만 추려 다듬기 → 필수·동의 재검증 → 저장.
 * 이미 제출된 링크는 덮어쓰지 않는다 (계정 정보가 링크로 다시 바뀌거나 노출되지 않게).
 */
export async function submitGeoIntake(
  nanoid: string,
  rawAnswers: unknown,
  consent: boolean,
): Promise<GeoIntakeResult<null>> {
  try {
    const row = await db.getGeoIntakeByNanoid(nanoid);
    if (!row) return { ok: false, error: "유효하지 않은 링크입니다." };
    if (row.status === "submitted") return { ok: false, error: "이미 제출된 링크입니다." };

    const answers = sanitizeAnswers(rawAnswers);
    const invalid = validateSubmission(answers, consent === true);
    if (invalid) return { ok: false, error: invalid };

    const saved = await db.submitGeoIntakeRow(nanoid, answers);
    if (!saved) return { ok: false, error: "이미 제출된 링크입니다." };

    revalidatePath("/geo-intakes");
    revalidatePath(`/geo-intakes/${nanoid}`);
    return { ok: true, data: null };
  } catch (e) {
    return fail(e, "제출하지 못했습니다");
  }
}
