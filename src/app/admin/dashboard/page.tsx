import { Suspense } from "react";
import { redirect } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getAdminUser } from "@/lib/admin";
import { getQueryClient } from "@/hooks/get-query-client";
import { dashboardRawQuery } from "@/lib/queries";
import { CardSkeleton } from "@/components/ListSkeleton";
import DashboardView from "./DashboardView";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const me = await getAdminUser();
  if (!me) redirect("/admin/login");

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { month: qMonth } = await searchParams;
  const currentMonth =
    qMonth && /^\d{4}-\d{2}$/.test(qMonth) ? qMonth : defaultMonth;

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(dashboardRawQuery());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#F0F4FA] px-4 py-6">
            <CardSkeleton cards={4} />
          </div>
        }
      >
        <DashboardView
          currentMonth={currentMonth}
          nowMs={now.getTime()}
          isSuper={me.role === "super"}
        />
      </Suspense>
    </HydrationBoundary>
  );
}
