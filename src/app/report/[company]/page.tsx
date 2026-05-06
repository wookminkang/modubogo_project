import dayjs from "@/lib/dayjs";

interface ReportPageProps {
  params: {
    company: Promise<string>;
  };
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { company } = await params;

  const chart = {
    "2026": [
      { month: "3", payment: 823912 },
      { month: "4", payment: 2930010 },
      { month: "5", payment: 3261726 },
    ],
  };

  const categorys = [
    {
      category: "검색광고",
      channel: "네이버 파워링크",
      period: "1",
      amount: "14000000",
      agency: "엠포넷",
    },
    {
      category: "바이럴",
      channel: "브랜드블로그",
      period: "1",
      amount: "1000000",
      agency: "스탠다드",
    },
    {
      category: "디스플레이",
      channel: "네이버 GFA",
      period: "1",
      amount: "3213190",
      agency: "스탠다드",
    },
  ];

  const total = categorys.reduce((sum, item) => sum + Number(item.amount), 0);
  const max = Math.max(...categorys.map((item) => Number(item.amount)));
  const chartMax = Math.max(...chart["2026"].map((d) => d.payment));

  return (
    <div className="min-h-screen bg-[#F0F4FA]">
      {/* 헤더 */}
      <header className="bg-[#0e299c] text-white px-6 pt-10 pb-8">
        <p className="text-sm text-blue-300 mb-3">
          {dayjs().format("YYYY.MM.DD (ddd)")} · 광고 운영보고
        </p>
        <h1 className="text-4xl font-bold leading-tight mb-3">
          {decodeURIComponent(company || "")}
          <span className="inline-block w-2.5 h-2.5 bg-red-500 rounded-full ml-2 mb-1" />
        </h1>
        <p className="text-sm text-blue-200 leading-relaxed">
          이번 달 진행 중인 광고 항목과<br />매체 운영 현황을 정리한 보고서예요.
        </p>
        <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between">
          <span className="text-sm text-blue-300">보고자</span>
          <span className="text-sm font-medium text-white">홍길동 대리 · Hong@modubogo.com</span>
        </div>
      </header>

      <div className="px-4 py-6 flex flex-col gap-5">
        {/* 요약 통계 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-400 mb-2">5월 집행 합계</p>
            <p className="text-2xl font-bold text-[#0e299c]">
              {(20129395).toLocaleString()}
              <span className="text-sm ml-1 font-normal text-gray-400">원</span>
            </p>
            <p className="text-sm text-gray-400 mt-2">11건 결제</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-400 mb-2">결제처</p>
            <p className="text-2xl font-bold text-[#0e299c]">
              6
              <span className="text-sm ml-1 font-normal text-gray-400">곳</span>
            </p>
            <p className="text-sm text-gray-400 mt-2">집행사 수</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-400 mb-2">최대 결제 항목</p>
            <p className="text-2xl font-bold text-[#0e299c]">
              {(14204000).toLocaleString()}
              <span className="text-sm ml-1 font-normal text-gray-400">원</span>
            </p>
            <p className="text-sm text-gray-400 mt-2">네이버 파워링크</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-400 mb-2">YTD 누적</p>
            <p className="text-2xl font-bold text-[#0e299c]">
              {(34291902).toLocaleString()}
              <span className="text-sm ml-1 font-normal text-gray-400">원</span>
            </p>
            <p className="text-sm text-gray-400 mt-2">올해 누적 집행액</p>
          </div>
        </div>

        {/* 월별 집행 추이 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-base font-semibold text-[#0e299c] mb-6">
            월별 집행 추이
          </p>
          <div className="flex items-end gap-3 h-[140px]">
            {chart["2026"].map((item) => {
              const height = Math.round((item.payment / chartMax) * 140);
              const isCurrent = item.month === "5";
              return (
                <div
                  key={item.month}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  <p className="text-xs font-medium text-[#0e299c]">
                    {item.payment.toLocaleString()}원
                  </p>
                  <div
                    className={`w-full rounded-t-lg ${isCurrent ? "bg-[#0e299c]" : "bg-gray-200"}`}
                    style={{ height: `${height}px` }}
                  />
                  <p
                    className={`text-sm font-semibold ${isCurrent ? "text-[#0e299c]" : "text-gray-400"}`}
                  >
                    {item.month}월
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 카테고리별 분포 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-base font-semibold text-[#0e299c] mb-5">
            카테고리별 분포
          </p>
          <div className="flex flex-col gap-5">
            {categorys.map((item, index) => {
              const pct = Math.round((Number(item.amount) / total) * 100);
              const barWidth = Math.round((Number(item.amount) / max) * 100);
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[#0e299c]">
                      {item.category}
                    </span>
                    <span className="text-sm font-bold text-[#0e299c]">
                      {pct}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">
                    ₩{Number(item.amount).toLocaleString()}
                  </p>
                  <div className="h-1.5 bg-gray-100 w-full rounded-full">
                    <div
                      className={`h-full rounded-full ${index === 0 ? "bg-red-500" : "bg-[#0e299c]"}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 카테고리별 집행 내역 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-base font-semibold text-[#0e299c] mb-4">
            카테고리별 집행 내역
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-400 text-left">
                <th className="pb-3 pr-2 font-normal">#</th>
                <th className="pb-3 pr-2 font-normal">구분</th>
                <th className="pb-3 pr-2 font-normal">채널</th>
                <th className="pb-3 pr-2 font-normal">집행사</th>
                <th className="pb-3 text-right font-normal">금액</th>
              </tr>
            </thead>
            <tbody>
              {categorys.map((item, index) => (
                <tr key={index} className="border-b last:border-0">
                  <td className="py-3 pr-2 text-gray-500">{index + 1}</td>
                  <td className="py-3 pr-2 text-gray-500">{item.category}</td>
                  <td className="py-3 pr-2 text-gray-500">{item.channel}</td>
                  <td className="py-3 pr-2 text-gray-500">{item.agency}</td>
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
      </div>
    </div>
  );
}
