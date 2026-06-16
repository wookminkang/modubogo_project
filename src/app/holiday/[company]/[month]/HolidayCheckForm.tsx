"use client";

import { useEffect, useState } from "react";
import dayjs from "@/lib/dayjs";
import { ActionButton } from "seed-design/ui/action-button";
import { submitHolidaySchedule } from "./actions";
import {
  type Item,
  type Screen,
  type Status,
  isItemComplete,
  phaseOf,
  sameScreen,
} from "./_steps/types";
import { ProgressBar } from "./_steps/ProgressBar";
import { StickyBar } from "./_steps/StickyBar";
import { IntroStep } from "./_steps/IntroStep";
import { DecisionStep } from "./_steps/DecisionStep";
import { TimeStep } from "./_steps/TimeStep";
import { CustomStep } from "./_steps/CustomStep";
import { ConfirmStep } from "./_steps/ConfirmStep";
import { DoneStep } from "./_steps/DoneStep";

export default function HolidayCheckForm({
  hospitalName,
  monthLabel,
  month,
  items: initialItems,
}: {
  hospitalName: string;
  monthLabel: string;
  month: string; // 'YYYY-MM'
  items: Item[];
}) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [screen, setScreen] = useState<Screen>({ kind: "intro" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const hadInitial = initialItems.length > 0;

  // 화면 전환 시 최상단으로 (퍼널 UX)
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen]);

  const updateItem = (date: string, patch: Partial<Item>) =>
    setItems((prev) =>
      prev.map((it) => (it.date === date ? { ...it, ...patch } : it)),
    );

  // 임의 휴무일 추가: 선택한 날짜를 휴진으로 카드 생성 (중복 제외)
  const addCustomDays = (dates: Date[]) => {
    setItems((prev) => {
      const existing = new Set(prev.map((it) => it.date));
      const additions: Item[] = dates
        .map((d) => dayjs(d).format("YYYY-MM-DD"))
        .filter((ds) => !existing.has(ds))
        .map((ds) => ({
          date: ds,
          holiday_name: "임시 휴무",
          status: "closed" as Status,
          short_start: "",
          short_end: "",
          noLunch: false,
          lunch_start: "",
          lunch_end: "",
          isCustom: true,
        }));
      const next = [...prev, ...additions];
      // 공휴일 먼저, 그다음 임의 휴무 — 각 그룹 내 날짜순
      return next.sort((a, b) => {
        if (!!a.isCustom !== !!b.isCustom) return a.isCustom ? 1 : -1;
        return a.date.localeCompare(b.date);
      });
    });
  };

  const removeCustom = (date: string) =>
    setItems((prev) => prev.filter((it) => it.date !== date));

  // 공휴일 / 임의 휴무 분리
  const holidayItems = items.filter((it) => !it.isCustom);
  const customItems = items.filter((it) => it.isCustom);

  // 처음에 항목이 있었다면(hadInitial) 모두 지운 빈 상태도 저장 허용(삭제 반영)
  const allComplete =
    items.every(isItemComplete) && (items.length > 0 || hadInitial);

  // ── 동적 화면 시퀀스 빌드 (진료면 시간 화면 삽입, 휴진이면 생략) ──
  const screens: Screen[] = [{ kind: "intro" }];
  for (const it of holidayItems) {
    screens.push({ kind: "decision", date: it.date });
    if (it.status === "open") screens.push({ kind: "time", date: it.date });
  }
  screens.push({ kind: "custom" }, { kind: "confirm" });

  const curIdx = Math.max(
    0,
    screens.findIndex((s) => sameScreen(s, screen)),
  );
  const move = (dir: 1 | -1) => {
    const next = screens[curIdx + dir];
    if (next) setScreen(next);
  };

  // 현재 화면이 가리키는 항목 (decision/time)
  const screenItem =
    screen.kind === "decision" || screen.kind === "time"
      ? items.find((it) => it.date === screen.date)
      : undefined;

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      await submitHolidaySchedule(
        hospitalName,
        month,
        items.map((it) => ({
          date: it.date,
          holiday_name: it.holiday_name || "임시 휴무",
          status: (it.status || "closed") as Status,
          short_start: it.short_start,
          short_end: it.short_end,
          noLunch: it.noLunch,
          lunch_start: it.lunch_start,
          lunch_end: it.lunch_end,
        })),
      );
      setDone(true);
    } catch (e) {
      console.error("일정 제출 실패:", e);
      setError("제출 실패 — 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return <DoneStep monthLabel={monthLabel} />;
  }

  // ── 화면별 하단 CTA ──
  const ctaProps = {
    variant: "brandSolid" as const,
    size: "large" as const,
    className: "w-full",
  };
  let cta: React.ReactNode = null;
  if (screen.kind === "intro") {
    cta = (
      <ActionButton {...ctaProps} onClick={() => move(1)}>
        시작하기
      </ActionButton>
    );
  } else if (screen.kind === "decision") {
    cta = (
      <ActionButton
        {...ctaProps}
        disabled={!screenItem?.status}
        onClick={() => move(1)}
      >
        다음
      </ActionButton>
    );
  } else if (screen.kind === "time") {
    cta = (
      <ActionButton
        {...ctaProps}
        disabled={!screenItem || !isItemComplete(screenItem)}
        onClick={() => move(1)}
      >
        다음
      </ActionButton>
    );
  } else if (screen.kind === "custom") {
    // 추가한 휴무일은 사유를 모두 입력해야 진행 가능 (없으면 건너뛰기 OK)
    const customMissingReason = customItems.some(
      (it) => !it.holiday_name || it.holiday_name === "임시 휴무",
    );
    cta = (
      <ActionButton
        {...ctaProps}
        disabled={customMissingReason}
        onClick={() => move(1)}
      >
        다음
      </ActionButton>
    );
  } else if (screen.kind === "confirm") {
    cta = (
      <ActionButton
        {...ctaProps}
        loading={saving}
        disabled={!allComplete}
        onClick={handleSubmit}
      >
        제출하기
      </ActionButton>
    );
  }

  return (
    <div className="flex-1 px-4 py-6">
      <div className="mx-auto flex max-w-[480px] flex-col rounded-2xl shadow-sm">
        <ProgressBar
          phase={phaseOf(screen)}
          showBack={screen.kind !== "intro"}
          onBack={() => move(-1)}
        />

        {screen.kind === "intro" && (
          <IntroStep monthLabel={monthLabel} holidayItems={holidayItems} />
        )}
        {screen.kind === "decision" && screenItem && (
          <DecisionStep
            item={screenItem}
            index={holidayItems.findIndex((h) => h.date === screenItem.date)}
            total={holidayItems.length}
            onSelect={(status) => updateItem(screenItem.date, { status })}
          />
        )}
        {screen.kind === "time" && screenItem && (
          <TimeStep
            item={screenItem}
            onChange={(patch) => updateItem(screenItem.date, patch)}
          />
        )}
        {screen.kind === "custom" && (
          <CustomStep
            month={month}
            monthLabel={monthLabel}
            customItems={customItems}
            usedDates={new Set(items.map((it) => it.date))}
            onUpdateItem={updateItem}
            onRemove={removeCustom}
            onAddDays={addCustomDays}
          />
        )}
        {screen.kind === "confirm" && (
          <ConfirmStep
            hospitalName={hospitalName}
            monthLabel={monthLabel}
            holidayItems={holidayItems}
            customItems={customItems}
            isEmpty={items.length === 0}
            error={error}
          />
        )}

        <StickyBar>{cta}</StickyBar>
      </div>
    </div>
  );
}
