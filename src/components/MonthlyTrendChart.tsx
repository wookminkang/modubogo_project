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
  currentMonth: string;
}

const formatAmount = (v: number) => {
  if (v >= 10000000) return `${(v / 10000000).toFixed(0)}천만`;
  if (v >= 1000000) return `${(v / 1000000).toFixed(0)}백만`;
  if (v >= 10000) return `${(v / 10000).toFixed(0)}만`;
  return v.toLocaleString();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const item: ChartItem = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-md p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-gray-700 mb-2">{label}월 집행 내역</p>
      {item.categories.map((cat, i) => (
        <div key={i} className="flex justify-between gap-4 py-0.5">
          <span className="text-gray-500 truncate max-w-[90px]">
            {cat.category}
          </span>
          <span className="font-medium text-[#0e299c]">
            ₩{Number(cat.amount).toLocaleString()}
          </span>
        </div>
      ))}
      <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between">
        <span className="text-gray-500 font-medium">합계</span>
        <span className="font-bold text-[#0e299c]">
          ₩{item.payment.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export default function MonthlyTrendChart({ data, currentMonth }: Props) {
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
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          barCategoryGap="35%"
          margin={{ top: 24, right: 4, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f0f0f0"
          />
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
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
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
              formatter={(v: any) =>
                typeof v === "number" ? formatAmount(v) : ""
              }
              style={{ fontSize: 10, fill: "#6b7280" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
