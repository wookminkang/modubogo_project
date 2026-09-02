"use client";

import { useState } from "react";

// 새 레이아웃 리포트(/geo-report/[id]/period-compare) 링크를 복사하거나 미리본다.
// CompareLinkButton과 데이터 소스는 같지만(가짜 기간 창 없음), 화면 스타일이 다르다
// (통계 타일 + 통합 추이 차트) — 그래서 별도 라우트/버튼으로 둔다.
// 두 점검일만 고르던 이전 버전과 달리, 지금은 실제 점검일 전부를 리포트가 자동으로 담는다
// (from/to 쿼리 없음) — 점검 회차가 늘어나면 링크를 바꿀 필요 없이 그대로 최신 이력을 보여준다.
export default function PeriodReportLinkButton({
  targetId,
  runDates, // 최신순
}: {
  targetId: string;
  runDates: string[];
}) {
  const [copied, setCopied] = useState(false);

  if (runDates.length < 2) return null; // 점검이 2회 이상이어야 비교가 의미 있다

  const href = `/geo-report/${targetId}/period-compare`;

  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}${href}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#0e299c] px-3 py-1.5 text-xs font-semibold text-[#0e299c] transition-colors hover:bg-[#0e299c]/5"
      >
        {copied ? "복사됨 ✓" : "🗓️ 새 레이아웃 리포트 링크 복사"}
      </button>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#333d4b] hover:bg-gray-50 transition-colors"
      >
        미리보기
      </a>
    </div>
  );
}
