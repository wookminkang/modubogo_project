// 공휴일 진료일정 퍼널 — 공유 타입·상수·헬퍼

// 진료 여부: open = 진료, closed = 휴진 (morning 은 더 이상 사용 안 함, 데이터 호환용으로만 타입 유지)
export type Status = "morning" | "open" | "closed";

export interface Item {
  date: string;
  holiday_name: string;
  status: Status | ""; // "" = 아직 미선택
  short_start: string; // 진료 시작
  short_end: string; // 진료 종료
  noLunch: boolean; // 점심시간 없음
  lunch_start: string; // 점심 시작
  lunch_end: string; // 점심 종료
  isCustom?: boolean; // 원장이 임의로 추가한 휴무일(공휴일 아님)
}

// 시간 옵션 생성 (30분 단위)
const pad2 = (n: number) => String(n).padStart(2, "0");
const buildTimes = (startH: number, endH: number): string[] => {
  const out: string[] = [];
  for (let h = startH; h <= endH; h++) {
    out.push(`${pad2(h)}:00`);
    if (h < endH) out.push(`${pad2(h)}:30`);
  }
  return out;
};

// 진료 시작: 08:00 ~ 13:00
export const START_OPTIONS = buildTimes(8, 13);
// 진료 종료: 12:00 ~ 22:00 (저녁 진료 병원 대응)
export const END_OPTIONS = buildTimes(12, 22);
// 점심시간: 11:00 ~ 15:00
export const LUNCH_OPTIONS = buildTimes(11, 15);

// 카카오톡 인앱 브라우저 여부 (UA에 KAKAOTALK 포함)
export function isKakaoInApp(): boolean {
  if (typeof navigator === "undefined") return false;
  return /KAKAOTALK/i.test(navigator.userAgent);
}

// 항목 입력 완료 여부
export function isItemComplete(it: Item): boolean {
  if (!it.status) return false; // 진료 여부 미선택
  if (it.status === "closed") return true; // 휴진은 추가 입력 없음
  if (!it.short_start || !it.short_end) return false; // 진료시간 필수
  if (!it.noLunch && (!it.lunch_start || !it.lunch_end)) return false; // 점심시간
  return true;
}

// 확인 단계용 한 줄 요약 ("09:00~18:00 · 점심시간 없음") — 진료/휴진 라벨은 표시하지 않음
export function statusSummary(it: Item): string {
  if (it.status === "closed") return "휴진";
  if (!it.status) return "미선택";
  const time =
    it.short_start && it.short_end ? `${it.short_start}~${it.short_end}` : "";
  const lunch = it.noLunch
    ? "점심시간 없음"
    : it.lunch_start && it.lunch_end
      ? `점심 ${it.lunch_start}~${it.lunch_end}`
      : "";
  return [time, lunch].filter(Boolean).join(" · ");
}

// ── 퍼널 화면(스크린) 정의 — 공휴일별로 진료여부 → (진료면) 진료시간 순차 ──
export type Screen =
  | { kind: "intro" }
  | { kind: "decision"; date: string } // 진료/휴진 선택
  | { kind: "time"; date: string } // 진료시간 입력 (진료일 때만)
  | { kind: "custom" } // 추가 휴무일 등록
  | { kind: "confirm" }; // 최종 확인

export const sameScreen = (a: Screen, b: Screen) =>
  a.kind === b.kind &&
  (a as { date?: string }).date === (b as { date?: string }).date;

// 진행 단계(3): 진료여부 / 추가휴무 / 확인. intro 는 0.
export const TOTAL_PHASES = 3;
export const phaseOf = (s: Screen): number =>
  s.kind === "intro"
    ? 0
    : s.kind === "decision" || s.kind === "time"
      ? 1
      : s.kind === "custom"
        ? 2
        : 3;
