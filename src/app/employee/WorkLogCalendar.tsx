"use client";

import { useState, useTransition } from "react";
import dayjs from "@/lib/dayjs";
import { pad } from "@/lib/utils";
import { saveWorkLog } from "@/lib/worklog-actions";
import type { WorkLog } from "@/lib/db";
import type { PublicHoliday } from "@/lib/publicHoliday";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function WorkLogCalendar({
  month,
  today,
  logs,
  leaveRanges,
  holidays,
}: {
  month: string; // 'YYYY-MM'
  today: string; // 'YYYY-MM-DD'
  logs: WorkLog[];
  leaveRanges: { startDate: string; endDate: string }[];
  holidays: PublicHoliday[];
}) {
  const logByDate = new Map(logs.map((l) => [l.log_date, l.content]));
  const holidayByDate = new Map(holidays.map((h) => [h.date, h.name]));
  const isOnLeave = (dateStr: string) =>
    leaveRanges.some((r) => dateStr >= r.startDate && dateStr <= r.endDate);

  const inThisMonth = today.startsWith(month);
  const [selectedDate, setSelectedDate] = useState(inThisMonth ? today : `${month}-01`);
  const [content, setContent] = useState(() => logByDate.get(selectedDate) ?? "");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  function selectDate(dateStr: string) {
    setSelectedDate(dateStr);
    setContent(logByDate.get(dateStr) ?? "");
    setStatus("idle");
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await saveWorkLog(selectedDate, content);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    });
  }

  // 달력 그리드 구성 (holiday 발송 화면과 동일한 계산 방식)
  const [year, monthNum] = month.split("-").map(Number);
  const first = dayjs(`${month}-01`);
  const daysInMonth = first.daysInMonth();
  const startWeekday = first.day();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      {/* 캘린더 그리드 */}
      <div className="bg-white rounded-2xl shadow-sm p-4 md:flex-1 min-w-0">
        <div className="grid grid-cols-7 border-b border-gray-100 pb-2">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`text-center text-xs font-semibold ${
                i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 pt-2">
          {cells.map((d, idx) => {
            if (d === null) return <div key={idx} className="min-h-[84px]" />;
            const dateStr = `${year}-${pad(monthNum)}-${pad(d)}`;
            const preview = logByDate.get(dateStr);
            const holidayName = holidayByDate.get(dateStr);
            const onLeave = isOnLeave(dateStr);
            const selected = dateStr === selectedDate;
            const isToday = dateStr === today;
            const weekday = idx % 7;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => selectDate(dateStr)}
                className={`flex min-h-[84px] flex-col items-start gap-1 rounded-xl p-1.5 text-left transition-colors ${
                  selected ? "bg-[#0e299c]/10 ring-1 ring-[#0e299c]" : "hover:bg-gray-50"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isToday
                      ? "bg-[#0e299c] text-white"
                      : holidayName || weekday === 0
                        ? "text-red-500"
                        : weekday === 6
                          ? "text-blue-400"
                          : "text-gray-700"
                  }`}
                >
                  {d}
                </span>
                {holidayName && (
                  <span className="w-full truncate rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-500">
                    {holidayName}
                  </span>
                )}
                {onLeave && (
                  <span className="w-full truncate rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-600">
                    휴가
                  </span>
                )}
                {preview && (
                  <span className="w-full truncate rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                    {preview}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택한 날짜 편집 패널 */}
      <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3 md:w-[340px] md:shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">{selectedDate}</span>
          {status === "saved" && <span className="text-xs text-[#0e299c]">저장됨</span>}
          {status === "error" && (
            <span className="text-xs text-red-500">저장 실패, 다시 시도해주세요</span>
          )}
        </div>
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setStatus("idle");
          }}
          rows={10}
          placeholder="이 날 진행한 업무를 자유롭게 적어주세요."
          className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 outline-none focus:border-[#0e299c] focus:ring-2 focus:ring-[#0e299c]/20 resize-none"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="self-end h-10 px-5 bg-[#0e299c] hover:bg-[#0b2180] disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
        >
          {isPending ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
