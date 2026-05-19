"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "./nav";

export default function DocsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col">
      {NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-1.5 text-sm transition-colors border-l-2 ${
              active
                ? "border-[#0e299c] text-[#0e299c] font-semibold bg-blue-50/60"
                : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
