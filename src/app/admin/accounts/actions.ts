"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin, type MenuKey } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isEmployeeMenuKey } from "@/lib/employee-menus";

/** 관리자 계정의 제한 메뉴 권한을 켜거나 끈다 (슈퍼관리자 전용). */
export async function toggleMenuPermission(
  userId: string,
  menu: MenuKey,
  granted: boolean
): Promise<{ ok: boolean; error?: string }> {
  await requireSuperAdmin();

  const { data, error: fetchError } = await supabaseAdmin
    .from("admin_users")
    .select("allowed_menus")
    .eq("id", userId)
    .single();
  if (fetchError || !data) return { ok: false, error: "계정을 찾을 수 없습니다." };

  const current = new Set<string>(data.allowed_menus ?? []);
  if (granted) current.add(menu);
  else current.delete(menu);

  const { error } = await supabaseAdmin
    .from("admin_users")
    .update({ allowed_menus: Array.from(current) })
    .eq("id", userId);
  if (error) return { ok: false, error: "저장에 실패했습니다." };

  revalidatePath("/admin/accounts");
  revalidatePath("/admin/employees");
  return { ok: true };
}

/** 직원 계정의 확장 메뉴 권한(진료일정 등)을 켜거나 끈다 (슈퍼관리자 전용). */
export async function toggleEmployeeMenuPermission(
  employeeId: string,
  menu: string,
  granted: boolean
): Promise<{ ok: boolean; error?: string }> {
  await requireSuperAdmin();
  if (!isEmployeeMenuKey(menu)) return { ok: false, error: "알 수 없는 메뉴입니다." };

  const { data, error: fetchError } = await supabaseAdmin
    .from("employees")
    .select("allowed_menus")
    .eq("id", employeeId)
    .single();
  if (fetchError || !data) return { ok: false, error: "직원을 찾을 수 없습니다." };

  const current = new Set<string>(data.allowed_menus ?? []);
  if (granted) current.add(menu);
  else current.delete(menu);

  const { error } = await supabaseAdmin
    .from("employees")
    .update({ allowed_menus: Array.from(current) })
    .eq("id", employeeId);
  if (error) return { ok: false, error: "저장에 실패했습니다." };

  revalidatePath("/admin/accounts");
  revalidatePath("/admin/employees");
  return { ok: true };
}
