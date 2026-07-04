import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getAdminUser } from "@/lib/admin";
import { getQueryClient } from "@/hooks/get-query-client";
import { hospitalsInfiniteQuery } from "@/lib/queries";
import { ListSkeleton } from "@/components/ListSkeleton";
import LedgerCompanyList from "./LedgerCompanyList";

export const dynamic = "force-dynamic";

export default async function LedgerHubPage() {
  const me = await getAdminUser();
  if (!me) redirect("/admin/login");

  const queryClient = getQueryClient();
  await queryClient.prefetchInfiniteQuery(hospitalsInfiniteQuery());

  return (
    <div className="flex-1 overflow-x-clip bg-[#F0F4FA] py-6 px-4">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-1 flex items-center gap-2">
          <Wallet size={22} className="text-[#0e299c]" />
          <h1 className="text-2xl font-bold text-gray-900">입금·소진 관리내역</h1>
        </div>
        <p className="mb-5 text-sm text-gray-500">
          병원을 선택하면 입금·소진 관리내역(구글시트 스타일)을 볼 수 있어요.
        </p>

        <HydrationBoundary state={dehydrate(queryClient)}>
          <Suspense fallback={<ListSkeleton rows={6} />}>
            <LedgerCompanyList />
          </Suspense>
        </HydrationBoundary>
      </div>
    </div>
  );
}
