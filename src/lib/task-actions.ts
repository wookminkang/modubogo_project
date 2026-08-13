"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  countTasksAssignedAfter,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  type TaskPriority,
  type TaskStatus,
} from "./db";
import { getAdminUser, canAccessMenu, type AdminUser } from "./admin";
import { getEmployeeUser } from "./employee";
import { supabaseAdmin } from "./supabaseAdmin";

const ADMIN_PATH = "/admin/employees/tasks";
const EMPLOYEE_PATH = "/employee/tasks";

/** 직원 관리 메뉴 권한이 있는 관리자만 통과 (업무 생성/수정/삭제 가드). */
async function requireEmployeesAdmin(): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user || !canAccessMenu(user, "employees"))
    throw new Error("권한이 없습니다.");
  return user;
}

function parsePriority(value: string): TaskPriority {
  return value === "high" || value === "low" ? value : "normal";
}

/** [관리자] 업무 등록. 담당자·제목 필수. */
export async function createTaskAction(formData: FormData) {
  const admin = await requireEmployeesAdmin();

  const employeeId = String(formData.get("employeeId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const priority = parsePriority(String(formData.get("priority") ?? "normal"));

  if (!employeeId || !title) redirect(`${ADMIN_PATH}?error=missing`);

  await createTask({ employeeId, title, body, priority, assignedBy: admin.id });
  revalidatePath(ADMIN_PATH);
  revalidatePath(EMPLOYEE_PATH);
  redirect(`${ADMIN_PATH}?created=1`);
}

/** [관리자] 업무 수정 (담당자/제목/내용/우선순위 — 상태는 직원만 변경). */
export async function updateTaskAction(formData: FormData) {
  await requireEmployeesAdmin();

  const id = String(formData.get("id") ?? "");
  const employeeId = String(formData.get("employeeId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const priority = parsePriority(String(formData.get("priority") ?? "normal"));
  // 수정 후 목록 필터 유지용 (hidden input으로 전달)
  const filter = String(formData.get("filter") ?? "");

  if (!id || !employeeId || !title) redirect(`${ADMIN_PATH}?error=missing`);

  await updateTask(id, { employeeId, title, body, priority });
  revalidatePath(ADMIN_PATH);
  revalidatePath(EMPLOYEE_PATH);
  redirect(filter ? `${ADMIN_PATH}?${filter}` : ADMIN_PATH);
}

/** [관리자] 업무 삭제. 클라이언트 컴포넌트에서 ConfirmToast 확인 후 호출. */
export async function deleteTaskAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireEmployeesAdmin();
  if (!id) return { ok: false, error: "잘못된 요청입니다." };

  try {
    await deleteTask(id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "삭제 실패" };
  }
  revalidatePath(ADMIN_PATH);
  revalidatePath(EMPLOYEE_PATH);
  return { ok: true };
}

/**
 * [직원] 상단바 알림 배지용 — 마지막 확인(tasks_seen_at) 이후 새로 배정된 업무 수.
 * tasks_seen_at 컬럼이 아직 없으면(sql/employees_tasks_seen.sql 미실행) 0 을 돌려줘 배지를 숨긴다.
 */
export async function getUnseenTaskCountAction(): Promise<number> {
  const employee = await getEmployeeUser();
  if (!employee) return 0;

  const { data, error } = await supabaseAdmin
    .from("employees")
    .select("tasks_seen_at")
    .eq("id", employee.id)
    .single();
  if (error) return 0;

  return countTasksAssignedAfter(
    employee.id,
    (data.tasks_seen_at as string | null) ?? null,
  );
}

/** [직원] 할당 업무 확인 처리 — tasks_seen_at 을 지금으로 갱신해 배지를 지운다. */
export async function markTasksSeenAction(): Promise<void> {
  const employee = await getEmployeeUser();
  if (!employee) return;

  // 컬럼 미적용 상태면 에러가 나지만 배지도 안 뜨므로 조용히 무시
  await supabaseAdmin
    .from("employees")
    .update({ tasks_seen_at: new Date().toISOString() })
    .eq("id", employee.id);
}

/**
 * 직원 본인 업무 상태 전환. employeeId 는 클라이언트 입력이 아니라
 * 세션(getEmployeeUser())에서만 가져온다 — 타인 업무 변경 방지 (work log 저장과 동일 원칙).
 */
export async function updateTaskStatusAction(
  id: string,
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  const employee = await getEmployeeUser();
  if (!employee) return { ok: false, error: "로그인이 필요합니다." };

  const valid: TaskStatus[] = ["todo", "in_progress", "done"];
  if (!id || !valid.includes(status as TaskStatus))
    return { ok: false, error: "잘못된 요청입니다." };

  try {
    await updateTaskStatus(id, employee.id, status as TaskStatus);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "변경 실패" };
  }
  revalidatePath(EMPLOYEE_PATH);
  revalidatePath(ADMIN_PATH);
  return { ok: true };
}
