import { requireEmployee } from "@/lib/employee";
import { getLeaveRequestsByEmployee, type LeaveRequest } from "@/lib/db";
import { cancelLeaveRequestAction } from "@/lib/leave-actions";
import { daysInclusive, computeEntitledLeaveDays, monthsBetween } from "@/lib/utils";
import LeaveRequestForm from "./LeaveRequestForm";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ error?: string; submitted?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  missing: "시작일과 종료일을 입력해주세요.",
  range: "종료일은 시작일보다 빠를 수 없습니다.",
  overlap: "이미 신청된(대기중·승인) 기간과 겹쳐요.",
};

const STATUS_LABEL: Record<LeaveRequest["status"], string> = {
  pending: "대기중",
  approved: "승인됨",
  rejected: "거절됨",
};

const STATUS_CLASS: Record<LeaveRequest["status"], string> = {
  pending: "bg-orange-100 text-orange-600",
  approved: "bg-[#0e299c]/10 text-[#0e299c]",
  rejected: "bg-gray-100 text-gray-500",
};

export default async function EmployeeLeavePage({ searchParams }: Props) {
  const employee = await requireEmployee();
  const { error, submitted } = await searchParams;
  const requests = await getLeaveRequestsByEmployee(employee.id);

  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const thisYear = String(new Date().getFullYear());
  const usedDays = requests
    .filter((r) => r.status === "approved" && r.start_date.startsWith(thisYear))
    .reduce((sum, r) => sum + daysInclusive(r.start_date, r.end_date), 0);
  const entitledDays = computeEntitledLeaveDays(
    employee.hireDate,
    employee.annualLeaveDays,
    today,
  );
  const remainingDays = entitledDays - usedDays;
  const monthsWorked = employee.hireDate ? monthsBetween(employee.hireDate, today) : null;
  const isFirstYear = monthsWorked !== null && monthsWorked < 12;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">휴가신청</h1>
        <p className="text-sm text-gray-500 mt-1">
          기간과 사유를 입력해 신청하면 관리자 승인 후 반영돼요.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm max-w-[480px] flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{thisYear}년 연차</span>
          <span className="text-sm font-bold text-gray-900">
            {entitledDays}일 중 {usedDays}일 사용{" "}
            <span className="text-[#0e299c]">({remainingDays}일 남음)</span>
          </span>
        </div>
        {isFirstYear && (
          <p className="text-xs text-gray-400">
            입사 {monthsWorked}개월차 · 매달 만근하면 1일씩 늘어나요 (정규 연차{" "}
            {employee.annualLeaveDays}일은 입사 1년 후 적용)
          </p>
        )}
      </div>

      <LeaveRequestForm remainingDays={remainingDays} />

      {(submitted === "1" || error) && (
        <p className={`text-xs max-w-[480px] ${error ? "text-red-500" : "text-[#0e299c]"}`}>
          {error
            ? (ERROR_MESSAGES[error] ?? "신청 처리 중 오류가 발생했습니다.")
            : "신청이 완료되었습니다. 승인을 기다려주세요."}
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-gray-700">내 신청 내역</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-2xl p-4 shadow-sm max-w-[480px]">
            신청한 휴가가 없어요.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 max-w-[480px]">
            {requests.map((r) => (
              <li
                key={r.id}
                className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {r.start_date} ~ {r.end_date}
                    <span className="ml-1.5 font-normal text-gray-400">
                      ({daysInclusive(r.start_date, r.end_date)}일)
                    </span>
                  </p>
                  {r.reason && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{r.reason}</p>
                  )}
                </div>
                {r.status === "pending" ? (
                  <form action={cancelLeaveRequestAction} className="shrink-0">
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      취소
                    </button>
                  </form>
                ) : (
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${STATUS_CLASS[r.status]}`}
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
