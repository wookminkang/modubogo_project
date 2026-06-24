"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { NAV } from "./nav";

export default function DocsMobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* 햄버거 버튼 */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="메뉴 열기"
      >
        <Menu size={20} className="text-gray-600" />
      </button>

      {/* 드로어 컨테이너 */}
      <div className={`fixed inset-0 z-50 md:hidden ${open ? "" : "pointer-events-none"}`}>
        {/* 배경 */}
        <div
          className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />

        {/* 드로어 패널 */}
        <div
          className={`absolute top-0 right-0 h-full w-72 bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
        >
          {/* 드로어 헤더 */}
          <div className="flex items-center justify-between px-5 h-14 border-b border-gray-100 shrink-0">
            <Image
              src="/modubogo_logo.svg"
              alt="모두보고"
              width={77}
              height={24}
              className="h-6 w-auto"
            />
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="메뉴 닫기"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          {/* 내비게이션 */}
          <nav className="flex-1 overflow-y-auto py-5 px-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3 px-2">
              가이드
            </p>
            <div className="flex flex-col gap-0.5">
              {NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`px-3 py-2.5 text-sm rounded-xl transition-colors ${
                      active
                        ? "bg-[#0e299c]/10 text-[#0e299c] font-semibold"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
