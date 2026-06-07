import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import dayjs from "@/lib/dayjs";
import { isAdmin } from "@/lib/admin";
import { getPublicHolidays } from "@/lib/publicHoliday";
import { getHolidayReplyCompanies } from "@/lib/db";
import ReportShell from "@/app/report/ReportShell";

export const dynamic = "force-dynamic";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * 공휴일 회신 현황 목록 (관리자 전용).
 * /report 와 동일한 ReportShell 레이아웃을 사용한다.
 * 다음 달 공휴일에 회신한 회사를 나열, 클릭 시 회신 상세로 이동.
 */
export default async function HolidayRepliesListPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const base = dayjs().add(1, "month");
  const year = base.year();
  const month = base.month() + 1;
  const monthKey = `${year}-${pad(month)}`;

  const [holidays, companies] = await Promise.all([
    getPublicHolidays(year, month),
    getHolidayReplyCompanies(monthKey),
  ]);
  const total = holidays.length;

  return (
    <ReportShell title={`${month}월 공휴일 회신 현황`}>
      {companies.length === 0 ? (
        <p className="py-20 text-center text-sm text-gray-400">
          아직 회신한 병원이 없어요.
        </p>
      ) : (
        <ul className="flex flex-col">
          {companies.map(({ company, responded }) => {
            const complete = total > 0 && responded >= total;
            return (
              <li key={company}>
                <Link
                  href={`/report/${encodeURIComponent(
                    company
                  )}/holiday/replies?month=${monthKey}`}
                  className="flex items-center justify-between gap-3 rounded-lg border-b border-gray-100 px-2 py-5 transition-colors hover:bg-gray-50/60"
                >
                  <p className="min-w-0 truncate text-[17px] font-bold text-gray-900">
                    {company}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    {complete ? (
                      <span className="rounded-full bg-[#0e299c]/10 px-2.5 py-1 text-xs font-semibold text-[#0e299c]">
                        회신 완료
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600">
                        {responded}/{total} 회신
                      </span>
                    )}
                    <ChevronRight size={18} className="text-gray-300" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </ReportShell>
  );
}
