/**
 * 세그먼트 loading.tsx 공용 폴백 (스피너).
 * 서버 컴포넌트 — 네비게이션 시 페이지의 비동기 작업(인증/prefetch) 동안 표시된다.
 */
export default function LoadingState({
  label = "불러오는 중...",
}: {
  label?: string;
}) {
  return (
    <div className="min-h-screen bg-[#F0F4FA] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#0e299c] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">{label}</p>
      </div>
    </div>
  );
}
