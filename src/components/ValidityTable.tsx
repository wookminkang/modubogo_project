import dayjs from "@/lib/dayjs";
import type { ValidityItem } from "@/lib/mockData";
import { CardTitle } from "./CardTitle";

interface Props {
  validity: ValidityItem[];
}

export default function ValidityTable({ validity }: Props) {
  if (validity.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <CardTitle
        title="광고 계약·심의 관리 현황"
        description="광고 계약 및 심의 유효기간 관리 현황을 쉽게 확인할 수 있어요"
      />
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-gray-400 text-left">
            <th className="pb-3 pr-2 font-normal">구분</th>
            <th className="pb-3 pr-2 font-normal">주제</th>
            <th className="pb-3 pr-2 font-normal">유효기간</th>
            <th className="pb-3 text-right font-normal">D-day</th>
          </tr>
        </thead>
        <tbody>
          {validity.map((item, index) => {
            const diff = dayjs(item.expiryDate).diff(dayjs(), "day");
            const dday =
              diff === 0 ? "D-day" : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
            const ddayColor =
              diff < 0
                ? "text-red-500"
                : diff <= 7
                ? "text-orange-500"
                : "text-[#0e299c]";
            return (
              <tr key={index} className="border-b last:border-0">
                <td className="py-3 pr-2 text-gray-800">{item.category}</td>
                <td className="py-3 pr-2 text-gray-800">{item.subject}</td>
                <td className="py-3 pr-2 text-gray-400">{item.expiryDate}</td>
                <td className={`py-3 text-right font-bold ${ddayColor}`}>{dday}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
