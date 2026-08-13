import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { listEmployees } from "@/lib/employee";
import { getAllTasksForAdmin } from "@/lib/db";
import { EXCLUDED_ASSIGNEE_USERNAMES } from "@/lib/task-ui";
import AdminTaskBoard from "./AdminTaskBoard";

export const dynamic = "force-dynamic";

/**
 * 직원별 업무 진행 현황 — 지라 스타일 칸반 보드 (보기 전용).
 * 상태 전환은 직원만 하는 설계라 드래그 없음. 등록/수정/삭제는 업무 할당
 * (/admin/employees/tasks)에서 — 카드의 "수정"이 해당 업무 수정 폼으로 딥링크된다.
 * 직원 필터 칩·컬럼 구성은 AdminTaskBoard.tsx("use client") 참고.
 */
export default async function AdminTaskProgressPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const [tasks, employees] = await Promise.all([
    getAllTasksForAdmin(),
    listEmployees(),
  ]);

  const staff = employees
    .filter(
      (e) =>
        e.status === "approved" && !EXCLUDED_ASSIGNEE_USERNAMES.has(e.username),
    )
    .map((e) => ({ id: e.id, name: e.name }));
  const staffIds = new Set(staff.map((s) => s.id));
  const staffTasks = tasks.filter((t) => staffIds.has(t.employee_id));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-[#0e299c]">진행 현황</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          배정된 업무의 진행 상태를 보드로 확인하세요
        </p>
      </div>

      {staff.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white rounded-2xl p-4 shadow-sm">
          승인된 직원이 없어요.
        </p>
      ) : (
        <AdminTaskBoard tasks={staffTasks} staff={staff} />
      )}
    </div>
  );
}
