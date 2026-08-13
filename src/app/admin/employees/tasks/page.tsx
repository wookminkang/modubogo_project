import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { listEmployees } from "@/lib/employee";
import { getAllTasksForAdmin } from "@/lib/db";
import { createTaskAction } from "@/lib/task-actions";
import { EXCLUDED_ASSIGNEE_USERNAMES } from "@/lib/task-ui";
import PrioritySegment from "./PrioritySegment";
import AssignedTaskList from "./AssignedTaskList";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    employee?: string;
    edit?: string;
    error?: string;
    created?: string;
  }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  missing: "담당자와 제목을 입력해주세요.",
};

const SELECT_CLASS =
  "h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 outline-none focus:border-[#0e299c]";
const INPUT_CLASS =
  "h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 outline-none focus:border-[#0e299c] w-full";

/**
 * 업무 할당 — "배정 작업"에만 집중한 화면.
 * 상태 카운트·상태별 조회는 진행 현황(/admin/employees/progress)이 담당.
 * 하단 목록(AssignedTaskList)은 검색·직원 필터가 즉시 반영되는 클라이언트 컴포넌트로,
 * 목록 데이터는 여기서 전체를 한 번 조회해 넘긴다(필터링은 클라이언트 메모리에서).
 */
export default async function AdminTasksPage({ searchParams }: Props) {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const { employee, edit, error, created } = await searchParams;

  const [allTasks, employees] = await Promise.all([
    getAllTasksForAdmin(),
    listEmployees(),
  ]);
  // 담당자 후보에서 테스트 계정(강민욱)은 우선 제외 — 실제 직원에게만 배정
  const approved = employees
    .filter(
      (e) =>
        e.status === "approved" && !EXCLUDED_ASSIGNEE_USERNAMES.has(e.username),
    )
    .map((e) => ({ id: e.id, name: e.name }));
  const employeeOptions = employees.map((e) => ({ id: e.id, name: e.name }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0e299c]">업무 할당</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            직원에게 새 업무를 배정하세요
          </p>
        </div>
        <Link
          href="/admin/employees/progress"
          className="text-xs font-medium text-[#0e299c] border border-[#0e299c]/20 px-3 py-1.5 rounded-lg hover:bg-[#0e299c]/5 transition-colors shrink-0"
        >
          진행 현황 보기 →
        </Link>
      </div>

      {error && ERROR_MESSAGES[error] && (
        <p className="text-sm font-semibold text-red-600 bg-red-50 rounded-2xl px-4 py-3">
          {ERROR_MESSAGES[error]}
        </p>
      )}
      {created && (
        <p className="text-sm font-semibold text-[#0e299c] bg-[#0e299c]/5 rounded-2xl px-4 py-3">
          업무를 등록했어요.
        </p>
      )}

      {/* 새 업무 등록 — 이 화면의 주인공 */}
      <form action={createTaskAction} className="bg-white rounded-2xl p-5 shadow-sm flex flex-col gap-4">
        <h2 className="text-base font-bold text-gray-900">새 업무 등록</h2>
        <div className="flex items-end gap-4 flex-wrap">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-gray-500">담당자</span>
            <select name="employeeId" defaultValue="" className={SELECT_CLASS} required>
              <option value="" disabled>
                담당자 선택
              </option>
              {approved.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-gray-500">우선순위</span>
            <PrioritySegment />
          </div>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-500">업무 제목</span>
          <input
            name="title"
            placeholder="예: 8월 블로그 원고 2건 작성"
            maxLength={200}
            className={INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-500">업무 내용 (선택)</span>
          <textarea
            name="body"
            placeholder="업무 상세 내용을 적어주세요"
            rows={3}
            className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 outline-none focus:border-[#0e299c] focus:ring-2 focus:ring-[#0e299c]/20 w-full resize-y"
          />
        </label>
        <button
          type="submit"
          className="self-end h-11 px-6 bg-[#0e299c] hover:bg-[#0b2180] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          배정하기
        </button>
      </form>

      {/* 배정한 업무 — 검색·필터 즉시 반영, 수정/삭제 */}
      <AssignedTaskList
        tasks={allTasks}
        employees={employeeOptions}
        approved={approved}
        editId={edit}
        initialEmployee={employee}
      />
    </div>
  );
}
