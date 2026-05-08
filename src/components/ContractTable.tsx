import type { ContractItem } from "@/lib/mockData";
import { getCategoryColor } from "@/lib/categoryColors";
import { CardTitle } from "./CardTitle";

interface Props {
  contracts: ContractItem[];
}

export default function ContractTable({ contracts }: Props) {
  if (contracts.length === 0) return null;

  return (
    <div>
      <CardTitle
        title="광고 계약·리포트 현황"
        description="외주업체 계약기간과 광고 보고서를 한눈에 확인할 수 있어요"
      />

      {contracts.map((item, index) => (
        <div
          className="bg-white rounded-2xl px-4 py-4 shadow-sm mb-2"
          key={index}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span
                className={`text-[10px] px-[8px] py-[2px] inline-block w-fit rounded-lg ${getCategoryColor(item.category).bg} ${getCategoryColor(item.category).text}`}
              >
                {item.category}
              </span>
              <div className="text-[#333d4b] text-[14px] font-medium truncate">
                {item.name}
              </div>
              {item.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] text-[#0e299c] truncate underline underline-offset-2"
                >
                  {item.link}
                </a>
              )}
            </div>
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-[#F0F4FA]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0e299c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
