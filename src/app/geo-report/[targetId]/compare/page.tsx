import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getGeoTarget,
  listGeoKeywords,
  listGeoRunDates,
  listGeoDailySummaries,
  getGeoRunDetailForDate,
  type GeoRunResult,
} from "@/lib/geo-db";
import { categoryClass } from "../../../geo-check/_components/categories";
import CompareCharts from "./CompareCharts";

// GEO 노출 비교 리포트 공개 뷰 — 두 점검일의 O/X를 나란히 놓고 성과(신규 노출·이탈)를 보여준다.
// /geo-report/[targetId] 와 같은 링크 공개 방식. ?from=YYYY-MM-DD&to=YYYY-MM-DD.
export const dynamic = "force-dynamic";

type Change = "new" | "lost" | "kept" | "none";

function changeOf(before: boolean | null, after: boolean | null): Change {
  if (after === true && before !== true) return "new";
  if (after !== true && before === true) return "lost";
  if (after === true && before === true) return "kept";
  return "none";
}

const CHANGE_BADGE: Record<Change, { label: string; cls: string } | null> = {
  new: { label: "▲ 신규 노출", cls: "bg-[#e2f0e0] text-[#2f6a2a]" },
  lost: { label: "▼ 노출 이탈", cls: "bg-[#fce8e6] text-[#8a2a20]" },
  kept: { label: "유지", cls: "bg-[#eef1f7] text-[#5a6478]" },
  none: null,
};

function Mark({ found }: { found: boolean | null | undefined }) {
  if (found === true) return <span className="text-[15px] font-bold text-[#274e13]">O</span>;
  if (found === false) return <span className="text-[15px] font-bold text-[#c5321f]">X</span>;
  return <span className="text-sm text-gray-300">—</span>;
}

export default async function GeoCompareReport({
  params,
  searchParams,
}: {
  params: Promise<{ targetId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { targetId } = await params;
  const target = await getGeoTarget(targetId);
  if (!target) notFound();

  const runDates = await listGeoRunDates(targetId); // 최신순
  if (runDates.length === 0) notFound();

  const { from: rawFrom, to: rawTo } = await searchParams;
  const valid = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && runDates.includes(d) ? d : null);
  // 기본: to = 가장 최근 점검일, from = 그 이전 점검일 (하나뿐이면 자기 자신과 비교하지 않고 같은 날 표시)
  const to = valid(rawTo) ?? runDates[0];
  const from = valid(rawFrom) ?? runDates.find((d) => d < to) ?? to;

  const [keywords, fromDetail, toDetail, daily] = await Promise.all([
    listGeoKeywords(targetId),
    getGeoRunDetailForDate(targetId, from),
    getGeoRunDetailForDate(targetId, to),
    listGeoDailySummaries(targetId),
  ]);

  const byKeyword = (results: GeoRunResult[] | undefined) => {
    const m = new Map<string, GeoRunResult>();
    for (const r of results ?? []) {
      const key = r.keywordId ?? r.keywordText;
      if (!m.has(key)) m.set(key, r);
    }
    return m;
  };
  const fromBy = byKeyword(fromDetail?.results);
  const toBy = byKeyword(toDetail?.results);

  // 행 기준은 "양쪽 결과에 등장한 모든 키워드" — 키워드 마스터 순서를 따르되,
  // 마스터에서 삭제된 키워드도 결과 스냅샷(keywordText)으로 행을 만든다.
  type Row = {
    key: string;
    text: string;
    category: string | null;
    before: GeoRunResult | undefined;
    after: GeoRunResult | undefined;
  };
  const rows: Row[] = [];
  const seen = new Set<string>();
  for (const k of keywords) {
    const key = k.id;
    if (!fromBy.has(key) && !toBy.has(key)) continue; // 어느 쪽에도 결과 없는 키워드는 비교표에서 제외
    seen.add(key);
    rows.push({ key, text: k.keyword, category: k.category, before: fromBy.get(key), after: toBy.get(key) });
  }
  for (const [key, r] of [...toBy, ...fromBy]) {
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ key, text: r.keywordText, category: null, before: fromBy.get(key), after: toBy.get(key) });
  }

  const stat = (results: GeoRunResult[] | undefined) => {
    const list = results ?? [];
    const total = list.length;
    const found = list.filter((r) => r.found === true).length;
    return { total, found, rate: total ? Math.round((found / total) * 100) : 0 };
  };
  const fromStat = stat(fromDetail?.results);
  const toStat = stat(toDetail?.results);
  const delta = toStat.rate - fromStat.rate;

  const changes = rows.map((r) => changeOf(r.before?.found ?? null, r.after?.found ?? null));
  const newCount = changes.filter((c) => c === "new").length;
  const lostCount = changes.filter((c) => c === "lost").length;
  const keptCount = changes.filter((c) => c === "kept").length;

  // 변화가 큰 순서로 정렬: 신규 노출 → 이탈 → 유지 → 나머지 (광고주가 성과를 먼저 보게)
  const ORDER: Record<Change, number> = { new: 0, lost: 1, kept: 2, none: 3 };
  const sorted = rows
    .map((r, i) => ({ ...r, change: changes[i] }))
    .sort((a, b) => ORDER[a.change] - ORDER[b.change]);

  const series = daily.map((d) => ({
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
          노출되는지를 <b>{from}</b> 과 <b>{to}</b> 두 차례 점검해 비교한 결과입니다.
        </p>

        {/* 요약 카드 */}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
            <p className="text-xs text-[#8b95a1]">이전 점검 ({from})</p>
            <p className="mt-1 text-[26px] font-bold leading-none text-[#6b7684]">{fromStat.rate}%</p>
            <p className="mt-1 text-xs text-[#8b95a1]">{fromStat.found}/{fromStat.total} 노출</p>
          </div>
          <div className="rounded-xl border border-[#0e299c]/30 bg-white px-5 py-4">
            <p className="text-xs text-[#8b95a1]">이번 점검 ({to})</p>
            <p className="mt-1 text-[26px] font-bold leading-none text-[#0e299c]">{toStat.rate}%</p>
            <p className="mt-1 text-xs text-[#8b95a1]">{toStat.found}/{toStat.total} 노출</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
            <p className="text-xs text-[#8b95a1]">노출률 변화</p>
            <p
              className={`mt-1 text-[26px] font-bold leading-none ${
                delta > 0 ? "text-[#2f6a2a]" : delta < 0 ? "text-[#c5321f]" : "text-[#6b7684]"
              }`}
            >
              {delta > 0 ? `▲ ${delta}%` : delta < 0 ? `▼ ${Math.abs(delta)}%` : "—"}
            </p>
            <p className="mt-1 text-xs text-[#8b95a1]">
              {fromStat.rate}% → {toStat.rate}%
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
            <p className="text-xs text-[#8b95a1]">키워드 변화</p>
            <p className="mt-1 flex items-baseline gap-2 text-sm font-bold leading-none">
              <span className="text-[20px] text-[#2f6a2a]">+{newCount}</span>
              <span className="text-xs font-medium text-[#8b95a1]">신규</span>
              <span className="text-[20px] text-[#c5321f]">-{lostCount}</span>
              <span className="text-xs font-medium text-[#8b95a1]">이탈</span>
            </p>
            <p className="mt-1.5 text-xs text-[#8b95a1]">유지 {keptCount}개</p>
          </div>
        </div>

        {/* 그래프 */}
        <div className="mt-4">
          <CompareCharts series={series} fromDate={from} toDate={to} />
        </div>

        {/* 키워드별 성과표 */}
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-4">
            <p className="text-sm font-bold text-[#333d4b]">키워드별 노출 비교</p>
            <p className="mt-0.5 text-xs text-[#8b95a1]">
              변화가 있는 키워드가 위로 옵니다 · O = 노출, X = 미노출, — = 그날 미점검
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-[#fafbfc] text-xs text-[#8b95a1]">
                  <th className="px-5 py-2.5 text-left font-medium">키워드</th>
                  <th className="w-24 px-2 py-2.5 text-center font-medium">{from.slice(5).replace("-", "/")}</th>
                  <th className="w-24 px-2 py-2.5 text-center font-medium">{to.slice(5).replace("-", "/")}</th>
                  <th className="w-32 px-4 py-2.5 text-left font-medium">변화</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const badge = CHANGE_BADGE[r.change];
                  return (
                    <tr key={r.key} className="border-b border-gray-50 last:border-b-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {r.category && (
                            <span
                              className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${categoryClass(r.category)}`}
                            >
                              {r.category}
                            </span>
                          )}
                          <span className="text-[#333d4b]">{r.text}</span>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <Mark found={r.before?.found} />
                      </td>
                      <td className="px-2 py-3 text-center">
                        <Mark found={r.after?.found} />
                      </td>
                      <td className="px-4 py-3">
                        {badge && (
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${badge.cls}`}>
                            {badge.label}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center">
          <Link
            href={`/geo-report/${targetId}?date=${to}`}
            className="text-xs font-semibold text-[#0e299c] hover:underline"
          >
            {to} 상세 체크리스트(답변 원문) 보기 →
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          본 리포트는 OpenAI API(web_search) 기준이며, 실제 chatgpt.com 화면과 100% 동일하지 않을
          수 있습니다. 생성형 AI 특성상 동일 질문도 시점에 따라 결과가 달라질 수 있습니다.
        </p>
      </main>
    </>
  );
}
