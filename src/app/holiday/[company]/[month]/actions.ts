"use server";

import { supabase } from "@/lib/supabase";

export interface HolidayScheduleItem {
  date: string; // YYYY-MM-DD
  holiday_name: string;
  status: "open" | "closed" | "morning";
  short_start: string;
  short_end: string;
  noLunch: boolean;
  lunch_start: string;
  lunch_end: string;
}

/** 원장이 확인·수정한 공휴일별 진료여부를 holiday_schedules 에 저장(upsert). */
export async function submitHolidaySchedule(
  company: string,
  items: HolidayScheduleItem[]
) {
  if (items.length === 0) return;

  const rows = items.map((it) => {
    // 근무시간·점심시간은 오전진료·정상진료에서 저장
    const hasHours = it.status === "morning" || it.status === "open";
    const hasLunch = hasHours && !it.noLunch;
    return {
      company,
      date: it.date,
      holiday_name: it.holiday_name,
      status: it.status,
      short_start: hasHours ? it.short_start || null : null,
      short_end: hasHours ? it.short_end || null : null,
      lunch_start: hasLunch ? it.lunch_start || null : null,
      lunch_end: hasLunch ? it.lunch_end || null : null,
      note:
        (it.status === "morning" || it.status === "open") && it.noLunch
          ? "점심시간 없음"
          : null,
    };
  });

  const { error } = await supabase
    .from("holiday_schedules")
    .upsert(rows, { onConflict: "company,date" });
  if (error) throw error;

  // 변경 이력 기록 (제출할 때마다 1행) — 실패해도 제출 자체는 성공 처리
  const month = items[0].date.slice(0, 7); // 'YYYY-MM'
  const { error: logErr } = await supabase
    .from("holiday_submissions")
    .insert({ company, month, schedule: items });
  if (logErr) console.error("[holiday] 이력 저장 실패:", logErr);
}
