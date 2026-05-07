"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { ReportCategory } from "@/lib/mockData";
import { CardTitle } from "./CardTitle";

const COLORS = [
  "#0e299c",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
];

interface Props {
  categories: ReportCategory[];
  total: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div style={{
      backgroundColor: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: "12px",
      padding: "8px 12px",
      fontSize: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    }}>
      <p style={{ color: "#374151", fontWeight: 600, marginBottom: 4 }}>{item.name}</p>
      <p style={{ color: "#0e299c", fontWeight: 700 }}>₩{Number(item.value).toLocaleString()}</p>
    </div>
  );
}

export default function CategoryDonutChart({ categories, total }: Props) {
  const data = categories.map((c) => ({
    name: c.category,
    value: Number(c.amount),
    pct: Math.round((Number(c.amount) / total) * 100),
  }));

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <CardTitle
        title="광고 채널별 운영 현황"
        description="각 광고 채널의 운영 현황 및 집행 비중을 확인할 수 있어요"
      />

      <div className="flex items-center gap-4">
        {/* 도넛 차트 */}
        <div
          className="relative flex-shrink-0"
          style={{ width: 160, height: 160 }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {data.map((_, index) => (
                  <Cell
                    key={index}
                    fill={COLORS[index % COLORS.length]}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip content={<DonutTooltip />} wrapperStyle={{ zIndex: 10 }} />
            </PieChart>
          </ResponsiveContainer>
          {/* 중앙 텍스트 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-xs text-gray-400">합계</p>
            <p className="text-sm font-bold text-[#0e299c] leading-tight">
              {total >= 10000000
                ? `${(total / 10000000).toFixed(1)}천만`
                : total >= 1000000
                  ? `${(total / 1000000).toFixed(0)}백만`
                  : `${(total / 10000).toFixed(0)}만`}
            </p>
          </div>
        </div>

        {/* 범례 */}
        <div className="flex flex-col gap-2.5 flex-1 min-w-0">
          {data.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm text-gray-700 truncate">
                  {item.name}
                </span>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className="text-sm font-bold text-[#0e299c]">
                  {item.pct}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
