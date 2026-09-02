import type { ReactNode } from "react";
import type { GeoRunDetail, GeoRunResult } from "@/lib/geo-db";

function rate(detail: GeoRunDetail | null): number | null {
  if (!detail || !detail.run.totalCount) return detail ? 0 : null;
  return Math.round((detail.run.foundCount / detail.run.totalCount) * 100);
}

function byKeyword(results: GeoRunResult[] | undefined) {
  const m = new Map<string, boolean | null>();
  for (const r of results ?? []) {
    const key = r.keywordId ?? r.keywordText;
    if (!m.has(key)) m.set(key, r.found);
  }
  return m;
}

/** 두 실행 상세를 키워드 단위로 비교해 신규/이탈 노출 수를 센다. compare/page.tsx의 changeOf()와
 *  같은 판정 규칙(신규: 이번 O·직전 not-O / 이탈: 이번 not-O·직전 O)을 이 페이지용으로 새로 작성. */
function countChanges(current: GeoRunDetail | null, previous: GeoRunDetail | null) {
  if (!current || !previous) return null;
  const curBy = byKeyword(current.results);
  const prevBy = byKeyword(previous.results);
  let newCount = 0;
  let lostCount = 0;
  const keys = new Set([...curBy.keys(), ...prevBy.keys()]);
  for (const k of keys) {
    const before = prevBy.get(k) ?? null;
    const after = curBy.get(k) ?? null;
    if (after === true && before !== true) newCount++;
    else if (after !== true && before === true) lostCount++;
  }
  return { newCount, lostCount };
}

function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "up" | "down" | "muted";
}) {
  const toneCls = {
    default: "text-[#0e299c]",
    up: "text-[#2f6a2a]",
    down: "text-[#c5321f]",
    muted: "text-[#8b95a1]",
  }[tone];
  return (
    <div className="rounded-lg border border-gray-100 bg-[#fafbfc] px-3 py-2.5">
      <p className="text-[11px] text-[#8b95a1]">{label}</p>
      <p className={`mt-0.5 text-base font-bold leading-tight ${toneCls}`}>{value}</p>
    </div>
  );
}

/** 실제 점검일 하나(date)의 노출 요약 — 작은 통계 타일로 쪼개서 한눈에 훑을 수 있게 한다.
 *  7일 창 같은 걸 만들지 않고 "그날 실제로 점검한 결과" 그대로 보여준다. */
export default function PeriodColumn({
  label,
  date,
  detail,
  compareDetail,
}: {
  label: string;
  date: string;
  detail: GeoRunDetail | null;
  /** 델타·신규/이탈 비교 대상이 되는 다른 점검일의 상세. 없으면 비교 타일을 "—"로 둔다. */
  compareDetail?: GeoRunDetail | null;
}) {
  const thisRate = rate(detail);
  const compareRate = compareDetail !== undefined ? rate(compareDetail) : null;
  const delta = compareDetail !== undefined && thisRate !== null && compareRate !== null ? thisRate - compareRate : null;
  const changes = compareDetail !== undefined ? countChanges(detail, compareDetail ?? null) : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm font-bold text-[#333d4b]">{label}</p>
      <p className="mt-0.5 text-xs text-[#8b95a1]">{date}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="노출률" value={thisRate === null ? "—" : `${thisRate}%`} />
        <StatTile
          label="노출 키워드"
          value={detail ? `${detail.run.foundCount}/${detail.run.totalCount}` : "—"}
          tone="muted"
        />
        <StatTile
          label={compareDetail !== undefined ? "직전 점검 대비" : "비교 대상"}
          value={delta === null ? "—" : delta > 0 ? `▲${delta}%` : delta < 0 ? `▼${Math.abs(delta)}%` : "-"}
          tone={delta === null ? "muted" : delta > 0 ? "up" : delta < 0 ? "down" : "muted"}
        />
        <StatTile
          label="신규/이탈 키워드"
          value={
            changes ? (
              <>
                <span className="text-[#2f6a2a]">+{changes.newCount}</span>{" "}
                <span className="text-[#c5321f]">-{changes.lostCount}</span>
              </>
            ) : (
              "—"
            )
          }
          tone={changes ? "default" : "muted"}
        />
      </div>
    </div>
  );
}
