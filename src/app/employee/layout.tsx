import Link from "next/link";
import Image from "next/image";
import { getEmployeeUser } from "@/lib/employee";
import EmployeeSidebar from "./EmployeeSidebar";
import EmployeeTopBar from "./EmployeeTopBar";

/**
 * 직원 영역 독립 레이아웃. 관리자 Header/Footer 는 쓰지 않는다
 * (관리자 세션 기준 nav/대시보드 링크가 직원에게 맞지 않음).
 * 로그인 상태면 좌측 사이드바(EmployeeSidebar) 레이아웃, 아니면(로그인/가입 화면) 단순 센터 레이아웃.
 */
export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getEmployeeUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F0F4FA] flex flex-col">
        <header className="sticky top-0 z-20 bg-white border-b border-gray-100">
          <div className="max-w-[480px] mx-auto px-5 h-14 flex items-center">
            <Link href="/employee/login" className="flex items-center gap-2">
              <Image
                src="/modubogo_logo.svg"
                alt="모두보고"
                width={80}
                height={24}
                className="h-6 w-auto"
              />
              <span className="text-sm font-bold text-gray-400">직원</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[480px] mx-auto px-5 py-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F4FA] flex">
      <EmployeeSidebar allowedMenus={user.allowedMenus} />
      <div className="flex flex-1 min-w-0 flex-col">
        <EmployeeTopBar user={user} />
        <main className="flex-1 min-w-0 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
