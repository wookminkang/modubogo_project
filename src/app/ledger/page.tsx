import { Suspense } from "react";
import { redirect } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getAdminUser } from "@/lib/admin";
import { getLedgerCompanies } from "@/lib/db";
import { getQueryClient } from "@/hooks/get-query-client";
import { hospitalsInfiniteQuery } from "@/lib/queries";
import { ListSkeleton } from "@/components/ListSkeleton";
import Header from "@/components/Header";
import LedgerCompanyList from "./LedgerCompanyList";

export const dynamic = "force-dynamic";

export default async function LedgerHubPage() {
  const me = await getAdminUser();
  if (!me) redirect("/admin/login");

  const queryClient = getQueryClient();
  // 내역이 입력된 병원만 노출하기 위해 ledger 보유 회사 목록을 함께 조회한다.
  const [ledgerCompanies] = await Promise.all([
    getLedgerCompanies(),
    queryClient.prefetchInfiniteQuery(hospitalsInfiniteQuery()),
  ]);

  return (
    <>
      <Header showNav user={{ name: me.name, role: me.role }} />
      <div className="flex-1 overflow-x-clip bg-[#F0F4FA] py-6 px-4">
        <div className="mx-auto max-w-[1200px]">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">입금·소진 관리내역</h1>
        <p className="mb-5 text-sm text-gray-500">
          입금·소진 내역이 설정된 병원만 표시됩니다. 병원을 선택하면 관리내역(구글시트
          스타일)을 볼 수 있어요.
        </p>

          <HydrationBoundary state={dehydrate(queryClient)}>
            <Suspense fallback={<ListSkeleton rows={6} />}>
              <LedgerCompanyList ledgerCompanies={ledgerCompanies} />
            </Suspense>
          </HydrationBoundary>
        </div>
      </div>
    </>
  );
}
