"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Search } from "lucide-react";
import dayjs from "@/lib/dayjs";
import type { TaskRow } from "@/lib/db";
import { updateTaskAction } from "@/lib/task-actions";
import {
  TASK_STATUS_LABEL as STATUS_LABEL,
  TASK_STATUS_CLASS as STATUS_CLASS,
  TASK_PRIORITY_LABEL as PRIORITY_LABEL,
  TASK_PRIORITY_CLASS as PRIORITY_CLASS,
} from "@/lib/task-ui";
import PrioritySegment from "./PrioritySegment";
import TaskDeleteButton from "./TaskDeleteButton";

export interface EmployeeOption {
  id: string;
  name: string;
}

const SELECT_CLASS =
  "h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 outline-none focus:border-[#0e299c] bg-white";
const INPUT_CLASS =
  "h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 outline-none focus:border-[#0e299c] w-full";

/**
 * 배정한 업무 목록 — "찾기"에 초점을 둔 클라이언트 컴포넌트.
 * 검색(제목·내용·담당자 이름)과 직원 필터가 타이핑/선택 즉시 반영된다(제출 버튼 없음).
 * 평소에는 진행 중만 펼치고 완료는 접어두지만, 검색 중에는 완료 포함 전체에서 찾아
 * 한 목록으로 보여준다. 수정 진입(?edit=)은 URL 기반이라 진행 현황에서 딥링크로도 들어온다.
 */
export default function AssignedTaskList({
  tasks,
  employees,
  approved,
  editId,
  initialEmployee,
}: {
  tasks: TaskRow[];
  employees: EmployeeOption[];
  approved: EmployeeOption[];
  editId?: string;
  initialEmployee?: string;
}) {
  const [employeeFilter, setEmployeeFilter] = useState(initialEmployee ?? "");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const nameById = useMemo(
    () => new Map(employees.map((e) => [e.id, e.name])),
    [employees],
  );

  const filtered = useMemo(() => {
    let list = employeeFilter
      ? tasks.filter((t) => t.employee_id === employeeFilter)
      : tasks;
    if (deferredQuery) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(deferredQuery) ||
          t.body.toLowerCase().includes(deferredQuery) ||
          (nameById.get(t.employee_id) ?? "")
            .toLowerCase()
            .includes(deferredQuery),
      );
    }
    return list;
  }, [tasks, employeeFilter, deferredQuery, nameById]);

  const searching = deferredQuery.length > 0;
  const activeTasks = filtered.filter((t) => t.status !== "done");
  const doneTasks = filtered.filter((t) => t.status === "done");

  const editHref = (id: string) => {
    const q = new URLSearchParams();
    if (employeeFilter) q.set("employee", employeeFilter);
    q.set("edit", id);
    return `/admin/employees/tasks?${q.toString()}#task-${id}`;
  };
  const cancelHref = employeeFilter
    ? `/admin/employees/tasks?employee=${employeeFilter}`
    : "/admin/employees/tasks";
  // 수정 저장 후 redirect 시 직원 필터 유지용 (updateTaskAction의 filter hidden input)
  const filterStr = employeeFilter ? `employee=${employeeFilter}` : "";

  const renderRow = (t: TaskRow) =>
    editId === t.id ? (
      /* 인라인 수정 폼 */
      <li key={t.id} id={`task-${t.id}`} className="py-3 first:pt-0 last:pb-0 scroll-mt-24">
        <form
          action={updateTaskAction}
          className="flex flex-col gap-3 rounded-xl bg-[#0e299c]/[0.03] p-3 ring-1 ring-[#0e299c]/30"
        >
          <input type="hidden" name="id" value={t.id} />
          <input type="hidden" name="filter" value={filterStr} />
          <div className="flex items-center gap-3 flex-wrap">
            <select name="employeeId" defaultValue={t.employee_id} className={SELECT_CLASS}>
              {approved.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
            <PrioritySegment defaultValue={t.priority} />
          </div>
          <input name="title" defaultValue={t.title} maxLength={200} className={INPUT_CLASS} />
          <textarea
            name="body"
            defaultValue={t.body}
            rows={3}
            className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 outline-none focus:border-[#0e299c] focus:ring-2 focus:ring-[#0e299c]/20 w-full resize-y bg-white"
          />
          <div className="flex items-center justify-end gap-2">
            <a
              href={cancelHref}
              className="text-xs font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors bg-white"
            >
              취소
            </a>
            <button
              type="submit"
              className="text-xs font-semibold text-white bg-[#0e299c] px-3 py-1.5 rounded-lg hover:bg-[#0b2180] transition-colors"
            >
              저장
            </button>
          </div>
        </form>
      </li>
    ) : (
      <li key={t.id} id={`task-${t.id}`} className="py-3 first:pt-0 last:pb-0 scroll-mt-24">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${PRIORITY_CLASS[t.priority]}`}>
            {PRIORITY_LABEL[t.priority]}
          </span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${STATUS_CLASS[t.status]}`}>
            {STATUS_LABEL[t.status]}
          </span>
          <p className="text-sm font-semibold text-gray-900 truncate">{t.title}</p>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {t.status === "done" && t.completed_at && (
              <span className="text-xs font-semibold text-green-600">
                ✓ {dayjs(t.completed_at).format("M/D")} 완료
              </span>
            )}
            <a
              href={editHref(t.id)}
              className="text-xs font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              수정
            </a>
            <TaskDeleteButton taskId={t.id} title={t.title} />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          {nameById.get(t.employee_id) ?? "(알 수 없음)"} ·{" "}
          {dayjs(t.created_at).format("M/D")} 배정
        </p>
        {t.body && (
          <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{t.body}</p>
        )}
        {t.employee_memo && (
          <div className="mt-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 w-fit max-w-full">
            <span className="block text-[10px] font-bold text-amber-600">직원 메모</span>
            <span className="block text-xs text-gray-700 mt-0.5 whitespace-pre-wrap">
              {t.employee_memo}
            </span>
          </div>
        )}
      </li>
    );

  return (
    <section className="bg-white rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-base font-bold text-gray-900">
          배정한 업무
          <span className="ml-1.5 text-sm font-semibold text-gray-400">
            {searching ? `검색 결과 ${filtered.length}건` : `진행 중 ${activeTasks.length}건`}
          </span>
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="제목·내용·담당자 검색"
              className="h-10 w-52 pl-9 pr-3 rounded-lg border border-gray-200 text-sm text-gray-700 outline-none focus:border-[#0e299c]"
            />
          </div>
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">전체 직원</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {searching ? (
        /* 검색 중 — 완료 포함 전체에서 찾은 결과를 한 목록으로 */
        filtered.length === 0 ? (
          <p className="text-sm text-gray-400">
            &ldquo;{query.trim()}&rdquo;에 해당하는 업무가 없어요.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-gray-100">
            {filtered.map(renderRow)}
          </ul>
        )
      ) : (
        <>
          {activeTasks.length === 0 ? (
            <p className="text-sm text-gray-400">진행 중인 업무가 없어요.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-gray-100">
              {activeTasks.map(renderRow)}
            </ul>
          )}

          {doneTasks.length > 0 && (
            <details
              className="group"
              open={Boolean(editId) && doneTasks.some((t) => t.id === editId)}
            >
              <summary className="cursor-pointer select-none text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors list-none flex items-center gap-1">
                <span className="inline-block transition-transform group-open:rotate-90">
                  ▸
                </span>
                처리완료 {doneTasks.length}건 보기
              </summary>
              <ul className="mt-3 flex flex-col divide-y divide-gray-100 border-t border-gray-100 pt-3">
                {doneTasks.map(renderRow)}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}
