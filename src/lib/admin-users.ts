import "server-only";
import { supabaseAdmin } from "./supabaseAdmin";
import type { AdminRole } from "./admin";

/**
 * 관리자 계정(admin_users) 조회·관리 모듈. service_role 로만 접근(RLS 차단 테이블).
 * ⚠️ 서버 전용 — 클라이언트 컴포넌트에서 import 금지.
 */

export interface AdminUserRow {
  id: string;
  username: string;
  name: string;
  role: AdminRole;
  created_at: string;
}

/** 가입된 전체 관리자 계정 목록 (가입일 오름차순) */
export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("id, username, name, role, created_at")
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as AdminUserRow[];
}
