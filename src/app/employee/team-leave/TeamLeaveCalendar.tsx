import dayjs from "@/lib/dayjs";
import { pad } from "@/lib/utils";
import type { PublicHoliday } from "@/lib/publicHoliday";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 캘린더에 그릴 휴가 1건 (사유는 개인정보라 받지 않는다). */
export interface TeamLeaveItem {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  unit: "full" | "half_am" | "half_pm";
  status: "approved" | "pending";
}

// 직원별 막대 색상 — 직원 인덱스로 순환 (같은 직원은 같은 색)
const PALETTE = [
  "bg-orange-100 text-orange-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
  "bg-amber-100 text-amber-700",
  "bg-indigo-100 text-indigo-700",
];

export function unitLabel(unit: TeamLeaveItem["unit"]): string {
  return unit === "half_am" ? "오전반차" : unit === "half_pm" ? "오후반차" : "";
}

/** 한 주(7칸) 안에서 휴가 1건이 차지하는 구간. 주를 넘어가면 다음 주에 새 세그먼트로 이어진다. */
interface Segment {
  item: TeamLeaveItem;
  startCol: number; // 0(일)~6(토)
  endCol: number;
  isStart: boolean; // 이 세그먼트가 휴가의 실제 시작일을 포함하는지 (왼쪽 둥글게)
  isEnd: boolean; // 실제 종료일 포함 (오른쪽 둥글게)
  lane: number; // 같은 주에서 겹치는 휴가를 위아래로 쌓는 줄 번호
}

/**
 * 팀 전체 휴가 월 캘린더 (읽기 전용, 서버 컴포넌트).
 * 여러 날짜에 걸친 휴가는 날짜마다 칩을 찍지 않고 주 단위 **연속 막대**로 그린다
 * (구글 캘린더식). 주 행마다 CSS grid 로 날짜 헤더 1줄 + 휴가 레인 N줄을 쌓고,
 * 막대는 gridColumn 으로 시작~끝 칸을 span 한다.
 */
export default function TeamLeaveCalendar({
  month,
  today,
  items,
  holidays,
  colorIndexByEmployee,
  currentEmployeeId,
}: {
  month: string;
  today: string;
  items: TeamLeaveItem[];
  holidays: PublicHoliday[];
  colorIndexByEmployee: Map<string, number>;
  currentEmployeeId: string;
}) {
  const holidayByDate = new Map(holidays.map((h) => [h.date, h.name]));

  const [year, monthNum] = month.split("-").map(Number);
  const first = dayjs(`${month}-01`);
  const daysInMonth = first.daysInMonth();
  const startWeekday = first.day();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const dateOf = (d: number) => `${year}-${pad(monthNum)}-${pad(d)}`;

  // 주별 세그먼트 계산 + 레인 배정 (시작일 빠른 순 → 빈 레인부터 greedy)
  const weekSegments: Segment[][] = weeks.map((week) => {
    const days = week.map((d) => (d === null ? null : dateOf(d)));
    const firstDay = days.find((x): x is string => x !== null);
    const lastDay = [...days].reverse().find((x): x is string => x !== null);
    if (!firstDay || !lastDay) return [];

    const segs: Omit<Segment, "lane">[] = [];
    for (const item of items) {
      if (item.endDate < firstDay || item.startDate > lastDay) continue;
      const startCol = days.findIndex((x) => x !== null && x >= item.startDate);
      let endCol = -1;
      for (let c = 6; c >= 0; c--) {
        const x = days[c];
        if (x !== null && x <= item.endDate) {
          endCol = c;
          break;
        }
      }
      if (startCol === -1 || endCol === -1 || endCol < startCol) continue;
      segs.push({
        item,
        startCol,
        endCol,
        isStart: days[startCol] === item.startDate,
        isEnd: days[endCol] === item.endDate,
      });
    }
    segs.sort(
      (a, b) =>
        a.startCol - b.startCol ||
        b.endCol - b.startCol - (a.endCol - a.startCol) ||
        a.item.employeeName.localeCompare(b.item.employeeName),
    );
    const laneEnds: number[] = []; // lane -> 마지막으로 점유한 col
    return segs.map((s) => {
      let lane = laneEnds.findIndex((end) => end < s.startCol);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = s.endCol;
      return { ...s, lane };
    });
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 min-w-0">
      <div className="grid grid-cols-7 border-b border-gray-100 pb-2">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`text-center text-xs font-semibold ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      <div className="flex flex-col pt-1">
        {weeks.map((week, wi) => {
          const segs = weekSegments[wi];
          const laneCount = segs.reduce((m, s) => Math.max(m, s.lane + 1), 0);
          return (
            <div
              key={wi}
              className="grid grid-cols-7 gap-x-1 border-b border-gray-50 py-1 last:border-b-0"
              style={{
                gridTemplateRows: `auto repeat(${laneCount}, auto)`,
                minHeight: 96,
              }}
            >
              {/* 1행: 날짜 숫자 + 공휴일 */}
              {week.map((d, ci) => {
                if (d === null)
                  return <div key={ci} style={{ gridColumn: ci + 1, gridRow: 1 }} />;
                const dateStr = dateOf(d);
                const holidayName = holidayByDate.get(dateStr);
                const isToday = dateStr === today;
                return (
                  <div
                    key={ci}
                    style={{ gridColumn: ci + 1, gridRow: 1 }}
                    className={`flex flex-col items-start gap-1 rounded-t-xl px-1.5 pt-1.5 pb-1 ${
                      isToday ? "bg-[#0e299c]/5" : ""
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isToday
                          ? "bg-[#0e299c] text-white"
                          : holidayName || ci === 0
                            ? "text-red-500"
                            : ci === 6
                              ? "text-blue-400"
                              : "text-gray-700"
                      }`}
                    >
                      {d}
                    </span>
                    {holidayName && (
                      <span className="w-full truncate rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-500">
                        {holidayName}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* 2행~: 휴가 막대 (여러 날이면 칸을 가로질러 하나로 이어짐) */}
              {segs.map((s) => {
                const color =
                  PALETTE[(colorIndexByEmployee.get(s.item.employeeId) ?? 0) % PALETTE.length];
                const half = unitLabel(s.item.unit);
                const mine = s.item.employeeId === currentEmployeeId;
                const pending = s.item.status === "pending";
                const radius = `${s.isStart ? "rounded-l-md" : ""} ${s.isEnd ? "rounded-r-md" : ""}`;
                return (
                  <span
                    key={s.item.id}
                    style={{
                      gridColumn: `${s.startCol + 1} / ${s.endCol + 2}`,
                      gridRow: s.lane + 2,
                    }}
                    title={`${s.item.employeeName} · ${s.item.startDate} ~ ${s.item.endDate}${
                      half ? ` · ${half}` : ""
                    }${pending ? " · 승인 대기" : ""}`}
                    className={`mx-0.5 mb-1 truncate px-1.5 py-0.5 text-[10px] font-semibold ${radius} ${
                      pending
                        ? "border border-dashed border-gray-300 bg-white text-gray-400"
                        : color
                    } ${mine ? "ring-1 ring-[#0e299c]/40" : ""} ${
                      s.isStart ? "" : "ml-0"
                    } ${s.isEnd ? "" : "mr-0"}`}
                  >
                    {/* 이어지는 세그먼트(주 넘김)는 이름을 다시 보여줘 어떤 휴가인지 알 수 있게 */}
                    {s.item.employeeName}
                    {half && <span className="font-normal opacity-80"> {half}</span>}
                    {pending && <span className="font-normal"> (대기)</span>}
                    {!s.isStart && <span className="font-normal opacity-60"> (이어짐)</span>}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
