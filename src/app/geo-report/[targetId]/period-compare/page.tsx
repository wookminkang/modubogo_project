import { notFound } from "next/navigation";
import {
  getGeoTarget,
  listGeoKeywords,
  listGeoRunDates,
  listGeoDailySummaries,
  getGeoRunDetailsForDates,
} from "@/lib/geo-db";
import PeriodColumn from "./_components/PeriodColumn";
import TrendHighlightChart from "./_components/TrendHighlightChart";
import MentionTimeline from "./_components/MentionTimeline";

// GEO 노출 기간 비교 리포트 공개 뷰 — "내가 실제로 점검한 날짜 전부"를 놓고 비교한다. 가짜 7일
// 창을 만들지 않는다: 이 병원은 격주로만 점검하므로(daily가 아님) 실제 점검일을 그대로 쓴다.
// 점검 회차가 늘어날수록 카드·표 열도 함께 늘어난다(2회 전용 from/to 픽커였던 걸 전체 이력으로 확장).
export const dynamic = "force-dynamic";

export default async function GeoPeriodCompareReport({
  params,
}: {
  params: Promise<{ targetId: string }>;
}) {
  const { targetId } = await params;
  const target = await getGeoTarget(targetId);
  if (!target) notFound();

  const runDatesDesc = await listGeoRunDates(targetId); // 최신순, 실제 점검이 있었던 날짜만
  if (runDatesDesc.length === 0) notFound();
  const dates = [...runDatesDesc].reverse(); // 오래된 → 최신

  const [keywords, daily, detailsByDate] = await Promise.all([
    listGeoKeywords(targetId),
    listGeoDailySummaries(targetId),
    getGeoRunDetailsForDates(targetId, dates),
  ]);

  const earliest = dates[0];
  const latest = dates[dates.length - 1];

  const trendPoints = daily.map((d) => ({
    date: d.date,
    rate: d.total ? Math.round((d.found / d.total) * 100) : 0,
    found: d.found,
    total: d.total,
  }));

  return (
    <>
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-4">
          <span className="text-[15px] font-bold text-[#0e299c]">모두보고</span>
          <span className="text-gray-300">·</span>
          <span className="text-sm font-semibold text-[#333d4b]">GEO 노출 성과 리포트</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-xl font-bold text-[#333d4b]">{target.name}</h1>
        <p className="mt-1 text-sm text-[#6b7684]">
          ChatGPT에 키워드를 물었을 때 <b className="text-[#0e299c]">{target.name}</b>이(가) 답변에
          노출되는지를 지금까지의 점검일 {dates.length}회({earliest} ~ {latest}) 기준으로 비교한
          결과입니다.
        </p>

        <div className="mt-5">
          <TrendHighlightChart points={trendPoints} latestDate={latest} />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...dates].reverse().map((date, idx, arr) => {
            const detail = detailsByDate.get(date) ?? null;
            const prevDate = arr[idx + 1]; // 최신순 배열이므로 다음 항목이 직전 점검
            const compareDetail = prevDate ? detailsByDate.get(prevDate) ?? null : undefined;
            return (
              <PeriodColumn
                key={date}
                label={idx === 0 ? "최근 점검" : `${arr.length - idx}번째 이전 점검`}
                date={date}
                detail={detail}
                compareDetail={compareDetail}
              />
            );
          })}
        </div>

        <div className="mt-4">
          <MentionTimeline keywords={keywords} dates={dates} detailsByDate={detailsByDate} />
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          본 리포트는 OpenAI API(web_search) 기준이며, 실제 chatgpt.com 화면과 100% 동일하지 않을
          수 있습니다. 생성형 AI 특성상 동일 질문도 시점에 따라 결과가 달라질 수 있습니다.
        </p>
      </main>
    </>
  );
}
