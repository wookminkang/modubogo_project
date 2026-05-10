"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ReportCategory } from "@/lib/mockData";
import { CardTitle } from "./CardTitle";
import Image from "next/image";

interface ChartItem {
  month: string;
  payment: number;
  categories: ReportCategory[];
}

interface Props {
  data: ChartItem[];
  currentMonth?: string;
}

const CATEGORY_HEX: Record<string, string> = {
  검색광고: "#16a34a",
  디스플레이: "#7c3aed",
  동영상: "#ea580c",
  소셜: "#2563eb",
  브랜드: "#ca8a04",
  오프라인: "#db2777",
  바이럴: "#0e299c",
  기타: "#6b7280",
};
const FALLBACK = ["#0e299c", "#3b82f6", "#34d399", "#f59e0b", "#f87171", "#a78bfa"];

const fmt = (v: number) => {
  if (v >= 10000000) return `${(v / 10000000).toFixed(0)}천만`;
  if (v >= 1000000) return `${(v / 1000000).toFixed(0)}백만`;
  if (v >= 10000) return `${(v / 10000).toFixed(0)}만`;
  return v.toLocaleString();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: { value: number }) => s + (p.value ?? 0), 0);
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-md p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-gray-700 mb-2">{label}월 집행 내역</p>
      {payload.map((p: { name: string; value: number; fill: string }, i: number) => (
        <div key={i} className="flex justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1 text-gray-500">
            <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: p.fill }} />
            {p.name}
          </span>
          <span className="font-medium text-gray-800">₩{p.value.toLocaleString()}</span>
        </div>
      ))}
      <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between">
        <span className="text-gray-500 font-medium">합계</span>
        <span className="font-bold text-[#0e299c]">₩{total.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function MonthlyTrendChart({ data }: Props) {
  // 전체 카테고리 추출 (순서 유지)
  const allCategories = Array.from(
    new Set(data.flatMap((d) => d.categories.map((c) => c.category)))
  );

  // 월별 데이터를 카테고리별 금액으로 변환
  const stackedData = data.map((d) => {
    const catMap: Record<string, number> = {};
    for (const c of d.categories) {
      catMap[c.category] = (catMap[c.category] ?? 0) + Number(c.amount || 0);
    }
    return { month: d.month, payment: d.payment, ...catMap };
  });

  const getCategoryColor = (cat: string, idx: number) =>
    CATEGORY_HEX[cat] ?? FALLBACK[idx % FALLBACK.length];

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm relative">
      <div className="absolute z-10 right-2 top-[-40px]">
        <Image
          src="/images/teest_ct_06.png"
          width={110}
          height={110}
          alt="모두보고 캐릭터 아이콘"
        />
      </div>

      <CardTitle
        title="월별 광고 집행 현황"
        description="광고 운영 흐름과 예산 변화를 쉽게 확인할 수 있어요"
      />

      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={stackedData}
          barCategoryGap="35%"
          margin={{ top: 24, right: 4, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tickFormatter={(v) => `${v}월`}
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmt}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />

          {allCategories.map((cat, i) => {
            const isTop = i === allCategories.length - 1;
            const color = getCategoryColor(cat, i);
            return (
              <Bar
                key={cat}
                dataKey={cat}
                stackId="stack"
                fill={color}
                radius={isTop ? [6, 6, 0, 0] : [0, 0, 0, 0]}
              >
                {isTop && (
                  <LabelList
                    dataKey="payment"
                    position="top"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any) => (typeof v === "number" && v > 0 ? fmt(v) : "")}
                    style={{ fontSize: 10, fill: "#6b7280" }}
                  />
                )}
              </Bar>
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
