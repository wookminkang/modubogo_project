import { getPublicHolidays } from "@/lib/publicHoliday";
import { getHolidaySchedules } from "@/lib/db";
import HolidayCheckForm from "./HolidayCheckForm";

interface Props {
  params: Promise<{ company: string; month: string }>;
}

export const dynamic = "force-dynamic";

// 원장이 알림톡 '자세한 내용 확인하기'로 진입하는 공개 페이지.
// month = 'YYYY-MM'
export default async function HolidayLandingPage({ params }: Props) {
  const { company, month } = await params;
  const hospitalName = decodeURIComponent(company);
  const [ys, ms] = month.split("-");
  const year = Number(ys);
  const monthNum = Number(ms);

  const [holidays, existing] = await Promise.all([
    getPublicHolidays(year, monthNum),
    getHolidaySchedules(hospitalName, month),
  ]);

  // 공휴일 + 저장된 진료여부 병합
  const existingMap = new Map(existing.map((e) => [e.date, e]));
  const items = holidays.map((h) => {
    const ex = existingMap.get(h.date);
    return {
      date: h.date,
      holiday_name: h.name,
      status: (ex?.status as "open" | "closed" | "morning") ?? "open",
      short_start: ex?.short_start ?? "",
      short_end: ex?.short_end ?? "",
      noLunch: (ex?.note ?? "").includes("점심시간 없음"),
      lunch_start: ex?.lunch_start ?? "",
      lunch_end: ex?.lunch_end ?? "",
    };
  });

  return (
    <HolidayCheckForm
      hospitalName={hospitalName}
      monthLabel={`${year}년 ${monthNum}월`}
      items={items}
    />
  );
}
