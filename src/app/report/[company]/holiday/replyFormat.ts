// 공휴일 진료 회신 표시용 공용 헬퍼/타입.
// HolidayClient(전송 화면)와 replies(회신 전용 화면) 양쪽에서 재사용한다.
// 순수 함수라 서버/클라이언트 어디서든 import 가능.

export interface ScheduleRow {
  date: string;
  holiday_name: string;
  status: string; // morning | open | closed
  short_start: string | null;
  short_end: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
  note: string | null;
}

// 제출 이력 스냅샷 (holiday_submissions.schedule)
export interface SnapItem {
  date: string;
  holiday_name: string;
  status: string; // morning | open | closed
  short_start: string;
  short_end: string;
  lunch_start: string;
  lunch_end: string;
  noLunch: boolean;
}

// 점심시간 표시 문구
export function lunchText(sc: ScheduleRow): string {
  if (sc.lunch_start && sc.lunch_end)
    return `점심 ${sc.lunch_start}~${sc.lunch_end}`;
  if (sc.note?.includes("점심시간 없음")) return "점심시간 없음";
  return "";
}

export function formatSnapshot(it: SnapItem): string {
  if (it.status === "closed") return "휴무";
  const lunch = it.noLunch
    ? " (점심없음)"
    : it.lunch_start && it.lunch_end
      ? ` (점심 ${it.lunch_start}~${it.lunch_end})`
      : "";
  if (it.status === "morning")
    return `오전진료 ${it.short_start}~${it.short_end}${lunch}`;
  return `정상진료${lunch}`;
}

// 이전 제출과 비교해 바뀐 공휴일만 추출 (문자열 from/to)
export function diffSnapshots(prev: SnapItem[], cur: SnapItem[]) {
  const prevMap = new Map(prev.map((it) => [it.date, it]));
  const out: { date: string; name: string; from: string; to: string }[] = [];
  for (const it of cur) {
    const p = prevMap.get(it.date);
    const to = formatSnapshot(it);
    const from = p ? formatSnapshot(p) : "—";
    if (from !== to)
      out.push({ date: it.date, name: it.holiday_name, from, to });
  }
  return out;
}

// 바뀐 공휴일을 항목(SnapItem) 단위로 반환 (변경 전/후를 칩으로 렌더링하기 위함)
export function diffSnapshotItems(prev: SnapItem[], cur: SnapItem[]) {
  const prevMap = new Map(prev.map((it) => [it.date, it]));
  const out: {
    date: string;
    name: string;
    before: SnapItem | null;
    after: SnapItem;
  }[] = [];
  for (const it of cur) {
    const p = prevMap.get(it.date) ?? null;
    if (!p || formatSnapshot(p) !== formatSnapshot(it)) {
      out.push({ date: it.date, name: it.holiday_name, before: p, after: it });
    }
  }
  return out;
}
