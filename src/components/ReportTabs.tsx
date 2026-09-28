"use client";

import { useState } from "react";

/**
 * 보고서 공개 뷰의 탭 — [이번 달 보고서] / [히스토리].
 *
 * 두 화면 모두 서버에서 미리 그려 넘겨받고(children 으로), 여기서는 보여줄 쪽만 고른다.
 * 탭을 누를 때 서버를 다시 부르지 않아 전환이 즉시 끝난다.
 */
export default function ReportTabs({
  report,
  history,
  historyCount,
}: {
  report: React.ReactNode;
  history: React.ReactNode;
  historyCount: number;
}) {
  const [tab, setTab] = useState<"report" | "history">("report");

  return (
    <div>
      <div className="flex gap-1 bg-[#F0F4FA] px-4 pt-4">
        <TabButton active={tab === "report"} onClick={() => setTab("report")}>
          이번 달 보고서
        </TabButton>
        <TabButton active={tab === "history"} onClick={() => setTab("history")}>
          히스토리
          {historyCount > 0 && (
            <span className="ml-1 text-[11px] font-semibold opacity-70">{historyCount}</span>
          )}
        </TabButton>
      </div>

      {/* 감춘 쪽도 DOM 에 두면 스크롤 위치·입력 중인 내용이 유지된다 */}
      <div hidden={tab !== "report"}>{report}</div>
      <div hidden={tab !== "history"}>{history}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 rounded-t-xl px-4 py-3 text-sm font-bold transition-colors ${
        active ? "bg-white text-[#0e299c] shadow-sm" : "bg-transparent text-gray-400 hover:text-gray-600"
      }`}
    >
      {children}
    </button>
  );
}
