"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  BarChart,
  Bar,
  LabelList,
  Cell,
} from "recharts";

export interface DailyPoint {
  date: string; // 'YYYY-MM-DD'
  rate: number; // 0~100
  found: number;
  total: number;
}

const BLUE = "#0e299c";
const GRAY = "#c7cdd8";

function fmtDate(d: string) {
  const [, m, day] = d.split("-");
  return `${Number(m)}/${Number(day)}`;
}

/** 노출률 추이 라인 + 비교 두 날짜 바 차트. 공개 리포트 전용(인터랙션 최소). */
export default function CompareCharts({
  series,
  fromDate,
  toDate,
}: {
  series: DailyPoint[];
  fromDate: string;
  toDate: string;
}) {
  const from = series.find((p) => p.date === fromDate);
  const to = series.find((p) => p.date === toDate);
  const bars = [
    { name: fmtDate(fromDate), label: "이전 점검", rate: from?.rate ?? 0, sub: from ? `${from.found}/${from.total}` : "-", isTo: false },
    { name: fmtDate(toDate), label: "이번 점검", rate: to?.rate ?? 0, sub: to ? `${to.found}/${to.total}` : "-", isTo: true },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {/* 노출률 추이 (전체 점검 이력) */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 md:col-span-3">
        <p className="text-sm font-bold text-[#333d4b]">노출률 추이</p>
        <p className="mt-0.5 text-xs text-[#8b95a1]">점검일 기준 · 강조점이 비교 대상 두 날짜</p>
        <div className="mt-3 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 12, right: 16, bottom: 0, left: -18 }}>
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
                  const p = (item as { payload?: DailyPoint })?.payload;
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
              {from && (
                <ReferenceDot x={from.date} y={from.rate} r={6} fill="#fff" stroke={GRAY} strokeWidth={3} />
              )}
              {to && (
                <ReferenceDot x={to.date} y={to.rate} r={6} fill="#fff" stroke={BLUE} strokeWidth={3} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 두 날짜 비교 바 */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 md:col-span-2">
        <p className="text-sm font-bold text-[#333d4b]">점검일 비교</p>
        <p className="mt-0.5 text-xs text-[#8b95a1]">
          {fmtDate(fromDate)} → {fmtDate(toDate)} 노출률
        </p>
        <div className="mt-3 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} margin={{ top: 24, right: 8, bottom: 0, left: -18 }} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "#6b7684" }}
                axisLine={{ stroke: "#e5e8eb" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 50, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11, fill: "#8b95a1" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value, _n, item) => {
                  const p = (item as { payload?: (typeof bars)[number] })?.payload;
                  return [`${String(value ?? "")}% (${p?.sub ?? ""})`, p?.label ?? ""];
                }}
                cursor={{ fill: "#f5f6fa" }}
                contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e5e8eb" }}
              />
              <Bar dataKey="rate" radius={[8, 8, 0, 0]} isAnimationActive={false}>
                {bars.map((b) => (
                  <Cell key={b.name} fill={b.isTo ? BLUE : GRAY} />
                ))}
                <LabelList
                  dataKey="rate"
                  position="top"
                  formatter={(v: React.ReactNode) => `${v}%`}
                  style={{ fontSize: 12, fontWeight: 700, fill: "#333d4b" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
