import { Suspense } from "react";
import { redirect } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { isAdmin } from "@/lib/admin";
import { getQueryClient } from "@/hooks/get-query-client";
import { alimtalkLogsQuery } from "@/lib/queries";
import { CardSkeleton } from "@/components/ListSkeleton";
import AlimtalkLogsView from "./AlimtalkLogsView";

export const dynamic = "force-dynamic";

export default async function AlimtalkLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const { status } = await searchParams;
  const activeTab = status === "failed" ? "failed" : "success";

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(alimtalkLogsQuery());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#F0F4FA] px-4 py-6">
            <CardSkeleton cards={5} />
          </div>
        }
      >
        <AlimtalkLogsView activeTab={activeTab} />
      </Suspense>
    </HydrationBoundary>
  );
}
