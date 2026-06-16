"use client";

import { Check, Stethoscope, Moon } from "lucide-react";
import dayjs from "@/lib/dayjs";
import { Text } from "seed-design/ui/text";
import type { Item, Status } from "./types";

// 진료 여부 선택지 (진료/휴진)
const DECISIONS: {
  key: Extract<Status, "open" | "closed">;
  label: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "open",
    label: "진료",
    desc: "이 날 진료해요",
    icon: <Stethoscope size={26} />,
  },
  {
    key: "closed",
    label: "휴진",
    desc: "이 날 쉬어요",
    icon: <Moon size={26} />,
  },
];

// 1단계 · 공휴일별 진료 여부 선택
export function DecisionStep({
  item,
  index,
  total,
  onSelect,
}: {
  item: Item;
  index: number; // 0-based
  total: number;
  onSelect: (status: Status) => void;
}) {
  return (
    <div className="flex flex-col gap-5 py-5 pt-10">
      <div className="flex flex-col gap-2">
        <Text
          as="p"
          textStyle="t6Regular"
          color="fg.neutralSubtle"
          className="opacity-70"
        >
          공휴일 {index + 1} / <b className="text-white">{total}</b>
        </Text>
        <Text as="h1" textStyle="t10Bold">
          {dayjs(item.date).format("M월 D일 (ddd)")}
          <br />
          <Text as="span" textStyle="t10Bold" color="fg.critical">
            {item.holiday_name}
          </Text>
        </Text>
        <Text as="p" textStyle="t6Regular" color="fg.neutralSubtle">
          이 날 진료하시나요?
        </Text>
      </div>

      <div
        role="radiogroup"
        aria-label="진료 여부"
        className="grid grid-cols-2 gap-3 p-4"
      >
        {DECISIONS.map((opt) => {
          const active = item.status === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(opt.key)}
              className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border py-9 transition-all ${
                active
                  ? "border-[var(--seed-color-bg-neutral-weak)] bg-[var(--seed-color-bg-neutral-weak)] ring-1 ring-[var(--seed-color-bg-neutral-weak)] ring-inset"
                  : "border-[var(--seed-color-bg-neutral-weak)] active:bg-[var(--seed-color-bg-neutral-weak)]"
              }`}
            >
              {active && (
                <Check
                  size={16}
                  strokeWidth={3}
                  className="absolute right-3 top-3 text-white"
                />
              )}
              <span
                className={
                  active
                    ? "text-white"
                    : "text-[var(--seed-color-fg-neutral-subtle)]"
                }
              >
                {opt.icon}
              </span>
              <Text
                textStyle="t9Bold"
                color={active ? "fg.brandContrast" : undefined}
              >
                {opt.label}
              </Text>
              <Text textStyle="t5Regular" color="fg.neutralSubtle">
                {opt.desc}
              </Text>
            </button>
          );
        })}
      </div>
    </div>
  );
}
