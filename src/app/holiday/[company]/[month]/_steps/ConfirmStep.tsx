"use client";

import dayjs from "@/lib/dayjs";
import { Callout } from "@seed-design/react";
import { Text } from "seed-design/ui/text";
import { Badge } from "seed-design/ui/badge";
import { type Item, statusSummary } from "./types";

function SummaryRow({ it }: { it: Item }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--seed-color-stroke-neutral-muted)] py-3 last:border-0">
      <div className="flex min-w-0 flex-col gap-2">
        <span className="flex items-center gap-1.5">
          {it.isCustom && (
            <Badge tone="neutral" variant="weak" size="medium">
              임시
            </Badge>
          )}
          <Text textStyle="t5Bold" color="fg.neutralSubtle">
            {dayjs(it.date).format("M월 D일 (ddd)")}
          </Text>
        </span>
        {it.holiday_name && (
          <span className="flex items-center gap-1.5">
            {!it.isCustom && (
              <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-[#e25151]" />
            )}
            <Text textStyle="t7Regular" color="fg.neutral">
              {it.holiday_name}
            </Text>
          </span>
        )}
      </div>
      <Text
        textStyle="t5Medium"
        className="max-w-[55%] text-right"
        color="fg.neutralSubtle"
      >
        {statusSummary(it)}
      </Text>
    </div>
  );
}

// 4단계 · 입력 내용 확인
export function ConfirmStep({
  hospitalName,
  monthLabel,
  holidayItems,
  customItems,
  isEmpty,
  error,
}: {
  hospitalName: string;
  monthLabel: string;
  holidayItems: Item[];
  customItems: Item[];
  isEmpty: boolean;
  error: string;
}) {
  return (
    <div className="flex flex-col gap-5 p-5 pt-10">
      <div className="flex flex-col gap-2">
        <Text as="h1" textStyle="t10Bold">
          입력하신 내용을
          <br />
          확인해 주세요
        </Text>
        <Text as="p" textStyle="t6Regular" color="fg.neutralSubtle">
          내용이 맞으면 제출해 주세요. 수정하려면 이전으로 돌아가세요.
        </Text>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="rounded-xl bg-[var(--seed-color-bg-neutral-weak)] px-4 py-3">
          <Text
            as="p"
            textStyle="t10Bold"
            color="fg.brandContrast"
            className="break-keep"
          >
            {hospitalName}
          </Text>
          {/* <Text as="p" textStyle="t7Regular" color="fg.neutralSubtle">
            {monthLabel} 진료일정
          </Text> */}
        </div>

        {holidayItems.length > 0 && (
          <section className="flex flex-col gap-1 mt-2">
            <Text as="h2" textStyle="t6Bold" color="fg.neutralSubtle">
              공휴일 진료일정
            </Text>
            <div className="rounded-2xl bg-[var(--seed-color-bg-neutral-weak)] px-4 mt-2">
              {holidayItems.map((it) => (
                <SummaryRow key={it.date} it={it} />
              ))}
            </div>
          </section>
        )}

        {customItems.length > 0 && (
          <section className="flex flex-col gap-1">
            <Text as="h2" textStyle="t6Bold" color="fg.neutralSubtle">
              추가 휴무일
            </Text>
            <div className="rounded-2xl bg-[var(--seed-color-bg-neutral-weak)] px-4">
              {customItems.map((it) => (
                <SummaryRow key={it.date} it={it} />
              ))}
            </div>
          </section>
        )}

        {isEmpty && (
          <Callout.Root tone="warning">
            <Callout.Content>
              <Callout.Description>
                등록된 진료일정이 없습니다. 그대로 제출하면 기존 일정이 모두
                삭제됩니다.
              </Callout.Description>
            </Callout.Content>
          </Callout.Root>
        )}

        {error && (
          <Callout.Root tone="critical">
            <Callout.Content>
              <Callout.Description>{error}</Callout.Description>
            </Callout.Content>
          </Callout.Root>
        )}
      </div>
    </div>
  );
}
