import dayjs from "@/lib/dayjs";
import type { ValidityItem } from "@/lib/mockData";
import { getCategoryColor } from "@/lib/categoryColors";
import { CardTitle } from "./CardTitle";

interface Props {
  validity: ValidityItem[];
  colorMap?: Record<string, { bgHex: string; textHex: string }>;
}

export default function ValidityTable({ validity, colorMap }: Props) {
  const items = validity.filter((v) => v.subject || v.category);
  if (items.length === 0) return null;

  return (
    <div>
      <CardTitle
        title="광고 계약·심의 관리 현황"
        description="광고 계약 및 심의 유효기간 관리 현황을 쉽게 확인할 수 있어요"
      />

      <div className="flex flex-col gap-3">
        {items.map((item, index) => {
          const hasExpiry = !!item.expiryDate;
          const diff = hasExpiry ? dayjs(item.expiryDate).diff(dayjs(), "day") : null;
          const dday =
            diff === null
              ? null
              : diff === 0
                ? "D-day"
                : diff > 0
                  ? `D-${diff}`
                  : `D+${Math.abs(diff)}`;
          const ddayColor =
            diff === null
              ? ""
              : diff < 0
                ? "text-red-500"
                : diff <= 7
                  ? "text-orange-500"
                  : "text-[#0e299c]";
          return (
            <div
              key={index}
              className="bg-white rounded-2xl px-4 py-4 shadow-sm"
            >
              {/* 상단: 구분 태그 */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] px-[8px] py-[2px] rounded-lg w-fit" style={{ backgroundColor: getCategoryColor(item.category, colorMap).bgHex, color: getCategoryColor(item.category, colorMap).textHex }}>
                  {item.category}
                </span>
              </div>

              {/* 주제 */}
              <p className="text-[15px] font-semibold text-[#333d4b] mb-2 leading-snug">
                {item.subject}
              </p>

              {/* 하단: 유효기간 + D-day 또는 심의중 */}
              <div className="flex items-center">
                {hasExpiry ? (
                  <>
                    <div className="flex-1 flex flex-col gap-0.5">
                      <div className="flex items-center gap-1 text-[12px] text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        유효기간
                      </div>
                      <span className="text-[13px] text-gray-600">
                        {dayjs(item.expiryDate).format("YYYY.MM.DD")}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[11px] text-gray-400">D-day</span>
                      <span className={`text-[22px] font-bold leading-tight ${ddayColor}`}>
                        {dday}
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="text-[12px] px-3 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">
                    심의중
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
