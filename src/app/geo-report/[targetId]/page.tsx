import { notFound } from "next/navigation";
import {
  getGeoTarget,
  listGeoKeywords,
  listGeoRunDates,
  getGeoRunDetailForDate,
  todayKst,
} from "@/lib/geo-db";
import { coreToken } from "@/lib/geo-match";
import ChecklistTable from "../../geo-check/_components/ChecklistTable";
import ViewDateNav from "../../geo-check/_components/ViewDateNav";

// GEO 노출 리포트 공개 뷰 — 관리자 로그인 없이 광고주에게 체크리스트만 보여준다.
// 링크(대상 id)만 있으면 열람 가능하다 (ledger/[company]/view, design/[token] 와 같은 방식).
// 실행·키워드 편집·비고 편집은 없다. 오직 O/X 체크리스트와 답변 열람만.
export const dynamic = "force-dynamic";

export default async function GeoReportView({
  params,
  searchParams,
}: {
  params: Promise<{ targetId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { targetId } = await params;
  const target = await getGeoTarget(targetId);
  if (!target) notFound();

  const today = todayKst();
  const { date: rawDate } = await searchParams;
  const runDates = await listGeoRunDates(targetId);
  // 기본은 가장 최근 점검일. 잘못된 값·점검 안 한 날짜는 최근 점검일로 되돌린다.
  const fallback = runDates[0] ?? today;
  const date =
    rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && runDates.includes(rawDate)
      ? rawDate
      : fallback;

  const [keywords, detail] = await Promise.all([
    listGeoKeywords(targetId),
    getGeoRunDetailForDate(targetId, date),
  ]);

  // 노출률 요약 — 광고주가 맨 위에서 한눈에 보게 한다.
  const results = detail?.results ?? [];
  const total = results.length;
  const found = results.filter((r) => r.found === true).length;
  const rate = total ? Math.round((found / total) * 100) : 0;

  return (
    <>
      {/* 공개 뷰 전용 헤더 — 관리자 네비 없이 로고와 리포트명만 (ledger view 와 같은 컨셉) */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-4">
          <span className="text-[15px] font-bold text-[#0e299c]">모두보고</span>
          <span className="text-gray-300">·</span>
          <span className="text-sm font-semibold text-[#333d4b]">GEO 노출 리포트</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-xl font-bold text-[#333d4b]">{target.name}</h1>
        <p className="mt-1 text-sm text-[#6b7684]">
          ChatGPT에 아래 키워드를 물었을 때 <b className="text-[#0e299c]">{target.name}</b>이(가)
          답변에 노출되는지 점검한 결과입니다.
        </p>

        {/* 노출률 요약 밴드 */}
        {runDates.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-gray-200 bg-white px-6 py-5">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-[36px] font-bold leading-none text-[#0e299c]">{rate}%</span>
                <span className="text-sm text-[#6b7684]">
                  {found}/{total} 노출
                </span>
              </div>
              <p className="mt-1.5 text-xs text-[#8b95a1]">점검일 {date}</p>
            </div>
            <div className="flex gap-5 text-sm">
              <span className="flex items-center gap-1.5">
                <b className="text-[#274e13]">O</b>
                <span className="text-[#6b7684]">노출 {found}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <b className="text-[#8a1c1c]">X</b>
                <span className="text-[#6b7684]">미노출 {total - found}</span>
              </span>
            </div>
          </div>
        )}

        {runDates.length > 1 && (
          <div className="mt-4">
            <ViewDateNav targetId={targetId} date={date} runDates={runDates} />
          </div>
        )}

        <div className="mt-4">
          {runDates.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-400">
              아직 점검 결과가 없습니다.
            </p>
          ) : (
            <ChecklistTable
              targetId={targetId}
              targetName={target.name}
              highlightTerms={[target.name, ...target.aliases, coreToken(target.name)]}
              date={date}
              hasRun={!!detail}
              results={detail?.results ?? []}
              keywords={keywords}
              readOnly
            />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          본 리포트는 OpenAI API(web_search) 기준이며, 실제 chatgpt.com 화면과 100% 동일하지
          않을 수 있습니다.
        </p>
      </main>
    </>
  );
}
