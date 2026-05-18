import type { ReportCategory } from "@/lib/mockData";
import { getPeriodCount } from "@/lib/mockData";
import { getCategoryColor } from "@/lib/categoryColors";
import { CardTitle } from "./CardTitle";

interface NaverAdCosts {
  powerlink: number;
  place: number;
  powerContents: number;
}

interface Props {
  categories: ReportCategory[];
  total: number;
  naverAdCosts?: NaverAdCosts | null;
  reportMonth?: string;
}

export default function CategoryTable({ categories, naverAdCosts }: Props) {
  // category 기준으로 그룹핑 (순서 유지)
  const grouped = categories.reduce<{ category: string; items: ReportCategory[] }[]>(
    (acc, item) => {
      const existing = acc.find((g) => g.category === item.category);
      if (existing) {
        existing.items.push(item);
      } else {
        acc.push({ category: item.category, items: [item] });
      }
      return acc;
    },
    []
  );

  // 네이버 API 실적이 있는데 검색광고 그룹이 없으면 빈 그룹 추가
  if (naverAdCosts && !grouped.some((g) => g.category === "검색광고")) {
    grouped.push({ category: "검색광고", items: [] });
  }

  // 검색광고 묶음을 항상 맨 위로
  grouped.sort((a, b) => {
    if (a.category === "검색광고") return -1;
    if (b.category === "검색광고") return 1;
    return 0;
  });

  return (
    <div>
      <CardTitle
        title="매체별 운영 현황"
        description="각 광고 매체의 운영 업체 및 계약 내용을 확인할 수 있어요"
      />

      <div className="flex flex-col gap-3">
        {grouped.map(({ category, items }) => {
          const { bg, text } = getCategoryColor(category);
          const naverExtra = (naverAdCosts && category === "검색광고")
            ? naverAdCosts.powerlink + naverAdCosts.place + naverAdCosts.powerContents
            : 0;
          const groupTotal = items.reduce((s, i) => {
            const period = getPeriodCount(i.period);
            return s + Math.round(Number(i.amount || 0) / period);
          }, 0) + naverExtra;
          return (
            <div key={category} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* 카테고리 헤더 */}
              <div className={`flex items-center justify-between px-4 py-2.5 ${bg}`}>
                <span className={`text-xs font-bold ${text}`}>{category}</span>
                <span className={`text-xs font-semibold ${text}`}>
                  ₩{groupTotal.toLocaleString()}원
                </span>
              </div>

              {/* 검색광고 카테고리 - 네이버 API 실적 먼저 */}
              {naverAdCosts && category === "검색광고" && [
                { channel: "네이버 파워링크", value: naverAdCosts.powerlink },
                { channel: "네이버 플레이스", value: naverAdCosts.place },
                { channel: "네이버 파워컨텐츠", value: naverAdCosts.powerContents },
              ].map(({ channel, value }) => (
                <div key={channel} className="flex items-center justify-between px-4 py-3 border-t border-gray-50">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[14px] font-medium text-[#333d4b]">{channel}</span>
                    <span className="text-[13px] text-[#6b7684]">NAVER</span>
                  </div>
                  <span className="text-[14px] text-gray-800">₩{value.toLocaleString()}원</span>
                </div>
              ))}

              {/* 항목 목록 */}
              {items.map((item, idx) => {
                const period = getPeriodCount(item.period);
                const totalAmt = Number(item.amount);
                const monthlyAmt = Math.round(totalAmt / period);
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-4 py-3 border-t border-gray-50"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[14px] font-medium text-[#333d4b]">{item.channel}</span>
                      <span className="text-[13px] text-[#6b7684]">{item.agency}</span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[14px] text-gray-800">
                        ₩{totalAmt.toLocaleString()}원
                      </span>
                      {period > 1 && (
                        <span className="text-[12px] text-gray-400">
                          (월 ₩{monthlyAmt.toLocaleString()}원)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

    </div>
  );
}
