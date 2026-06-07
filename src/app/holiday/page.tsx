import Link from "next/link";
import { redirect } from "next/navigation";
import dayjs from "@/lib/dayjs";
import { isAdmin } from "@/lib/admin";
import { getPublicHolidays } from "@/lib/publicHoliday";
import {
  getCompaniesSummaryFromDB,
  getHolidayReplyCompanies,
  getHolidaySends,
} from "@/lib/db";
import ReportShell from "@/app/report/ReportShell";
import MonthNav from "@/components/MonthNav";
import ScrollNav from "@/components/ScrollNav";
import { pad } from "@/lib/utils";
import HolidayHubTable, { type HubRow } from "./HolidayHubTable";

export const dynamic = "force-dynamic";

type Row = HubRow;

/**
 * 공휴일 진료일정 알림톡 통합 현황 (관리자 전용) — 테이블 뷰.
 * 보고서 병원 전체를 baseline으로, 회사별 "발송 정보(시각·수신번호)"와
 * "회신 상태"를 한 행에 함께 보여준다. (미발송 병원까지 노출)
 */
type StatusKey = "all" | "unsent" | "awaiting" | "done";

export default async function HolidayRepliesListPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; status?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const { month: monthParam, status: statusParam } = await searchParams;
  const activeStatus: StatusKey =
    statusParam === "unsent" ||
    statusParam === "awaiting" ||
    statusParam === "done"
      ? statusParam
      : "all";
  const base = monthParam ? dayjs(`${monthParam}-01`) : dayjs().add(1, "month");
  const year = base.year();
  const month = base.month() + 1;
  const monthKey = `${year}-${pad(month)}`;

  const [holidays, companies, replies, sends] = await Promise.all([
    getPublicHolidays(year, month),
    getCompaniesSummaryFromDB(),
    getHolidayReplyCompanies(monthKey),
    getHolidaySends(monthKey),
  ]);
  const total = holidays.length;
  const holidayDateSet = new Set(holidays.map((h) => h.date));

  // 보고서 병원 전체 ∪ 회신 ∪ 발송 회사를 대상으로 회사별 행 구성
  const replyMap = new Map(replies.map((r) => [r.company, r]));
  const sendMap = new Map(sends.map((s) => [s.company, s]));
  const regionMap = new Map(companies.map((c) => [c.company, c.region]));
  const allCompanies = new Set<string>([
    ...companies.map((c) => c.company),
    ...replies.map((r) => r.company),
    ...sends.map((s) => s.company),
  ]);
  const rowMap = new Map<string, Row>();
  for (const company of allCompanies) {
    const r = replyMap.get(company);
    // 회신 완료/카운트는 공휴일 기준. 임의(비공휴일) 휴무는 별도로 표기.
    const dates = r?.respondedDates ?? [];
    const responded = dates.filter((d) => holidayDateSet.has(d)).length;
    const customCount = dates.filter((d) => !holidayDateSet.has(d)).length;
    rowMap.set(company, {
      company,
      region: regionMap.get(company) ?? null,
      responded,
      customCount,
      lastSubmittedAt: r?.lastSubmittedAt ?? null,
      send: sendMap.get(company) ?? null,
    });
  }

  // 행 상태 분류: 미발송 → 발송·미회신 → 회신완료
  const statusOf = (r: Row): Exclude<StatusKey, "all"> => {
    if (total > 0 && r.responded >= total) return "done";
    return r.send ? "awaiting" : "unsent";
  };
  const rank: Record<Exclude<StatusKey, "all">, number> = {
    unsent: 0,
    awaiting: 1,
    done: 2,
  };

  // 상태 우선 정렬, 같은 상태 내에서는 최근 활동순
  const activityOf = (r: Row) => {
    const a = r.send?.lastSentAt ?? "";
    const b = r.lastSubmittedAt ?? "";
    return a > b ? a : b;
  };
  const allRows = Array.from(rowMap.values()).sort((a, b) => {
    const ra = rank[statusOf(a)];
    const rb = rank[statusOf(b)];
    if (ra !== rb) return ra - rb;
    const av = activityOf(a);
    const bv = activityOf(b);
    if (av && bv) return bv.localeCompare(av);
    if (av) return -1;
    if (bv) return 1;
    return a.company.localeCompare(b.company, "ko");
  });

  // 요약 카운트
  const counts = {
    all: allRows.length,
    unsent: allRows.filter((r) => statusOf(r) === "unsent").length,
    awaiting: allRows.filter((r) => statusOf(r) === "awaiting").length,
    done: allRows.filter((r) => statusOf(r) === "done").length,
  };

  // 상태 필터 적용
  const rows =
    activeStatus === "all"
      ? allRows
      : allRows.filter((r) => statusOf(r) === activeStatus);

  // 상태 필터 탭 정의
  const filters: { key: StatusKey; label: string; count: number }[] = [
    { key: "all", label: "전체", count: counts.all },
    { key: "unsent", label: "미발송", count: counts.unsent },
    { key: "awaiting", label: "발송·미회신", count: counts.awaiting },
    { key: "done", label: "회신완료", count: counts.done },
  ];
  const tabHref = (key: StatusKey) =>
    `/holiday?month=${monthKey}${key === "all" ? "" : `&status=${key}`}`;

  return (
    <ReportShell
      title={`${month}월 병원별 진료일정 목록`}
      actions={<MonthNav basePath="/holiday" month={monthKey} />}
    >
      <>
        {/* 상태 필터 탭 (요약 카운트 겸용) */}
        <div className="flex flex-wrap gap-1.5 pb-4">
          {filters.map((f) => {
            const active = f.key === activeStatus;
            return (
              <Link
                key={f.key}
                href={tabHref(f.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-[#0e299c] bg-[#0e299c] text-white"
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {f.label}
                <span className={active ? "text-white/80" : "text-gray-400"}>
                  {f.count}
                </span>
              </Link>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <p className="py-20 text-center text-sm text-gray-400">
            {activeStatus === "all"
              ? "표시할 병원이 없어요."
              : "해당 상태의 병원이 없어요."}
          </p>
        ) : (
          <HolidayHubTable rows={rows} total={total} monthKey={monthKey} />
        )}

        <ScrollNav />
      </>
    </ReportShell>
  );
}
