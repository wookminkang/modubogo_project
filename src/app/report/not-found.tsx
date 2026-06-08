import Image from "next/image";
import Link from "next/link";

/**
 * report 영역 전용 404. /report/[company] 또는 [month] 에서 notFound() 호출 시 표시.
 * (루트 not-found.tsx 보다 보고서 맥락에 맞는 안내 + 목록 링크 제공)
 */
export default function ReportNotFound() {
  return (
    <div className="min-h-screen bg-[#F0F4FA] flex flex-col items-center justify-center px-6 text-center">
      <Image
        src="/images/error_page.png"
        width={180}
        height={180}
        alt="보고서를 찾을 수 없음"
        className="mb-6"
      />
      <h1 className="text-2xl font-bold text-gray-900 mb-3">
        보고서를 찾을 수 없어요.
      </h1>
      <p className="text-sm text-gray-400 leading-relaxed mb-8">
        요청하신 보고서가 존재하지 않거나
        <br />
        삭제되었을 수 있어요.
      </p>

      <Link
        href="/report"
        className="bg-[#0e299c] text-white text-sm font-semibold px-6 py-3 rounded-2xl mb-3 hover:bg-[#0b2180] transition-colors"
      >
        보고서 목록으로
      </Link>
      <Link
        href="/"
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
