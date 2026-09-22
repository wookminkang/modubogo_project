"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

// 제출된 값을 클립보드로 복사 (키워드 목록을 GEO 체크 키워드 등록에 그대로 붙여넣는 용도).
export default function CopyButton({ text, label = "복사" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md bg-[var(--seed-color-bg-brand-weak)] px-2 py-1 text-xs font-semibold text-[#0e299c] transition-opacity hover:opacity-80"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "복사됨" : label}
    </button>
  );
}
