import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import { CardTitle } from "@/components/CardTitle";
import {
  getGeoTarget,
  listGeoKeywords,
  listGeoRuns,
  listGeoRunDates,
  getGeoRunDetailForDate,
  kstDate,
  todayKst,
} from "@/lib/geo-db";
import { coreToken } from "@/lib/geo-match";
import KeywordManager from "../_components/KeywordManager";
import RunPanel from "../_components/RunPanel";
import ShareLinkButton from "../_components/ShareLinkButton";

export const dynamic = "force-dynamic";
// 키워드 여러 개를 web_search 로 돌리므로 실행 시간을 넉넉히 잡는다.
export const maxDuration = 300;

/** YYYY-MM-DD 에 일수를 더한다. (UTC 정오 기준으로 계산해 DST·타임존 영향 배제) */
function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function GeoTargetPage({
  params,
  searchParams,
}: {
  params: Promise<{ targetId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const { targetId } = await params;
  const target = await getGeoTarget(targetId);
  if (!target) notFound();

  const today = todayKst();
  const { date: rawDate } = await searchParams;
  // 잘못된 값이나 미래 날짜는 오늘로 되돌린다 (미래 점검은 있을 수 없다).
  const date =
    rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && rawDate <= today ? rawDate : today;

  const [keywords, runs, runDates, detail] = await Promise.all([
    listGeoKeywords(targetId),
    listGeoRuns(targetId, 60),
    listGeoRunDates(targetId),
    getGeoRunDetailForDate(targetId, date),
  ]);

  // 직전 점검일의 노출률 — 변화량(▲▼) 계산용. 지금 보는 날짜보다 앞선 가장 가까운 점검.
  const prevRun = runs.find((r) => kstDate(r.startedAt) < date);
  const prevRate = prevRun && prevRun.totalCount ? prevRun.foundCount / prevRun.totalCount : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <Link href="/geo-check" className="text-xs font-semibold text-[#6b7684] hover:text-[#0e299c]">
          ← GEO 체크 목록
        </Link>
        <ShareLinkButton targetId={targetId} />
      </div>

      <div className="mt-3">
        <CardTitle
          title={target.name}
          description={
            [
              target.region,
              target.aliases.length ? `다른 표기: ${target.aliases.join(", ")}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "등록된 지역·별칭 없음"
          }
        />
      </div>

      <RunPanel
        targetId={targetId}
        targetName={target.name}
        highlightTerms={[target.name, ...target.aliases, coreToken(target.name)]}
        activeCount={keywords.filter((k) => k.active).length}
        initialDetail={detail}
        prevRate={prevRate}
        prevRunDate={prevRun ? kstDate(prevRun.startedAt) : null}
        keywords={keywords}
        date={date}
        today={today}
        prevDate={shiftDate(date, -1)}
        nextDate={date < today ? shiftDate(date, 1) : null}
        checkedDates={runDates}
      />

      <div className="mt-12">
        <KeywordManager targetId={targetId} keywords={keywords} />
      </div>

      {runDates.length > 1 && (
        <div className="mt-12">
          <CardTitle title="점검 이력" description="날짜별 노출률 변화입니다." />
          <div className="flex flex-col gap-2">
            {runDates.map((d) => {
              const r = runs.find((x) => kstDate(x.startedAt) === d)!;
              const rate = r.totalCount ? r.foundCount / r.totalCount : 0;
              return (
                <Link
                  key={d}
                  href={`/geo-check/${targetId}?date=${d}`}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                    d === date
                      ? "border-[#0e299c] bg-[#0e299c]/5"
                      : "border-gray-200 bg-white hover:border-[#0e299c]"
                  }`}
                >
                  <span className="text-sm text-[#333d4b]">
                    {d}
                    {r.startedBy ? ` · ${r.startedBy}` : ""}
                  </span>
                  <div className="flex items-center gap-3">
                    {r.status === "partial" && (
                      <span className="text-xs font-semibold text-amber-600">일부 미완료</span>
                    )}
                    {r.failedCount > 0 && (
                      <span className="text-xs text-red-500">실패 {r.failedCount}</span>
                    )}
                    <span className="text-sm font-bold text-[#0e299c]">
                      {r.foundCount}/{r.totalCount} · {Math.round(rate * 100)}%
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
