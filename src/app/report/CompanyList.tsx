"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search, ChevronRight, ShieldCheck, LogOut } from "lucide-react";
import dayjs from "@/lib/dayjs";
import { logoutAdmin } from "@/lib/admin-actions";
import { companiesSummaryQuery } from "@/lib/queries";
import ReportShell from "./ReportShell";

type HospitalType =
  | "전체"
  | "메인 관리"
  | "한의원"
  | "한의원(네트워크)"
  | "한의원(입원실)"
  | "한방병원"
  | "정신과"
  | "양방";

const TABS: HospitalType[] = [
  "전체",
  "메인 관리",
  "한의원",
  "한의원(네트워크)",
  "한의원(입원실)",
  "한방병원",
  "정신과",
  "양방",
];

export default function CompanyList({
  isSuper = false,
}: {
  isSuper?: boolean;
}) {
  const { data: companies } = useSuspenseQuery(companiesSummaryQuery());
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeTab, setActiveTab] = useState<HospitalType>("전체");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const filtered = companies.filter((c) => {
    const matchesTab = activeTab === "전체" || c.hospitalType === activeTab;
    const matchesQuery = c.company
      .toLowerCase()
      .includes(debouncedQuery.toLowerCase());
    return matchesTab && matchesQuery;
  });

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

  const actions = (
    <>
      {isSuper && (
        <Link
          href="/super"
          className="inline-flex items-center gap-1.5 bg-[#0e299c]/10 text-[#0e299c] text-xs md:text-sm font-semibold px-3 md:px-4 py-2 md:py-2.5 rounded-xl hover:bg-[#0e299c]/15 transition-colors whitespace-nowrap"
        >
          <ShieldCheck size={15} />
          슈퍼관리자
        </Link>
      )}
      <Link
        href="/admin/dashboard"
        className="bg-white text-gray-600 text-xs md:text-sm font-medium px-3 md:px-4 py-2 md:py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors whitespace-nowrap"
      >
        대시보드
      </Link>
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

  // 모바일: 가로 스크롤 알약 / 데스크탑: 세로 사이드바 목록
  const sidebar = (
    <nav className="flex flex-row md:flex-col gap-2 md:gap-1 overflow-x-auto md:overflow-visible pb-1 md:pb-0 scrollbar-hide">
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`shrink-0 md:w-full text-left whitespace-nowrap rounded-full md:rounded-lg px-4 py-2 md:py-3 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === tab
              ? "bg-[#0e299c] text-white"
              : "bg-[#F0F4FA] md:bg-transparent text-gray-500 hover:bg-[#F0F4FA]"
          }`}
        >
          {tab}
        </button>
      ))}
    </nav>
  );

  return (
    <ReportShell
      title="보고서 목록"
      search={search}
      actions={actions}
      sidebar={sidebar}
    >
      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-20">
          {debouncedQuery ? "검색 결과가 없습니다." : "등록된 보고서가 없습니다."}
        </p>
      ) : (
        <ul className="flex flex-col">
          {filtered.map(({ company, latestMonth, reportCount, region }) => (
            <li key={company}>
              <Link
                href={`/report/${encodeURIComponent(company)}`}
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
