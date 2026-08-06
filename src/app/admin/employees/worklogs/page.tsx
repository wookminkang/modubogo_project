import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { listEmployees } from "@/lib/employee";
import { getAllWorkLogsForAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ employee?: string; month?: string }>;
}

export default async function AdminWorkLogsPage({ searchParams }: Props) {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const { employee, month } = await searchParams;
  const [employees, logs] = await Promise.all([
    listEmployees(),
    getAllWorkLogsForAdmin({
      employeeId: employee || undefined,
      month: month || undefined,
    }),
  ]);
  const approvedEmployees = employees.filter((e) => e.status === "approved");
  const nameById = new Map(employees.map((e) => [e.id, e.name]));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-[#0e299c]">직원 업무일지</h1>
        <p className="text-sm text-gray-400 mt-0.5">전체 직원의 업무일지를 모아볼 수 있어요</p>
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
          {approvedEmployees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
        <input
          type="month"
          name="month"
          defaultValue={month ?? ""}
          className="h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 outline-none focus:border-[#0e299c]"
        />
        <button
          type="submit"
          className="h-10 px-4 bg-[#0e299c] hover:bg-[#0b2180] text-white text-sm font-semibold rounded-lg transition-colors shrink-0"
        >
          필터
        </button>
      </form>

      {logs.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white rounded-2xl p-4 shadow-sm">
          조건에 맞는 업무일지가 없어요.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {logs.map((log) => (
            <li key={log.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <details>
                <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold text-gray-900 shrink-0">
                      {nameById.get(log.employee_id) ?? "(알 수 없음)"}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">{log.log_date}</span>
                    <span className="text-sm text-gray-500 truncate">
                      {log.content || "(내용 없음)"}
                    </span>
                  </span>
                </summary>
                <div className="px-4 pb-4 text-sm text-gray-700 whitespace-pre-line border-t border-gray-100 pt-3">
                  {log.content || "(내용 없음)"}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
