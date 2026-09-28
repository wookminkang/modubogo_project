"use client";

import { useState, useTransition } from "react";
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import dayjs from "@/lib/dayjs";
import Toast from "./Toast";
import ConfirmToast from "./ConfirmToast";
import { CardTitle } from "./CardTitle";
import {
  addCompanyHistory,
  editCompanyHistory,
  fetchCompanyHistories,
  removeCompanyHistory,
} from "@/lib/history-actions";
import type { HistoryEntry } from "@/lib/history-db";

/**
 * 병원별 히스토리 탭.
 *
 * 원장님(공개 뷰)에게는 읽기 전용 타임라인, 관리자에게는 같은 자리에서
 * 추가·수정·삭제 버튼이 함께 보인다. 쓰기는 전부 서버 액션(history-actions.ts)을 거치고,
 * 저장 뒤에는 서버에서 목록을 다시 받아 화면을 맞춘다.
 */
export default function HistoryPanel({
  company,
  initial,
  canEdit,
}: {
  company: string;
  initial: HistoryEntry[];
  canEdit: boolean;
}) {
  const [entries, setEntries] = useState(initial);
  const [editing, setEditing] = useState<null | { id?: string; happenedOn: string; title: string; body: string }>(
    null,
  );
  const [confirmDel, setConfirmDel] = useState<HistoryEntry | null>(null);
  const [toast, setToast] = useState("");
  const [pending, startTransition] = useTransition();

  const reload = () => fetchCompanyHistories(company).then(setEntries);

  const save = () => {
    if (!editing || pending) return;
    const input = { happenedOn: editing.happenedOn, title: editing.title, body: editing.body };
    startTransition(async () => {
      const res = editing.id
        ? await editCompanyHistory(editing.id, input)
        : await addCompanyHistory(company, input);
      if (!res.ok) {
        setToast(res.error);
        return;
      }
      setEditing(null);
      await reload();
      setToast(input.title ? "저장했어요" : "저장했어요");
    });
  };

  const remove = (entry: HistoryEntry) => {
    setConfirmDel(null);
    startTransition(async () => {
      const res = await removeCompanyHistory(entry.id);
      if (!res.ok) {
        setToast(res.error);
        return;
      }
      await reload();
      setToast("삭제했어요");
    });
  };

  return (
    <div className="flex flex-col gap-5 bg-[#F0F4FA] px-4 py-6">
      <CardTitle
        title="병원 히스토리"
        description="그동안 진행한 작업을 날짜순으로 정리했어요"
      />

      {canEdit && !editing && (
        <button
          type="button"
          onClick={() =>
            setEditing({ happenedOn: dayjs().format("YYYY-MM-DD"), title: "", body: "" })
          }
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-gray-300 bg-white/60 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-[#0e299c] hover:text-[#0e299c]"
        >
          <Plus size={16} />
          기록 추가
        </button>
      )}

      {editing && (
        <HistoryForm
          value={editing}
          onChange={setEditing}
          onSave={save}
          onCancel={() => setEditing(null)}
          saving={pending}
        />
      )}

      {entries.length === 0 && !editing ? (
        <p className="rounded-2xl bg-white px-5 py-10 text-center text-sm text-gray-400 shadow-sm">
          아직 등록된 기록이 없어요.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-2xl bg-white px-5 py-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs text-gray-400">
                    <CalendarDays size={13} />
                    {dayjs(entry.happenedOn).format("YYYY.MM.DD")}
                  </div>
                  <p className="text-[15px] font-bold text-[#333d4b]">{entry.title}</p>
                  {entry.body && (
                    <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-6 text-gray-500">
                      {entry.body}
                    </p>
                  )}
                </div>

                {canEdit && (
                  <div className="flex shrink-0 gap-1">
                    <IconButton
                      label="수정"
                      onClick={() =>
                        setEditing({
                          id: entry.id,
                          happenedOn: entry.happenedOn,
                          title: entry.title,
                          body: entry.body,
                        })
                      }
                    >
                      <Pencil size={14} />
                    </IconButton>
                    <IconButton label="삭제" onClick={() => setConfirmDel(entry)} danger>
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {confirmDel && (
        <ConfirmToast
          title="이 기록을 삭제할까요?"
          subtitle={confirmDel.title}
          onYes={() => remove(confirmDel)}
          onNo={() => setConfirmDel(null)}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </div>
  );
}

function HistoryForm({
  value,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  value: { id?: string; happenedOn: string; title: string; body: string };
  onChange: (v: { id?: string; happenedOn: string; title: string; body: string }) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const input =
    "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-[#333d4b] outline-none transition-colors focus:border-[#0e299c]";

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white px-5 py-5 shadow-sm">
      <p className="text-sm font-bold text-[#333d4b]">{value.id ? "기록 수정" : "새 기록"}</p>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-gray-500">날짜</span>
        <input
          type="date"
          value={value.happenedOn}
          onChange={(e) => onChange({ ...value, happenedOn: e.target.value })}
          className={input}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-gray-500">제목</span>
        <input
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          placeholder="예) 홈페이지 메인 개편"
          className={input}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-gray-500">내용</span>
        <textarea
          value={value.body}
          onChange={(e) => onChange({ ...value, body: e.target.value })}
          placeholder="어떤 작업을 했는지 적어 주세요."
          rows={4}
          className={`${input} resize-y leading-6`}
        />
      </label>

      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-500"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !value.title.trim()}
          className="flex-1 rounded-xl bg-[#0e299c] py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`rounded-lg p-1.5 text-gray-400 transition-colors ${
        danger ? "hover:bg-red-50 hover:text-red-500" : "hover:bg-gray-100 hover:text-[#0e299c]"
      }`}
    >
      {children}
    </button>
  );
}
