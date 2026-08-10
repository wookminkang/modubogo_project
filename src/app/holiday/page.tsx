import { redirect } from "next/navigation";
import dayjs from "@/lib/dayjs";
import { getAdminUser, canAccessMenu } from "@/lib/admin";
import { getPublicHolidays } from "@/lib/publicHoliday";
import {
  getCompaniesSummaryFromDB,
  getHolidayReplyCompanies,
  getHolidaySends,
  getHolidayRecipients,
} from "@/lib/db";
import MonthNav from "@/components/MonthNav";
import ScrollNav from "@/components/ScrollNav";
import { pad } from "@/lib/utils";
import HolidayHub from "./HolidayHub";
import { type HubRow } from "./HolidayHubTable";

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
  const me = await getAdminUser();
  if (!me) redirect("/admin/login");
  if (!canAccessMenu(me, "holiday")) redirect("/report");

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

  const [holidays, companies, replies, sends, recipientMap] = await Promise.all(
    [
      getPublicHolidays(year, month),
      getCompaniesSummaryFromDB(),
      getHolidayReplyCompanies(monthKey),
      getHolidaySends(monthKey),
      getHolidayRecipients(),
    ]
  );
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
      configuredRecipients: recipientMap.get(company) ?? [],
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

  // 상태 필터 탭 정의 (href는 서버에서 미리 계산해 클라이언트로 전달)
  const tabHref = (key: StatusKey) =>
    `/holiday?month=${monthKey}${key === "all" ? "" : `&status=${key}`}`;
  const filters: {
    key: StatusKey;
    label: string;
    count: number;
    href: string;
  }[] = [
    { key: "all", label: "전체", count: counts.all, href: tabHref("all") },
    {
      key: "unsent",
      label: "미발송",
      count: counts.unsent,
      href: tabHref("unsent"),
    },
    {
      key: "awaiting",
      label: "발송·미회신",
      count: counts.awaiting,
      href: tabHref("awaiting"),
    },
    {
      key: "done",
      label: "회신완료",
      count: counts.done,
      href: tabHref("done"),
    },
  ];

  return (
    <HolidayHub
      title={`${month}월 병원별 진료일정 목록`}
      actions={<MonthNav basePath="/holiday" month={monthKey} />}
      monthKey={monthKey}
      rows={rows}
      total={total}
      filters={filters}
      activeStatus={activeStatus}
    >
      <ScrollNav />
    </HolidayHub>
  );
}
