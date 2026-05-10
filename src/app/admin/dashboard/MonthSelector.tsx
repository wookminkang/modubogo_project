"use client";

import { useRouter } from "next/navigation";
import { MonthPicker } from "@/components/ui/month-picker";

export default function MonthSelector({ value }: { value: string }) {
  const router = useRouter();
  return (
    <MonthPicker
      value={value}
      onChange={(m) => router.push(`/admin/dashboard?month=${m}`)}
      className="w-40 h-9 text-sm"
    />
  );
}
