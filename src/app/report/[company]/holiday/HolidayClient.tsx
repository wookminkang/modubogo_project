"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import dayjs from "@/lib/dayjs";
import { sendHolidayAlimtalk } from "@/lib/bizgo";
import Toast from "@/components/Toast";
import ConfirmToast from "@/components/ConfirmToast";
import AlimtalkPanel from "./AlimtalkPanel";

interface Holiday {
  date: string;
  name: string;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n: number) => String(n).padStart(2, "0");

export default function HolidayClient({
  hospitalName,
  year,
  month,
  holidays,
  recipients,
}: {
  hospitalName: string;
  year: number;
  month: number;
  holidays: Holiday[];
  recipients?: string[];
}) {
  // 알림톡 전송 상태
  const [sendStep, setSendStep] = useState<
    "idle" | "confirm" | "sending" | "result"
  >("idle");
  const [sendMsg, setSendMsg] = useState("");

  const monthKey = `${year}-${pad(month)}`;

  const handleSend = async () => {
    setSendStep("sending");
    try {
      // 템플릿이 "- #{공휴일}" 로 첫 dash를 제공하므로, 변수는 dash 없이 "\n- " 로 연결
      const schedule =
        holidays.length > 0
          ? holidays
              .map((h) => `${dayjs(h.date).format("M월 D일(ddd)")} ${h.name}`)
              .join("\n- ")
          : `${month}월 공휴일이 없습니다.`;
      const detailUrl = `https://modubogo.com/holiday/${encodeURIComponent(hospitalName)}/${monthKey}`;

      await sendHolidayAlimtalk({
        company: hospitalName,
        monthLabel: monthKey,
        monthNum: month,
        schedule,
        detailUrl,
        recipients,
      });
      setSendMsg("알림톡을 발송했어요 ✅");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      setSendMsg(`발송 실패: ${msg}`);
    }
    setSendStep("result");
  };

  // 달력 그리드 구성
  const holidayMap = new Map(holidays.map((h) => [h.date, h.name]));
  const first = dayjs(`${year}-${pad(month)}-01`);
  const daysInMonth = first.daysInMonth();
  const startWeekday = first.day();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <div className="flex-1 overflow-x-clip bg-[#F0F4FA] py-6 px-4">
        <div className="max-w-[1100px] mx-auto bg-white rounded-2xl shadow-sm px-4 py-6 md:px-8 md:py-8">
          <Link
            href={`/report/${encodeURIComponent(hospitalName)}`}
            className="mb-5 inline-flex items-center gap-1.5 text-base font-semibold text-gray-600 transition-colors hover:text-[#0e299c]"
          >
            <ArrowLeft size={18} />
            뒤로가기
          </Link>

          {/* 헤더 + 알림톡 전송 버튼 */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#0e299c] break-keep">
                {hospitalName}
              </h1>
              <p className="text-[#6b7684] mt-1 text-sm">
                {year}년 {month}월 공휴일 진료 일정을 확인하고 알림톡을
                보내보세요.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 md:justify-end">
              <button
                type="button"
                onClick={() => setSendStep("confirm")}
                disabled={sendStep === "sending"}
                className="cursor-pointer rounded-xl bg-[#FEE500] px-4 py-2.5 text-sm font-bold text-[#3C1E1E] transition-all hover:brightness-95 active:scale-[0.99] disabled:opacity-50"
              >
                {sendStep === "sending" ? "전송 중..." : "알림톡 전송하기"}
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-8 md:flex-row md:gap-10">
            {/* 왼쪽: 캘린더 (작게) */}
            <div className="md:w-[360px] md:shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  {year}.{pad(month)}
                </h2>
                <span className="text-xs font-semibold text-red-500 bg-red-50 px-2.5 py-1 rounded-full">
                  공휴일 {holidays.length}일
                </span>
              </div>

              {/* 요일 헤더 */}
              <div className="mt-3 grid grid-cols-7 border-b border-gray-100 pb-2">
                {WEEKDAYS.map((w, i) => (
                  <div
                    key={w}
                    className={`text-center text-xs font-semibold ${
                      i === 0
                        ? "text-red-400"
                        : i === 6
                          ? "text-blue-400"
                          : "text-gray-400"
                    }`}
                  >
                    {w}
                  </div>
                ))}
              </div>

              {/* 날짜 그리드 */}
              <div className="grid grid-cols-7 gap-y-1 pt-2">
                {cells.map((d, idx) => {
                  if (d === null)
                    return <div key={idx} className="min-h-[68px]" />;
                  const dateStr = `${year}-${pad(month)}-${pad(d)}`;
                  const holidayName = holidayMap.get(dateStr);
                  const weekday = idx % 7;
                  const numColor = holidayName
                    ? ""
                    : weekday === 0
                      ? "text-red-400"
                      : weekday === 6
                        ? "text-blue-400"
                        : "text-gray-700";
                  return (
                    <div
                      key={idx}
                      className="flex min-h-[68px] flex-col items-center gap-1 pt-1"
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors ${
                          holidayName
                            ? "bg-red-500 text-white font-bold shadow-sm shadow-red-200"
                            : `font-medium ${numColor}`
                        }`}
                      >
                        {d}
                      </span>
                      {holidayName && (
                        <span className="px-0.5 text-[10px] font-semibold leading-tight text-red-500 text-center break-keep">
                          {holidayName}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>

            {/* 오른쪽: 알림톡/자세히보기 미리보기 (나란히) */}
            <div className="min-w-0 flex-1 md:border-l md:border-gray-100 md:pl-10">
              <AlimtalkPanel
                hospitalName={hospitalName}
                year={year}
                month={month}
                holidays={holidays}
              />
            </div>
          </div>
        </div>
      </div>

      {sendStep === "confirm" && (
        <ConfirmToast
          title={hospitalName}
          subtitle={`${month}월 진료일정`}
          message="진료일정 알림톡을 보내시겠어요?"
          onYes={handleSend}
          onNo={() => {
            setSendStep("result");
            setSendMsg("알림톡 보내기를 취소했어요");
          }}
        />
      )}
      {sendStep === "result" && (
        <Toast message={sendMsg} onDone={() => setSendStep("idle")} />
      )}
    </>
  );
}
