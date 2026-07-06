import dayjs from "@/lib/dayjs";
import Script from "next/script";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import {
  getReportFromDB,
  getReportsByCompanyFromDB,
  getCompanySettings,
  getCategoryColorsFromDB,
  resolveCompanyParam,
} from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { logoutAdmin } from "@/lib/admin-actions";
import PasswordGate from "@/components/PasswordGate";
import ScrollNav from "@/components/ScrollNav";
import { getTotalAmount } from "@/lib/mockData";
import { DEFAULT_COLORS } from "@/lib/categoryColors";
import MonthCompareChart from "@/components/MonthCompareChart";
import CategoryDonutChart from "@/components/CategoryDonutChart";
import MonthlyTrendChart from "@/components/MonthlyTrendChart";
import CategoryTable from "@/components/CategoryTable";
import ValidityTable from "@/components/ValidityTable";
import ContractTable from "@/components/ContractTable";
import Image from "next/image";
import CopyLinkButton from "@/components/CopyLinkButton";
import AdBanner from "./AdBanner";
import { getNaverAdCosts } from "@/lib/naverAd";
import ExternalBalances, {
  ExternalBalancesSkeleton,
} from "./ExternalBalances";

interface ReportPageProps {
  params: Promise<{ company: string; month: string }>;
  searchParams: Promise<{ auth_error?: string }>;
}

export default async function ReportPage({
  params,
  searchParams,
}: ReportPageProps) {
  const { company, month } = await params;
  const { auth_error } = await searchParams;
  const decoded = await resolveCompanyParam(company);

  const [report, allReports, admin, settings, dbColors] = await Promise.all([
    getReportFromDB(decoded, month),
    getReportsByCompanyFromDB(decoded),
    isAdmin(),
    getCompanySettings(decoded),
    getCategoryColorsFromDB(),
  ]);
  const colorMap = { ...DEFAULT_COLORS, ...dbColors };

  const hasNaverSettings = !!settings?.naver_ad_api_key;
  const naverCreds = hasNaverSettings
    ? {
        apiKey: settings!.naver_ad_api_key,
        secretKey: settings!.naver_ad_secret_key,
        customerId: settings!.naver_ad_customer_id,
      }
    : null;
  const hasDableSettings = !!(
    settings?.dable_account && settings?.dable_api_key
  );
  const year = month.slice(0, 4);
  const yearReports = allReports.filter((r) => r.month.startsWith(year));
  const currentMonthStr = dayjs().format("YYYY-MM");

  // 네이버 비용은 차트·총광고비에 얽혀 있어 본문과 함께 렌더한다(값 점프 방지).
  // 과거 달은 값이 변하지 않으므로 회사+월 단위로 캐싱(과거 1일 / 현재달 10분)해 재방문 속도 개선.
  // 비즈머니·데이블 잔액은 본문과 무관한 표시 위젯이라 <ExternalBalances/> 로 분리해 스트리밍한다.
  const cachedNaverCosts = (m: string) =>
    naverCreds
      ? unstable_cache(
          () => getNaverAdCosts(m, settings!),
          ["naver-costs", decoded, m],
          { revalidate: m >= currentMonthStr ? 600 : 86400 },
        )().catch(() => null)
      : Promise.resolve(null);

  const [naverAdCosts, ...yearNaverCostResults] = await Promise.all([
    cachedNaverCosts(month),
    ...yearReports.map((r) =>
      r.month !== month ? cachedNaverCosts(r.month) : Promise.resolve(null),
    ),
  ]);

  // 연도 내 달별 네이버 비용 맵 (현재 달 포함)
  const naverCostByMonth: Record<
    string,
    { powerlink: number; place: number; powerContents: number }
  > = {};
  if (naverAdCosts) naverCostByMonth[month] = naverAdCosts;
  yearReports.forEach((r, i) => {
    if (r.month !== month && yearNaverCostResults[i]) {
      naverCostByMonth[r.month] = yearNaverCostResults[i]!;
    }
  });

  if (!report) notFound();

  // 탈퇴한 병원의 보고서는 링크로 직접 접근해도 공개하지 않는다(관리자만 열람 가능).
  // 유형은 회사 단위(company_settings) 우선, 없으면 보고서(reports.hospital_type) 기준.
  const hospitalType =
    (settings?.hospital_type as string | null | undefined) ??
    report.hospital_type ??
    null;
  if (hospitalType === "탈퇴" && !admin) notFound();

  if (report.password) {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(`report_auth_${report.id}`);
    if (authCookie?.value !== report.password) {
      return (
        <PasswordGate
          reportId={report.id}
          company={company}
          month={month}
          error={!!auth_error}
        />
      );
    }
  }

  const categories = report.categories;
  const total = getTotalAmount(categories, month);
  const uniqueAgencies = new Set(
    categories.map((c: { agency: string }) => c.agency),
  ).size;

  // 전월 비교
  const prevMonthStr = dayjs(month, "YYYY-MM")
    .subtract(1, "month")
    .format("YYYY-MM");
  const prevReport = allReports.find((r) => r.month === prevMonthStr) ?? null;
  const prevNaverCosts = naverCostByMonth[prevMonthStr] ?? null;
  const prevNaverExtra = prevNaverCosts
    ? [
        {
          category: "검색광고",
          channel: "네이버 파워링크",
          agency: "NAVER",
          amount: prevNaverCosts.powerlink,
        },
        {
          category: "검색광고",
          channel: "네이버 플레이스",
          agency: "NAVER",
          amount: prevNaverCosts.place,
        },
        {
          category: "검색광고",
          channel: "네이버 파워컨텐츠",
          agency: "NAVER",
          amount: prevNaverCosts.powerContents,
        },
      ]
    : [];
  const prevCategories = [...(prevReport?.categories ?? []), ...prevNaverExtra];
  const prevTotal =
    prevCategories.length > 0
      ? getTotalAmount(prevCategories, prevMonthStr)
      : 0;

  // 네이버 API 실적 가상 카테고리 항목 (현재 달)
  const naverExtra = naverAdCosts
    ? [
        {
          category: "검색광고",
          channel: "네이버 파워링크",
          agency: "NAVER",
          amount: naverAdCosts.powerlink,
        },
        {
          category: "검색광고",
          channel: "네이버 플레이스",
          agency: "NAVER",
          amount: naverAdCosts.place,
        },
        {
          category: "검색광고",
          channel: "네이버 파워컨텐츠",
          agency: "NAVER",
          amount: naverAdCosts.powerContents,
        },
      ]
    : [];
  const categoriesWithNaver = [...categories, ...naverExtra];
  const totalWithNaver = getTotalAmount(categoriesWithNaver, month);
  const chartData = yearReports
    .map((r) => {
      const costs = naverCostByMonth[r.month];
      const extra = costs
        ? [
            {
              category: "검색광고",
              channel: "네이버 파워링크",
              agency: "NAVER",
              amount: costs.powerlink,
            },
            {
              category: "검색광고",
              channel: "네이버 플레이스",
              agency: "NAVER",
              amount: costs.place,
            },
            {
              category: "검색광고",
              channel: "네이버 파워컨텐츠",
              agency: "NAVER",
              amount: costs.powerContents,
            },
          ]
        : [];
      const cats = [...r.categories, ...extra];
      return {
        month: r.month.slice(5),
        payment: getTotalAmount(cats, r.month),
        categories: cats,
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
  const currentMonthNum = month.slice(5);

  return (
    <div className="min-h-screen bg-[#F0F4FA]">
      <div className="mx-auto flex w-full max-w-[800px] justify-center gap-6 lg:gap-10">
        {/* 왼쪽 광고 배너 (데스크탑 전용) — 위/아래 2개 */}
        <aside className="hidden lg:block w-[240px] shrink-0 py-6">
          <div className="sticky top-20 flex flex-col gap-3">
            {/* 위 배너 */}
            <AdBanner
              src="/images/report_ad_banner01.png"
              width={1024}
              height={1536}
              alt="광고 배너 1"
            />
            {/* 아래 배너 — 메디로드 */}
            <AdBanner
              src="/images/report_ad_banner02.png"
              width={1004}
              height={1567}
              alt="메디로드 광고 배너"
              href="https://mediroad.io"
            />
          </div>
        </aside>

        {/* 보고서 상세 */}
        <div className="w-full max-w-[420px] bg-[#F0F4FA] shadow-xl">
          <ScrollNav />
          <div className="flex justify-center overflow-hidden">
            <Image
              src="/images/test_ct_05.png"
              width={500}
              height={500}
              alt="모두보고 캐릭터 아이콘"
              priority
              className="w-full max-w-[500px] h-auto"
            />
          </div>

          {/* 헤더 */}
          <header className="-mt-[30px] bg-[#0e299c] text-white px-6 pt-10 pb-10">
            <p className="text-sm text-blue-300 mb-3">
              {dayjs().format("YYYY.MM.DD (ddd)")} · 광고 운영보고
            </p>
            <h1 className="text-4xl font-bold leading-tight mb-1">
              {decoded}
              <span className="inline-block w-2.5 h-2.5 bg-red-500 rounded-full ml-2 mb-1" />
            </h1>
            <p className="text-sm text-blue-200 leading-relaxed">
              이번 달 진행 중인 광고 항목과
              <br />
              매체 운영 현황을 정리한 보고서예요.
            </p>
            {admin && (
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/report/${company}`}
                  className="text-xs text-blue-300 bg-white/10 px-3 py-1.5 rounded-lg"
                >
                  ← 목록
                </Link>
                <Link
                  href={`/report/${company}/${month}/edit`}
                  className="text-xs text-white bg-white/20 px-3 py-1.5 rounded-lg"
                >
                  수정
                </Link>
                <form action={logoutAdmin}>
                  <button
                    type="submit"
                    className="text-xs text-blue-300 bg-white/10 px-3 py-1.5 rounded-lg"
                  >
                    로그아웃
                  </button>
                </form>
              </div>
            )}
            <div className="mt-5 pt-5 border-t border-white/10 flex items-center justify-between"></div>
            <div className="flex items-center gap-3 flex-wrap">
              {admin && <CopyLinkButton />}
              <a
                href="tel:01087821285"
                className="flex items-center gap-1.5 text-xs text-blue-200 bg-white/10 px-3 py-1.5 rounded-lg"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.62 5.1 2 2 0 0 1 3.6 2.87h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.5a16 16 0 0 0 6 6l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                010.8782.1285
              </a>
              <a
                href="http://pf.kakao.com/_UaWgn"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-200 bg-white/10 px-3 py-1.5 rounded-lg"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.533 1.523 4.77 3.85 6.106l-.977 3.546a.375.375 0 0 0 .548.415L9.5 18.35c.817.128 1.659.15 2.5.15 5.523 0 10-3.477 10-7.5S17.523 3 12 3z" />
                </svg>
                카카오톡
              </a>
              <a
                href="https://announcego.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-200 bg-white/10 px-3 py-1.5 rounded-lg"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                홈페이지
              </a>
            </div>
          </header>

          <div className="px-4 py-6 flex flex-col gap-5 bg-[#F0F4FA] -mt-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-1">
              {/* 날짜 */}
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {dayjs(month).format("YYYY.MM")}월
              </div>

              {(hasNaverSettings || hasDableSettings) && (
                <Suspense fallback={<ExternalBalancesSkeleton />}>
                  <ExternalBalances settings={settings} month={month} />
                </Suspense>
              )}

              {/* 총 광고비 + 외주업체 */}
              <div className="flex items-stretch">
                <div className="flex-1 flex flex-col gap-1">
                  <p className="text-xs text-gray-400">총 광고비</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalWithNaver.toLocaleString()}
                    <span className="text-base font-normal text-gray-500 ml-1">
                      원
                    </span>
                  </p>
                </div>
                <div className="w-px bg-gray-100 mx-4" />
                <div className="flex items-center justify-between flex-1">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      외주업체
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {uniqueAgencies}
                      <span className="text-base font-normal text-gray-500 ml-1">
                        곳
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 안내 문구 */}
              <div className="mt-3 flex items-start gap-1.5 bg-gray-50 rounded-xl px-3 py-2.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 flex-shrink-0"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-xs text-gray-400 leading-relaxed">
                  해당 금액은 전체 외주업체의 광고비 합계입니다.
                </p>
              </div>
            </div>

            {/* 만료 임박 계약 */}
            {(() => {
              const today = dayjs();
              const expiring = report.validity
                .filter(
                  (v: {
                    expiryDate: string;
                    subject: string;
                    category: string;
                  }) => v.expiryDate,
                )
                .map(
                  (v: {
                    expiryDate: string;
                    subject: string;
                    category: string;
                  }) => ({
                    ...v,
                    daysLeft: dayjs(v.expiryDate).diff(today, "day"),
                  }),
                )
                .filter(
                  (v: { daysLeft: number }) =>
                    v.daysLeft >= 0 && v.daysLeft <= 60,
                )
                .sort(
                  (a: { daysLeft: number }, b: { daysLeft: number }) =>
                    a.daysLeft - b.daysLeft,
                );

              if (expiring.length === 0) return null;
              return (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-orange-100 bg-orange-50">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span className="text-sm font-bold text-orange-500">
                      만료 임박 계약 ({expiring.length}건)
                    </span>
                  </div>
                  <p className="text-[13px] text-[#6b7684] px-4 py-2.5 border-b border-gray-50">
                    곧 만료되는 계약을 확인해보세요.
                  </p>
                  <div className="divide-y divide-gray-50">
                    {expiring.map(
                      (
                        item: {
                          subject: string;
                          category: string;
                          daysLeft: number;
                        },
                        idx: number,
                      ) => {
                        const badgeColor =
                          item.daysLeft <= 14
                            ? "bg-red-50 text-red-500"
                            : item.daysLeft <= 30
                              ? "bg-orange-50 text-orange-500"
                              : "bg-amber-50 text-amber-600";
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-semibold text-gray-800">
                                {item.subject}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {item.category}
                              </p>
                            </div>
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-full ${badgeColor}`}
                            >
                              D-{item.daysLeft}
                            </span>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 월별 광고 집행 현황 */}
            <MonthlyTrendChart
              data={chartData}
              currentMonth={currentMonthNum}
            />

            {/* 전월 대비 광고 비교 */}
            <MonthCompareChart
              currentMonth={month}
              prevMonth={prevMonthStr}
              currentCategories={categoriesWithNaver}
              prevCategories={prevCategories}
              currentTotal={totalWithNaver}
              prevTotal={prevTotal}
            />

            {/* 카테고리별 분포 */}
            <CategoryDonutChart
              categories={categoriesWithNaver}
              total={totalWithNaver}
            />

            {/* 매체별 운영 현황 */}
            <CategoryTable
              categories={categories}
              total={total}
              naverAdCosts={naverAdCosts}
              reportMonth={month}
              colorMap={colorMap}
            />

            {/* 광고 계약·리포트 현황 */}
            <ContractTable contracts={report.contracts} colorMap={colorMap} />

            {/* 광고 심의 및 운영 현황 */}
            <ValidityTable validity={report.validity} colorMap={colorMap} />
          </div>

          <Script id="channeltalk" strategy="afterInteractive">{`
        (function(){var w=window;if(w.ChannelIO){return w.console.error("ChannelIO script included twice.");}var ch=function(){ch.c(arguments);};ch.q=[];ch.c=function(args){ch.q.push(args);};w.ChannelIO=ch;function l(){if(w.ChannelIOInitialized){return;}w.ChannelIOInitialized=true;var s=document.createElement("script");s.type="text/javascript";s.async=true;s.src="https://cdn.channel.io/plugin/ch-plugin-web.js";var x=document.getElementsByTagName("script")[0];if(x.parentNode){x.parentNode.insertBefore(s,x);}}if(document.readyState==="complete"){l();}else{w.addEventListener("DOMContentLoaded",l);w.addEventListener("load",l);}})();
        ChannelIO('boot', { pluginKey: '${process.env.NEXT_PUBLIC_CHANNELTALK_PLUGIN_KEY}' });
      `}</Script>
        </div>
      </div>
    </div>
  );
}
