"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { ReportCategory } from "@/lib/mockData";

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

export default function CategoryDonutChart({ categories, total }: Props) {
  const data = categories.map((c) => ({
    name: c.category,
    value: Number(c.amount),
    pct: Math.round((Number(c.amount) / total) * 100),
  }));

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <p className="text-base font-semibold text-[#0e299c] mb-4">카테고리별 분포</p>

      <div className="flex items-center gap-4">
        {/* 도넛 차트 */}
        <div className="relative flex-shrink-0" style={{ width: 160, height: 160 }}>
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
                  <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) =>
                  typeof value === "number" ? [`₩${value.toLocaleString()}`, ""] : [String(value ?? ""), ""]
                }
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  fontSize: "12px",
                }}
              />
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
            <div key={index} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm text-gray-700 truncate">{item.name}</span>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className="text-sm font-bold text-[#0e299c]">{item.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
