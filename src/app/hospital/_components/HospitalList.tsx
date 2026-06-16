"use client";

import { Fragment, useEffect, useRef } from "react";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { hospitalsInfiniteQuery } from "@/lib/queries";
import { List, ListLinkItem, ListDivider } from "seed-design/ui/list";
import { ActionButton } from "seed-design/ui/action-button";
import { Badge } from "seed-design/ui/badge";
import { ContentPlaceholder } from "seed-design/ui/content-placeholder";

export function HospitalList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(hospitalsInfiniteQuery());

  // 페이지들을 평탄화해 하나의 병원 목록으로 합친다.
  const hospitals = data.pages.flatMap((page) => page.items);

  // 목록 끝 센티넬이 보이면 자동으로 다음 페이지를 불러온다.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div>
      <List>
        {hospitals.map(({ company, region }, index) => (
          <Fragment key={company}>
            {index > 0 && <ListDivider />}
            <ListLinkItem
              href={`/hospital/${encodeURIComponent(company)}`}
              title={company}
              className="px-0"
              prefix={
                // 병원 이미지가 아직 없어 빈 썸네일(placeholder)로 자리만 채운다.
                <ContentPlaceholder
                  aria-hidden
                  className="rounded-lg overflow-hidden"
                  style={{ width: 48, height: 48 }}
                >
                  <Building2 className="h-5 w-5 text-gray-300" />
                </ContentPlaceholder>
              }
              suffix={
                region ? (
                  <Badge tone="brand" variant="solid" size="medium">
                    {region}
                  </Badge>
                ) : (
                  <Badge tone="neutral" variant="solid" size="medium">
                    지역 미설정
                  </Badge>
                )
              }
            />
          </Fragment>
        ))}
      </List>

      {/* 무한 스크롤 트리거 + 수동 더 보기 버튼 */}
      {hasNextPage ? (
        <div ref={sentinelRef} className="flex justify-center py-4">
          <ActionButton
            variant="neutralWeak"
            size="medium"
            loading={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            더 보기
          </ActionButton>
        </div>
      ) : (
        // 마지막 페이지: 전체 개수 요약(목록 푸터)
        <p className="py-4 text-center text-xs text-gray-400">
          모든 병원을 불러왔어요 · 총 {hospitals.length}개
        </p>
      )}
    </div>
  );
}
