"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search, ChevronRight, LogOut } from "lucide-react";
import dayjs from "@/lib/dayjs";
import { logoutAdmin } from "@/lib/admin-actions";
import { companiesSummaryQuery } from "@/lib/queries";
import ReportShell from "./ReportShell";

export default function CompanyList() {
  const { data: companies } = useSuspenseQuery(companiesSummaryQuery());
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // 탈퇴한 병원은 보고서 목록에서 숨긴다.
  const filtered = companies.filter(
    (c) =>
      c.hospitalType !== "탈퇴" &&
      c.company.toLowerCase().includes(debouncedQuery.toLowerCase()),
  );

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
        className="w-full bg-[#F0F4FA] rounded-full pl-11 pr-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#0e299c]/40"
      />
    </>
  );

  const actions = (
    <>
      <Link
        href="/report/new"
        className="bg-[#0e299c] text-white text-xs md:text-sm font-medium px-3 md:px-4 py-2 md:py-2.5 rounded-xl hover:bg-[#0a1f78] transition-colors whitespace-nowrap"
      >
        + 새 보고서
      </Link>
      <form action={logoutAdmin}>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 bg-white text-gray-500 text-xs md:text-sm font-medium px-3 md:px-4 py-2 md:py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors whitespace-nowrap cursor-pointer"
        >
          <LogOut size={15} />
          로그아웃
        </button>
      </form>
    </>
  );

  return (
    <ReportShell title="보고서 목록" search={search} actions={actions}>
      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-20">
          {debouncedQuery ? "검색 결과가 없습니다." : "등록된 보고서가 없습니다."}
        </p>
      ) : (
        <ul className="flex flex-col">
          {filtered.map(({ company, latestMonth, reportCount, region, nanoid }) => (
            <li key={company}>
              <Link
                href={`/report/${nanoid ?? encodeURIComponent(company)}`}
                className="group flex items-center gap-3 md:gap-6 py-5 border-b border-gray-100 hover:bg-gray-50/60 transition-colors px-2 rounded-lg"
              >
                {/* 썸네일 (공통 기본 이미지) */}
                <div className="w-32 h-20 shrink-0 rounded-xl overflow-hidden bg-[#F0F4FA]">
                  <Image
                    src="/images/default_hospital.jpg"
                    alt={company}
                    width={128}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* 가운데 정보 블록 */}
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 font-bold text-gray-900 break-keep text-[17px]">
                    {region && (
                      <span className="text-[11px] font-medium bg-[#0e299c]/90 text-white px-2 py-0.5 rounded-md">
                        {region}
                      </span>
                    )}
                    {company}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      최근 {dayjs(latestMonth).format("YYYY.MM")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    총 <strong className="text-gray-600">{reportCount}</strong>건
                  </p>
                </div>

                {/* 우측 원형 화살표 */}
                <div className="w-9 h-9 shrink-0 rounded-full bg-[#F0F4FA] flex items-center justify-center text-gray-400 group-hover:bg-[#0e299c] group-hover:text-white transition-colors">
                  <ChevronRight size={18} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ReportShell>
  );
}
