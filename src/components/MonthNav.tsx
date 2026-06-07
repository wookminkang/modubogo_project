import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import dayjs from "@/lib/dayjs";
import { pad } from "@/lib/utils";

/**
 * 진료일정 화면 공통 월 네비게이션.
 * - month: "YYYY-MM" (현재 표시 중인 월)
 * - basePath: 이동 링크의 기준 경로. 이전/다음 달은 `${basePath}?month=YYYY-MM` 로 연결한다.
 */
export default function MonthNav({
  basePath,
  month,
}: {
  basePath: string;
  month: string;
}) {
  const base = dayjs(`${month}-01`);
  const label = `${base.year()}.${pad(base.month() + 1)}`;
  const prev = base.subtract(1, "month").format("YYYY-MM");
  const next = base.add(1, "month").format("YYYY-MM");
  const btn =
    "grid h-8 w-8 place-items-center rounded-lg text-gray-500 hover:bg-gray-50 transition-colors";

  return (
    <div className="flex shrink-0 items-center gap-1 rounded-xl border border-gray-200 bg-white px-1 py-1">
      <Link href={`${basePath}?month=${prev}`} className={btn} aria-label="이전 달">
        <ChevronLeft size={18} />
      </Link>
      <span className="px-2 text-sm font-bold text-gray-800">{label}</span>
      <Link href={`${basePath}?month=${next}`} className={btn} aria-label="다음 달">
        <ChevronRight size={18} />
      </Link>
    </div>
  );
}
