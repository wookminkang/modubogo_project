import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { HospitalList } from "@/app/hospital/_components/HospitalList";
import { getQueryClient } from "@/hooks/get-query-client";
import { hospitalsInfiniteQuery } from "@/lib/queries";
import { ListSkeleton } from "@/components/ListSkeleton";
import { ListHeader } from "seed-design/ui/list-header";
import { ActionButton } from "seed-design/ui/action-button";

export default async function HospitalListPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchInfiniteQuery(hospitalsInfiniteQuery());

  // 컨테이너·푸터는 hospital/layout.tsx 가 담당한다. 여기는 페이지 고유 헤더+본문만.
  return (
    <>
      {/* 헤더 영역 */}
      <header className="border-b border-gray-100 px-3 pt-4 pb-2">
        <div className="flex items-center justify-between gap-2 pr-3">
          <ListHeader as="h1">병원 목록</ListHeader>
          <ActionButton asChild variant="brandSolid" size="small">
            <Link href="/hospital/new">
              <Plus size={15} className="-ml-0.5 mr-0.5" />새 병원
            </Link>
          </ActionButton>
        </div>
        <p className="px-3 pb-1 text-sm text-gray-500">
          등록된 병원을 확인하고 상세 보고서로 이동하세요.
        </p>
      </header>

      {/* 본문 (목록) */}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<ListSkeleton rows={6} />}>
          <HospitalList />
        </Suspense>
      </HydrationBoundary>
    </>
  );
}
