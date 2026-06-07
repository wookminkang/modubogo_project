import Link from "next/link";
import Image from "next/image";
import { unstable_cache } from "next/cache";
import dayjs from "@/lib/dayjs";
import {
  getReportsByCompanyFromDB,
  getCompanySettings,
  getAlimtalkCountsByMonth,
} from "@/lib/db";
import { getTotalAmount } from "@/lib/mockData";
import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import DeleteReportButton from "@/components/DeleteReportButton";
import KakaoNotifyButton from "@/components/KakaoNotifyButton";
import NaverAdSettingsButton from "@/components/NaverAdSettingsButton";
import AlimtalkSettingsButton from "@/components/AlimtalkSettingsButton";
import DableSettingsButton from "@/components/DableSettingsButton";
import { getNaverAdCosts } from "@/lib/naverAd";

/**
 * 회사 상세: 왼쪽 정보 패널(상호명/썸네일/지역/설정/새 보고서) + 오른쪽 월별 보고서 리스트.
 * [company]/page.tsx 에서 사용한다. company 는 이미 디코딩된 상호명을 받는다.
 */
export default async function CompanyReports({ company }: { company: string }) {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const [reports, settings, alimtalkCounts] = await Promise.all([
    getReportsByCompanyFromDB(company),
    getCompanySettings(company),
    getAlimtalkCountsByMonth(company),
  ]);

  if (reports.length === 0) notFound();

  // 네이버 API 설정이 있으면 각 월의 비용을 병렬로 가져옴.
  // 과거 달은 값이 변하지 않으므로 회사+월 단위로 캐싱(과거 1일 / 현재달 10분)해 렌더 속도 개선.
  const naverCostMap: Record<string, number> = {};
  if (settings?.naver_ad_api_key) {
    const currentMonth = dayjs().format("YYYY-MM");
    const results = await Promise.all(
      reports.map((r) =>
        unstable_cache(() => getNaverAdCosts(r.month, settings), ["naver-costs", company, r.month], {
          revalidate: r.month >= currentMonth ? 600 : 86400,
        })().catch(() => null),
      ),
    );
    for (let i = 0; i < reports.length; i++) {
      const costs = results[i];
      if (costs) {
        naverCostMap[reports[i].month] =
          costs.powerlink + costs.place + costs.powerContents;
      }
    }
  }

  const region = settings?.region as string | undefined;
  const latestMonth = reports.reduce(
    (acc, r) => (r.month > acc ? r.month : acc),
    reports[0].month,
  );

  return (
    <div className="flex flex-col gap-6 md:flex-row md:gap-10">
      {/* 왼쪽: 회사 정보 패널 */}
      <aside className="w-full md:w-80 md:shrink-0 flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-[#0e299c] break-keep">
          {company}
        </h1>

        {/* 썸네일 */}
        <div className="w-full overflow-hidden rounded-2xl bg-[#F0F4FA] relative">
          <Image
            src="/images/default_hospital.jpg"
            alt={company}
            width={400}
            height={250}
            className="w-full h-auto"
          />

          {/* 지역 + 통계 */}
          <div className="flex flex-col gap-1.5 absolute bottom-3 left-3">
            <span className="self-start text-xs font-medium bg-[#0e299c]/90 text-white px-2.5 py-1 rounded-md">
              {region}
            </span>

            <p className="text-sm text-gray-600 font-medium">
              최근 {dayjs(latestMonth).format("YYYY.M")} | 총{" "}
              <strong className="text-gray-600">{reports.length}</strong>건
            </p>
          </div>
        </div>

        <Link
          href="/report/new"
          className="w-full text-center bg-[#0e299c] text-white text-sm font-semibold px-4 py-3 rounded-xl hover:bg-[#0a1f78] transition-colors"
        >
          + 새 보고서
        </Link>

        {/* 설정 버튼 (세로) */}
        <div className="flex flex-col gap-2">
          <AlimtalkSettingsButton
            company={company}
            defaultValues={settings ?? {}}
          />
          <NaverAdSettingsButton
            company={company}
            defaultValues={settings ?? {}}
          />
          <DableSettingsButton
            company={company}
            defaultValues={settings ?? {}}
          />
        </div>
      </aside>

      {/* 오른쪽: 월별 보고서 리스트 */}
      <main className="flex-1 min-w-0 md:border-l md:border-gray-100 md:pl-10">
        <ul className="flex flex-col">
          {reports.map((report) => {
            const total =
              getTotalAmount(report.categories) +
              (naverCostMap[report.month] ?? 0);
            return (
              <li
                key={report.id}
                className="flex items-center justify-between gap-3 py-4 border-b border-gray-100"
              >
                <Link
                  href={`/report/${encodeURIComponent(company)}/${report.month}`}
                  className="flex-1 min-w-0"
                >
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-bold text-gray-900">
                      {dayjs(report.month).format("YYYY.MM")}
                    </p>
                    {(alimtalkCounts[report.month] ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#FEE500]/30 px-2 py-0.5 text-xs font-semibold text-[#3C1E1E]">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7L6 21l3.6-1.9c.8.1 1.6.2 2.4.2 5.5 0 10-3.6 10-8s-4.5-8-10-8z" />
                        </svg>
                        알림톡 {alimtalkCounts[report.month]}회
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 flex items-baseline gap-1.5 text-sm font-medium text-gray-500">
                    <span className="text-2xl font-extrabold text-[#0e299c]">
                      ₩{total.toLocaleString()}원
                    </span>
                  </p>
                </Link>
                <div className="flex items-center gap-1 shrink-0">
                  <KakaoNotifyButton
                    company={company}
                    month={report.month}
                    recipients={
                      [
                        settings?.recipient1,
                        settings?.recipient2,
                        settings?.recipient3,
                      ].filter(Boolean) as string[]
                    }
                  />
                  <DeleteReportButton
                    reportId={report.id}
                    month={report.month}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
