import Link from "next/link";
import { getReportsByCompanyFromDB, getCompanySettings } from "@/lib/db";
import { getTotalAmount } from "@/lib/mockData";
import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import DeleteReportButton from "@/components/DeleteReportButton";
import KakaoNotifyButton from "@/components/KakaoNotifyButton";
import NaverAdSettingsButton from "@/components/NaverAdSettingsButton";
import AlimtalkSettingsButton from "@/components/AlimtalkSettingsButton";
import { getNaverAdCosts } from "@/lib/naverAd";

interface CompanyReportListPageProps {
  params: Promise<{ company: string }>;
}

export default async function CompanyReportListPage({
  params,
}: CompanyReportListPageProps) {
  const { company } = await params;

  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const decoded = decodeURIComponent(company);
  const [reports, settings] = await Promise.all([
    getReportsByCompanyFromDB(decoded),
    getCompanySettings(decoded),
  ]);

  if (reports.length === 0) notFound();

  // 네이버 API 설정이 있으면 각 월의 비용을 병렬로 가져옴
  const naverCostMap: Record<string, number> = {};
  if (settings?.naver_ad_api_key) {
    const results = await Promise.all(
      reports.map((r) =>
        getNaverAdCosts(r.month, settings).catch(() => null)
      )
    );
    for (let i = 0; i < reports.length; i++) {
      const costs = results[i];
      if (costs) {
        naverCostMap[reports[i].month] =
          costs.powerlink + costs.place + costs.powerContents;
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F4FA]">
      <div className="px-4 py-6 flex flex-col gap-4">
        <div>
          <Link href="/report" className="text-sm text-gray-400 mb-1 block">
            ← 전체 목록
          </Link>
          <h1 className="text-2xl font-bold text-[#0e299c] mb-3">{decoded}</h1>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <AlimtalkSettingsButton company={decoded} defaultValues={settings ?? {}} />
              </div>
              <div className="flex-1">
                <NaverAdSettingsButton company={decoded} defaultValues={settings ?? {}} />
              </div>
            </div>
            <Link
              href="/report/new"
              className="w-full text-center bg-[#0e299c] text-white text-sm font-medium px-4 py-2.5 rounded-xl"
            >
              + 새 보고서
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {reports.map((report) => {
            const total = getTotalAmount(report.categories) + (naverCostMap[report.month] ?? 0);
            return (
              <div
                key={report.id}
                className="bg-white rounded-2xl shadow-sm flex items-center"
              >
                <Link
                  href={`/report/${encodeURIComponent(decoded)}/${report.month}`}
                  className="flex-1 flex items-center justify-between px-5 py-5"
                >
                  <div>
                    <p className="font-bold text-base text-gray-900">
                      {report.month}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      ₩{total.toLocaleString()} · {report.categories.length}건
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-2 pr-3">
                  <KakaoNotifyButton
                    company={decoded}
                    month={report.month}
                    recipients={[settings?.recipient1, settings?.recipient2, settings?.recipient3].filter(Boolean) as string[]}
                  />
                  <DeleteReportButton
                    reportId={report.id}
                    month={report.month}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
