"use client";

import { CalendarDays } from "lucide-react";
import { ko } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value?: string; // "YYYY-MM-DD"
  onChange?: (value: string) => void;
  className?: string;
}

export function DatePicker({ value, onChange, className }: DatePickerProps) {
  const selected = value ? new Date(value + "T00:00:00") : undefined;

  const formatted = selected
    ? `${selected.getFullYear()}년 ${selected.getMonth() + 1}월 ${selected.getDate()}일`
    : "날짜 선택";

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    onChange?.(`${yyyy}-${mm}-${dd}`);
  };

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-transparent px-3 text-sm transition-colors hover:border-[#0e299c] focus-visible:outline-none focus-visible:border-[#0e299c] focus-visible:ring-3 focus-visible:ring-[#0e299c]/20",
          !value ? "text-gray-400" : "text-gray-900",
          className
        )}
      >
        <span>{formatted}</span>
        <CalendarDays className="size-4 text-gray-400" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          locale={ko}
          captionLayout="dropdown"
          classNames={{
            day: "group/day relative aspect-square h-full w-full rounded-md p-0 text-center select-none",
          }}
          styles={{
            caption_label: { fontSize: "0.875rem", fontWeight: 600 },
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
