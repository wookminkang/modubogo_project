"use client";

import { useState, useTransition, useRef } from "react";
import { DEFAULT_COLORS } from "@/lib/categoryColors";
import { saveCategoryColor, deleteCategoryColor } from "./actions";
import { Trash2, Plus } from "lucide-react";

interface CategoryRow {
  category: string;
  bgHex: string;
  textHex: string;
}

interface Props {
  initialColors: CategoryRow[];
}

const DEFAULT_KEYS = Object.keys(DEFAULT_COLORS);

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

  const [newName, setNewName] = useState("");
  const [newBg, setNewBg] = useState("#e0f2fe");
  const [newText, setNewText] = useState("#0369a1");
  const [addError, setAddError] = useState("");

  const handleColorChange = (catIdx: number, field: "bgHex" | "textHex", value: string) => {
    const updated = colors.map((c, i) => i === catIdx ? { ...c, [field]: value } : c);
    setColors(updated);
  };

  const handleSave = (catIdx: number) => {
    const row = colors[catIdx];
    startTransition(async () => {
      await saveCategoryColor(row.category, row.bgHex, row.textHex);
      setSavedIdx(catIdx);
      setTimeout(() => setSavedIdx(null), 1500);
    });
  };

  const handleDelete = (catIdx: number) => {
    const target = colors[catIdx];
    setColors((prev) => prev.filter((_, i) => i !== catIdx));
    startTransition(async () => {
      await deleteCategoryColor(target.category);
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
      {/* 새 카테고리 추가 — 상단 */}
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
        {colors.map((row, catIdx) => {
          const isDefault = DEFAULT_KEYS.includes(row.category);
          return (
            <div key={row.category} className={`px-4 py-4 ${catIdx !== colors.length - 1 ? "border-b border-gray-100" : ""}`}>
              <div className="flex items-center justify-between mb-3">
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
                  {!isDefault && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(catIdx)}
                      className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ColorSwatch
                  label="배경색"
                  value={row.bgHex}
                  onChange={(v) => handleColorChange(catIdx, "bgHex", v)}
                />
                <ColorSwatch
                  label="텍스트색"
                  value={row.textHex}
                  onChange={(v) => handleColorChange(catIdx, "textHex", v)}
                />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSave(catIdx)}
                  className="text-xs text-[#0e299c] font-semibold px-3 py-1.5 rounded-xl border border-[#0e299c]/30 hover:bg-[#0e299c]/5 transition-colors"
                >
                  저장
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
