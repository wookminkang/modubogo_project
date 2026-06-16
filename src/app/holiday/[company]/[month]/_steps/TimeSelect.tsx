"use client";

import { useState } from "react";
import { Clock, Check } from "lucide-react";
import { ActionButton } from "seed-design/ui/action-button";
import { Text } from "seed-design/ui/text";
import {
  BottomSheetRoot,
  BottomSheetTrigger,
  BottomSheetContent,
  BottomSheetBody,
} from "seed-design/ui/bottom-sheet";
import { START_OPTIONS } from "./types";

// 시·분 그리드 타임피커 — Seed BottomSheet 안에서 한눈에 보고 바로 탭
export function TimeSelect({
  value,
  onChange,
  placeholder,
  options = START_OPTIONS,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options?: string[];
  label?: string; // 있으면 큰 카드형 버튼으로 렌더
}) {
  const [open, setOpen] = useState(false);
  const hours = Array.from(new Set(options.map((t) => t.split(":")[0])));
  const minutes = Array.from(new Set(options.map((t) => t.split(":")[1])));
  const [hh, mm] = value ? value.split(":") : ["", ""];

  const selectHour = (h: string) => onChange(`${h}:${mm || minutes[0]}`);
  const selectMin = (m: string) => {
    onChange(`${hh || hours[0]}:${m}`);
    setOpen(false);
  };

  // 시/분 컬럼 (렌더 함수 — 컴포넌트로 만들지 않아 상태 보존)
  const column = (
    label: string,
    list: string[],
    selected: string,
    onPick: (v: string) => void,
    fmt: (v: string) => string,
  ) => (
    <div className="flex min-w-0 flex-1 flex-col text-center py-3">
      <Text
        as="p"
        textStyle="t7Medium"
        color="fg.neutralSubtle"
        className="mb-2 text-center"
      >
        {label}
      </Text>
      <div
        data-vaul-no-drag
        className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain rounded-xl p-1.5"
      >
        {list.map((v) => (
          <ActionButton
            key={v}
            variant={v === selected ? "brandSolid" : "ghost"}
            size="large"
            onClick={() => onPick(v)}
          >
            {fmt(v)}
          </ActionButton>
        ))}
      </div>
    </div>
  );

  return (
    <BottomSheetRoot open={open} onOpenChange={setOpen}>
      <BottomSheetTrigger asChild>
        {label ? (
          // 큰 카드형 버튼 (진료/휴진 버튼과 동일한 크기·가운데 정렬)
          <button
            type="button"
            className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-[var(--seed-color-bg-neutral-weak)] py-9 transition-all active:bg-[var(--seed-color-bg-neutral-weak)] ${
              value ? "bg-[var(--seed-color-bg-neutral-weak)]" : ""
            }`}
          >
            {value && (
              <Check
                size={16}
                strokeWidth={3}
                className="absolute right-3 top-3 text-white"
              />
            )}
            <Clock
              size={26}
              className={
                value
                  ? "text-white"
                  : "text-[var(--seed-color-fg-neutral-subtle)]"
              }
            />
            <Text textStyle="t9Bold" color={value ? "fg.brandContrast" : undefined}>
              {label}
            </Text>
            <Text textStyle="t5Regular" color="fg.neutralSubtle">
              {value || placeholder}
            </Text>
          </button>
        ) : (
          <ActionButton variant="neutralOutline" size="medium" flexGrow>
            <span className="flex w-full items-center justify-between gap-1">
              <span
                className={
                  value ? "" : "text-[var(--seed-color-fg-neutral-subtle)]"
                }
              >
                {value || placeholder}
              </span>
              <Clock size={15} className="shrink-0 opacity-50" />
            </span>
          </ActionButton>
        )}
      </BottomSheetTrigger>
      <BottomSheetContent title={`${label ?? placeholder} 선택`}>
        <BottomSheetBody>
          <div className="flex h-[46vh] gap-3 overflow-hidden pb-2">
            {column("시", hours, hh, selectHour, (h) => `${Number(h)}시`)}
            {column("분", minutes, mm, selectMin, (m) => `${m}분`)}
          </div>
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheetRoot>
  );
}
