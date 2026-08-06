import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin";
import AdminEmployeesSidebar from "./AdminEmployeesSidebar";
import AdminEmployeesTopBar from "./AdminEmployeesTopBar";

/**
 * 관리자 "직원 관리" 영역(직원 승인/업무일지/휴가 승인) 전용 레이아웃.
 * employee/layout.tsx 와 동일한 사이드바+상단바 톤으로 맞췄다(직원 관련 관리자 화면만 —
 * 대시보드·알림톡로그·카테고리색상이나 report/ledger 등 다른 화면은 그대로 유지).
 *
 * 상위 admin/layout.tsx 가 전체를 max-w-[600px] 박스로 감싸고 있어, 그 안에서는
 * 넓은 사이드바 레이아웃이 나올 수 없다. fixed inset-0 로 뷰포트 전체를 덮어
 * 부모의 폭 제약을 벗어난다(자식 페이지들의 부모 컨테이너 밖으로 나가는 표준적인 방식).
 */
export default async function AdminEmployeesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  return (
    <div className="fixed inset-0 z-30 flex bg-[#F0F4FA]">
      <AdminEmployeesSidebar />
      <div className="flex flex-1 min-w-0 flex-col overflow-y-auto">
        <AdminEmployeesTopBar user={user} />
        <main className="flex-1 min-w-0 mx-auto w-full max-w-5xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
