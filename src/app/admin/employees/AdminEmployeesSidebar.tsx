"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserCheck, ClipboardList, Plane } from "lucide-react";

const NAV = [
  { href: "/admin/employees", label: "직원 승인", icon: UserCheck },
  { href: "/admin/employees/worklogs", label: "업무일지", icon: ClipboardList },
  { href: "/admin/employees/leave", label: "휴가 승인", icon: Plane },
];

/**
 * 관리자 "직원 관리" 영역 전용 좌측 사이드바. employee/EmployeeSidebar.tsx 와
 * 동일한 스타일로 맞췄다(요청: 직원 관련 관리자 화면만 직원 사이드바와 톤 통일).
 */
export default function AdminEmployeesSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-gray-100 bg-white">
      <Link href="/admin/employees" className="flex items-center gap-2 px-5 h-16 shrink-0">
        <Image
          src="/modubogo_logo.svg"
          alt="모두보고"
          width={80}
          height={24}
          className="h-6 w-auto"
        />
        <span className="text-sm font-bold text-gray-400">관리자</span>
      </Link>

      <nav className="flex flex-col gap-1 px-3 py-4">
        {NAV.map((item) => {
          const active =
            item.href === "/admin/employees"
              ? pathname === "/admin/employees"
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
