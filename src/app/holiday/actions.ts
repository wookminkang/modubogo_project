"use server";

import dayjs from "@/lib/dayjs";
import { hasHolidayAccess } from "@/lib/menu-access";
import { getPublicHolidays } from "@/lib/publicHoliday";
import { getCompanySettings, getCompanyHospitalType } from "@/lib/db";
import { sendHolidayAlimtalk } from "@/lib/bizgo";

export interface BulkSendResult {
  sent: string[]; // 발송 성공한 회사
  failed: { company: string; reason: string }[]; // 실패한 회사 + 사유
}

/**
 * 선택한 여러 병원에 진료일정 알림톡을 일괄 발송한다.
 * - 공휴일 목록은 월 기준 1회만 조회해 모두에게 동일 적용
 * - 수신번호(원장 번호)는 회사별 company_settings 에서 조회
 * - 회사별 독립 발송(Promise.allSettled)으로 일부 실패해도 나머지는 진행
 */
export async function sendBulkHolidayAlimtalk(
  companies: string[],
  monthKey: string
): Promise<BulkSendResult> {
  if (!(await hasHolidayAccess())) throw new Error("권한이 없습니다.");

  const targets = Array.from(new Set(companies.filter(Boolean)));
  if (targets.length === 0) return { sent: [], failed: [] };

  const base = dayjs(`${monthKey}-01`);
  const year = base.year();
  const month = base.month() + 1;

  const holidays = await getPublicHolidays(year, month);
  // 템플릿의 #{공휴일} 변수에 들어갈 일정 목록 (템플릿에 dash가 없으므로 각 줄 앞에 "- ")
  const schedule =
    holidays.length > 0
      ? holidays
          .map((h) => `- ${dayjs(h.date).format("M월 D일(ddd)")} ${h.name}`)
          .join("\n")
      : `- ${month}월 공휴일이 없습니다.`;

  const results = await Promise.allSettled(
    targets.map(async (company) => {
      // 목록 화면에서 걸러지지만, 서버 액션이 직접 호출될 경우를 대비한 방어 가드.
      const hospitalType = await getCompanyHospitalType(company);
      if (hospitalType === "탈퇴") throw new Error("탈퇴한 병원입니다.");

      const settings = await getCompanySettings(company);
      const recipients = [
        settings?.recipient1,
        settings?.recipient2,
        settings?.recipient3,
        settings?.recipient4,
        settings?.recipient5,
      ].filter(Boolean) as string[];

      // 링크에는 nanoid 를 쓴다 — 상호명이 URL 에 박히면 나중에 이름을 바꿨을 때
      // 이미 발송된 버튼이 끊긴다. nanoid 가 없는 병원만 이름으로 폴백.
      const slug =
        (settings?.nanoid as string | null | undefined) ??
        encodeURIComponent(company);
      const detailUrl = `https://modubogo.com/holiday/${slug}/${monthKey}`;

      await sendHolidayAlimtalk({
        company,
        slug,
        monthLabel: monthKey,
        monthNum: month,
        schedule,
        detailUrl,
        recipients,
      });
    })
  );

  const sent: string[] = [];
  const failed: { company: string; reason: string }[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      sent.push(targets[i]);
    } else {
      const reason =
        r.reason instanceof Error ? r.reason.message : String(r.reason);
      failed.push({ company: targets[i], reason });
    }
  });

  return { sent, failed };
}
