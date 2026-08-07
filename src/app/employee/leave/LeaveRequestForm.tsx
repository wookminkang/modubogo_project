"use client";

import { useState } from "react";
import { submitLeaveRequest } from "@/lib/leave-actions";
import { daysInclusive } from "@/lib/utils";

type Unit = "full" | "half_am" | "half_pm";

const UNIT_OPTIONS: { value: Unit; label: string }[] = [
  { value: "full", label: "종일" },
  { value: "half_am", label: "오전반차" },
  { value: "half_pm", label: "오후반차" },
];

export default function LeaveRequestForm({ remainingDays }: { remainingDays: number }) {
  const [unit, setUnit] = useState<Unit>("full");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const requestedDays =
    unit !== "full"
      ? startDate
        ? 0.5
        : 0
      : startDate && endDate && startDate <= endDate
        ? daysInclusive(startDate, endDate)
        : 0;
  const overQuota = requestedDays > 0 && requestedDays > remainingDays;

  return (
    <form
      action={submitLeaveRequest}
      className="bg-white rounded-2xl p-5 shadow-sm flex flex-col gap-3 max-w-[480px]"
    >
      <div className="flex items-center gap-1 rounded-xl bg-gray-50 p-1">
        {UNIT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setUnit(opt.value)}
            className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-colors ${
              unit === opt.value
                ? "bg-white text-[#0e299c] shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <input type="hidden" name="unit" value={unit} />

      {unit === "full" ? (
        <div className="flex items-center gap-2">
          <input
            type="date"
            name="startDate"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-10 flex-1 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 outline-none focus:border-[#0e299c]"
          />
          <span className="text-gray-400">~</span>
          <input
            type="date"
            name="endDate"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-10 flex-1 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 outline-none focus:border-[#0e299c]"
          />
        </div>
      ) : (
        <input
          type="date"
          name="startDate"
          required
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 outline-none focus:border-[#0e299c]"
        />
      )}

      {requestedDays > 0 && (
        <p className={`text-xs font-medium ${overQuota ? "text-red-500" : "text-gray-500"}`}>
          총 {requestedDays}일 신청
          {overQuota && ` — 남은 연차(${remainingDays}일)보다 많아요`}
        </p>
      )}

      <textarea
        name="reason"
        rows={3}
        placeholder="사유를 입력해주세요."
        className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 outline-none focus:border-[#0e299c] focus:ring-2 focus:ring-[#0e299c]/20 resize-none"
      />

      <button
        type="submit"
        className="self-end h-10 px-5 bg-[#0e299c] hover:bg-[#0b2180] text-white font-semibold rounded-xl text-sm transition-colors"
      >
        신청하기
      </button>
    </form>
  );
}
