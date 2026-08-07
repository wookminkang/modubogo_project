import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { listEmployees, type EmployeeRow } from "@/lib/employee";
import {
  approveEmployeeAction,
  rejectEmployeeAction,
  updateLeaveQuotaAction,
} from "@/lib/employee-actions";
import { getAllLeaveRequestsForAdmin } from "@/lib/db";
import { leaveAmount, computeEntitledLeaveDays } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<EmployeeRow["status"], string> = {
  pending: "승인 대기",
  approved: "승인됨",
  rejected: "거절됨",
};

const STATUS_CLASS: Record<EmployeeRow["status"], string> = {
  pending: "bg-orange-100 text-orange-600",
  approved: "bg-[#0e299c]/10 text-[#0e299c]",
  rejected: "bg-gray-100 text-gray-500",
};

export default async function AdminEmployeesPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const [employees, approvedLeave] = await Promise.all([
    listEmployees(),
    getAllLeaveRequestsForAdmin({ status: "approved" }),
  ]);
  const pending = employees.filter((e) => e.status === "pending");
  const others = employees.filter((e) => e.status !== "pending");

  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const thisYear = String(new Date().getFullYear());
  const usedDaysById = new Map<string, number>();
  for (const r of approvedLeave) {
    if (!r.start_date.startsWith(thisYear)) continue;
    usedDaysById.set(r.employee_id, (usedDaysById.get(r.employee_id) ?? 0) + leaveAmount(r));
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-[#0e299c]">직원 승인</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          직원 가입을 승인하고 연차를 관리할 수 있어요
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-gray-700">
          승인 대기 ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-2xl p-4 shadow-sm">
            대기 중인 가입 신청이 없어요.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pending.map((emp) => (
              <li
                key={emp.id}
                className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{emp.name}</p>
                  <p className="text-xs text-gray-400">
                    {emp.username} · {new Date(emp.created_at).toLocaleDateString("ko-KR")}
                  </p>
                  <p className="text-xs text-gray-400">
                    {emp.phone} · {emp.email}
                    {emp.hire_date && ` · 입사 ${emp.hire_date}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <form action={approveEmployeeAction}>
                    <input type="hidden" name="id" value={emp.id} />
                    <button
                      type="submit"
                      className="text-xs font-semibold text-white bg-[#0e299c] px-3 py-1.5 rounded-lg hover:bg-[#0b2180] transition-colors"
                    >
                      승인
                    </button>
                  </form>
                  <form action={rejectEmployeeAction}>
                    <input type="hidden" name="id" value={emp.id} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      거절
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-gray-700">전체 직원 ({others.length})</h2>
        {others.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-2xl p-4 shadow-sm">
            아직 가입한 직원이 없어요.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {others.map((emp) => {
              const used = usedDaysById.get(emp.id) ?? 0;
              const entitled = computeEntitledLeaveDays(
                emp.hire_date,
                emp.annual_leave_days,
                today,
              );
              const remaining = entitled - used;
              return (
                <li
                  key={emp.id}
                  className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{emp.name}</p>
                      <p className="text-xs text-gray-400">{emp.username}</p>
                      <p className="text-xs text-gray-400">
                        {emp.phone} · {emp.email}
                        {emp.hire_date && ` · 입사 ${emp.hire_date}`}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${STATUS_CLASS[emp.status]}`}
                    >
                      {STATUS_LABEL[emp.status]}
                    </span>
                  </div>

                  {emp.status === "approved" && (
                    <form
                      action={updateLeaveQuotaAction}
                      className="flex items-center gap-2 border-t border-gray-100 pt-3"
                    >
                      <input type="hidden" name="id" value={emp.id} />
                      <span className="text-xs text-gray-400 shrink-0">정규 연차(1년 후)</span>
                      <input
                        type="number"
                        name="annualLeaveDays"
                        min={0}
                        step={0.5}
                        defaultValue={emp.annual_leave_days}
                        className="h-8 w-16 px-2 rounded-lg border border-gray-200 text-xs text-gray-700 outline-none focus:border-[#0e299c]"
                      />
                      <span className="text-xs text-gray-400 shrink-0">
                        일 · 현재 부여 {entitled}일 · {thisYear}년 {used}일 사용 ({remaining}일
                        남음)
                      </span>
                      <button
                        type="submit"
                        className="ml-auto text-xs font-medium text-[#0e299c] border border-[#0e299c]/20 px-3 py-1.5 rounded-lg hover:bg-[#0e299c]/5 transition-colors shrink-0"
                      >
                        저장
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
