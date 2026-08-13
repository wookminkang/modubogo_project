"use client";

import { useState } from "react";
import type { TaskPriority } from "@/lib/db";

const OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "high", label: "높음" },
  { value: "normal", label: "보통" },
  { value: "low", label: "낮음" },
];

/**
 * 우선순위 세그먼트 컨트롤 + hidden input (LeaveRequestForm의 unit 선택 패턴).
 * 서버 렌더 폼(등록/수정) 안에 leaf 클라이언트 컴포넌트로 끼워 쓴다.
 */
export default function PrioritySegment({
  name = "priority",
  defaultValue = "normal",
}: {
  name?: string;
  defaultValue?: TaskPriority;
}) {
  const [value, setValue] = useState<TaskPriority>(defaultValue);

  return (
    <div className="flex items-center gap-1 rounded-xl bg-gray-50 p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setValue(opt.value)}
          className={`flex-1 h-9 px-4 rounded-lg text-sm font-semibold transition-colors ${
            value === opt.value
              ? "bg-white text-[#0e299c] shadow-sm"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          {opt.label}
        </button>
      ))}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
