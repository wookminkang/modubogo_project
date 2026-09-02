import { categoryClass } from "@/app/geo-check/_components/categories";
import type { GeoKeyword, GeoRunDetail } from "@/lib/geo-db";

type Row = { key: string; text: string; category: string | null };

/** 키워드 마스터 전체를 기준으로 행을 만들고, 결과 스냅샷에만 남은(삭제된) 키워드도
 *  별도 행으로 보존한다. geo-check/CLAUDE.md: "표는 결과가 아니라 키워드 전체를 기준으로 그린다." */
function buildRows(keywords: GeoKeyword[], detailsByDate: Map<string, GeoRunDetail>): Row[] {
  const rows: Row[] = keywords.map((k) => ({ key: k.id, text: k.keyword, category: k.category }));
  const seen = new Set(rows.map((r) => r.key));
  for (const detail of detailsByDate.values()) {
    for (const r of detail.results) {
      const key = r.keywordId ?? r.keywordText;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ key, text: r.keywordText, category: null });
    }
  }
  return rows;
}

function foundAt(row: Row, date: string, detailsByDate: Map<string, GeoRunDetail>): boolean | null | undefined {
  const detail = detailsByDate.get(date);
  if (!detail) return undefined; // 그날 실행 자체가 없음
  const r = detail.results.find((x) => (x.keywordId ?? x.keywordText) === row.key);
  return r?.found; // true / false / null(판정 보류) / undefined(그 실행에 이 키워드 없음)
}

type DotState = "found" | "absent" | "unchecked";

function dotState(found: boolean | null | undefined): DotState {
  if (found === true) return "found";
  if (found === false) return "absent";
  return "unchecked";
}

const DOT_CLASS: Record<DotState, string> = {
  found: "border-[#2f6a2a] bg-[#2f6a2a]",
  absent: "border-[#c5321f] bg-white",
  unchecked: "border-[#e5e8eb] bg-[#f5f6fa]",
};

const DOT_LABEL: Record<DotState, string> = {
  found: "노출",
  absent: "미노출",
  unchecked: "미점검",
};

type Change = "new" | "lost" | "kept" | "none";

function changeOf(before: boolean | null | undefined, after: boolean | null | undefined): Change {
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

const ORDER: Record<Change, number> = { new: 0, lost: 1, kept: 2, none: 3 };

function Dot({ state }: { state: DotState }) {
  return (
    <span
      title={DOT_LABEL[state]}
      className={`inline-block h-2.5 w-2.5 rounded-full border-2 ${DOT_CLASS[state]}`}
    />
  );
}

function shortDate(d: string) {
  return d.slice(5).replace("-", "/");
}

/** 실제 점검이 있었던 날짜 전부(dates, 오래된→최신)를 열로 놓고 키워드별 노출 변화를 보여준다.
 *  가짜 날짜 창을 만들지 않는다 — "내가 점검한 날짜"만 쓴다. "변화"는 가장 이른 날짜 대비
 *  가장 최근 날짜의 전체 기간 변화로 판정한다. */
export default function MentionTimeline({
  keywords,
  dates,
  detailsByDate,
}: {
  keywords: GeoKeyword[];
  dates: string[]; // 오래된 → 최신
  detailsByDate: Map<string, GeoRunDetail>;
}) {
  const rows = buildRows(keywords, detailsByDate);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-6 text-center text-xs text-[#8b95a1]">
        등록된 키워드가 없습니다.
      </div>
    );
  }

  const earliest = dates[0];
  const latest = dates[dates.length - 1];

  const sorted = rows
    .map((row) => {
      const values = dates.map((d) => foundAt(row, d, detailsByDate));
      const before = foundAt(row, earliest, detailsByDate);
      const after = foundAt(row, latest, detailsByDate);
      return { ...row, values, change: changeOf(before, after) };
    })
    .sort((a, b) => ORDER[a.change] - ORDER[b.change]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-3">
        <p className="text-sm font-bold text-[#333d4b]">멘션 현황</p>
        <p className="mt-0.5 text-xs text-[#8b95a1]">
          변화가 있는 키워드가 위로 옵니다 · 왼쪽부터 {shortDate(earliest)} → {shortDate(latest)} 순 · 마지막 열 = 전체 기간 변화
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-[#fafbfc] text-xs text-[#8b95a1]">
              <th className="px-5 py-2.5 text-left font-medium">키워드</th>
              {dates.map((d) => (
                <th key={d} className="w-16 px-2 py-2.5 text-center font-medium">
                  {shortDate(d)}
                </th>
              ))}
              <th className="w-32 px-4 py-2.5 text-left font-medium">변화</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const badge = CHANGE_BADGE[row.change];
              return (
                <tr key={row.key} className="border-b border-gray-50 last:border-b-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {row.category && (
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${categoryClass(row.category)}`}
                        >
                          {row.category}
                        </span>
                      )}
                      <span className="text-[#333d4b]">{row.text}</span>
                    </div>
                  </td>
                  {row.values.map((v, i) => (
                    <td key={dates[i]} className="px-2 py-3 text-center">
                      <Dot state={dotState(v)} />
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    {badge && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${badge.cls}`}>{badge.label}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
