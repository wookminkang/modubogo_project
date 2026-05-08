export default function ReportLoading() {
  return (
    <div className="min-h-screen animate-pulse">
      {/* 캐릭터 이미지 영역 */}
      <div className="flex justify-center bg-[#F0F4FA] h-[200px]" />

      {/* 헤더 */}
      <div className="relative top-[-30px] bg-[#0e299c] px-6 pt-10 pb-8">
        <div className="h-3 w-24 bg-white/20 rounded mb-4" />
        <div className="h-8 w-40 bg-white/20 rounded mb-3" />
        <div className="h-3 w-56 bg-white/20 rounded mb-1" />
        <div className="h-3 w-44 bg-white/20 rounded mb-5" />
        <div className="flex gap-2 mt-4">
          <div className="h-7 w-16 bg-white/20 rounded-lg" />
          <div className="h-7 w-16 bg-white/20 rounded-lg" />
        </div>
        <div className="mt-6 pt-5 border-t border-white/10" />
        <div className="mt-3 flex gap-2">
          <div className="h-7 w-24 bg-white/20 rounded-lg" />
          <div className="h-7 w-20 bg-white/20 rounded-lg" />
          <div className="h-7 w-20 bg-white/20 rounded-lg" />
        </div>
      </div>

      {/* 본문 */}
      <div className="px-4 flex flex-col gap-5 bg-[#F0F4FA] relative top-[-20px]">
        {/* 요약 카드 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="h-3 w-20 bg-gray-100 rounded mb-3" />
          <div className="flex items-stretch gap-4">
            <div className="flex-1">
              <div className="h-3 w-16 bg-gray-100 rounded mb-2" />
              <div className="h-8 w-32 bg-gray-100 rounded" />
            </div>
            <div className="w-px bg-gray-100" />
            <div className="flex-1">
              <div className="h-3 w-16 bg-gray-100 rounded mb-2" />
              <div className="h-8 w-16 bg-gray-100 rounded" />
            </div>
          </div>
          <div className="mt-4 h-9 bg-gray-50 rounded-xl" />
        </div>

        {/* 차트 스켈레톤 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm h-[220px]">
          <div className="h-4 w-32 bg-gray-100 rounded mb-4" />
          <div className="h-[160px] bg-gray-50 rounded-xl" />
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm h-[200px]">
          <div className="h-4 w-40 bg-gray-100 rounded mb-4" />
          <div className="h-[140px] bg-gray-50 rounded-xl" />
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm h-[200px]">
          <div className="h-4 w-36 bg-gray-100 rounded mb-4" />
          <div className="h-[140px] bg-gray-50 rounded-xl" />
        </div>

        {/* 테이블 스켈레톤 */}
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm h-16" />
          ))}
        </div>
      </div>
    </div>
  );
}
