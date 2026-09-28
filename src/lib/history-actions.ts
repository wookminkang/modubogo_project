"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser, canAccessMenu } from "./admin";
import * as db from "./history-db";

// 병원별 히스토리 쓰기. 읽기는 공개(보고서 뷰 탭)지만 쓰기는 보고서 메뉴 권한을 가진 관리자만.
// geo-intake-actions.ts 와 같은 형태 — 권한 확인 → 입력 검증 → 판별 유니온 반환.

export type HistoryResult = { ok: true } | { ok: false; error: string };

const TITLE_MAX = 200;
const BODY_MAX = 5000;

function fail(e: unknown, prefix: string): { ok: false; error: string } {
  return { ok: false, error: `${prefix}: ${e instanceof Error ? e.message : String(e)}` };
}

async function guard(): Promise<{ name: string } | string> {
  const me = await getAdminUser();
  if (!me) return "권한이 없습니다. 관리자로 로그인해 주세요.";
  if (!canAccessMenu(me, "report")) return "보고서 메뉴 권한이 없습니다.";
  return { name: me.name };
}

/** 입력 다듬기 + 검증. 문제가 있으면 사용자에게 보여줄 문장을 돌려준다. */
function clean(input: { happenedOn: string; title: string; body: string }) {
  const happenedOn = input.happenedOn?.trim() ?? "";
  const title = input.title?.trim().slice(0, TITLE_MAX) ?? "";
  const body = (input.body ?? "").trim().slice(0, BODY_MAX);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(happenedOn)) return "날짜를 골라 주세요.";
  if (!title) return "제목을 입력해 주세요.";
  return { happenedOn, title, body };
}

export async function addCompanyHistory(
  company: string,
  input: { happenedOn: string; title: string; body: string },
): Promise<HistoryResult> {
  const me = await guard();
  if (typeof me === "string") return { ok: false, error: me };

  const name = company.trim();
  if (!name) return { ok: false, error: "병원을 찾을 수 없습니다." };

  const value = clean(input);
  if (typeof value === "string") return { ok: false, error: value };

  try {
    await db.insertCompanyHistory({ company: name, ...value, createdBy: me.name });
    revalidatePath(`/report/${name}`);
    return { ok: true };
  } catch (e) {
    return fail(e, "기록을 저장하지 못했습니다");
  }
}

export async function editCompanyHistory(
  id: string,
  input: { happenedOn: string; title: string; body: string },
): Promise<HistoryResult> {
  const me = await guard();
  if (typeof me === "string") return { ok: false, error: me };

  const value = clean(input);
  if (typeof value === "string") return { ok: false, error: value };

  try {
    await db.updateCompanyHistory(id, value);
    return { ok: true };
  } catch (e) {
    return fail(e, "기록을 수정하지 못했습니다");
  }
}

export async function removeCompanyHistory(id: string): Promise<HistoryResult> {
  const me = await guard();
  if (typeof me === "string") return { ok: false, error: me };
  try {
    await db.deleteCompanyHistory(id);
    return { ok: true };
  } catch (e) {
    return fail(e, "기록을 삭제하지 못했습니다");
  }
}

/** 화면에서 저장 직후 목록을 다시 받아올 때 쓴다 (서버 상태를 믿는다) */
export async function fetchCompanyHistories(company: string) {
  return db.listCompanyHistories(company.trim());
}
