"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import dayjs from "@/lib/dayjs";
import type { EmployeeTodo, TaskPriority, TaskStatus } from "@/lib/db";
import {
  TASK_STATUS_LABEL as STATUS_LABEL,
  TASK_PRIORITY_LABEL as PRIORITY_LABEL,
  TASK_PRIORITY_CLASS as PRIORITY_CLASS,
} from "@/lib/task-ui";
import {
  createTodoAction,
  updateTodoAction,
  updateTodoStatusAction,
  deleteTodoAction,
} from "@/lib/todo-actions";
import Toast from "@/components/Toast";
import ConfirmToast from "@/components/ConfirmToast";

const COLUMNS: { status: TaskStatus; dot: string }[] = [
  { status: "todo", dot: "bg-orange-400" },
  { status: "in_progress", dot: "bg-[#0e299c]" },
  { status: "done", dot: "bg-green-500" },
];

const PRIORITIES: TaskPriority[] = ["high", "normal", "low"];

interface FormValues {
  title: string;
  memo: string;
  priority: TaskPriority;
  dueDate: string;
}
const EMPTY: FormValues = { title: "", memo: "", priority: "normal", dueDate: "" };

/**
 * 직원 개인 투두 칸반 보드. EmployeeTaskBoard(할당 업무)와 같은 드래그/세그먼트 UX 에
 * 본인이 직접 등록/수정/삭제까지 하는 셀프 투두. 소유권은 서버 액션이 세션으로 강제.
 */
export default function TodoBoard({ todos, today }: { todos: EmployeeTodo[]; today: string }) {
  const [overrides, setOverrides] = useState<Record<string, TaskStatus>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  const [toast, setToast] = useState("");
  const [, startTransition] = useTransition();

  // 추가 폼(대기 컬럼 상단) / 카드 인라인 수정
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<EmployeeTodo | null>(null);
  const [saving, setSaving] = useState(false);

  const statusOf = (t: EmployeeTodo): TaskStatus => overrides[t.id] ?? t.status;
  const editing = adding || editId !== null;

  const changeStatus = (id: string, prev: TaskStatus, next: TaskStatus) => {
    if (next === prev) return;
    setOverrides((o) => ({ ...o, [id]: next }));
    startTransition(async () => {
      const result = await updateTodoStatusAction(id, next);
      if (result.ok) setToast(`${STATUS_LABEL[next]}(으)로 옮겼어요`);
      else {
        setOverrides((o) => ({ ...o, [id]: prev }));
        setToast(result.error);
      }
    });
  };

  const submit = () => {
    if (saving || !form.title.trim()) return;
    setSaving(true);
    startTransition(async () => {
      const result = editId
        ? await updateTodoAction(editId, form)
        : await createTodoAction(form);
      setSaving(false);
      if (result.ok) {
        setToast(editId ? "수정했어요" : "추가했어요");
        setAdding(false);
        setEditId(null);
        setForm(EMPTY);
      } else setToast(result.error);
    });
  };

  const doDelete = (t: EmployeeTodo) => {
    setConfirmDelete(null);
    startTransition(async () => {
      const result = await deleteTodoAction(t.id);
      setToast(result.ok ? "삭제했어요" : result.error);
      if (result.ok && editId === t.id) {
        setEditId(null);
        setForm(EMPTY);
      }
    });
  };

  const formBox = (
    <li className="bg-white rounded-xl p-3 shadow-sm ring-1 ring-[#0e299c]/30 flex flex-col gap-2">
      <input
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="할 일을 입력하세요"
        maxLength={200}
        autoFocus
        className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-sm outline-none focus:border-[#0e299c]"
      />
      <textarea
        value={form.memo}
        onChange={(e) => setForm({ ...form, memo: e.target.value })}
        rows={2}
        maxLength={1000}
        placeholder="메모 (선택)"
        className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs outline-none focus:border-[#0e299c] resize-none"
      />
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-0.5 rounded-lg bg-gray-50 p-0.5">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setForm({ ...form, priority: p })}
              className={`h-6 px-2 rounded-md text-[11px] font-semibold transition-colors ${
                form.priority === p ? "bg-white text-[#0e299c] shadow-sm" : "text-gray-400"
              }`}
            >
              {PRIORITY_LABEL[p]}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={form.dueDate}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          className="h-7 flex-1 min-w-0 rounded-lg border border-gray-200 px-1.5 text-[11px] text-gray-600 outline-none focus:border-[#0e299c]"
          title="마감일 (선택)"
        />
      </div>
      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => {
            setAdding(false);
            setEditId(null);
            setForm(EMPTY);
          }}
          className="h-7 px-2 rounded-md text-[11px] font-semibold text-gray-400 hover:text-gray-600"
        >
          취소
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving || !form.title.trim()}
          className="h-7 px-3 rounded-md text-[11px] font-semibold text-white bg-[#0e299c] hover:bg-[#0b2180] disabled:opacity-40 transition-colors"
        >
          {editId ? "수정 저장" : "추가"}
        </button>
      </div>
    </li>
  );

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {COLUMNS.map(({ status: col, dot }) => {
          const list = todos.filter((t) => statusOf(t) === col);
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
                const todo = todos.find((t) => t.id === id);
                if (todo) changeStatus(todo.id, statusOf(todo), col);
              }}
              className={`flex flex-col rounded-2xl p-3 transition-colors ${
                isOver ? "bg-[#0e299c]/5 ring-2 ring-[#0e299c]/30" : "bg-gray-100/70"
              }`}
            >
              <div className="flex items-center gap-2 px-1 pb-3">
                <span className={`h-2 w-2 rounded-full ${dot}`} />
                <h2 className="text-sm font-bold text-gray-700">{STATUS_LABEL[col]}</h2>
                <span className="text-xs font-bold text-gray-400">{list.length}</span>
                {col === "todo" && !editing && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm(EMPTY);
                      setAdding(true);
                    }}
                    className="ml-auto flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[11px] font-semibold text-[#0e299c] hover:bg-[#0e299c]/5 transition-colors"
                  >
                    <Plus size={13} /> 추가
                  </button>
                )}
              </div>

              <ul className="flex flex-col gap-2 min-h-24 max-h-[65vh] overflow-y-auto">
                {col === "todo" && adding && formBox}
                {list.length === 0 && !(col === "todo" && adding) ? (
                  <li className="text-xs text-gray-400 px-1 py-3 text-center">비어 있어요</li>
                ) : (
                  list.map((t) => {
                    if (editId === t.id) return <div key={t.id}>{formBox}</div>;
                    const current = statusOf(t);
                    const overdue =
                      t.due_date && current !== "done" && t.due_date < today;
                    return (
                      <li
                        key={t.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", t.id);
                          e.dataTransfer.effectAllowed = "move";
                          setDragId(t.id);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setOverColumn(null);
                        }}
                        className={`group bg-white rounded-xl p-3 shadow-sm cursor-grab active:cursor-grabbing ${
                          dragId === t.id ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${PRIORITY_CLASS[t.priority]}`}
                          >
                            {PRIORITY_LABEL[t.priority]}
                          </span>
                          {t.due_date && (
                            <span
                              className={`text-[11px] font-semibold shrink-0 ${
                                overdue ? "text-red-500" : "text-gray-400"
                              }`}
                            >
                              ~{dayjs(t.due_date).format("M/D")}
                              {overdue && " 지남"}
                            </span>
                          )}
                          <span className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => {
                                setForm({
                                  title: t.title,
                                  memo: t.memo,
                                  priority: t.priority,
                                  dueDate: t.due_date ?? "",
                                });
                                setAdding(false);
                                setEditId(t.id);
                              }}
                              className="rounded p-1 text-gray-300 hover:bg-gray-100 hover:text-[#0e299c]"
                              aria-label="수정"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(t)}
                              className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500"
                              aria-label="삭제"
                            >
                              <Trash2 size={13} />
                            </button>
                          </span>
                        </div>
                        <p
                          className={`text-sm font-semibold mt-1.5 ${
                            current === "done" ? "text-gray-400 line-through" : "text-gray-900"
                          }`}
                        >
                          {t.title}
                        </p>
                        {t.memo && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-3 whitespace-pre-wrap">
                            {t.memo}
                          </p>
                        )}
                        <div className="mt-2 flex items-center justify-between gap-1">
                          <div className="flex items-center gap-0.5 rounded-lg bg-gray-50 p-0.5 w-fit">
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
                          <span className="text-[11px] text-gray-400 shrink-0">
                            {current === "done" && t.completed_at
                              ? `✓ ${dayjs(t.completed_at).format("M/D")}`
                              : dayjs(t.created_at).format("M/D")}
                          </span>
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
      {confirmDelete && (
        <ConfirmToast
          title="투두를 삭제할까요?"
          subtitle={confirmDelete.title}
          yesLabel="삭제"
          noLabel="취소"
          showIcon={false}
          onYes={() => doDelete(confirmDelete)}
          onNo={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
}
