"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Calendar, Plane } from "lucide-react";

const NAV = [
  { href: "/employee", label: "업무일지", icon: Calendar },
  { href: "/employee/leave", label: "휴가신청", icon: Plane },
];

/**
 * 직원 영역 좌측 사이드바(메뉴 전용). Header.tsx 의 usePathname 액티브 탭 패턴을 세로형으로 옮긴 것.
 * 프로필/로그아웃은 상단바(EmployeeTopBar)로 옮겨서 여기엔 없다.
 */
export default function EmployeeSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-gray-100 bg-white">
      <Link href="/employee" className="flex items-center gap-2 px-5 h-16 shrink-0">
        <Image
          src="/modubogo_logo.svg"
          alt="모두보고"
          width={80}
          height={24}
          className="h-6 w-auto"
        />
        <span className="text-sm font-bold text-gray-400">직원</span>
      </Link>

      <nav className="flex flex-col gap-1 px-3 py-4">
        {NAV.map((item) => {
          // "/employee"는 형제 경로("/employee/leave")의 접두사이기도 해서 정확히
          // 일치할 때만 active. 그 외(더 구체적인 경로)는 하위 경로까지 startsWith로 매칭.
          const active =
            item.href === "/employee"
              ? pathname === "/employee"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "bg-[#0e299c]/10 text-[#0e299c]"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
