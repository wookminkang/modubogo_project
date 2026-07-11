"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPassword, signSession } from "./auth-crypto";
import { supabaseAdmin } from "./supabaseAdmin";

/**
 * 아이디 + 비밀번호 로그인.
 * admin_users 에서 username 조회 → scrypt 해시 검증 → 성공 시 서명 세션 쿠키 저장.
 */
export async function loginAdmin(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) redirect("/admin/login?error=1");

  const { data } = await supabaseAdmin
    .from("admin_users")
    .select("id, password_hash")
    .eq("username", username)
    .single();

  if (!data || !verifyPassword(password, data.password_hash)) {
    redirect("/admin/login?error=1");
  }

  const cookieStore = await cookies();
  cookieStore.set("admin_session", signSession(data.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7일
    path: "/",
  });
  redirect("/hospital");
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
  redirect("/report");
}
