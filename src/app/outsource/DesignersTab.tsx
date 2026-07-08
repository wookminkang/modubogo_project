"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, User, Check, X } from "lucide-react";
import Toast from "@/components/Toast";
import ConfirmToast from "@/components/ConfirmToast";
import {
  createDesignerAction,
  updateDesignerAction,
  deleteDesignerAction,
} from "@/lib/design-actions";
import { EmptyState } from "./OutsourceView";
import type { Designer } from "@/lib/db";

// 연락처 자동 하이픈: 숫자(전화)로 보일 때만 한국 전화번호 형식으로 포맷.
// 이메일·카카오톡 아이디 등 문자가 섞이면 원본을 그대로 둔다.
function formatContact(v: string): string {
  if (!/^[\d\s()+\-]*$/.test(v)) return v; // 전화번호 형태가 아니면 그대로
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (!d) return "";
  if (d.startsWith("02")) {
    // 서울 지역번호 02-XXX(X)-XXXX
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`;
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}`;
  }
  // 휴대폰/그 외 국번 (010-1234-5678)
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export default function DesignersTab({ designers }: { designers: Designer[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState("");
  const [confirmDel, setConfirmDel] = useState<Designer | null>(null);

  // 신규 입력
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", contact: "", memo: "" });
  // 수정 중인 디자이너 id
  const [editId, setEditId] = useState<string | null>(null);

  const resetAdd = () => {
    setForm({ name: "", contact: "", memo: "" });
    setAdding(false);
  };

  const handleAdd = () => {
    if (!form.name.trim()) {
      setToast("이름을 입력해주세요.");
      return;
    }
    startTransition(async () => {
      try {
        await createDesignerAction(form);
        resetAdd();
        setToast("디자이너를 등록했어요.");
        router.refresh();
      } catch {
        setToast("등록에 실패했어요.");
      }
    });
  };

  const handleDelete = () => {
    if (!confirmDel) return;
    const target = confirmDel;
    setConfirmDel(null);
    startTransition(async () => {
      try {
        await deleteDesignerAction(target.id);
        setToast("삭제되었어요.");
        router.refresh();
      } catch {
        setToast("삭제에 실패했어요.");
      }
    });
  };

  return (
    <div>
      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm text-gray-500">총 {designers.length}명</p>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#0e299c] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0a1f78]"
          >
            <Plus size={16} />
            디자이너 추가
          </button>
        )}
      </div>

      {/* 신규 등록 폼 */}
      {adding && (
        <div className="mt-4 flex flex-col gap-2.5 rounded-2xl border border-[#0e299c]/20 bg-[#F0F4FA] p-4">
          <DesignerInputs value={form} onChange={setForm} />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={resetAdd}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0e299c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a1f78] disabled:opacity-60"
            >
              <Check size={15} />
              등록
            </button>
          </div>
        </div>
      )}

      {/* 목록 */}
      {designers.length === 0 && !adding ? (
        <EmptyState icon={<User size={32} className="text-gray-300" />}>
          등록된 디자이너가 없어요. “디자이너 추가”로 등록하세요.
        </EmptyState>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {designers.map((d) =>
            editId === d.id ? (
              <EditRow
                key={d.id}
                designer={d}
                onCancel={() => setEditId(null)}
                onSaved={(msg) => {
                  setEditId(null);
                  setToast(msg);
                  router.refresh();
                }}
              />
            ) : (
              <li
                key={d.id}
                className="flex items-start gap-3 rounded-2xl border border-gray-100 p-4"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0F4FA] text-[#0e299c]">
                  <User size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-gray-900">{d.name}</p>
                  {d.contact && (
                    <p className="mt-0.5 text-sm text-gray-600">{d.contact}</p>
                  )}
                  {d.memo && (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-gray-400">
                      {d.memo}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditId(d.id)}
                    title="수정"
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#0e299c]"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDel(d)}
                    title="삭제"
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {confirmDel && (
        <ConfirmToast
          title="디자이너를 삭제할까요?"
          subtitle="배정된 요청서의 담당자 표시는 해제됩니다."
          message={confirmDel.name}
          yesLabel="삭제"
          onYes={handleDelete}
          onNo={() => setConfirmDel(null)}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </div>
  );
}

// 수정 인라인 폼
function EditRow({
  designer,
  onCancel,
  onSaved,
}: {
  designer: Designer;
  onCancel: () => void;
  onSaved: (msg: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: designer.name,
    contact: designer.contact ?? "",
    memo: designer.memo ?? "",
  });
  const [err, setErr] = useState("");

  const save = () => {
    if (!form.name.trim()) {
      setErr("이름을 입력해주세요.");
      return;
    }
    startTransition(async () => {
      try {
        await updateDesignerAction(designer.id, form);
        onSaved("수정했어요.");
      } catch {
        setErr("수정에 실패했어요.");
      }
    });
  };

  return (
    <li className="flex flex-col gap-2.5 rounded-2xl border border-[#0e299c]/20 bg-[#F0F4FA] p-4">
      <DesignerInputs value={form} onChange={setForm} />
      {err && <p className="text-xs font-medium text-red-500">{err}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
        >
          <X size={15} />
          취소
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0e299c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a1f78] disabled:opacity-60"
        >
          <Check size={15} />
          저장
        </button>
      </div>
    </li>
  );
}

// 공용 입력 필드 (이름/연락처/메모)
function DesignerInputs({
  value,
  onChange,
}: {
  value: { name: string; contact: string; memo: string };
  onChange: (v: { name: string; contact: string; memo: string }) => void;
}) {
  const cls =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-[#0e299c] placeholder:text-gray-400";
  return (
    <div className="flex flex-col gap-2">
      <input
        className={cls}
        placeholder="이름 (필수)"
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
      />
      <input
        className={cls}
        placeholder="연락처 (전화·이메일·카카오톡 등)"
        value={value.contact}
        onChange={(e) =>
          onChange({ ...value, contact: formatContact(e.target.value) })
        }
      />
      <textarea
        className={`${cls} resize-none`}
        rows={2}
        placeholder="메모 (단가·스타일·특이사항)"
        value={value.memo}
        onChange={(e) => onChange({ ...value, memo: e.target.value })}
      />
    </div>
  );
}
