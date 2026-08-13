"use client";

import { useState, useTransition } from "react";
import dayjs from "@/lib/dayjs";
import type { TaskRow, TaskStatus } from "@/lib/db";
import {
  TASK_STATUS_LABEL as STATUS_LABEL,
  TASK_PRIORITY_LABEL as PRIORITY_LABEL,
  TASK_PRIORITY_CLASS as PRIORITY_CLASS,
} from "@/lib/task-ui";

export interface StaffOption {
  id: string;
  name: string;
}

const COLUMNS: { status: TaskStatus; dot: string }[] = [
  { status: "todo", dot: "bg-orange-400" },
  { status: "in_progress", dot: "bg-[#0e299c]" },
  { status: "done", dot: "bg-green-500" },
];

/**
 * 관리자 진행 현황 칸반 보드 (지라 스타일, 보기 전용).
 * 상태 전환은 직원만 하는 설계라 드래그는 없다 — 카드의 "수정"이 업무 할당
 * 페이지의 인라인 수정 폼(?edit=&#task-)으로 딥링크될 뿐이다.
 * 직원 필터 칩은 클라이언트 메모리 필터링이라 즉시 반영(전환은 useTransition).
 */
export default function AdminTaskBoard({
  tasks,
  staff,
}: {
  tasks: TaskRow[];
  staff: StaffOption[];
}) {
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [, startTransition] = useTransition();

  const nameById = new Map(staff.map((s) => [s.id, s.name]));
  const filtered = employeeFilter
    ? tasks.filter((t) => t.employee_id === employeeFilter)
    : tasks;

  const chipClass = (active: boolean) =>
    `h-8 px-3 rounded-full text-xs font-semibold transition-colors shrink-0 ${
      active
        ? "bg-[#0e299c] text-white"
        : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
    }`;

  const editHref = (t: TaskRow) =>
    `/admin/employees/tasks?employee=${t.employee_id}&edit=${t.id}#task-${t.id}`;

  return (
    <div className="flex flex-col gap-4">
      {/* 직원 필터 칩 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => startTransition(() => setEmployeeFilter(""))}
          className={chipClass(employeeFilter === "")}
        >
          전체
        </button>
        {staff.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => startTransition(() => setEmployeeFilter(s.id))}
            className={chipClass(employeeFilter === s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {COLUMNS.map(({ status: col, dot }) => {
          const list = filtered.filter((t) => t.status === col);
          return (
            <section key={col} className="flex flex-col rounded-2xl bg-gray-100/70 p-3">
              <div className="flex items-center gap-2 px-1 pb-3">
                <span className={`h-2 w-2 rounded-full ${dot}`} />
                <h2 className="text-sm font-bold text-gray-700">
                  {STATUS_LABEL[col]}
                </h2>
                <span className="text-xs font-bold text-gray-400">
                  {list.length}
                </span>
              </div>

              <ul className="flex flex-col gap-2 min-h-24 max-h-[65vh] overflow-y-auto">
                {list.length === 0 ? (
                  <li className="text-xs text-gray-400 px-1 py-3 text-center">
                    비어 있어요
                  </li>
                ) : (
                  list.map((t) => (
                    <li key={t.id} className="bg-white rounded-xl p-3 shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${PRIORITY_CLASS[t.priority]}`}
                        >
                          {PRIORITY_LABEL[t.priority]}
                        </span>
                        <span className="ml-auto text-[11px] text-gray-400 shrink-0">
                          {col === "done" && t.completed_at
                            ? `✓ ${dayjs(t.completed_at).format("M/D")}`
                            : `${dayjs(t.created_at).format("M/D")} 배정`}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 mt-1.5">
                        {t.title}
                      </p>
                      {t.body && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 whitespace-pre-wrap">
                          {t.body}
                        </p>
                      )}
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0e299c]/10 text-[#0e299c] text-[10px] font-bold shrink-0">
                          {(nameById.get(t.employee_id) ?? "?").charAt(0)}
                        </span>
                        <span className="text-xs font-semibold text-gray-600 truncate">
                          {nameById.get(t.employee_id) ?? "(알 수 없음)"}
                        </span>
                        <a
                          href={editHref(t)}
                          className="ml-auto text-[11px] font-medium text-gray-400 hover:text-[#0e299c] transition-colors shrink-0"
                        >
                          수정
                        </a>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
