"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hashPassword, verifyPassword, signSession } from "./auth-crypto";
import { supabaseAdmin } from "./supabaseAdmin";
import { isAdmin, getAdminUser, canAccessMenu } from "./admin";
import { isEmployeeMenuKey } from "./employee-menus";

/**
 * 직원 회원가입. username 중복이면 에러로 되돌아간다.
 * 승인 전(status='pending')까지는 로그인할 수 없다.
 */
export async function signupEmployee(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const hireDate = String(formData.get("hireDate") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!username || !name || !phone || !email || !hireDate || !password) {
    redirect("/employee/signup?error=missing");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/employee/signup?error=email");
  }
  if (password !== passwordConfirm) {
    redirect("/employee/signup?error=mismatch");
  }

  const { data: existing } = await supabaseAdmin
    .from("employees")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (existing) {
    redirect("/employee/signup?error=duplicate");
  }

  const { error } = await supabaseAdmin.from("employees").insert({
    username,
    name,
    phone,
    email,
    hire_date: hireDate,
    password_hash: hashPassword(password),
    status: "pending",
  });
  if (error) {
    redirect("/employee/signup?error=unknown");
  }

  redirect("/employee/login?signup=1");
}

/**
 * 직원 로그인. status 에 따라 별도 에러 메시지로 되돌아간다.
 */
export async function loginEmployee(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) redirect("/employee/login?error=1");

  const { data } = await supabaseAdmin
    .from("employees")
    .select("id, password_hash, status")
    .eq("username", username)
    .single();

  if (!data || !verifyPassword(password, data.password_hash)) {
    redirect("/employee/login?error=1");
  }
  if (data.status === "pending") redirect("/employee/login?error=pending");
  if (data.status === "rejected") redirect("/employee/login?error=rejected");

  const cookieStore = await cookies();
  cookieStore.set("employee_session", signSession(data.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7일
    path: "/",
  });
  redirect("/employee");
}

export async function logoutEmployee() {
  const cookieStore = await cookies();
  cookieStore.delete("employee_session");
  redirect("/employee/login");
}

/** 직원 가입 승인 (관리자 전용). */
export async function approveEmployeeAction(formData: FormData) {
  if (!(await isAdmin())) throw new Error("권한이 없습니다.");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { error } = await supabaseAdmin
    .from("employees")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`승인 실패: ${error.message}`);

  revalidatePath("/admin/employees");
}

/** 직원 가입 거절 (관리자 전용). */
export async function rejectEmployeeAction(formData: FormData) {
  if (!(await isAdmin())) throw new Error("권한이 없습니다.");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { error } = await supabaseAdmin
    .from("employees")
    .update({ status: "rejected", approved_at: null })
    .eq("id", id);
  if (error) throw new Error(`거절 실패: ${error.message}`);

  revalidatePath("/admin/employees");
}

/**
 * 직원 연차(연간 부여일수 + 수동 보정치) 수정 (관리자 전용).
 * 보정치는 수습기간 제외·주말 출근 대체휴가 등 자동 공식(computeEntitledLeaveDays)으로
 * 표현 안 되는 회사별 예외를 관리자가 +/- 로 직접 맞추는 값이다.
 */
export async function updateLeaveQuotaAction(formData: FormData) {
  if (!(await isAdmin())) throw new Error("권한이 없습니다.");
  const id = String(formData.get("id") ?? "");
  const days = Number(formData.get("annualLeaveDays"));
  const adjustment = Number(formData.get("leaveAdjustmentDays") ?? 0);
  if (!id || !Number.isFinite(days) || days < 0 || !Number.isFinite(adjustment)) return;

  const { error } = await supabaseAdmin
    .from("employees")
    .update({ annual_leave_days: days, leave_adjustment_days: adjustment })
    .eq("id", id);
  if (error) throw new Error(`연차 수정 실패: ${error.message}`);

  revalidatePath("/admin/employees");
}

/**
 * 직원 확장 메뉴 권한을 통째로 저장한다 (직원 관리 메뉴 권한이 있는 관리자).
 * `/admin/employees` 카드의 체크박스에서 호출 — 알 수 없는 키는 걸러내고 정의된 키만 저장.
 * (슈퍼관리자 전용 토글은 `src/app/admin/accounts/actions.ts` 참고 — 같은 컬럼을 다룬다.)
 */
export async function setEmployeeMenusAction(
  employeeId: string,
  menus: string[],
): Promise<{ ok: boolean; error?: string }> {
  const admin = await getAdminUser();
  if (!admin || !canAccessMenu(admin, "employees")) {
    return { ok: false, error: "권한이 없습니다." };
  }
  if (!employeeId) return { ok: false, error: "직원을 찾을 수 없습니다." };

  const cleaned = Array.from(new Set(menus.filter(isEmployeeMenuKey)));
  const { error } = await supabaseAdmin
    .from("employees")
    .update({ allowed_menus: cleaned })
    .eq("id", employeeId)
    .eq("status", "approved");
  if (error) return { ok: false, error: "저장에 실패했습니다." };

  revalidatePath("/admin/employees");
  revalidatePath("/admin/accounts");
  return { ok: true };
}
