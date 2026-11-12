import type { GeoKeyword } from "@/lib/geo-db";

// 체크리스트·리포트에 어떤 키워드 행을 보여줄지 정하는 순수 함수들.
// 클라이언트 컴포넌트(ChecklistTable)에서도 쓰므로 DB 의존 없이 둔다.

/** 비고의 "원고 발행 YYYY-MM-DD" 날짜 — 없으면 null. */
export function publishDateFromMemo(memo: string | null | undefined): string | null {
  return memo?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
}

/**
 * 지금 키워드 세트가 시작된 날 = 켜진 키워드 중 가장 이른 원고 발행일. 없으면 null.
 * 예) 11/1 발행분부터 키워드를 통째로 교체했다면 11/1.
 */
export function currentSetStart(keywords: GeoKeyword[]): string | null {
  let start: string | null = null;
  for (const k of keywords) {
    if (!k.active) continue;
    const d = publishDateFromMemo(k.memo);
    if (d && (!start || d < start)) start = d;
  }
  return start;
}

/**
 * 보여줄 키워드.
 *
 * - 켜진 키워드는 항상 보인다 (점검 안 한 날은 공란 = 미점검).
 * - 꺼진 키워드는 **지금 세트가 시작되기 전 날짜**에, 그날 결과가 있을 때만 보인다.
 *   교체해서 끈 옛 키워드는 교체 이후 화면에서 사라지고(그날 옛 키워드로 점검했더라도),
 *   교체 전 날짜를 열면 그때 점검한 그대로 보인다. 발행 전 예약 키워드는 결과가 없으니 숨겨진다.
 *
 * @param checks 보고 있는 날짜(기간)별로 결과가 있는 키워드 id
 */
export function visibleKeywords(
  keywords: GeoKeyword[],
  checks: { date: string; keywordIds: Iterable<string> }[],
): GeoKeyword[] {
  const start = currentSetStart(keywords);
  const shownInactive = new Set<string>();
  for (const c of checks) {
    if (start && c.date >= start) continue;
    for (const id of c.keywordIds) shownInactive.add(id);
  }
  return keywords.filter((k) => k.active || shownInactive.has(k.id));
}
