import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { logoutAdmin } from "@/lib/admin-actions";
import type { AdminUser } from "@/lib/admin";

/** employee/EmployeeTopBar.tsx 와 동일한 톤의 상단바 — 관리자 프로필(아바타+이름+역할)과 로그아웃. */
export default function AdminEmployeesTopBar({ user }: { user: AdminUser }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-gray-100 bg-white px-6">
      <Link
        href="/hospital"
        className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#0e299c] transition-colors"
      >
        <ArrowLeft size={16} />
        관리자 홈
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0e299c]/10 text-sm font-bold text-[#0e299c]">
            {user.name.slice(0, 1)}
          </span>
          <span className="text-sm font-semibold text-gray-700">
            {user.name}님
            <span className="ml-1.5 text-xs font-normal text-gray-400">
              ({user.role === "super" ? "슈퍼관리자" : "관리자"})
            </span>
          </span>
        </div>
        <form action={logoutAdmin}>
          <button
            type="submit"
            className="text-xs font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            로그아웃
          </button>
        </form>
      </div>
    </header>
  );
}
