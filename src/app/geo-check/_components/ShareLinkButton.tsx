"use client";

import { useState } from "react";

// 공개 뷰(/geo-report/[id]) 링크를 클립보드에 복사한다.
// window.location 기준으로 절대 URL 을 만들어 광고주에게 그대로 전달할 수 있게 한다.
export default function ShareLinkButton({ targetId }: { targetId: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/geo-report/${targetId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[#0e299c] px-3 py-1.5 text-xs font-semibold text-[#0e299c] transition-colors hover:bg-[#0e299c]/5"
    >
      {copied ? "링크 복사됨 ✓" : "🔗 광고주 공유 링크 복사"}
    </button>
  );
}
