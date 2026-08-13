"use client";

import { useState, useTransition } from "react";
import dayjs from "@/lib/dayjs";
import type { TaskRow, TaskStatus } from "@/lib/db";
import {
  TASK_STATUS_LABEL as STATUS_LABEL,
  TASK_PRIORITY_LABEL as PRIORITY_LABEL,
  TASK_PRIORITY_CLASS as PRIORITY_CLASS,
} from "@/lib/task-ui";
import {
  updateTaskStatusAction,
  updateTaskMemoAction,
} from "@/lib/task-actions";
import Toast from "@/components/Toast";

const COLUMNS: { status: TaskStatus; dot: string }[] = [
  { status: "todo", dot: "bg-orange-400" },
  { status: "in_progress", dot: "bg-[#0e299c]" },
  { status: "done", dot: "bg-green-500" },
];

/**
 * 직원 할당 업무 칸반 보드 (지라 스타일).
 * 카드를 컬럼 간 드래그하면 상태가 바뀐다 — 낙관적 반영 + 실패 시 롤백 + Toast.
 * 드래그가 안 되는 환경(터치 등)을 위해 카드 하단에 컴팩트 세그먼트도 같이 둔다.
 * 두 경로 모두 changeStatus() 한 곳을 지나므로 동작이 항상 일치한다.
 * employeeId 는 서버 액션이 세션에서 가져온다 (타인 업무 변경 불가 원칙 유지).
 */
export default function EmployeeTaskBoard({ tasks }: { tasks: TaskRow[] }) {
  // 낙관적 상태 오버라이드 — 서버 revalidate 로 tasks prop 이 따라잡을 때까지의 임시값
  const [overrides, setOverrides] = useState<Record<string, TaskStatus>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  const [toast, setToast] = useState("");
  const [, startTransition] = useTransition();

  // 메모 — 편집 중인 카드 id + 입력값 + 낙관적 오버라이드 (상태와 동일 패턴)
  const [memoEditId, setMemoEditId] = useState<string | null>(null);
  const [memoDraft, setMemoDraft] = useState("");
  const [memoOverrides, setMemoOverrides] = useState<Record<string, string>>({});

  const statusOf = (t: TaskRow): TaskStatus => overrides[t.id] ?? t.status;
  const memoOf = (t: TaskRow): string => memoOverrides[t.id] ?? t.employee_memo;

  const saveMemo = (t: TaskRow) => {
    const prev = memoOf(t);
    const next = memoDraft.trim();
    setMemoEditId(null);
    if (next === prev) return;
    setMemoOverrides((o) => ({ ...o, [t.id]: next })); // 낙관적 반영
    startTransition(async () => {
      const result = await updateTaskMemoAction(t.id, next);
      if (result.ok) {
        setToast(next ? "메모를 저장했어요" : "메모를 지웠어요");
      } else {
        setMemoOverrides((o) => ({ ...o, [t.id]: prev })); // 실패 시 롤백
        setToast(result.error ?? "메모 저장에 실패했어요");
      }
    });
  };

  const changeStatus = (taskId: string, prev: TaskStatus, next: TaskStatus) => {
    if (next === prev) return;
    setOverrides((o) => ({ ...o, [taskId]: next })); // 낙관적 반영
    startTransition(async () => {
      const result = await updateTaskStatusAction(taskId, next);
      if (result.ok) {
        setToast(`${STATUS_LABEL[next]}(으)로 옮겼어요`);
      } else {
        setOverrides((o) => ({ ...o, [taskId]: prev })); // 실패 시 롤백
        setToast(result.error ?? "변경에 실패했어요");
      }
    });
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {COLUMNS.map(({ status: col, dot }) => {
          const list = tasks.filter((t) => statusOf(t) === col);
          const isOver = overColumn === col && dragId !== null;
          return (
            <section
              key={col}
              onDragOver={(e) => {
                e.preventDefault();
                setOverColumn(col);
              }}
              onDragLeave={() => setOverColumn(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOverColumn(null);
                const id = e.dataTransfer.getData("text/plain") || dragId;
                setDragId(null);
                const task = tasks.find((t) => t.id === id);
                if (task) changeStatus(task.id, statusOf(task), col);
              }}
              className={`flex flex-col rounded-2xl p-3 transition-colors ${
                isOver ? "bg-[#0e299c]/5 ring-2 ring-[#0e299c]/30" : "bg-gray-100/70"
              }`}
            >
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
                  list.map((t) => {
                    const current = statusOf(t);
                    const memo = memoOf(t);
                    const editingMemo = memoEditId === t.id;
                    return (
                      <li
                        key={t.id}
                        draggable={!editingMemo}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", t.id);
                          e.dataTransfer.effectAllowed = "move";
                          setDragId(t.id);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setOverColumn(null);
                        }}
                        className={`bg-white rounded-xl p-3 shadow-sm cursor-grab active:cursor-grabbing ${
                          dragId === t.id ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${PRIORITY_CLASS[t.priority]}`}
                          >
                            {PRIORITY_LABEL[t.priority]}
                          </span>
                          <span className="ml-auto text-[11px] text-gray-400 shrink-0">
                            {current === "done" && t.completed_at
                              ? `✓ ${dayjs(t.completed_at).format("M/D")}`
                              : `${dayjs(t.created_at).format("M/D")} 배정`}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 mt-1.5">
                          {t.title}
                        </p>
                        {t.body && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-3 whitespace-pre-wrap">
                            {t.body}
                          </p>
                        )}

                        {/* 직원 메모 — 카드에서 바로 작성/수정 */}
                        {editingMemo ? (
                          <div className="mt-2 flex flex-col gap-1.5">
                            <textarea
                              value={memoDraft}
                              onChange={(e) => setMemoDraft(e.target.value)}
                              rows={3}
                              maxLength={1000}
                              autoFocus
                              placeholder="진행 상황이나 특이사항을 메모하세요"
                              className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-xs text-gray-700 outline-none focus:border-[#0e299c] resize-y"
                            />
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setMemoEditId(null)}
                                className="h-6 px-2 rounded-md text-[11px] font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                취소
                              </button>
                              <button
                                type="button"
                                onClick={() => saveMemo(t)}
                                className="h-6 px-2.5 rounded-md text-[11px] font-semibold text-white bg-[#0e299c] hover:bg-[#0b2180] transition-colors"
                              >
                                저장
                              </button>
                            </div>
                          </div>
                        ) : memo ? (
                          <button
                            type="button"
                            onClick={() => {
                              setMemoDraft(memo);
                              setMemoEditId(t.id);
                            }}
                            className="mt-2 w-full text-left rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-2 hover:border-amber-200 transition-colors"
                          >
                            <span className="block text-[10px] font-bold text-amber-600">
                              메모
                            </span>
                            <span className="block text-xs text-gray-700 mt-0.5 whitespace-pre-wrap">
                              {memo}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setMemoDraft("");
                              setMemoEditId(t.id);
                            }}
                            className="mt-2 text-[11px] font-semibold text-gray-400 hover:text-[#0e299c] transition-colors"
                          >
                            + 메모 추가
                          </button>
                        )}

                        {/* 드래그 대체 경로 — 터치/키보드용 컴팩트 상태 전환 */}
                        <div className="mt-2.5 flex items-center gap-0.5 rounded-lg bg-gray-50 p-0.5 w-fit">
                          {COLUMNS.map(({ status: s }) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => changeStatus(t.id, current, s)}
                              className={`h-6 px-2 rounded-md text-[11px] font-semibold transition-colors ${
                                current === s
                                  ? "bg-white text-[#0e299c] shadow-sm"
                                  : "text-gray-400 hover:text-gray-600"
                              }`}
                            >
                              {STATUS_LABEL[s]}
                            </button>
                          ))}
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </section>
          );
        })}
      </div>
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}
