import { requireEmployee, listEmployees } from "@/lib/employee";
import { getAllLeaveRequestsForAdmin } from "@/lib/db";
import { getPublicHolidays } from "@/lib/publicHoliday";
import { leaveAmount } from "@/lib/utils";
import MonthNav from "@/components/MonthNav";
import TeamLeaveCalendar, { unitLabel, type TeamLeaveItem } from "./TeamLeaveCalendar";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ month?: string }>;
}

/**
 * 팀 휴가 캘린더 — 모든 직원이 서로의 휴가 일정을 볼 수 있는 읽기 전용 화면.
 * 승인된 휴가는 색 칩, 승인 대기는 점선 칩으로 표시. 사유는 개인정보라 노출하지 않는다.
 * 직원 이름은 employees 가 RLS 잠금이라 listEmployees()(service-role) Map 으로 매칭 (anon join 금지).
 */
export default async function TeamLeavePage({ searchParams }: Props) {
  const me = await requireEmployee();
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
  const nameById = new Map(approvedEmployees.map((e) => [e.id, e.name]));
  const colorIndexByEmployee = new Map(approvedEmployees.map((e, i) => [e.id, i]));

  // 이번 달과 겹치는 승인/대기 휴가만 (거절 제외, 탈퇴/미승인 직원 제외)
  const items: TeamLeaveItem[] = allLeaves
    .filter((r) => r.status !== "rejected")
    .filter((r) => r.start_date <= monthEnd && r.end_date >= monthStart)
    .filter((r) => nameById.has(r.employee_id))
    .map((r) => ({
      id: r.id,
      employeeId: r.employee_id,
      employeeName: nameById.get(r.employee_id) ?? "",
      startDate: r.start_date,
      endDate: r.end_date,
      unit: r.unit,
      status: r.status as "approved" | "pending",
    }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const approvedThisMonth = items.filter((it) => it.status === "approved");
  const onLeaveToday = items.filter(
    (it) => it.status === "approved" && it.startDate <= today && it.endDate >= today,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">팀 휴가</h1>
          <p className="text-sm text-gray-500 mt-1">
            팀원들의 휴가 일정을 한눈에 볼 수 있어요. 이번 달 승인된 휴가{" "}
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
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="md:flex-1 min-w-0 flex flex-col gap-3">
          {/* 월 이동은 캘린더 바로 위 가운데 — 우측 상단은 넓은 화면에서 눈에 안 띄어 옮김 */}
          <div className="flex justify-center">
            <MonthNav basePath="/employee/team-leave" month={month} />
          </div>
          <TeamLeaveCalendar
            month={month}
            today={today}
            items={items}
            holidays={holidays}
            colorIndexByEmployee={colorIndexByEmployee}
            currentEmployeeId={me.id}
          />
        </div>

        {/* 이번 달 휴가 목록 */}
        <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3 md:w-[300px] md:shrink-0">
          <span className="text-sm font-bold text-gray-900">이번 달 휴가 일정</span>
          {items.length === 0 ? (
            <p className="text-sm text-gray-400">이번 달에는 등록된 휴가가 없어요.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-gray-100">
              {items.map((it) => {
                const half = unitLabel(it.unit);
                const days = leaveAmount({
                  start_date: it.startDate,
                  end_date: it.endDate,
                  unit: it.unit,
                });
                const range =
                  it.startDate === it.endDate
                    ? it.startDate.slice(5).replace("-", ".")
                    : `${it.startDate.slice(5).replace("-", ".")} ~ ${it.endDate
                        .slice(5)
                        .replace("-", ".")}`;
                return (
                  <li key={it.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {it.employeeName}
                        {it.employeeId === me.id && (
                          <span className="ml-1 text-[10px] font-medium text-[#0e299c]">나</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        {range}
                        {half ? ` · ${half}` : ` · ${days}일`}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        it.status === "approved"
                          ? "bg-[#0e299c]/10 text-[#0e299c]"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {it.status === "approved" ? "승인" : "대기"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-[11px] text-gray-400 border-t border-gray-100 pt-3">
            휴가 사유는 본인과 관리자만 볼 수 있어요. 점선 칩은 아직 승인 대기 중인 신청이에요.
          </p>
        </div>
      </div>
    </div>
  );
}
