"use client";

import { CardTitle } from "./CardTitle";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ReportCategory } from "@/lib/mockData";

interface Props {
  currentMonth: string;
  prevMonth: string;
  currentCategories: ReportCategory[];
  prevCategories: ReportCategory[];
  currentTotal: number;
  prevTotal: number;
}

export default function MonthCompareChart({
  currentMonth,
  prevMonth,
  currentCategories,
  prevCategories,
  currentTotal,
  prevTotal,
}: Props) {
  const diff = currentTotal - prevTotal;
  const diffPct = prevTotal > 0 ? Math.round((diff / prevTotal) * 100) : null;
  const isUp = diff > 0;
  const isFlat = diff === 0;

  // 두 달의 카테고리 합집합으로 차트 데이터 구성
  const allCategories = Array.from(
    new Set([
      ...currentCategories.map((c) => c.category),
      ...prevCategories.map((c) => c.category),
    ]),
  );

  const chartData = allCategories.map((cat) => {
    const cur = currentCategories.find((c) => c.category === cat);
    const prev = prevCategories.find((c) => c.category === cat);
    return {
      name: cat,
      이번달: cur ? Number(cur.amount) : 0,
      전월: prev ? Number(prev.amount) : 0,
    };
  });

  const formatAmount = (v: number) => {
    if (v >= 10000000) return `${(v / 10000000).toFixed(0)}천만`;
    if (v >= 1000000) return `${(v / 1000000).toFixed(0)}백만`;
    if (v >= 10000) return `${(v / 10000).toFixed(0)}만`;
    return v.toLocaleString();
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm flex flex-col">
      <CardTitle
        title="전월 대비 광고비 비교"
        description="이전 달과 비교한 광고비 변동 내용을 확인할 수 있어요"
      />

      {/* 요약 수치 */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[#F0F4FA] rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">{prevMonth.slice(5)}월</p>
          <p className="text-lg font-bold text-gray-700">
            {prevTotal > 0 ? formatAmount(prevTotal) : "-"}
            {prevTotal > 0 && (
              <span className="text-xs font-normal text-gray-400 ml-1">원</span>
            )}
          </p>
        </div>
        <div className="bg-[#F0F4FA] rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">
            {currentMonth.slice(5)}월
          </p>
          <p className="text-lg font-bold text-[#0e299c]">
            {formatAmount(currentTotal)}
            <span className="text-xs font-normal text-gray-400 ml-1">원</span>
          </p>
        </div>
        <div
          className={`rounded-xl p-4 ${
            isFlat ? "bg-gray-50" : isUp ? "bg-red-50" : "bg-blue-50"
          }`}
        >
          <p className="text-xs text-gray-400 mb-1">증감</p>
          <p
            className={`text-lg font-bold ${
              isFlat ? "text-gray-400" : isUp ? "text-red-500" : "text-blue-500"
            }`}
          >
            {isFlat
              ? "±0"
              : isUp
                ? `+${formatAmount(diff)}`
                : formatAmount(diff)}
            <span className="text-xs font-normal ml-1">원</span>
          </p>
          {diffPct !== null && !isFlat && (
            <p
              className={`text-xs font-semibold mt-0.5 ${
                isUp ? "text-red-400" : "text-blue-400"
              }`}
            >
              {isUp ? `▲ ${diffPct}%` : `▼ ${Math.abs(diffPct)}%`}
            </p>
          )}
        </div>
      </div>

      {/* 카테고리별 비교 바 차트 */}
      {prevTotal > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barCategoryGap="30%" barGap={4}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f0f0f0"
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatAmount}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              width={42}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) =>
                typeof value === "number"
                  ? [`₩${value.toLocaleString()}`, ""]
                  : [String(value ?? ""), ""]
              }
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                fontSize: "12px",
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
            />
            <Bar dataKey="전월" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            <Bar dataKey="이번달" fill="#0e299c" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-24 text-sm text-gray-400">
          전월 데이터가 없습니다
        </div>
      )}
    </div>
  );
}
