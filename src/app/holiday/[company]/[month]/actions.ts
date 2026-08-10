"use server";

import { supabase } from "@/lib/supabase";
import { nextMonthStart } from "@/lib/db";

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

/**
 * 원장이 확인·수정한 진료여부(공휴일 + 임의 휴무)를 holiday_schedules 에 저장.
 * 해당 월의 저장본을 "제출된 항목과 동일"하게 동기화한다(삭제 후 삽입) →
 * 원장이 제거한 임의 휴무일도 반영된다. month = 'YYYY-MM'.
 */
export async function submitHolidaySchedule(
  company: string,
  month: string,
  items: HolidayScheduleItem[]
) {
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

  // 1) 이 달의 기존 저장본 삭제 (제거된 임의 휴무일까지 반영)
  const { error: delErr } = await supabase
    .from("holiday_schedules")
    .delete()
    .eq("company", company)
    .gte("date", `${month}-01`)
    .lt("date", nextMonthStart(month));
  if (delErr) throw delErr;

  // 2) 제출된 항목 삽입
  if (rows.length > 0) {
    const { error } = await supabase.from("holiday_schedules").insert(rows);
    if (error) throw error;
  }

  // 변경 이력 기록 (제출할 때마다 1행) — 실패해도 제출 자체는 성공 처리
  if (items.length > 0) {
    const { error: logErr } = await supabase
      .from("holiday_submissions")
      .insert({ company, month, schedule: items });
    if (logErr) console.error("[holiday] 이력 저장 실패:", logErr);
  }
}
