"use client";

import { Fragment } from "react";
import { ChevronDown } from "lucide-react";
import dayjs from "@/lib/dayjs";
import { Text } from "seed-design/ui/text";
import type { Item } from "./types";
import Image from "next/image";

const GUIDE_STEPS = [
  {
    title: "공휴일 진료 여부 선택",
    desc: "공휴일마다 진료 · 휴진 골라주세요.",
  },
  {
    title: "추가 휴무일 등록 (선택)",
    desc: "행사 등으로 쉬는 평일이 있으면 추가해요.",
  },
  { title: "내용 확인 후 제출", desc: "입력한 내용을 보고 한 번에 제출해요." },
];

// 0단계 · 안내
export function IntroStep({
  monthLabel,
  holidayItems,
}: {
  monthLabel: string;
  holidayItems: Item[];
}) {
  return (
    <div className="flex flex-col gap-5 p-5 pt-10">
      {/* 타이틀 */}
      <div className="flex flex-col gap-2">
        <Text
          as="p"
          textStyle="t6Regular"
          color="fg.neutralSubtle"
          className="opacity-70"
        >
          {monthLabel.replace(/\s*\d+월\s*$/, "")}{" "}
          <Text as="span" textStyle="t6Bold" color="fg.neutral">
            {monthLabel.match(/\d+월\s*$/)?.[0]?.trim()}
          </Text>{" "}
          진료일정
        </Text>
        <div className="flex items-center justify-between gap-3">
          <Text as="h1" textStyle="t10Bold">
            알리다고
            <br />
            진료일정 안내드려요!
          </Text>
          <div className="shrink-0">
            <Image
              src="/images/calendar.png"
              alt="알리다고 캐릭터"
              width={130}
              height={140}
              className="h-auto w-16 object-contain"
              priority
            />
          </div>
        </div>

        {/* <div className="flex items-center gap-1">
          <Clock
            size={14}
            className="text-[var(--seed-color-fg-neutral-subtle)]"
          />
          <Text textStyle="t7Regular" color="fg.neutralSubtle">
            약 1분이면 충분해요
          </Text>
        </div> */}
      </div>

      {/* 한 줄 안내 박스 */}
      {/* <div className="flex items-start gap-3 rounded-2xl p-4">
        <CalendarDays
          size={20}
          className="mt-0.5 shrink-0 text-[var(--seed-color-fg-brand)]"
        />
        <div className="flex flex-col gap-0.5">
          <Text as="p" textStyle="t5Bold">
            공휴일별로 진료 여부만 골라주시면 돼요.
          </Text>
          <Text as="p" textStyle="t7Regular" color="fg.neutralSubtle">
            복잡한 입력 없이 빠르게 완료할 수 있어요.
          </Text>
        </div>
      </div> */}

      {/* 진행 단계 카드 — 박스 사이에 아래 화살표 */}
      <div className="flex flex-col gap-2 py-2">
        {GUIDE_STEPS.map((s, idx) => (
          <Fragment key={idx}>
            <div className="flex items-center gap-3 rounded-2xl p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--seed-color-bg-neutral-weak)] text-sm font-bold text-[var(--seed-color-fg-neutral)]">
                {idx + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Text as="p" textStyle="t5Bold">
                  {s.title}
                </Text>
                <Text as="p" textStyle="t6Regular" color="fg.neutralSubtle">
                  {s.desc}
                </Text>
              </div>
            </div>
            {idx < GUIDE_STEPS.length - 1 && (
              <div className="flex justify-center">
                <ChevronDown
                  size={20}
                  className="text-[var(--seed-color-fg-neutral-subtle)]"
                />
              </div>
            )}
          </Fragment>
        ))}
      </div>

      {/* 디바이더 */}
      <div className="h-2.5 w-full bg-[var(--seed-color-stroke-neutral-muted)]" />

      {/* 이번 달 확인할 공휴일 */}
      <div className="flex items-start gap-3 rounded-2xl p-4">
        {/* <Image
          src="/images/holidaylist.png"
          alt="리스트 공휴일"
          width={130}
          height={140}
          className="h-auto w-16 object-contain"
          priority
        /> */}

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Text as="p" textStyle="t7Bold">
            이번 달 확인할 공휴일({holidayItems.length}일)
          </Text>
          <Text as="p" textStyle="t3Bold"></Text>
          {holidayItems.length > 0 ? (
            <div className="mt-0.5 flex flex-col">
              {holidayItems.map((it) => (
                <div key={it.date} className="flex items-center gap-1.5">
                  <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-[#e25151]" />
                  <Text as="p" textStyle="t7Regular">
                    {dayjs(it.date).format("M.D")} {it.holiday_name}
                  </Text>
                </div>
              ))}
            </div>
          ) : (
            <Text as="p" textStyle="t7Regular" color="fg.neutralSubtle">
              공휴일이 없어요. 추가 휴무일만 등록하면 돼요.
            </Text>
          )}
        </div>
      </div>
    </div>
  );
}
