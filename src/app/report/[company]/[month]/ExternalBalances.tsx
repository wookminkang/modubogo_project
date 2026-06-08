import { getBizmoney } from "@/lib/naverAd";
import { getDableReport, getDableMonthlySpend } from "@/lib/dableAd";

interface Settings {
  naver_ad_api_key?: string;
  naver_ad_secret_key?: string;
  naver_ad_customer_id?: string;
  dable_account?: string;
  dable_api_key?: string;
}

/**
 * 비즈머니 잔액 + 데이블 잔액/소진 카드.
 * 외부 API(네이버 빌링·데이블)가 느려서 보고서 본문 렌더를 막지 않도록
 * 독립 Suspense island 로 떼어내 스트리밍한다. 차트/총광고비와 무관한 표시 위젯.
 */
export default async function ExternalBalances({
  settings,
  month,
}: {
  settings: Settings;
  month: string;
}) {
  const hasNaver = !!settings?.naver_ad_api_key;
  const hasDable = !!(settings?.dable_account && settings?.dable_api_key);
  const naverCreds = hasNaver
    ? {
        apiKey: settings.naver_ad_api_key!,
        secretKey: settings.naver_ad_secret_key!,
        customerId: settings.naver_ad_customer_id!,
      }
    : null;

  const [bizmoney, dableReport, dableMonthlySpend] = await Promise.all([
    naverCreds ? getBizmoney(naverCreds).catch(() => null) : Promise.resolve(null),
    hasDable
      ? getDableReport(settings.dable_account!, settings.dable_api_key!).catch(
          () => null,
        )
      : Promise.resolve(null),
    hasDable
      ? getDableMonthlySpend(
          settings.dable_account!,
          settings.dable_api_key!,
          month,
        ).catch(() => null)
      : Promise.resolve(null),
  ]);

  if (bizmoney === null && dableReport === null && dableMonthlySpend === null) {
    return null;
  }

  return (
    <>
      {/* 비즈머니 잔액 */}
      {bizmoney !== null && (
        <div className="flex items-center justify-between bg-[#03C75A]/10 rounded-xl px-3 py-2.5 mb-2">
          <div className="flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="24" height="24" rx="4" fill="#03C75A" />
              <text
                x="12"
                y="17"
                textAnchor="middle"
                fontSize="13"
                fontWeight="bold"
                fill="white"
                fontFamily="sans-serif"
              >
                N
              </text>
            </svg>
            <span className="text-xs font-medium text-[#03C75A]">
              비즈머니 잔액
            </span>
          </div>
          <span className="text-sm font-bold text-[#03C75A]">
            {Math.floor(Number(bizmoney)).toLocaleString()}원
          </span>
        </div>
      )}

      {/* 데이블 광고 잔액 + 오늘/월 소진 */}
      {(dableReport !== null || dableMonthlySpend !== null) && (
        <div className="flex flex-col gap-1.5 mb-4">
          {/* 잔액: rate limit 여부에 따라 분기 */}
          {dableReport !== null &&
            (dableReport.rateLimited ? (
              <div className="flex items-center justify-between bg-[#FF6B35]/10 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect width="24" height="24" rx="4" fill="#FF6B35" />
                    <text
                      x="12"
                      y="17"
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="bold"
                      fill="white"
                      fontFamily="sans-serif"
                    >
                      D
                    </text>
                  </svg>
                  <span className="text-xs font-medium text-[#FF6B35]">
                    데이블 광고 잔액
                  </span>
                </div>
                <span className="text-xs text-[#FF6B35]">10분 후 업데이트</span>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-[#FF6B35]/10 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect width="24" height="24" rx="4" fill="#FF6B35" />
                    <text
                      x="12"
                      y="17"
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="bold"
                      fill="white"
                      fontFamily="sans-serif"
                    >
                      D
                    </text>
                  </svg>
                  <span className="text-xs font-medium text-[#FF6B35]">
                    데이블 광고 잔액
                  </span>
                </div>
                <span className="text-sm font-bold text-[#FF6B35]">
                  {Math.floor(dableReport.balance).toLocaleString()}원
                </span>
              </div>
            ))}
          {/* 오늘/월 소진: daily_report에서 항상 표시 */}
          {dableMonthlySpend !== null && (
            <>
              <div className="flex items-center justify-between bg-[#FF6B35]/10 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect width="24" height="24" rx="4" fill="#FF6B35" />
                    <text
                      x="12"
                      y="17"
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="bold"
                      fill="white"
                      fontFamily="sans-serif"
                    >
                      D
                    </text>
                  </svg>
                  <span className="text-xs font-medium text-[#FF6B35]">
                    데이블 오늘 소진
                  </span>
                </div>
                <span className="text-sm font-bold text-[#FF6B35]">
                  {Math.floor(dableMonthlySpend.today).toLocaleString()}원
                </span>
              </div>
              <div className="flex items-center justify-between bg-[#FF6B35]/10 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect width="24" height="24" rx="4" fill="#FF6B35" />
                    <text
                      x="12"
                      y="17"
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="bold"
                      fill="white"
                      fontFamily="sans-serif"
                    >
                      D
                    </text>
                  </svg>
                  <span className="text-xs font-medium text-[#FF6B35]">
                    데이블 월 소진
                  </span>
                </div>
                <span className="text-sm font-bold text-[#FF6B35]">
                  {Math.floor(dableMonthlySpend.monthly).toLocaleString()}원
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

/** ExternalBalances 스트리밍 대기용 폴백 */
export function ExternalBalancesSkeleton() {
  return (
    <div className="flex flex-col gap-1.5 mb-4 animate-pulse" aria-hidden>
      <div className="h-10 rounded-xl bg-gray-100" />
      <div className="h-10 rounded-xl bg-gray-100" />
    </div>
  );
}
