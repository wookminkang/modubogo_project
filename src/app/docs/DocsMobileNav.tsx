"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "./nav";

export default function DocsMobileNav() {
  const pathname = usePathname();

  return (
    <div className="overflow-x-auto scrollbar-none">
      <nav className="flex gap-1.5 px-4 py-2.5 w-max">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                active
                  ? "bg-[#0e299c] text-white"
                  : "text-gray-500 bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
