import { requireEmployee, listEmployees } from "@/lib/employee";
import { getAllLeaveRequestsForAdmin, getTeamEventsForMonth } from "@/lib/db";
import { getPublicHolidays } from "@/lib/publicHoliday";
import MonthNav from "@/components/MonthNav";
import TeamCalendar from "./TeamCalendar";
import type { TeamLeaveItem } from "./team-calendar-types";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ month?: string }>;
}

/**
 * 팀 캘린더 — 모든 직원이 서로의 휴가 + 팀 일정(회의·미팅·중요)을 보는 화면.
 * 휴가: 승인=색 막대, 대기=점선 막대, 사유 미노출. 일정: 누구나 등록, 작성자만 수정/삭제.
 * 직원 이름은 employees 가 RLS 잠금이라 listEmployees()(service-role) Map 으로 매칭 (anon join 금지).
 */
export default async function TeamCalendarPage({ searchParams }: Props) {
  const me = await requireEmployee();
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

  const { month: qMonth } = await searchParams;
  const month = qMonth && /^\d{4}-\d{2}$/.test(qMonth) ? qMonth : today.slice(0, 7);
  const [year, monthNum] = month.split("-").map(Number);
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(new Date(year, monthNum, 0).getDate()).padStart(2, "0")}`;

  const [employees, allLeaves, events, holidays] = await Promise.all([
    listEmployees(),
    getAllLeaveRequestsForAdmin(),
    getTeamEventsForMonth(month),
    getPublicHolidays(year, monthNum),
  ]);

  const approvedEmployees = employees.filter((e) => e.status === "approved");
  const nameById: Record<string, string> = Object.fromEntries(
    employees.map((e) => [e.id, e.name]),
  );
  const colorIndexByEmployee: Record<string, number> = Object.fromEntries(
    approvedEmployees.map((e, i) => [e.id, i]),
  );

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
        <h1 className="text-xl font-bold text-gray-900">팀 캘린더</h1>
        <p className="text-sm text-gray-500 mt-1">
          팀원 휴가와 회의·미팅 일정을 한눈에. 날짜를 누르면 상세를 보고 일정을 추가할 수 있어요.
          {" · "}이번 달 승인 휴가{" "}
          <span className="font-semibold text-[#0e299c]">{approvedThisMonth.length}건</span>
          {" · "}일정 <span className="font-semibold text-[#0e299c]">{events.length}건</span>
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

      {/* 월 이동은 캘린더 바로 위 가운데 */}
      <div className="flex justify-center">
        <MonthNav basePath="/employee/team-calendar" month={month} />
      </div>

      <TeamCalendar
        month={month}
        today={today}
        leaves={leaves}
        events={events}
        holidays={holidays}
        colorIndexByEmployee={colorIndexByEmployee}
        currentEmployeeId={me.id}
        nameById={nameById}
      />
    </div>
  );
}
