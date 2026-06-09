/**
 * 원장 회신 확인 페이지 로딩 스켈레톤.
 * 네비게이션 즉시 골격을 보여줘 빈 화면 대기를 없앤다. (실제 페이지 레이아웃과 동일한 카드 구조)
 */
export default function RepliesLoading() {
  return (
    <div className="flex-1 overflow-x-clip bg-[#F0F4FA] py-6 px-4">
      <div className="max-w-[1200px] mx-auto animate-pulse" aria-hidden>
        {/* 카드 1: 병원명 + 공휴일 진료 체크 */}
        <section className="bg-white rounded-2xl shadow-sm px-5 py-5 md:px-7 md:py-6">
          <div className="mb-4 h-4 w-20 rounded bg-gray-100" />
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="h-7 w-48 rounded bg-gray-100" />
              <div className="h-4 w-64 rounded bg-gray-100" />
            </div>
            <div className="h-9 w-32 shrink-0 rounded-lg bg-gray-100" />
          </div>

          <div className="my-5 border-t border-gray-100" />

          <div className="flex items-center justify-between">
            <div className="h-5 w-28 rounded bg-gray-100" />
            <div className="h-4 w-20 rounded bg-gray-100" />
          </div>

          {/* 공휴일 카드 그리드 */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-100 bg-gray-50 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-24 rounded bg-gray-100" />
                    <div className="h-3.5 w-16 rounded bg-gray-100" />
                  </div>
                  <div className="h-6 w-16 rounded-full bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 카드 2: 회신 이력 */}
        <section className="mt-4 bg-white rounded-2xl shadow-sm px-5 py-5 md:px-7 md:py-6">
          <div className="h-5 w-24 rounded bg-gray-100" />
          <div className="mt-2 h-4 w-72 rounded bg-gray-100" />
          <div className="mt-5 flex flex-col gap-5">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-gray-200" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="h-6 w-20 rounded-full bg-gray-100" />
                    <div className="h-4 w-28 rounded bg-gray-100" />
                  </div>
                  <div className="mt-1 h-16 w-full rounded-xl bg-gray-50" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
