import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "./auth-crypto";
import { supabaseAdmin } from "./supabaseAdmin";

export type EmployeeStatus = "pending" | "approved" | "rejected";

export interface EmployeeUser {
  id: string;
  username: string;
  name: string;
  hireDate: string | null;
  annualLeaveDays: number;
  leaveAdjustmentDays: number;
  /** 직원에게 열어준 확장 메뉴 (현재 키: 'holiday'). 사이드바 노출·접근 가드 공용. */
  allowedMenus: string[];
}

export interface EmployeeRow {
  id: string;
  username: string;
  name: string;
  phone: string;
  email: string;
  hire_date: string | null;
  status: EmployeeStatus;
  annual_leave_days: number;
  leave_adjustment_days: number;
  /** 직원에게 열어준 확장 메뉴 키 목록 (`@/lib/employee-menus` EMPLOYEE_MENUS 참고). */
  allowed_menus: string[];
  created_at: string;
}

/**
 * 현재 로그인한 직원 (없거나 미승인이면 null).
 * 쿠키 `employee_session`(서명 토큰) → HMAC 검증 → employees 에서 id 로 조회.
 * admin.ts 의 getAdminUser() 와 동일한 패턴이나 완전히 별도 테이블/쿠키를 쓴다.
 */
export async function getEmployeeUser(): Promise<EmployeeUser | null> {
  const token = (await cookies()).get("employee_session")?.value;
  const userId = verifySession(token);
  if (!userId) return null;

  const { data, error } = await supabaseAdmin
    .from("employees")
    .select("id, username, name, status, hire_date, annual_leave_days, leave_adjustment_days, allowed_menus")
    .eq("id", userId)
    .single();

  if (error || !data || data.status !== "approved") return null;
  return {
    id: data.id,
    username: data.username,
    name: data.name,
    hireDate: data.hire_date,
    annualLeaveDays: data.annual_leave_days,
    leaveAdjustmentDays: data.leave_adjustment_days,
    allowedMenus: (data.allowed_menus as string[] | null) ?? [],
  };
}

/** 직원 전용 페이지 가드. 미인증/미승인 시 로그인 페이지로 리다이렉트. */
export async function requireEmployee(): Promise<EmployeeUser> {
  const user = await getEmployeeUser();
  if (!user) redirect("/employee/login");
  return user;
}

/** 전체 직원 계정 목록 (가입일 오름차순). 관리자 승인 화면용. */
export async function listEmployees(): Promise<EmployeeRow[]> {
  const { data, error } = await supabaseAdmin
    .from("employees")
    .select(
      "id, username, name, phone, email, hire_date, status, annual_leave_days, leave_adjustment_days, allowed_menus, created_at",
    )
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (data as (Omit<EmployeeRow, "allowed_menus"> & { allowed_menus: string[] | null })[]).map(
    (row) => ({ ...row, allowed_menus: row.allowed_menus ?? [] }),
  );
}
