"use client";

import { useState } from "react";

// 두 점검일을 골라 비교 리포트(/geo-report/[id]/compare) 링크를 복사하거나 미리본다.
// 기본값: to = 최근 점검일, from = 그 이전 점검일.
export default function CompareLinkButton({
  targetId,
  runDates, // 최신순
}: {
  targetId: string;
  runDates: string[];
}) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(runDates[0] ?? "");
  const [from, setFrom] = useState(runDates.find((d) => d < (runDates[0] ?? "")) ?? runDates[0] ?? "");
  const [copied, setCopied] = useState(false);

  if (runDates.length < 2) return null; // 점검이 2회 이상이어야 비교가 의미 있다

  const href = `/geo-report/${targetId}/compare?from=${from}&to=${to}`;

  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}${href}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const selectCls =
    "h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-[#333d4b] outline-none focus:border-[#0e299c]";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#0e299c] px-3 py-1.5 text-xs font-semibold text-[#0e299c] transition-colors hover:bg-[#0e299c]/5"
      >
        📊 비교 리포트 링크
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
            <p className="text-xs font-bold text-[#333d4b]">점검일 비교 리포트</p>
            <p className="mt-0.5 text-[11px] text-[#8b95a1]">두 점검일을 고르면 성과 비교 링크가 만들어져요.</p>
            <div className="mt-3 flex items-center gap-2">
              <select value={from} onChange={(e) => setFrom(e.target.value)} className={selectCls}>
                {runDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-400">→</span>
              <select value={to} onChange={(e) => setTo(e.target.value)} className={selectCls}>
                {runDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            {from >= to && (
              <p className="mt-2 text-[11px] text-[#c5321f]">이전 날짜가 이번 날짜보다 빨라야 해요.</p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={copy}
                disabled={from >= to}
                className="flex-1 rounded-lg bg-[#0e299c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0b2180] disabled:opacity-40 transition-colors"
              >
                {copied ? "복사됨 ✓" : "🔗 링크 복사"}
              </button>
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className={`flex-1 rounded-lg border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-[#333d4b] hover:bg-gray-50 transition-colors ${
                  from >= to ? "pointer-events-none opacity-40" : ""
                }`}
              >
                미리보기
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
