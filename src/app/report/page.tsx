import { Suspense } from "react";
import { redirect } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getAdminUser, canAccessMenu } from "@/lib/admin";
import { getQueryClient } from "@/hooks/get-query-client";
import { companiesSummaryQuery } from "@/lib/queries";
import { ListSkeleton } from "@/components/ListSkeleton";
import CompanyList from "./CompanyList";
import ScrollNav from "@/components/ScrollNav";

export const dynamic = "force-dynamic";

export default async function ReportListPage() {
  const me = await getAdminUser();
  if (!me) redirect("/admin/login");
  if (!canAccessMenu(me, "report")) redirect("/admin/dashboard");

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(companiesSummaryQuery());

  return (
    <>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<ListSkeleton />}>
          <CompanyList />
        </Suspense>
      </HydrationBoundary>
      <ScrollNav />
    </>
  );
}
