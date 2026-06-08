/**
 * Suspense 폴백용 공용 스켈레톤.
 * 목록/카드 로딩 시 레이아웃 시프트를 줄이기 위한 단순 펄스 플레이스홀더.
 */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="flex flex-col animate-pulse" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 py-5 border-b border-gray-100">
          <div className="w-32 h-20 shrink-0 rounded-xl bg-gray-100" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-4 w-1/3 rounded bg-gray-100" />
            <div className="h-3 w-1/4 rounded bg-gray-100" />
            <div className="h-3 w-1/5 rounded bg-gray-100" />
          </div>
          <div className="w-9 h-9 shrink-0 rounded-full bg-gray-100" />
        </li>
      ))}
    </ul>
  );
}

export function CardSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="flex flex-col gap-4 animate-pulse" aria-hidden>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
          <div className="h-4 w-1/4 rounded bg-gray-100" />
          <div className="h-8 w-1/2 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}
