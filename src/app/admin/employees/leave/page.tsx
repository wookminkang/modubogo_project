import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { listEmployees } from "@/lib/employee";
import { getAllLeaveRequestsForAdmin, type LeaveRequest } from "@/lib/db";
import {
  approveLeaveRequestAction,
  rejectLeaveRequestAction,
  revertLeaveRequestAction,
} from "@/lib/leave-actions";
import { leaveAmount } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ employee?: string; status?: string }>;
}

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

const UNIT_LABEL: Record<LeaveRequest["unit"], string> = {
  full: "",
  half_am: "오전반차",
  half_pm: "오후반차",
};

export default async function AdminLeavePage({ searchParams }: Props) {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const { employee, status } = await searchParams;
  const isStatus = (s?: string): s is LeaveRequest["status"] =>
    s === "pending" || s === "approved" || s === "rejected";

  const [requests, employees] = await Promise.all([
    getAllLeaveRequestsForAdmin({
      employeeId: employee || undefined,
      status: isStatus(status) ? status : undefined,
    }),
    listEmployees(),
  ]);
  const nameById = new Map(employees.map((e) => [e.id, e.name]));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-[#0e299c]">휴가 승인</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          직원 휴가신청을 승인하면 직원 업무일지 캘린더에 표시돼요
        </p>
      </div>

      <form
        method="get"
        className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-2"
      >
        <select
          name="employee"
          defaultValue={employee ?? ""}
          className="h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 outline-none focus:border-[#0e299c] flex-1"
        >
          <option value="">전체 직원</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 outline-none focus:border-[#0e299c]"
        >
          <option value="">전체 상태</option>
          <option value="pending">대기중</option>
          <option value="approved">승인됨</option>
          <option value="rejected">거절됨</option>
        </select>
        <button
          type="submit"
          className="h-10 px-4 bg-[#0e299c] hover:bg-[#0b2180] text-white text-sm font-semibold rounded-lg transition-colors shrink-0"
        >
          필터
        </button>
      </form>

      {requests.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white rounded-2xl p-4 shadow-sm">
          조건에 맞는 휴가신청이 없어요.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {requests.map((r) => (
            <li
              key={r.id}
              className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {nameById.get(r.employee_id) ?? "(알 수 없음)"}
                  <span className="ml-2 font-normal text-gray-400">
                    {r.unit === "full" ? `${r.start_date} ~ ${r.end_date}` : r.start_date} (
                    {r.unit === "full" ? `${leaveAmount(r)}일` : UNIT_LABEL[r.unit]})
                  </span>
                </p>
                {r.reason && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{r.reason}</p>
                )}
              </div>
              {r.status === "pending" ? (
                <div className="flex items-center gap-2 shrink-0">
                  <form action={approveLeaveRequestAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      className="text-xs font-semibold text-white bg-[#0e299c] px-3 py-1.5 rounded-lg hover:bg-[#0b2180] transition-colors"
                    >
                      승인
                    </button>
                  </form>
                  <form action={rejectLeaveRequestAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      거절
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_CLASS[r.status]}`}
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                  <form action={revertLeaveRequestAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      title="대기중으로 되돌리기"
                      className="text-xs font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      되돌리기
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
