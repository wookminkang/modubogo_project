import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { HospitalList } from "@/app/hospital/_components/HospitalList";
import { getQueryClient } from "@/hooks/get-query-client";
import { hospitalsInfiniteQuery } from "@/lib/queries";
import { ListSkeleton } from "@/components/ListSkeleton";
import { Text } from "seed-design/ui/text";
import { ActionButton } from "seed-design/ui/action-button";

export default async function HospitalListPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchInfiniteQuery(hospitalsInfiniteQuery());

  // 컨테이너·푸터는 hospital/layout.tsx 가 담당한다. 여기는 페이지 고유 헤더+본문만.
  return (
    <>
      {/* 헤더 영역 */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="flex min-w-0 flex-col gap-1">
          <Text as="h1" textStyle="t4Bold">
            병원 목록
          </Text>
          <Text as="p" textStyle="t6Regular" color="fg.neutralSubtle">
            등록된 병원을 확인하고 상세 보고서로 이동하세요.
          </Text>
        </div>
        <ActionButton
          asChild
          variant="brandSolid"
          size="small"
          className="shrink-0"
        >
          <Link href="/hospital/new">
            <Plus size={15} className="-ml-0.5 mr-0.5" />새 병원
          </Link>
        </ActionButton>
      </div>

      {/* 본문 (목록) */}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<ListSkeleton rows={6} />}>
          <HospitalList />
        </Suspense>
      </HydrationBoundary>
    </>
  );
}
