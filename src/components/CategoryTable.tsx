import type { ReportCategory } from "@/lib/mockData";
import { getCategoryColor } from "@/lib/categoryColors";
import { CardTitle } from "./CardTitle";

interface Props {
  categories: ReportCategory[];
  total: number;
}

export default function CategoryTable({ categories, total }: Props) {
  return (
    <div>
      <CardTitle
        title="매체별 운영 현황"
        description="각 광고 매체의 운영 업체 및 계약 내용을 확인할 수 있어요"
      />

      {categories.map((item, index) => (
        <div
          className="bg-white rounded-2xl px-4 py-4 shadow-sm mb-2"
          key={index}
        >
          <div className="flex items-center gap-1 justify-between">
            {/* 아이콘 */}
            <div className="flex items-start gap-2">
              <div className="flex flex-col gap-0.5">
                <span
                  className={`text-[10px] px-[8px] py-[2px] inline-block w-fit rounded-lg ${getCategoryColor(item.category).bg} ${getCategoryColor(item.category).text}`}
                >
                  {item.category}
                </span>
                <div className="text-[#333d4b] text-[14px] font-medium">
                  {item.channel}
                </div>
                <div className="text-[#6b7684] text-[13px]">{item.agency}</div>
              </div>
            </div>
            <div className="text-right text-[14px]">
              ₩{Number(item.amount).toLocaleString()}원
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
