"use client";

import dayjs from "@/lib/dayjs";
import { Switch } from "@seed-design/react";
import { Text } from "seed-design/ui/text";
import { TimeSelect } from "./TimeSelect";
import { type Item, START_OPTIONS, END_OPTIONS, LUNCH_OPTIONS } from "./types";

// 2단계 · 진료시간 입력 (진료 선택일 때만)
export function TimeStep({
  item,
  onChange,
}: {
  item: Item;
  onChange: (patch: Partial<Item>) => void;
}) {
  return (
    <div className="flex flex-col gap-5 p-5 pt-10">
      <div className="flex flex-col gap-2">
        <Text as="p" textStyle="t6Regular" color="fg.neutralSubtle">
          진료 시작·종료 시간과 점심시간을 알려주세요.
        </Text>
        <Text as="h1" textStyle="t10Bold">
          진료시간을
          <br />
          입력해 주세요
        </Text>
      </div>

      <div className="flex flex-col gap-2 p-4">
        <Text as="h2" textStyle="t6Bold" color="fg.neutralSubtle">
          진료시간
        </Text>
        <div className="grid grid-cols-2 gap-3">
          <TimeSelect
            label="진료 시작"
            value={item.short_start}
            onChange={(v) => onChange({ short_start: v })}
            placeholder="시간 선택"
            options={START_OPTIONS}
          />
          <TimeSelect
            label="진료 종료"
            value={item.short_end}
            onChange={(v) => onChange({ short_end: v })}
            placeholder="시간 선택"
            options={END_OPTIONS}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <Text as="h2" textStyle="t6Bold" color="fg.neutralSubtle">
            점심시간
          </Text>
          <Switch.Root
            checked={item.noLunch}
            onCheckedChange={(checked) => onChange({ noLunch: checked })}
            className="flex items-center gap-2"
          >
            <Switch.Label>
              <Text textStyle="t7Regular" color="fg.neutralSubtle">
                없음
              </Text>
            </Switch.Label>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Switch.HiddenInput />
          </Switch.Root>
        </div>
        {!item.noLunch && (
          <div className="grid grid-cols-2 gap-3">
            <TimeSelect
              label="점심 시작"
              value={item.lunch_start}
              onChange={(v) => onChange({ lunch_start: v })}
              placeholder="시간 선택"
              options={LUNCH_OPTIONS}
            />
            <TimeSelect
              label="점심 종료"
              value={item.lunch_end}
              onChange={(v) => onChange({ lunch_end: v })}
              placeholder="시간 선택"
              options={LUNCH_OPTIONS}
            />
          </div>
        )}
      </div>
    </div>
  );
}
