"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import ReportShell from "@/app/report/ReportShell";
import HolidayHubTable, { type HubRow } from "./HolidayHubTable";

type StatusKey = "all" | "unsent" | "awaiting" | "done";

/**
 * 진료일정 허브 클라이언트 셸.
 * 상호명 검색 상태를 보유하고, 검색창을 ReportShell의 sticky 헤더(search 슬롯)에
 * 올려 보고서 목록과 동일한 UI·스크롤 고정 동작을 갖게 한다.
 */
export default function HolidayHub({
  title,
  actions,
  monthKey,
  rows,
  total,
  filters,
  activeStatus,
  children,
}: {
  title: React.ReactNode;
  actions?: React.ReactNode;
  monthKey: string;
  rows: HubRow[];
  total: number;
  filters: { key: StatusKey; label: string; count: number; href: string }[];
  activeStatus: StatusKey;
  children?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // 상호명 검색 (보고서 목록과 동일하게 300ms 디바운스)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // 보고서 목록(CompanyList)과 동일한 검색창 UI
  const search = (
    <>
      <Search
        size={16}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        type="text"
        placeholder="상호명으로 검색하세요."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full bg-[#F0F4FA] rounded-full pl-11 pr-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#0e299c]/30"
      />
    </>
  );

  return (
    <ReportShell title={title} search={search} actions={actions}>
      <>
        {/* 상태 필터 탭 (요약 카운트 겸용) */}
        <div className="flex flex-wrap gap-1.5 pb-4">
          {filters.map((f) => {
            const active = f.key === activeStatus;
            return (
              <Link
                key={f.key}
                href={f.href}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-[#0e299c] bg-[#0e299c] text-white"
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {f.label}
                <span className={active ? "text-white/80" : "text-gray-400"}>
                  {f.count}
                </span>
              </Link>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <p className="py-20 text-center text-sm text-gray-400">
            {activeStatus === "all"
              ? "표시할 병원이 없어요."
              : "해당 상태의 병원이 없어요."}
          </p>
        ) : (
          <HolidayHubTable
            rows={rows}
            total={total}
            monthKey={monthKey}
            query={debouncedQuery}
          />
        )}

        {children}
      </>
    </ReportShell>
  );
}
