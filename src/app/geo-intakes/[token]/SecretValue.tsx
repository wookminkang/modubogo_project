"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import CopyButton from "./CopyButton";

// 계정 정보(아이디 / 비밀번호)는 화면을 열었을 때 바로 보이지 않게 가려 두고, '보기'를 눌렀을 때만 표시한다.
export default function SecretValue({ value }: { value: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="break-all font-mono text-sm text-[var(--seed-color-fg-neutral)]">
        {shown ? value : "••••••••"}
      </span>
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? "가리기" : "보기"}
        className="shrink-0 cursor-pointer rounded p-1 text-[var(--seed-color-fg-neutral-subtle)] hover:text-[var(--seed-color-fg-neutral)]"
      >
        {shown ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
      <CopyButton text={value} />
    </div>
  );
}
