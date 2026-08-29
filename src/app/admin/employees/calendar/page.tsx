import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { listEmployees } from "@/lib/employee";
import { getAllLeaveRequestsForAdmin } from "@/lib/db";
import { getPublicHolidays } from "@/lib/publicHoliday";
import MonthNav from "@/components/MonthNav";
import AdminLeaveCalendar from "./AdminLeaveCalendar";
import type { TeamLeaveItem } from "@/app/employee/team-calendar/team-calendar-types";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ month?: string }>;
}

/**
 * 휴가 캘린더 — 전 직원 휴가를 월 단위로 한눈에 보는 관리자 전용 읽기 전용 화면.
 * employee/team-calendar 의 휴가 막대 렌더링(AdminLeaveCalendar, 옛 TeamLeaveCalendar.tsx 방식)을
 * 재사용. 팀 일정(team_events) CRUD는 직원 세션 전용이라 이 화면 범위 밖(휴가 조회 요청만 받음).
 */
export default async function AdminLeaveCalendarPage({ searchParams }: Props) {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const { month: qMonth } = await searchParams;
  const month = qMonth && /^\d{4}-\d{2}$/.test(qMonth) ? qMonth : today.slice(0, 7);
  const [year, monthNum] = month.split("-").map(Number);
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(new Date(year, monthNum, 0).getDate()).padStart(2, "0")}`;

  const [employees, allLeaves, holidays] = await Promise.all([
    listEmployees(),
    getAllLeaveRequestsForAdmin(),
    getPublicHolidays(year, monthNum),
  ]);

  const approvedEmployees = employees.filter((e) => e.status === "approved");
  const nameById: Record<string, string> = Object.fromEntries(
    employees.map((e) => [e.id, e.name]),
  );
  const colorIndexByEmployee = new Map(approvedEmployees.map((e, i) => [e.id, i]));

  // 이번 달과 겹치는 승인/대기 휴가만 (거절 제외, 미승인 직원 제외)
  const leaves: TeamLeaveItem[] = allLeaves
    .filter((r) => r.status !== "rejected")
    .filter((r) => r.start_date <= monthEnd && r.end_date >= monthStart)
    .filter((r) => approvedEmployees.some((e) => e.id === r.employee_id))
    .map((r) => ({
      id: r.id,
      employeeId: r.employee_id,
      employeeName: nameById[r.employee_id] ?? "",
      startDate: r.start_date,
      endDate: r.end_date,
      unit: r.unit,
      status: r.status as "approved" | "pending",
    }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const approvedThisMonth = leaves.filter((it) => it.status === "approved");
  const onLeaveToday = leaves.filter(
    (it) => it.status === "approved" && it.startDate <= today && it.endDate >= today,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0e299c]">휴가 캘린더</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          전 직원 휴가를 월 단위로 한눈에 볼 수 있어요.
          {" · "}이번 달 승인 휴가{" "}
          <span className="font-semibold text-[#0e299c]">{approvedThisMonth.length}건</span>
          {today.startsWith(month) && (
            <>
              {" · "}오늘 휴가{" "}
              <span className="font-semibold text-[#0e299c]">
                {onLeaveToday.length === 0
                  ? "없음"
                  : onLeaveToday.map((it) => it.employeeName).join(", ")}
              </span>
            </>
          )}
        </p>
      </div>

      <div className="flex justify-center">
        <MonthNav basePath="/admin/employees/calendar" month={month} />
      </div>

      <AdminLeaveCalendar
        month={month}
        today={today}
        items={leaves}
        holidays={holidays}
        colorIndexByEmployee={colorIndexByEmployee}
      />
    </div>
  );
}
