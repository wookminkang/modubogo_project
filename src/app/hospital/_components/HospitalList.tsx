"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Building2, Search, ChevronUp, ChevronDown } from "lucide-react";
import { TagGroup } from "@seed-design/react";
import { hospitalsInfiniteQuery } from "@/lib/queries";
import { ActionButton } from "seed-design/ui/action-button";
import { Text } from "seed-design/ui/text";
import { ContentPlaceholder } from "seed-design/ui/content-placeholder";

// 보고서 목록과 동일한 병원 유형 카테고리
const TABS = [
  "전체",
  "메인 관리",
  "한의원",
  "한의원(네트워크)",
  "한의원(입원실)",
  "한방병원",
  "정신과",
  "양방",
  "일반",
  "탈퇴",
] as const;

// 검색어와 일치하는 부분을 강조 표시한다.
function highlightMatch(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-[#0e299c] px-0.5 font-bold text-white">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export function HospitalList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(hospitalsInfiniteQuery());

  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("전체");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // 검색어 디바운스 (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // 페이지들을 평탄화한 뒤 유형 + 검색어로 필터링한다.
  const all = data.pages.flatMap((page) => page.items);
  const hospitals = all.filter((h) => {
    const matchesTab = activeTab === "전체" || h.hospitalType === activeTab;
    const matchesQuery = h.company
      .toLowerCase()
      .includes(debouncedQuery.trim().toLowerCase());
    return matchesTab && matchesQuery;
  });

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
    <>
    <div>
      {/* 검색 */}
      <div className="px-5 pt-4">
        <div className="relative">
          <Search
            size={16}
            className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="병원명으로 검색하세요."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-full bg-[#F0F4FA] py-3 pr-4 pl-11 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-[#0e299c]/30"
          />
        </div>
      </div>

      {/* 유형 카테고리 탭 (가로 스크롤) */}
      <nav className="scrollbar-hide flex gap-2 overflow-x-auto px-5 pt-3 pb-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab
                ? "bg-[#0e299c] text-white"
                : "bg-[#F0F4FA] text-gray-500 hover:bg-[#e7edf6]"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {hospitals.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-400">
          {debouncedQuery.trim()
            ? `'${debouncedQuery.trim()}' 검색 결과가 없어요.`
            : activeTab === "전체"
              ? "등록된 병원이 없어요."
              : `'${activeTab}' 유형의 병원이 없어요.`}
        </p>
      ) : (
        // 모바일 1열 / PC 4열 그리드
        <div className="grid grid-cols-1 gap-4 px-5 pt-2 pb-6 md:grid-cols-4">
          {hospitals.map(({ company, region, hospitalType }) => (
            <Link
              key={company}
              href={`/hospital/${encodeURIComponent(company)}`}
              className="flex flex-col gap-2.5 rounded-2xl border border-[var(--seed-color-stroke-neutral-muted)] p-4 transition-colors hover:bg-[var(--seed-color-bg-neutral-weak)]"
            >
              <div className="flex items-center gap-2.5">
                <ContentPlaceholder
                  aria-hidden
                  className="shrink-0 overflow-hidden rounded-lg"
                  style={{ width: 40, height: 40 }}
                >
                  <Building2 className="h-5 w-5 text-gray-300" />
                </ContentPlaceholder>
                <Text textStyle="t5Bold" className="min-w-0 flex-1 truncate">
                  {highlightMatch(company, debouncedQuery)}
                </Text>
              </div>
              <TagGroup.Root size="t4">
                <TagGroup.Item tone={region ? "neutral" : "neutralSubtle"}>
                  <TagGroup.ItemLabel>
                    {region ?? "지역 미설정"}
                  </TagGroup.ItemLabel>
                </TagGroup.Item>
                {hospitalType && (
                  <TagGroup.Item tone="neutral">
                    <TagGroup.ItemLabel>{hospitalType}</TagGroup.ItemLabel>
                  </TagGroup.Item>
                )}
              </TagGroup.Root>
            </Link>
          ))}
        </div>
      )}

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
          {activeTab === "전체" && !debouncedQuery.trim()
            ? `모든 병원을 불러왔어요 · 총 ${hospitals.length}개`
            : `${hospitals.length}개`}
        </p>
      )}
    </div>

      {/* 맨 위로 / 맨 아래로 플로팅 버튼 */}
      <div className="fixed top-1/2 left-5 z-30 flex -translate-y-1/2 flex-col gap-2">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="맨 위로"
          className="grid h-11 w-11 place-items-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-md transition-colors hover:text-[#0e299c]"
        >
          <ChevronUp size={20} />
        </button>
        <button
          type="button"
          onClick={() =>
            window.scrollTo({
              top: document.documentElement.scrollHeight,
              behavior: "smooth",
            })
          }
          aria-label="맨 아래로"
          className="grid h-11 w-11 place-items-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-md transition-colors hover:text-[#0e299c]"
        >
          <ChevronDown size={20} />
        </button>
      </div>
    </>
  );
}
