"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot } from "recharts";

export interface TrendPoint {
  date: string; // 'YYYY-MM-DD' — 실제 점검이 있었던 날짜만 (listGeoDailySummaries는 미점검일을 안 준다)
  rate: number; // 0~100
  found: number;
  total: number;
}

const BLUE = "#0e299c";

function fmtDate(d: string) {
  const [, m, day] = d.split("-");
  return `${Number(m)}/${Number(day)}`;
}

/** 실제 점검일들만 이은 노출률 추이 위에, 가장 최근 점검일을 강조점으로 찍는다.
 *  가짜 7일 창을 만들지 않고 "내가 점검한 날짜"만 쓴다. */
export default function TrendHighlightChart({
  points,
  latestDate,
}: {
  points: TrendPoint[];
  latestDate: string;
}) {
  const latest = points.find((p) => p.date === latestDate);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm font-bold text-[#333d4b]">가시성 추이</p>
      <p className="mt-0.5 text-xs text-[#8b95a1]">
        실제 점검일 {points.length}회 기준 · 강조점은 가장 최근 점검일({fmtDate(latestDate)})
      </p>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 12, right: 16, bottom: 0, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDate}
              tick={{ fontSize: 11, fill: "#8b95a1" }}
              axisLine={{ stroke: "#e5e8eb" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: "#8b95a1" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value, _n, item) => {
                const p = (item as { payload?: TrendPoint })?.payload;
                return [`${String(value ?? "")}% (${p ? `${p.found}/${p.total}` : ""})`, "노출률"];
              }}
              labelFormatter={(d) => `점검일 ${d}`}
              contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e5e8eb" }}
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke={BLUE}
              strokeWidth={2}
              dot={{ r: 3, fill: BLUE, strokeWidth: 0 }}
              isAnimationActive={false}
            />
            {latest && <ReferenceDot x={latest.date} y={latest.rate} r={6} fill="#fff" stroke={BLUE} strokeWidth={3} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
