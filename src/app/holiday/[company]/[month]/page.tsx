import { getPublicHolidays } from "@/lib/publicHoliday";
import { getHolidaySchedules, resolveCompanyParam } from "@/lib/db";
import HolidayCheckForm from "./HolidayCheckForm";

interface Props {
  params: Promise<{ company: string; month: string }>;
}

export const dynamic = "force-dynamic";

// 원장이 알림톡 '진료일정 회신하기'로 진입하는 공개 페이지.
// month = 'YYYY-MM'
export default async function HolidayLandingPage({ params }: Props) {
  const { company, month } = await params;
  // nanoid 또는 상호명 모두 받는다 — 상호명이 바뀌어도 nanoid 링크는 계속 열리고,
  // 과거에 이름으로 발송된 링크도 그대로 동작한다.
  const hospitalName = await resolveCompanyParam(company);
  const [ys, ms] = month.split("-");
  const year = Number(ys);
  const monthNum = Number(ms);

  const [holidays, existing] = await Promise.all([
    getPublicHolidays(year, monthNum),
    getHolidaySchedules(hospitalName, month),
  ]);

  // 공휴일 + 저장된 진료여부 병합
  const existingMap = new Map(existing.map((e) => [e.date, e]));
  const toItem = (
    date: string,
    holidayName: string,
    isCustom: boolean
  ) => {
    const ex = existingMap.get(date);
    return {
      date,
      holiday_name: holidayName,
      status: (ex?.status as "morning" | "open" | "closed" | "") ?? "",
      short_start: ex?.short_start ?? "",
      short_end: ex?.short_end ?? "",
      noLunch: (ex?.note ?? "").includes("점심시간 없음"),
      lunch_start: ex?.lunch_start ?? "",
      lunch_end: ex?.lunch_end ?? "",
      isCustom,
    };
  };

  // ① 공휴일 항목
  const holidayItems = holidays.map((h) => toItem(h.date, h.name, false));

  // ② 임의(비공휴일) 휴무 항목 — 기존 저장분 중 공휴일이 아닌 date
  const holidayDates = new Set(holidays.map((h) => h.date));
  const customItems = existing
    .filter((e) => !holidayDates.has(e.date))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => toItem(e.date, e.holiday_name || "임시 휴무", true));

  return (
    <HolidayCheckForm
      hospitalName={hospitalName}
      monthLabel={`${year}년 ${monthNum}월`}
      month={month}
      items={[...holidayItems, ...customItems]}
    />
  );
}
