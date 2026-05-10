"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";

interface Company {
  company: string;
  latestMonth: string;
  reportCount: number;
  status?: string;
}

export default function CompanyList({ companies }: { companies: Company[] }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const filtered = companies.filter((c) =>
    c.company.toLowerCase().includes(debouncedQuery.toLowerCase())
  );

  return (
    <>
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="상호명으로 검색하세요"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-white rounded-xl pl-9 pr-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 shadow-sm outline-none focus:ring-2 focus:ring-[#0e299c]/30"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-10">
          {debouncedQuery ? "검색 결과가 없습니다." : "등록된 보고서가 없습니다."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(({ company, latestMonth, reportCount }) => (
            <Link
              key={company}
              href={`/report/${encodeURIComponent(company)}`}
              className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2 active:scale-95 transition-transform"
            >
              <p className="font-bold text-sm text-gray-900 leading-snug break-keep">
                {company}
              </p>
              <div className="flex flex-col gap-0.5 mt-auto">
                <p className="text-xs text-gray-400">최근 {latestMonth}</p>
                <p className="text-xs text-gray-400">총 {reportCount}건</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
