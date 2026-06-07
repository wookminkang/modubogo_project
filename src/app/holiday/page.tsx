import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Send, Phone } from "lucide-react";
import dayjs from "@/lib/dayjs";
import { isAdmin } from "@/lib/admin";
import { getPublicHolidays } from "@/lib/publicHoliday";
import {
  getHolidayReplyCompanies,
  getHolidaySends,
  type HolidaySendCompany,
} from "@/lib/db";
import ReportShell from "@/app/report/ReportShell";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const pad = (n: number) => String(n).padStart(2, "0");

interface Row {
  company: string;
  responded: number;
  lastSubmittedAt: string | null;
  send: HolidaySendCompany | null;
}

/**
 * 공휴일 진료일정 알림톡 통합 현황 (관리자 전용) — 테이블 뷰.
 * 회사별로 "발송 정보(시각·수신번호)"와 "회신 상태"를 한 행에 함께 보여준다.
 * 이번 달에 보낸 회사 ∪ 회신한 회사의 합집합을 최근 활동순으로 나열.
 */
export default async function HolidayRepliesListPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const base = dayjs().add(1, "month");
  const year = base.year();
  const month = base.month() + 1;
  const monthKey = `${year}-${pad(month)}`;

  const [holidays, replies, sends] = await Promise.all([
    getPublicHolidays(year, month),
    getHolidayReplyCompanies(monthKey),
    getHolidaySends(monthKey),
  ]);
  const total = holidays.length;

  // 발송 ∪ 회신 합집합으로 회사별 행 구성
  const sendMap = new Map(sends.map((s) => [s.company, s]));
  const rowMap = new Map<string, Row>();
  for (const r of replies) {
    rowMap.set(r.company, {
      company: r.company,
      responded: r.responded,
      lastSubmittedAt: r.lastSubmittedAt,
      send: sendMap.get(r.company) ?? null,
    });
  }
  for (const s of sends) {
    if (!rowMap.has(s.company)) {
      rowMap.set(s.company, {
        company: s.company,
        responded: 0,
        lastSubmittedAt: null,
        send: s,
      });
    }
  }

  // 최근 활동(발송/회신 중 늦은 쪽)순 정렬
  const activityOf = (r: Row) => {
    const a = r.send?.lastSentAt ?? "";
    const b = r.lastSubmittedAt ?? "";
    return a > b ? a : b;
  };
  const rows = Array.from(rowMap.values()).sort((a, b) => {
    const av = activityOf(a);
    const bv = activityOf(b);
    if (av && bv) return bv.localeCompare(av);
    if (av) return -1;
    if (bv) return 1;
    return a.company.localeCompare(b.company, "ko");
  });

  const sentCount = rows.filter((r) => r.send).length;

  return (
    <ReportShell title={`${month}월 병원별 진료일정 목록`}>
      {rows.length === 0 ? (
        <p className="py-20 text-center text-sm text-gray-400">
          아직 발송하거나 회신한 병원이 없어요.
        </p>
      ) : (
        <>
          <p className="px-1 pb-3 text-xs text-gray-400">
            발송 {sentCount}곳 · 전체 {rows.length}곳
          </p>

          <div className="rounded-xl border border-gray-100 bg-white">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-gray-500">병원</TableHead>
                  <TableHead className="text-gray-500">발송</TableHead>
                  <TableHead className="text-gray-500">발송 시각</TableHead>
                  <TableHead className="text-gray-500">수신번호</TableHead>
                  <TableHead className="text-gray-500">회신 상태</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const complete = total > 0 && row.responded >= total;
                  const send = row.send;
                  const failed = send?.status === "failed";
                  const moreRecipients =
                    send && send.recipients.length > 1
                      ? ` 외 ${send.recipients.length - 1}`
                      : "";
                  const href = `/report/${encodeURIComponent(
                    row.company
                  )}/holiday/replies?month=${monthKey}`;

                  return (
                    <TableRow key={row.company} className="border-gray-100">
                      {/* 병원명 */}
                      <TableCell>
                        <Link
                          href={href}
                          className="font-bold text-gray-900 hover:text-[#0e299c]"
                        >
                          {row.company}
                        </Link>
                      </TableCell>

                      {/* 발송 여부 */}
                      <TableCell>
                        {!send ? (
                          <Badge
                            variant="outline"
                            className="text-gray-400"
                          >
                            미발송
                          </Badge>
                        ) : failed ? (
                          <Badge variant="destructive">
                            <Send />
                            발송 실패
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-gray-700"
                          >
                            <Send />
                            발송
                            {send.sendCount > 1 && ` ${send.sendCount}회`}
                          </Badge>
                        )}
                      </TableCell>

                      {/* 발송 시각 */}
                      <TableCell className="text-gray-500">
                        {send
                          ? dayjs(send.lastSentAt).format(
                              "YYYY.MM.DD HH:mm:ss"
                            )
                          : "—"}
                      </TableCell>

                      {/* 수신번호 */}
                      <TableCell className="text-gray-500">
                        {send && send.recipients.length > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone size={12} className="text-gray-300" />
                            {send.recipients[0]}
                            {moreRecipients && (
                              <span className="text-gray-400">
                                {moreRecipients}
                              </span>
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      {/* 회신 상태 */}
                      <TableCell>
                        {complete ? (
                          <Badge className="bg-[#0e299c]/10 text-[#0e299c]">
                            회신 완료
                          </Badge>
                        ) : row.responded > 0 ? (
                          <Badge className="bg-amber-50 text-amber-600">
                            {row.responded}/{total} 회신
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-gray-500">
                            회신 대기
                          </Badge>
                        )}
                      </TableCell>

                      {/* 상세 이동 */}
                      <TableCell>
                        <Link
                          href={href}
                          className="grid h-7 w-7 place-items-center rounded-lg text-gray-300 transition-colors hover:bg-gray-50 hover:text-[#0e299c]"
                          aria-label={`${row.company} 회신 상세`}
                        >
                          <ChevronRight size={18} />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </ReportShell>
  );
}
