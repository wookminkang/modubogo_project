import { requireEmployee } from "@/lib/employee";
import { getWorkLogsForMonth, getLeaveRequestsByEmployee } from "@/lib/db";
import { getPublicHolidays } from "@/lib/publicHoliday";
import MonthNav from "@/components/MonthNav";
import WorkLogCalendar from "./WorkLogCalendar";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function EmployeeHomePage({ searchParams }: Props) {
  const employee = await requireEmployee();
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

  const { month: qMonth } = await searchParams;
  const month = qMonth && /^\d{4}-\d{2}$/.test(qMonth) ? qMonth : today.slice(0, 7);

  const [year, monthNum] = month.split("-").map(Number);
  const [logs, leaveRequests, holidays] = await Promise.all([
    getWorkLogsForMonth(employee.id, month),
    getLeaveRequestsByEmployee(employee.id),
    getPublicHolidays(year, monthNum),
  ]);
  const leaveRanges = leaveRequests
    .filter((r) => r.status === "approved")
    .map((r) => ({ startDate: r.start_date, endDate: r.end_date }));
  const writtenDays = logs.filter((l) => l.content.trim() !== "").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">업무일지</h1>
          <p className="text-sm text-gray-500 mt-1">
            날짜를 선택해 그날 업무 내용을 자유롭게 기록해주세요. 이번 달{" "}
            <span className="font-semibold text-[#0e299c]">{writtenDays}일</span> 작성했어요.
          </p>
        </div>
        <MonthNav basePath="/employee" month={month} />
      </div>

      <WorkLogCalendar
        month={month}
        today={today}
        logs={logs}
        leaveRanges={leaveRanges}
        holidays={holidays}
      />
    </div>
  );
}
