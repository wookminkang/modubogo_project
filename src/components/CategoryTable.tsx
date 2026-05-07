import type { ReportCategory } from "@/lib/mockData";
import { CardTitle } from "./CardTitle";

interface Props {
  categories: ReportCategory[];
  total: number;
}

export default function CategoryTable({ categories, total }: Props) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <CardTitle
        title="매체별 운영 현황"
        description="각 광고 매체의 운영 업체 및 계약 내용을 확인할 수 있어요"
      />

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-gray-400 text-left">
            <th className="pb-3 pr-2 font-normal">#</th>
            <th className="pb-3 pr-2 font-normal">구분</th>
            <th className="pb-3 pr-2 font-normal">채널</th>
            <th className="pb-3 pr-2 font-normal">외주업체</th>
            <th className="pb-3 text-right font-normal">금액</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((item, index) => (
            <tr key={index} className="border-b last:border-0">
              <td className="py-3 pr-2 text-gray-400">{index + 1}</td>
              <td className="py-3 pr-2 text-gray-800">{item.category}</td>
              <td className="py-3 pr-2 text-gray-800">{item.channel}</td>
              <td className="py-3 pr-2 text-gray-400">{item.agency}</td>
              <td className="py-3 text-right font-semibold text-[#0e299c]">
                ₩{Number(item.amount).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t">
            <td colSpan={4} className="pt-3 text-gray-400">
              합계
            </td>
            <td className="pt-3 text-right font-bold text-[#0e299c]">
              ₩{total.toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
