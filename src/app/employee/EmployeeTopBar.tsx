import { logoutEmployee } from "@/lib/employee-actions";
import type { EmployeeUser } from "@/lib/employee";

/** 메인 영역 상단바 — 프로필(아바타+이름)과 로그아웃. 참고 디자인의 상단 우측 프로필 영역 자리. */
export default function EmployeeTopBar({ user }: { user: EmployeeUser }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-end gap-3 border-b border-gray-100 bg-white px-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0e299c]/10 text-sm font-bold text-[#0e299c]">
          {user.name.slice(0, 1)}
        </span>
        <span className="text-sm font-semibold text-gray-700">{user.name}님</span>
      </div>
      <form action={logoutEmployee}>
        <button
          type="submit"
          className="text-xs font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          로그아웃
        </button>
      </form>
    </header>
  );
}
