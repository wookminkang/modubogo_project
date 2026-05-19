"use client";

import { useState, useTransition, useRef } from "react";
import { saveCategoryColor, deleteCategoryColor } from "./actions";
import ConfirmToast from "@/components/ConfirmToast";
import Toast from "@/components/Toast";
import { Trash2, Plus, Pencil } from "lucide-react";

interface CategoryRow {
  category: string;
  bgHex: string;
  textHex: string;
}

interface Props {
  initialColors: CategoryRow[];
}


function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <button
      type="button"
      onClick={() => ref.current?.click()}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
    >
      <span
        className="w-5 h-5 rounded-md border border-black/10 shrink-0"
        style={{ backgroundColor: value }}
      />
      <span className="text-xs text-gray-500">{label}</span>
      <input
        ref={ref}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />
    </button>
  );
}

export default function CategoryColorEditor({ initialColors }: Props) {
  const [colors, setColors] = useState<CategoryRow[]>(initialColors);
  const [savedIdx, setSavedIdx] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editBg, setEditBg] = useState("");
  const [editText, setEditText] = useState("");
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const [toast, setToast] = useState("");

  const [newName, setNewName] = useState("");
  const [newBg, setNewBg] = useState("#e0f2fe");
  const [newText, setNewText] = useState("#0369a1");
  const [addError, setAddError] = useState("");

  const startEdit = (catIdx: number) => {
    const row = colors[catIdx];
    setEditIdx(catIdx);
    setEditName(row.category);
    setEditBg(row.bgHex);
    setEditText(row.textHex);
  };

  const handleEditSave = () => {
    if (editIdx === null) return;
    const original = colors[editIdx];
    const trimmed = editName.trim();
    if (!trimmed) return;

    const updated = colors.map((c, i) =>
      i === editIdx ? { category: trimmed, bgHex: editBg, textHex: editText } : c
    );
    setColors(updated);
    const savedAt = editIdx;
    setEditIdx(null);

    startTransition(async () => {
      if (original.category !== trimmed) {
        await deleteCategoryColor(original.category);
      }
      await saveCategoryColor(trimmed, editBg, editText);
      setSavedIdx(savedAt);
      setTimeout(() => setSavedIdx(null), 1500);
      setToast("색상이 저장되었어요.");
    });
  };

  const handleCancel = () => {
    setEditIdx(null);
    setToast("수정을 취소했어요.");
  };

  const handleDeleteConfirm = () => {
    if (deleteIdx === null) return;
    const target = colors[deleteIdx];
    setColors((prev) => prev.filter((_, i) => i !== deleteIdx));
    setDeleteIdx(null);
    startTransition(async () => {
      await deleteCategoryColor(target.category);
      setToast(`'${target.category}' 카테고리를 삭제했어요.`);
    });
  };

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) { setAddError("카테고리명을 입력해주세요."); return; }
    if (colors.some((c) => c.category === trimmed)) { setAddError("이미 존재하는 카테고리예요."); return; }
    setAddError("");
    const newRow = { category: trimmed, bgHex: newBg, textHex: newText };
    setColors((prev) => [...prev, newRow]);
    setNewName("");
    startTransition(async () => {
      await saveCategoryColor(trimmed, newBg, newText);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
      {/* 삭제 확인 바텀시트 */}
      {deleteIdx !== null && (
        <ConfirmToast
          title="카테고리 삭제"
          subtitle={colors[deleteIdx]?.category}
          message="이 카테고리를 삭제할까요? 삭제 후 복구할 수 없어요."
          showIcon={false}
          yesLabel="삭제"
          noLabel="취소"
          onYes={handleDeleteConfirm}
          onNo={() => setDeleteIdx(null)}
        />
      )}

      {/* 수정 바텀시트 */}
      {editIdx !== null && (
        <ConfirmToast
          title="카테고리 수정"
          subtitle={colors[editIdx]?.category}
          yesLabel="저장"
          noLabel="취소"
          showIcon={false}
          onYes={handleEditSave}
          onNo={handleCancel}
        >
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="카테고리명"
              className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-900 focus:outline-none focus:border-[#0e299c]"
            />
            <div className="flex items-center gap-3 flex-wrap">
              <ColorSwatch label="배경색" value={editBg} onChange={setEditBg} />
              <ColorSwatch label="텍스트색" value={editText} onChange={setEditText} />
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: editBg, color: editText }}
              >
                {editName || "미리보기"}
              </span>
            </div>
          </div>
        </ConfirmToast>
      )}

      {/* 새 카테고리 추가 */}
      <div className="bg-white rounded-2xl shadow-sm px-4 py-4 flex flex-col gap-3">
        <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
          <Plus size={15} className="text-[#0e299c]" />
          새 카테고리 추가
        </p>
        <input
          type="text"
          value={newName}
          onChange={(e) => { setNewName(e.target.value); setAddError(""); }}
          placeholder="카테고리명 입력 (ex. 바이럴)"
          className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-900 focus:outline-none focus:border-[#0e299c]"
        />
        {addError && <p className="text-xs text-red-400">{addError}</p>}
        <div className="flex items-center gap-3">
          <ColorSwatch label="배경색" value={newBg} onChange={setNewBg} />
          <ColorSwatch label="텍스트색" value={newText} onChange={setNewText} />
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-lg"
            style={{ backgroundColor: newBg, color: newText }}
          >
            {newName || "미리보기"}
          </span>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={handleAdd}
          className="w-full h-10 bg-[#0e299c] text-white text-sm font-semibold rounded-xl hover:bg-[#0b2180] transition-colors disabled:opacity-50"
        >
          추가하기
        </button>
      </div>

      {/* 기존 카테고리 목록 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {colors.map((row, catIdx) => (
          <div key={row.category} className={`px-4 py-4 flex items-center justify-between ${catIdx !== colors.length - 1 ? "border-b border-gray-100" : ""}`}>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: row.bgHex, color: row.textHex }}
            >
              {row.category}
            </span>
            <div className="flex items-center gap-2">
              {savedIdx === catIdx && (
                <span className="text-xs text-green-500 font-medium">저장됨</span>
              )}
              <button
                type="button"
                disabled={isPending}
                onClick={() => startEdit(catIdx)}
                className="flex items-center gap-1 text-xs text-[#0e299c] font-medium px-2.5 py-1.5 rounded-xl border border-[#0e299c]/30 hover:bg-[#0e299c]/5 transition-colors disabled:opacity-50"
              >
                <Pencil size={12} />
                수정
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setDeleteIdx(catIdx)}
                className="flex items-center gap-1 text-xs text-red-400 font-medium px-2.5 py-1.5 rounded-xl border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <Trash2 size={12} />
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
