"use server";

import dayjs from "@/lib/dayjs";
import { isAdmin } from "@/lib/admin";
import { getPublicHolidays } from "@/lib/publicHoliday";
import { getCompanySettings } from "@/lib/db";
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
  if (!(await isAdmin())) throw new Error("권한이 없습니다.");

  const targets = Array.from(new Set(companies.filter(Boolean)));
  if (targets.length === 0) return { sent: [], failed: [] };

  const base = dayjs(`${monthKey}-01`);
  const year = base.year();
  const month = base.month() + 1;

  const holidays = await getPublicHolidays(year, month);
  // 템플릿이 "- #{공휴일}" 로 첫 dash를 제공하므로 변수는 dash 없이 "\n- " 로 연결
  const schedule =
    holidays.length > 0
      ? holidays
          .map((h) => `${dayjs(h.date).format("M월 D일(ddd)")} ${h.name}`)
          .join("\n- ")
      : `${month}월 공휴일이 없습니다.`;

  const results = await Promise.allSettled(
    targets.map(async (company) => {
      const settings = await getCompanySettings(company);
      const recipients = [
        settings?.recipient1,
        settings?.recipient2,
        settings?.recipient3,
      ].filter(Boolean) as string[];

      const detailUrl = `https://modubogo.com/holiday/${encodeURIComponent(
        company
      )}/${monthKey}`;

      await sendHolidayAlimtalk({
        company,
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
