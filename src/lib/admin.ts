import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "./auth-crypto";
import { supabaseAdmin } from "./supabaseAdmin";

export type AdminRole = "super" | "staff";

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: AdminRole;
}

/**
 * 현재 로그인한 관리자 유저 (없으면 null).
 * 쿠키 `admin_session`(서명 토큰) → HMAC 검증 → admin_users 에서 id 로 조회.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const token = (await cookies()).get("admin_session")?.value;
  const userId = verifySession(token);
  if (!userId) return null;

  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("id, username, name, role")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as AdminUser;
}

/** 관리자(슈퍼/직원) 로그인 여부. 기존 가드 호출처 호환용. */
export async function isAdmin(): Promise<boolean> {
  return (await getAdminUser()) !== null;
}

/**
 * 슈퍼관리자 전용 페이지 가드.
 * 미로그인 → /admin/login, 직원(staff) → /report 로 리다이렉트. 통과 시 유저 반환.
 */
export async function requireSuperAdmin(): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "super") redirect("/report");
  return user;
}
