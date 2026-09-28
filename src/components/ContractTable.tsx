import { contractLinkLabel, parseContractLinks, type ContractItem } from "@/lib/mockData";
import { getCategoryColor } from "@/lib/categoryColors";
import { CardTitle } from "./CardTitle";

interface Props {
  contracts: ContractItem[];
  colorMap?: Record<string, { bgHex: string; textHex: string }>;
}

export default function ContractTable({ contracts, colorMap }: Props) {
  const items = contracts.filter((c) => c.name || c.category);
  if (items.length === 0) return null;

  return (
    <div>
      <CardTitle
        title="광고 계약·리포트 현황"
        description="외주업체 계약기간과 광고 보고서를 한눈에 확인할 수 있어요"
      />

      {items.map((item, index) => {
        // 계약 하나에 리포트 링크가 여러 개 달릴 수 있다 (네이버·데이블 …)
        const links = parseContractLinks(item.link);
        return (
          <div className="bg-white rounded-2xl px-4 py-4 shadow-sm mb-2" key={index}>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span
                className="text-[10px] px-[8px] py-[2px] inline-block w-fit rounded-lg"
                style={{
                  backgroundColor: getCategoryColor(item.category, colorMap).bgHex,
                  color: getCategoryColor(item.category, colorMap).textHex,
                }}
              >
                {item.category}
              </span>
              <div className="text-[#333d4b] text-[14px] font-medium truncate">{item.name}</div>
              {item.keyword && (
                <div className="text-[12px] text-gray-400 truncate">{item.keyword}</div>
              )}
            </div>

            {links.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-xl bg-[#F0F4FA] px-3 py-2 text-[12px] font-medium text-[#0e299c] transition-colors hover:bg-[#e4ebf6]"
                  >
                    {contractLinkLabel(link, i, links.length)}
                    <ExternalLinkIcon />
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
