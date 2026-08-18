"use server";

import { revalidatePath } from "next/cache";
import {
  createTeamEvent,
  updateTeamEvent,
  deleteTeamEvent,
  type TeamEventCategory,
  type TeamEventInput,
} from "./db";
import { getEmployeeUser } from "./employee";

const PATH = "/employee/team-calendar";

export type TeamEventFormValues = {
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  category: string;
  memo: string;
};

type Result = { ok: true } | { ok: false; error: string };

const CATEGORIES: TeamEventCategory[] = ["meeting", "client", "important", "etc"];

/** 폼 값 검증·정규화. 실패 시 에러 메시지 문자열. */
function normalize(v: TeamEventFormValues): TeamEventInput | string {
  const title = v.title.trim();
  if (!title) return "제목을 입력해주세요.";
  if (title.length > 100) return "제목은 100자 이내로 입력해주세요.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.eventDate)) return "날짜가 올바르지 않습니다.";
  const time = (t: string) => (/^\d{2}:\d{2}$/.test(t) ? t : null);
  const startTime = time(v.startTime);
  const endTime = time(v.endTime);
  if (startTime && endTime && endTime < startTime) return "종료 시간이 시작 시간보다 빠릅니다.";
  const category = CATEGORIES.includes(v.category as TeamEventCategory)
    ? (v.category as TeamEventCategory)
    : "etc";
  const memo = v.memo.trim().slice(0, 1000);
  return { title, eventDate: v.eventDate, startTime, endTime: startTime ? endTime : null, category, memo };
}

/** 팀 일정 등록 — 작성자는 세션 직원(클라이언트 입력 안 받음). */
export async function createTeamEventAction(values: TeamEventFormValues): Promise<Result> {
  const me = await getEmployeeUser();
  if (!me) return { ok: false, error: "로그인이 필요합니다." };
  const input = normalize(values);
  if (typeof input === "string") return { ok: false, error: input };
  try {
    await createTeamEvent(me.id, input);
  } catch {
    return { ok: false, error: "저장에 실패했습니다. (team_events 테이블 확인)" };
  }
  revalidatePath(PATH);
  return { ok: true };
}

/** 팀 일정 수정 — 작성자 본인만 (created_by 조건은 DB 쿼리에서 강제). */
export async function updateTeamEventAction(
  id: string,
  values: TeamEventFormValues,
): Promise<Result> {
  const me = await getEmployeeUser();
  if (!me) return { ok: false, error: "로그인이 필요합니다." };
  const input = normalize(values);
  if (typeof input === "string") return { ok: false, error: input };
  try {
    const ok = await updateTeamEvent(id, me.id, input);
    if (!ok) return { ok: false, error: "본인이 등록한 일정만 수정할 수 있어요." };
  } catch {
    return { ok: false, error: "수정에 실패했습니다." };
  }
  revalidatePath(PATH);
  return { ok: true };
}

/** 팀 일정 삭제 — 작성자 본인만. */
export async function deleteTeamEventAction(id: string): Promise<Result> {
  const me = await getEmployeeUser();
  if (!me) return { ok: false, error: "로그인이 필요합니다." };
  try {
    const ok = await deleteTeamEvent(id, me.id);
    if (!ok) return { ok: false, error: "본인이 등록한 일정만 삭제할 수 있어요." };
  } catch {
    return { ok: false, error: "삭제에 실패했습니다." };
  }
  revalidatePath(PATH);
  return { ok: true };
}
