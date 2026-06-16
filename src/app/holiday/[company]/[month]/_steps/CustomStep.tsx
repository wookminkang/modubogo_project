"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { ko } from "date-fns/locale";
import dayjs from "@/lib/dayjs";
import { Calendar } from "@/components/ui/calendar";
import { ActionButton } from "seed-design/ui/action-button";
import { Text } from "seed-design/ui/text";
import { Badge } from "seed-design/ui/badge";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import {
  BottomSheetRoot,
  BottomSheetTrigger,
  BottomSheetContent,
  BottomSheetBody,
} from "seed-design/ui/bottom-sheet";
import type { Item } from "./types";

// 3단계 · 추가 휴무일 등록 (행사 등)
export function CustomStep({
  month,
  monthLabel,
  customItems,
  usedDates,
  onUpdateItem,
  onRemove,
  onAddDays,
}: {
  month: string; // 'YYYY-MM'
  monthLabel: string;
  customItems: Item[];
  usedDates: Set<string>; // 공휴일/이미 추가된 날짜 (중복 비활성화)
  onUpdateItem: (date: string, patch: Partial<Item>) => void;
  onRemove: (date: string) => void;
  onAddDays: (dates: Date[]) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [picked, setPicked] = useState<Date[]>([]);

  const monthStart = dayjs(`${month}-01`);
  const monthEnd = monthStart.endOf("month");
  const todayStart = dayjs().startOf("day");
  const isDateDisabled = (date: Date) => {
    const d = dayjs(date);
    const ds = d.format("YYYY-MM-DD");
    if (d.isBefore(monthStart) || d.isAfter(monthEnd)) return true; // 대상 월만
    if (d.isBefore(todayStart)) return true; // 지난 날짜 제외
    return usedDates.has(ds); // 공휴일/이미 추가된 날짜 제외
  };

  return (
    <div className="flex flex-col gap-5 py-5 pt-10">
      <div className="flex flex-col gap-2">
        <Text as="h1" textStyle="t10Bold">
          쉬는 날이
          <br />더 있나요?
        </Text>
        <Text as="p" textStyle="t6Regular" color="fg.neutralSubtle">
          행사·학회 등으로 쉬는 평일이 있으면 추가해 주세요. 없으면 그냥 다음을
          눌러도 돼요.
        </Text>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {customItems.length > 0 &&
          customItems.map((it) => (
            <div
              key={it.date}
              className="rounded-2xl border border-[var(--seed-color-stroke-neutral-muted)] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Badge tone="neutral" variant="weak" size="medium">
                    휴진
                  </Badge>
                  <Text textStyle="t5Bold">
                    {dayjs(it.date).format("M월 D일 (ddd)")}
                  </Text>
                </div>
                <ActionButton
                  variant="ghost"
                  size="xsmall"
                  onClick={() => onRemove(it.date)}
                  aria-label="이 휴무일 삭제"
                >
                  <X size={16} />
                </ActionButton>
              </div>
              <TextField
                aria-label="휴무 사유"
                value={it.holiday_name === "임시 휴무" ? "" : it.holiday_name}
                onValueChange={({ value }) =>
                  onUpdateItem(it.date, { holiday_name: value || "임시 휴무" })
                }
                className="mt-2"
              >
                <TextFieldInput placeholder="사유 (예: 행사·학회·개인사정)" />
              </TextField>
            </div>
          ))}

        <BottomSheetRoot
          open={addOpen}
          onOpenChange={(o) => {
            setAddOpen(o);
            if (!o) setPicked([]);
          }}
        >
          <BottomSheetTrigger asChild>
            <ActionButton
              variant="neutralWeak"
              size="medium"
              className="w-full"
            >
              휴무일 추가
            </ActionButton>
          </BottomSheetTrigger>
          <BottomSheetContent title={`휴무일 선택 (${monthLabel})`}>
            <BottomSheetBody>
              <div className="flex flex-col items-center gap-4 pb-2">
                <Calendar
                  mode="multiple"
                  selected={picked}
                  onSelect={(d) => setPicked(d ?? [])}
                  disabled={isDateDisabled}
                  defaultMonth={monthStart.toDate()}
                  startMonth={monthStart.toDate()}
                  endMonth={monthEnd.toDate()}
                  locale={ko}
                  className="text-base [--cell-size:2.75rem]"
                />
                <ActionButton
                  variant="brandSolid"
                  size="large"
                  className="w-full"
                  disabled={picked.length === 0}
                  onClick={() => {
                    onAddDays(picked);
                    setPicked([]);
                    setAddOpen(false);
                  }}
                >
                  {picked.length > 0
                    ? `${picked.length}일 추가`
                    : "날짜를 선택하세요"}
                </ActionButton>
              </div>
            </BottomSheetBody>
          </BottomSheetContent>
        </BottomSheetRoot>
      </div>
    </div>
  );
}
