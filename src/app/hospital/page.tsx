import { Suspense } from "react";
import {
  QueryClient,
  HydrationBoundary,
  dehydrate,
} from "@tanstack/react-query";
import { getHospitalList } from "@/lib/db";
import { HospitalList } from "@/app/hospital/_components/HospitalList";

export default async function HospitalListPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["hospitalList"],
    queryFn: getHospitalList,
  });

  return (
    <>
      <Suspense
        fallback={
          <p className="text-blue-500 mt-4">주방에서 요리를 준비 중입니다</p>
        }
      >
        <HydrationBoundary state={dehydrate(queryClient)}>
          <HospitalList />
        </HydrationBoundary>
      </Suspense>
    </>
  );
}
