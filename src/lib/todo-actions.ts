"use server";

import { revalidatePath } from "next/cache";
import {
  createEmployeeTodo,
  updateEmployeeTodo,
  deleteEmployeeTodo,
  type TaskPriority,
  type TaskStatus,
} from "./db";
import { getEmployeeUser } from "./employee";

const PATH = "/employee/todo";

type Result = { ok: true } | { ok: false; error: string };

function parsePriority(v: string): TaskPriority {
  return v === "high" || v === "low" ? v : "normal";
}
function parseStatus(v: string): TaskStatus | null {
  return v === "todo" || v === "in_progress" || v === "done" ? v : null;
}

/** 투두 등록 — employeeId 는 세션에서만 (tasks/worklog 와 동일 원칙). */
export async function createTodoAction(values: {
  title: string;
  memo: string;
  priority: string;
  dueDate: string;
}): Promise<Result> {
  const me = await getEmployeeUser();
  if (!me) return { ok: false, error: "로그인이 필요합니다." };
  const title = values.title.trim().slice(0, 200);
  if (!title) return { ok: false, error: "할 일을 입력해주세요." };
  const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(values.dueDate) ? values.dueDate : null;
  try {
    await createEmployeeTodo(me.id, {
      title,
      memo: values.memo.trim().slice(0, 1000),
      priority: parsePriority(values.priority),
      dueDate,
    });
  } catch {
    return { ok: false, error: "등록에 실패했습니다. (employee_todos 테이블 확인)" };
  }
  revalidatePath(PATH);
  return { ok: true };
}

/** 상태 전환 — done 진입 시 completed_at 기록, 벗어나면 해제. */
export async function updateTodoStatusAction(id: string, status: string): Promise<Result> {
  const me = await getEmployeeUser();
  if (!me) return { ok: false, error: "로그인이 필요합니다." };
  const next = parseStatus(status);
  if (!next) return { ok: false, error: "잘못된 상태입니다." };
  try {
    const ok = await updateEmployeeTodo(id, me.id, {
      status: next,
      completed_at: next === "done" ? new Date().toISOString() : null,
    });
    if (!ok) return { ok: false, error: "본인 투두만 옮길 수 있어요." };
  } catch {
    return { ok: false, error: "변경에 실패했습니다." };
  }
  revalidatePath(PATH);
  return { ok: true };
}

/** 내용 수정 (제목·메모·우선순위·마감일). */
export async function updateTodoAction(
  id: string,
  values: { title: string; memo: string; priority: string; dueDate: string },
): Promise<Result> {
  const me = await getEmployeeUser();
  if (!me) return { ok: false, error: "로그인이 필요합니다." };
  const title = values.title.trim().slice(0, 200);
  if (!title) return { ok: false, error: "할 일을 입력해주세요." };
  try {
    const ok = await updateEmployeeTodo(id, me.id, {
      title,
      memo: values.memo.trim().slice(0, 1000),
      priority: parsePriority(values.priority),
      due_date: /^\d{4}-\d{2}-\d{2}$/.test(values.dueDate) ? values.dueDate : null,
    });
    if (!ok) return { ok: false, error: "본인 투두만 수정할 수 있어요." };
  } catch {
    return { ok: false, error: "수정에 실패했습니다." };
  }
  revalidatePath(PATH);
  return { ok: true };
}

export async function deleteTodoAction(id: string): Promise<Result> {
  const me = await getEmployeeUser();
  if (!me) return { ok: false, error: "로그인이 필요합니다." };
  try {
    const ok = await deleteEmployeeTodo(id, me.id);
    if (!ok) return { ok: false, error: "본인 투두만 삭제할 수 있어요." };
  } catch {
    return { ok: false, error: "삭제에 실패했습니다." };
  }
  revalidatePath(PATH);
  return { ok: true };
}
