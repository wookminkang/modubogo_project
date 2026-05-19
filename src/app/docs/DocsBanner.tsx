const BARS = [
  { month: "12월", h: 34, current: false },
  { month: "1월",  h: 46, current: false },
  { month: "2월",  h: 38, current: false },
  { month: "3월",  h: 56, current: false },
  { month: "4월",  h: 50, current: false },
  { month: "5월",  h: 68, current: true  },
];

export default function DocsBanner() {
  return (
    <div className="w-full aspect-[21/9] bg-linear-to-br from-[#0e299c] to-[#071660] rounded-2xl overflow-hidden relative">
      {/* 배경 장식 */}
      <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/4" />
      <div className="absolute -bottom-20 -left-10 w-80 h-80 rounded-full bg-white/3" />

      <div className="relative h-full flex items-center px-8 gap-6">

        {/* 텍스트 */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 pr-2">
          <span className="self-start text-[11px] font-medium text-white/60 bg-white/10 border border-white/15 px-3 py-1 rounded-full leading-none">
            광고 운영 보고서 자동화
          </span>
          <div>
            <h2 className="text-[clamp(1.5rem,3.2vw,2.4rem)] font-bold text-white tracking-tight leading-none">
              모두보고<span className="text-red-400">.</span>
            </h2>
            <p className="mt-2 text-blue-200 text-[clamp(0.7rem,1.1vw,0.95rem)] font-medium">
              광고 운영 보고서, 더 쉽게
            </p>
          </div>
          <p className="text-white/45 text-[clamp(0.6rem,0.9vw,0.8rem)] leading-relaxed">
            월별 광고 집행 현황을 자동으로 정리하고<br />
            클라이언트에게 깔끔하게 전달하세요.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {["네이버 API", "카카오 알림톡", "차트 시각화"].map((tag) => (
              <span
                key={tag}
                className="text-[10px] text-white/55 border border-white/15 bg-white/5 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* 대시보드 목업 */}
        <div className="w-[53%] h-[86%] shrink-0 rounded-xl border border-white/10 bg-white/6 p-3 flex flex-col gap-2">

          {/* 윈도우 크롬 */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-red-400/70" />
            <span className="w-2 h-2 rounded-full bg-yellow-400/70" />
            <span className="w-2 h-2 rounded-full bg-green-400/70" />
            <span className="ml-2 text-[10px] text-white/30 truncate">2026년 5월 광고 보고서</span>
          </div>

          {/* KPI 카드 */}
          <div className="grid grid-cols-3 gap-1.5 shrink-0">
            {[
              { label: "총 광고비",    value: "2,450만원" },
              { label: "운영 채널",    value: "12개" },
              { label: "비즈머니",     value: "850만원" },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white/7 rounded-lg px-2 py-2">
                <p className="text-[8px] text-white/40 leading-none">{kpi.label}</p>
                <p className="text-[11px] font-bold text-white mt-1 leading-none">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* 바 차트 */}
          <div className="flex-1 flex flex-col min-h-0 gap-1">
            <p className="text-[8px] text-white/35 shrink-0">월별 광고비 트렌드</p>
            <div className="flex-1 min-h-0 flex flex-col justify-end">
              <div className="flex items-end gap-1">
                {BARS.map((bar) => (
                  <div key={bar.month} className="flex-1 flex flex-col items-center gap-0.5">
                    {bar.current && (
                      <span className="text-[7px] font-semibold text-white bg-white/15 px-1 rounded leading-snug">
                        +12%
                      </span>
                    )}
                    <div
                      className={`w-full rounded-t-sm ${bar.current ? "bg-white/80" : "bg-[#3b82f6]/45"}`}
                      style={{ height: `${bar.h}px` }}
                    />
                    <span className={`text-[7px] leading-tight ${bar.current ? "text-white font-semibold" : "text-white/30"}`}>
                      {bar.month}
                    </span>
                  </div>
                ))}
              </div>
              <div className="w-full h-px bg-white/10 mt-0.5" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
