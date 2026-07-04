"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Search, ChevronRight, Building2 } from "lucide-react";
import { hospitalsInfiniteQuery } from "@/lib/queries";
import { ActionButton } from "seed-design/ui/action-button";

/** 검색어와 일치하는 부분을 강조 표시한다. */
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

export default function LedgerCompanyList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(hospitalsInfiniteQuery());

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // 검색어 디바운스 (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // 로드된 페이지를 평탄화 후 검색어로 필터링 (병원 목록과 동일 패턴)
  const all = data.pages.flatMap((page) => page.items);
  const companies = all.filter((h) =>
    h.company.toLowerCase().includes(debouncedQuery.trim().toLowerCase()),
  );

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
      {/* 검색 */}
      <div className="relative mb-5">
        <Search
          size={16}
          className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="병원명으로 검색하세요."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-full bg-white py-3 pr-4 pl-11 text-sm text-gray-800 shadow-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-[#0e299c]/30"
        />
      </div>

      {companies.length === 0 ? (
        <p className="rounded-2xl bg-white py-16 text-center text-sm text-gray-400 shadow-sm">
          {debouncedQuery.trim()
            ? `'${debouncedQuery.trim()}' 검색 결과가 없어요.`
            : "등록된 병원이 없어요."}
        </p>
      ) : (
        // 모바일 2열 / PC 5열 그리드
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {companies.map(({ company, region, nanoid }) => (
            <Link
              key={company}
              href={`/ledger/${nanoid ?? encodeURIComponent(company)}`}
              className="group flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm transition-colors hover:bg-[#f4f7fe]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#F0F4FA] text-[#0e299c]">
                  <Building2 size={18} />
                </span>
                <ChevronRight
                  size={18}
                  className="shrink-0 text-gray-300 transition-colors group-hover:text-[#0e299c]"
                />
              </div>
              <p className="truncate text-sm font-bold text-gray-900">
                {highlightMatch(company, debouncedQuery)}
              </p>
              <span className="inline-flex w-fit rounded-md bg-[#0e299c]/8 px-2 py-0.5 text-[11px] font-medium text-[#0e299c]">
                {region ?? "지역 미설정"}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* 무한 스크롤 트리거 + 수동 더 보기 */}
      {hasNextPage ? (
        <div ref={sentinelRef} className="flex justify-center py-6">
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
        companies.length > 0 && (
          <p className="py-6 text-center text-xs text-gray-400">
            {debouncedQuery.trim()
              ? `${companies.length}개`
              : `모든 병원을 불러왔어요 · 총 ${companies.length}개`}
          </p>
        )
      )}
    </div>
  );
}
