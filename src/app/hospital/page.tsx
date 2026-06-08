import { Suspense } from "react";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { HospitalList } from "@/app/hospital/_components/HospitalList";
import { getQueryClient } from "@/hooks/get-query-client";
import { hospitalsQuery } from "@/lib/queries";
import { ListSkeleton } from "@/components/ListSkeleton";

export default async function HospitalListPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(hospitalsQuery());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <HospitalList />
      </Suspense>
    </HydrationBoundary>
  );
}
