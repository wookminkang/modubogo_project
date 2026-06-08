import { unstable_cache } from "next/cache";
import dayjs from "@/lib/dayjs";
import { getNaverAdCosts } from "@/lib/naverAd";

interface NaverSettings {
  naver_ad_api_key: string;
  naver_ad_secret_key: string;
  naver_ad_customer_id: string;
}

/**
 * 월별 보고서 행의 총 광고비 = DB 집행액 + 네이버 실적.
 * 네이버 호출은 느려서 목록 전체를 막지 않도록 행 단위 Suspense 로 스트리밍한다.
 * 과거 달은 값이 변하지 않으므로 회사+월 단위로 캐싱(과거 1일 / 현재달 10분).
 */
export default async function ReportTotal({
  company,
  month,
  dbTotal,
  settings,
}: {
  company: string;
  month: string;
  dbTotal: number;
  settings: NaverSettings;
}) {
  const currentMonth = dayjs().format("YYYY-MM");
  const costs = await unstable_cache(
    () => getNaverAdCosts(month, settings),
    ["naver-costs", company, month],
    { revalidate: month >= currentMonth ? 600 : 86400 },
  )().catch(() => null);

  const naver = costs ? costs.powerlink + costs.place + costs.powerContents : 0;
  const total = dbTotal + naver;

  return (
    <span className="text-2xl font-extrabold text-[#0e299c]">
      ₩{total.toLocaleString()}원
    </span>
  );
}

/** ReportTotal 스트리밍 대기용 폴백 */
export function ReportTotalSkeleton() {
  return (
    <span className="inline-block h-7 w-28 rounded bg-gray-100 animate-pulse align-middle" />
  );
}
