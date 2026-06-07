import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requireSuperAdmin } from "@/lib/admin";
import { logoutAdmin } from "@/lib/admin-actions";

/**
 * 슈퍼관리자 전용 영역 레이아웃.
 * 모든 /super/* 페이지는 여기서 한 번 슈퍼 권한을 검증한다(미로그인/직원은 리다이렉트).
 */
export default async function SuperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await requireSuperAdmin();

  return (
    <div className="min-h-screen bg-[#F0F4FA] flex flex-col">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/super" className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#0e299c]">
              <ShieldCheck size={16} className="text-white" />
            </span>
            <span className="text-base font-bold text-[#0e299c] tracking-tight">
              슈퍼관리자
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-gray-500">
              {me.name}님
            </span>
            <form action={logoutAdmin}>
              <button
                type="submit"
                className="text-xs font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-5 py-8">{children}</main>
    </div>
  );
}
