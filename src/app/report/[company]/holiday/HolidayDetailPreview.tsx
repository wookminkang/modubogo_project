"use client";

import dayjs from "@/lib/dayjs";

interface Holiday {
  date: string;
  name: string;
}

// 배너는 고정 (알림톡 샘플 배너) — 실제 /holiday 페이지와 동일
const SAMPLE_BANNER = "/images/talk_sample_img.jpg";

/**
 * '진료일정 회신하기' 클릭 시 보이는 공개 안내 페이지(/holiday/[company]/[month]) 미리보기.
 * - 상단 배너 이미지
 * - 공휴일별 진료여부 버튼 (미리보기 — 액션 없음)
 */
export default function HolidayDetailPreview({
  hospitalName,
  year,
  month,
  holidays,
}: {
  hospitalName: string;
  year: number;
  month: number;
  holidays: Holiday[];
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-[#F0F4FA] p-4">
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {/* 상단 배너 (고정 샘플) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SAMPLE_BANNER} alt="공휴일 진료 안내" className="h-auto w-full" />

        <div className="flex flex-col gap-4 p-4">
          {/* 타이틀 + 보조설명 */}
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-bold text-gray-900">
              공휴일 진료일정 확인
            </h2>
            <p className="text-xs leading-relaxed text-gray-500">
              다가오는 공휴일에 우리 병원이 진료하는지 확인하는 페이지예요.
              공휴일마다{" "}
              <b className="font-semibold text-gray-700">
                오전진료·정상진료·휴무
              </b>
              를 선택하시고, 변경할 내용이 있으면 수정 후 아래{" "}
              <b className="font-semibold text-gray-700">확인 완료</b> 버튼을
              눌러주세요.
            </p>
          </div>

          {/* 병원명 */}
          <div className="rounded-lg bg-[#F0F4FA] px-3 py-2.5">
            <p className="text-sm font-bold text-[#0e299c] break-keep">
              {hospitalName}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {year}년 {month}월 공휴일 진료일정
            </p>
          </div>

          {/* 공휴일 카드 */}
          <div className="flex flex-col gap-2">
            {holidays.length === 0 ? (
              <p className="text-sm text-gray-400">이번 달 공휴일이 없어요.</p>
            ) : (
              holidays.map((h) => (
                <div
                  key={h.date}
                  className="rounded-lg border border-gray-100 px-3 py-3"
                >
                  <p className="text-sm font-bold text-gray-900">
                    {dayjs(h.date).format("M월 D일 (ddd)")}{" "}
                    <span className="font-semibold text-red-500">{h.name}</span>
                  </p>
                  {/* 실제 화면과 동일한 버튼 (미리보기 — 액션 없음) */}
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {["오전진료", "정상진료", "휴무"].map((label, i) => (
                      <div
                        key={label}
                        className={`rounded-md py-1.5 text-center text-xs font-medium ${
                          i === 1
                            ? "bg-[#0e299c] text-white"
                            : "bg-[#F0F4FA] text-gray-400"
                        }`}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
