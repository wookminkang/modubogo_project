"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

interface MonthPickerProps {
  value?: string; // "YYYY-MM"
  onChange?: (value: string) => void;
  className?: string;
}

export function MonthPicker({ value, onChange, className }: MonthPickerProps) {
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => {
    if (value) return parseInt(value.slice(0, 4));
    return today.getFullYear();
  });

  const selectedYear = value ? parseInt(value.slice(0, 4)) : null;
  const selectedMonth = value ? parseInt(value.slice(5, 7)) : null;

  const formatted = value
    ? `${value.slice(0, 4)}년 ${parseInt(value.slice(5, 7))}월`
    : "월 선택";

  const handleSelect = (monthIndex: number) => {
    const mm = String(monthIndex + 1).padStart(2, "0");
    onChange?.(`${year}-${mm}`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-transparent px-3 text-sm text-gray-900 transition-colors hover:border-[#0e299c] focus-visible:outline-none focus-visible:border-[#0e299c] focus-visible:ring-3 focus-visible:ring-[#0e299c]/20",
          !value && "text-gray-400",
          className
        )}
      >
        <span>{formatted}</span>
        <CalendarDays className="size-4 text-gray-400" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 bg-white" align="start">
        {/* 연도 네비게이션 */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setYear((y) => y - 1)}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="size-4 text-gray-500" />
          </button>
          <span className="text-sm font-semibold text-gray-800">{year}년</span>
          <button
            type="button"
            onClick={() => setYear((y) => y + 1)}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="size-4 text-gray-500" />
          </button>
        </div>

        {/* 월 그리드 */}
        <div className="grid grid-cols-3 gap-1.5">
          {MONTHS.map((label, index) => {
            const isSelected = selectedYear === year && selectedMonth === index + 1;
            const isToday = today.getFullYear() === year && today.getMonth() === index;
            return (
              <button
                key={index}
                type="button"
                onClick={() => handleSelect(index)}
                className={cn(
                  "h-9 rounded-lg text-sm font-medium transition-colors",
                  isSelected
                    ? "bg-[#0e299c] text-white"
                    : isToday
                    ? "border border-[#0e299c] text-[#0e299c] hover:bg-[#0e299c]/10"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
