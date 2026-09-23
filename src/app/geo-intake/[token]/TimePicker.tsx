"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Text } from "seed-design/ui/text";
import { BottomSheetRoot, BottomSheetContent, BottomSheetBody } from "seed-design/ui/bottom-sheet";
import { TIME_OPTIONS } from "@/lib/geo-intake-fields";
import { INPUT_BUTTON, useIsMobile } from "./funnel-ui";

// 진료시간의 시각 하나를 고르는 칸.
//   휴대폰 — 아래에서 시트가 올라온다 (손가락이 닿는 곳에 목록이 떠서 고르기 쉽다)
//   PC     — 칸 바로 아래로 펼쳐진다 (시트는 데스크톱에서 과하다)
// 고르는 값은 30분 단위(TIME_OPTIONS = 06:00~23:30).

export function TimePicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const pick = (t: string) => {
    onChange(t);
    setOpen(false);
  };

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-label={label}
      aria-expanded={open}
      className={INPUT_BUTTON}
    >
      {value}
      <ChevronDown size={16} className="shrink-0 text-[var(--seed-color-fg-neutral-subtle)]" />
    </button>
  );

  if (isMobile) {
    return (
      <div className="flex-1">
        {trigger}
        <BottomSheetRoot open={open} onOpenChange={(o) => setOpen(o)}>
          <BottomSheetContent title={label}>
            <BottomSheetBody>
              <TimeGrid value={value} onPick={pick} className="max-h-[46vh] overflow-y-auto pb-4" />
            </BottomSheetBody>
          </BottomSheetContent>
        </BottomSheetRoot>
      </div>
    );
  }

  return (
    <div className="relative flex-1">
      {trigger}
      {open && (
        <>
          {/* 바깥을 누르면 닫히도록 */}
          <div className="fixed inset-0 z-[2]" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 z-[3] mt-1 rounded-[14px] border border-[var(--seed-color-stroke-neutral-muted)] bg-[var(--seed-color-bg-layer-default)] p-2 shadow-lg">
            <TimeGrid value={value} onPick={pick} className="max-h-60 overflow-y-auto" />
          </div>
        </>
      )}
    </div>
  );
}

function TimeGrid({
  value,
  onPick,
  className,
}: {
  value: string;
  onPick: (t: string) => void;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-3 gap-1 ${className ?? ""}`}>
      {TIME_OPTIONS.map((t) => {
        const selected = t === value;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onPick(t)}
            aria-pressed={selected}
            className={`rounded-[10px] py-2.5 transition-colors ${
              selected
                ? "bg-[var(--seed-color-bg-brand-solid)]"
                : "hover:bg-[var(--seed-color-bg-neutral-weak)]"
            }`}
          >
            <Text
              textStyle={selected ? "t4Bold" : "t4Regular"}
              color={selected ? "fg.brandContrast" : "fg.neutral"}
            >
              {t}
            </Text>
          </button>
        );
      })}
    </div>
  );
}
