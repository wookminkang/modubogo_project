"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface ReviewChartPoint {
  label: string;
  방문자: number;
  블로그: number;
}

type Metric = "방문자" | "블로그";

const META: Record<Metric, { color: string; gradId: string }> = {
  방문자: { color: "#0e299c", gradId: "grad-visitor" },
  블로그: { color: "#22c55e", gradId: "grad-blog" },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label, color }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-0.5 text-gray-500">{label}</p>
      <p className="text-sm font-bold" style={{ color }}>
        {Number(payload[0].value).toLocaleString()}
      </p>
    </div>
  );
}

export default function ReviewChart({ data }: { data: ReviewChartPoint[] }) {
  const [metric, setMetric] = useState<Metric>("방문자");
  const { color, gradId } = META[metric];

  // 최신값 + 전일 대비 증감 (오름차순 배열의 마지막 2점)
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const latestValue = last ? last[metric] : 0;
  const delta = last && prev ? last[metric] - prev[metric] : null;

  return (
    <div>
      {/* 헤더: 세그먼트 토글 + 최신값/증감 */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-[var(--seed-color-bg-neutral-subtle)] p-1">
          {(["방문자", "블로그"] as Metric[]).map((m) => {
            const active = m === metric;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                style={active ? { color: META[m].color } : undefined}
              >
                {m}
              </button>
            );
          })}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">
            {latestValue.toLocaleString()}
          </span>
          {delta !== null &&
            (delta === 0 ? (
              <span className="text-sm font-medium text-gray-400">—</span>
            ) : (
              <span
                className="text-sm font-bold"
                style={{ color: delta > 0 ? color : "#ef4444" }}
              >
                {delta > 0 ? "▲ +" : "▼ "}
                {delta}
              </span>
            ))}
        </div>
      </div>

      {/* 그라데이션 영역 차트 */}
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            padding={{ left: 8, right: 8 }}
          />
          <YAxis hide domain={["dataMin - 3", "dataMax + 3"]} />
          <Tooltip
            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: "4 4" }}
            content={<ChartTooltip color={color} />}
          />
          <Area
            type="monotone"
            dataKey={metric}
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradId})`}
            dot={data.length <= 1 ? { r: 4, fill: color } : false}
            activeDot={{ r: 5, strokeWidth: 2, fill: "#fff", stroke: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
