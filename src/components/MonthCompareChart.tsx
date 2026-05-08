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
      <div className="mb-5">
        {/* 전월 → 이번달 */}
        <div className="flex items-center justify-between px-1 mb-3">
          <div className="flex flex-col">
            <p className="text-sm font-semibold text-gray-700 mb-1 text-left">
              {Number(prevMonth.slice(5))}월
            </p>
            <p className="text-xl font-bold text-gray-500">
              {prevTotal > 0 ? formatAmount(prevTotal) : "-"}
              {prevTotal > 0 && (
                <span className="text-sm font-normal text-gray-400 ml-1">
                  원
                </span>
              )}
            </p>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="36"
            height="16"
            viewBox="0 0 36 16"
            fill="none"
          >
            <line
              x1="0"
              y1="8"
              x2="28"
              y2="8"
              stroke="#d1d5db"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M24 3L31 8L24 13"
              stroke="#d1d5db"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="flex flex-col items-end">
            <p className="text-sm font-semibold text-gray-700 mb-1 text-center">
              {Number(currentMonth.slice(5))}월
            </p>
            <p className="text-xl font-bold text-[#0e299c]">
              {formatAmount(currentTotal)}
              <span className="text-sm font-normal text-gray-400 ml-1">원</span>
            </p>
          </div>
        </div>

        {/* 증감 pill */}
        {!isFlat && (
          <div
            className={`flex items-center justify-center gap-3 rounded-2xl py-3 px-5 ${isUp ? "bg-red-50" : "bg-blue-50"}`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex items-center justify-center w-6 h-6 rounded-full ${isUp ? "bg-red-100 text-red-500" : "bg-blue-100 text-blue-500"}`}
              >
                {isUp ? "↑" : "↓"}
              </span>
              <span
                className={`text-lg font-bold ${isUp ? "text-red-500" : "text-blue-500"}`}
              >
                {isUp ? `+${formatAmount(diff)}` : formatAmount(diff)}
                <span className="text-sm font-normal ml-1">원</span>
              </span>
            </div>
            {diffPct !== null && (
              <>
                <div
                  className={`w-px h-5 ${isUp ? "bg-red-200" : "bg-blue-200"}`}
                />
                <span
                  className={`text-sm font-semibold ${isUp ? "text-red-500" : "text-blue-500"}`}
                >
                  {isUp ? `▲ ${diffPct}%` : `▼ ${Math.abs(diffPct)}%`}
                </span>
              </>
            )}
          </div>
        )}
        {isFlat && (
          <div className="flex items-center justify-center rounded-2xl py-3 px-5 bg-gray-50">
            <span className="text-lg font-bold text-gray-400">±0원</span>
          </div>
        )}
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
              formatter={(value: any, name: any) => {
                const label =
                  name === "이번달"
                    ? `${Number(currentMonth.slice(5))}월`
                    : `${Number(prevMonth.slice(5))}월`;
                return typeof value === "number"
                  ? [`₩${value.toLocaleString()}`, label]
                  : [String(value ?? ""), label];
              }}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
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
