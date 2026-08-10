import Link from "next/link";
import { requireSuperAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ArrowLeft } from "lucide-react";
import MenuPermissionEditor, { type AccountRow } from "./MenuPermissionEditor";

export const dynamic = "force-dynamic";

/** 관리자 계정별 메뉴 권한 설정 (슈퍼관리자 전용). */
export default async function AdminAccountsPage() {
  await requireSuperAdmin();

  const { data } = await supabaseAdmin
    .from("admin_users")
    .select("id, username, name, role, allowed_menus")
    .order("role", { ascending: false })
    .order("name");
  const accounts = (data ?? []) as AccountRow[];

  return (
    <div className="min-h-screen bg-[#F0F4FA]">
      <div className="px-4 py-6 flex flex-col gap-5 pb-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0e299c]">메뉴 권한 설정</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              계정별로 제한 메뉴 접근 권한을 켜고 끌 수 있어요
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-1 text-sm text-gray-500 bg-white px-3 py-2 rounded-xl shadow-sm"
          >
            <ArrowLeft size={14} />
            대시보드
          </Link>
        </div>

        <MenuPermissionEditor accounts={accounts} />
      </div>
    </div>
  );
}
