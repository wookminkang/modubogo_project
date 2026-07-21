import Link from "next/link";

// 공개 뷰의 날짜 이동. 관리자 화면과 달리 점검한 날짜들 사이만 오간다
// (점검 안 한 빈 날짜를 광고주에게 보여줄 이유가 없다).
export default function ViewDateNav({
  targetId,
  date,
  runDates,
}: {
  targetId: string;
  /** 지금 보고 있는 점검일. */
  date: string;
  /** 점검 기록이 있는 날짜들 (최신순). */
  runDates: string[];
}) {
  const idx = runDates.indexOf(date);
  // runDates 는 최신순이라 "이전 점검일"은 인덱스가 큰 쪽이다.
  const older = idx >= 0 && idx < runDates.length - 1 ? runDates[idx + 1] : null;
  const newer = idx > 0 ? runDates[idx - 1] : null;

  const base = `/geo-report/${targetId}`;

  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
      {older ? (
        <Link
          href={`${base}?date=${older}`}
          className="text-sm font-semibold text-[#6b7684] transition-colors hover:text-[#0e299c]"
        >
          ← {older}
        </Link>
      ) : (
        <span className="text-sm text-gray-300">← 이전 없음</span>
      )}

      <span className="text-[15px] font-bold text-[#333d4b]">
        {date}
        <span className="ml-2 text-xs font-normal text-[#6b7684]">
          점검일 {runDates.length}건 중 {idx + 1}번째
        </span>
      </span>

      {newer ? (
        <Link
          href={`${base}?date=${newer}`}
          className="text-sm font-semibold text-[#6b7684] transition-colors hover:text-[#0e299c]"
        >
          {newer} →
        </Link>
      ) : (
        <span className="text-sm text-gray-300">최신 →</span>
      )}
    </div>
  );
}
