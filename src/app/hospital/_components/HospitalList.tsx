"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Building2, Search, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { TagGroup } from "@seed-design/react";
import { hospitalsInfiniteQuery, hospitalsLiteQuery } from "@/lib/queries";
import { queryKeys } from "@/lib/queryKeys";
import { removeHospital } from "@/lib/company-actions";
import { ActionButton } from "seed-design/ui/action-button";
import { Text } from "seed-design/ui/text";
import { ContentPlaceholder } from "seed-design/ui/content-placeholder";
import ConfirmToast from "@/components/ConfirmToast";
import Toast from "@/components/Toast";

// 보고서 목록과 동일한 병원 유형 카테고리
const TABS = [
  "전체",
  "지역 미설정",
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
  // 개수 집계용 전 병원 경량 목록 (무한스크롤과 별개로 전체를 한 번에 확보)
  const { data: liteAll } = useSuspenseQuery(hospitalsLiteQuery());
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("전체");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // 병원 삭제 (확인창 → 서버액션 → 캐시 무효화)
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleDelete = async () => {
    if (!confirmTarget || pending) return;
    setPending(true);
    try {
      await removeHospital(confirmTarget);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.hospitalsInfinite() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.companiesSummary() }),
      ]);
      setToast("삭제되었습니다.");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    } finally {
      setPending(false);
      setConfirmTarget(null);
    }
  };

  // 검색어 디바운스 (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // 탭 + 검색어 필터 (그리드/개수 공용 — liteAll 과 페이지 항목에 동일 적용)
  const matchesFilter = (h: {
    company: string;
    region: string | null;
    hospitalType: string | null;
  }) => {
    const matchesTab =
      activeTab === "전체"
        ? h.hospitalType !== "탈퇴" // 전체 탭에서는 탈퇴 병원 제외
        : activeTab === "지역 미설정"
          ? (!h.region || !h.region.trim()) && h.hospitalType !== "탈퇴"
          : h.hospitalType === activeTab;
    const matchesQuery = h.company
      .toLowerCase()
      .includes(debouncedQuery.trim().toLowerCase());
    return matchesTab && matchesQuery;
  };

  // 렌더용: 로드된 페이지에서 필터링
  const all = data.pages.flatMap((page) => page.items);
  const hospitals = all.filter(matchesFilter);
  // 개수용: 전체 경량 목록에서 필터링 (무한스크롤과 무관하게 정확)
  const totalCount = liteAll.filter(matchesFilter).length;

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
      {/* 지점 수 (전체 경량 목록 기준 정확한 개수, 현재 탭·검색 반영) */}
      <div className="px-5 pt-4">
        <span className="text-sm font-semibold text-gray-700">
          지점 <span className="text-[#0e299c]">{totalCount}</span>개
        </span>
      </div>

      {/* 검색 */}
      <div className="px-5 pt-3">
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
              : activeTab === "지역 미설정"
                ? "지역 미설정 병원이 없어요."
                : `'${activeTab}' 유형의 병원이 없어요.`}
        </p>
      ) : (
        // 모바일 1열 / PC 4열 그리드
        <div className="grid grid-cols-1 gap-4 px-5 pt-2 pb-6 md:grid-cols-4">
          {hospitals.map(({ company, region, hospitalType, nanoid }) => (
            <div key={company} className="relative">
              <Link
                href={`/hospital/${nanoid ?? encodeURIComponent(company)}`}
                className="flex h-full flex-col gap-2.5 rounded-2xl border border-[var(--seed-color-stroke-neutral-muted)] p-4 transition-colors hover:bg-[var(--seed-color-bg-neutral-weak)]"
              >
                <div className="flex items-center gap-2.5 pr-7">
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
              <button
                type="button"
                onClick={() => setConfirmTarget(company)}
                aria-label={`${company} 삭제`}
                title="병원 삭제"
                className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-[#c0392b]/10 text-[#c0392b] shadow-sm transition-colors hover:bg-[#c0392b] hover:text-white"
              >
                <Trash2 size={14} />
              </button>
            </div>
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

      {confirmTarget && (
        <ConfirmToast
          title={confirmTarget}
          subtitle="병원 삭제"
          message="이 병원의 보고서·진료일정·입금소진·메모 등 모든 데이터가 함께 삭제됩니다. 삭제할까요?"
          yesLabel={pending ? "삭제 중…" : "삭제"}
          noLabel="취소"
          showIcon={false}
          onYes={handleDelete}
          onNo={() => {
            if (!pending) setConfirmTarget(null);
          }}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}
