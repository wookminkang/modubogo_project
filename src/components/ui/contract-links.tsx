"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { parseContractLinks, stringifyContractLinks, type ContractLink } from "@/lib/mockData";

/**
 * 계약 항목의 보고서 링크 입력 — 여러 개를 줄 단위로 넣는다.
 *
 * 폼에서는 `contracts.N.link` 문자열 한 칸을 그대로 쓰고(저장 경로 변경 없음),
 * 이 컴포넌트가 "이름|주소" 줄 목록으로 풀었다가 다시 합친다.
 * 보고서 작성(new)과 수정(edit) 두 화면이 같은 입력을 쓰도록 컴포넌트로 뺐다.
 */
export function ContractLinks({
  value,
  onChange,
  inputClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  inputClassName?: string;
}) {
  // 화면에 보이는 줄은 여기서 들고 있는다. 저장 문자열은 주소가 빈 줄을 버리기 때문에,
  // 저장값만 보고 그리면 "링크 추가"로 만든 빈 줄이 그 자리에서 사라진다.
  const [rows, setRows] = useState<ContractLink[]>(() => {
    const saved = parseContractLinks(value);
    return saved.length ? saved : [{ label: "", url: "" }];
  });

  const write = (next: ContractLink[]) => {
    setRows(next);
    onChange(stringifyContractLinks(next));
  };

  const setRow = (index: number, patch: Partial<ContractLink>) =>
    write(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <div className="flex flex-1 flex-col gap-2">
      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          {/* 이름 칸은 폭을 고정한다 — 넘겨받는 입력 클래스에 flex-1 이 들어 있어 감싸서 고정한다 */}
          <div className="w-[38%] shrink-0">
            <Input
              value={row.label}
              onChange={(e) => setRow(index, { label: e.target.value })}
              placeholder="이름 (예: 네이버 리포트)"
              className={`w-full ${inputClassName ?? ""}`}
            />
          </div>
          <Input
            value={row.url}
            onChange={(e) => setRow(index, { url: e.target.value })}
            placeholder="링크 URL"
            className={inputClassName}
          />
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => write(rows.filter((_, i) => i !== index))}
              aria-label={`링크 ${index + 1} 삭제`}
              className="shrink-0 rounded-lg p-1.5 text-[var(--seed-color-fg-neutral-muted)] transition-colors hover:bg-[var(--seed-color-bg-critical-weak)] hover:text-[var(--seed-color-fg-critical)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => write([...rows, { label: "", url: "" }])}
        className="flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[var(--seed-color-fg-neutral-muted)] transition-colors hover:bg-[var(--seed-color-bg-neutral-weak)] hover:text-[#0e299c]"
      >
        <Plus className="h-3.5 w-3.5" />
        링크 추가
      </button>
    </div>
  );
}
