"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
  ResponsiveContainer,
} from "recharts";

interface ChartItem {
  month: string; // "05"
  payment: number;
}

interface Props {
  data: ChartItem[];
  currentMonth: string; // "05"
}

export default function MonthlyTrendChart({ data, currentMonth }: Props) {
  const formatAmount = (v: number) => {
    if (v >= 10000000) return `${(v / 10000000).toFixed(0)}천만`;
    if (v >= 1000000) return `${(v / 1000000).toFixed(0)}백만`;
    if (v >= 10000) return `${(v / 10000).toFixed(0)}만`;
    return v.toLocaleString();
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <p className="text-base font-semibold text-[#0e299c] mb-4">월별 집행 추이</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barCategoryGap="35%" margin={{ top: 24, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tickFormatter={(v) => `${v}월`}
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatAmount}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) =>
              typeof value === "number" ? [`₩${value.toLocaleString()}`, "집행액"] : [String(value ?? ""), "집행액"]
            }
            labelFormatter={(label) => `${label}월`}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="payment" radius={[6, 6, 0, 0]}>
            {data.map((item, index) => (
              <Cell
                key={index}
                fill={item.month === currentMonth ? "#0e299c" : "#e2e8f0"}
              />
            ))}
            <LabelList
              dataKey="payment"
              position="top"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => (typeof v === "number" ? formatAmount(v) : "")}
              style={{ fontSize: 10, fill: "#6b7280" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
