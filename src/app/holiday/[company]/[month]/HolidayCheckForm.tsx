"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight, Clock } from "lucide-react";
import dayjs from "@/lib/dayjs";
import { submitHolidaySchedule } from "./actions";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

type Status = "morning" | "open" | "closed";

interface Item {
  date: string;
  holiday_name: string;
  status: Status | ""; // "" = 아직 미선택
  short_start: string; // 진료 시작 (오전/정상진료)
  short_end: string; // 진료 종료 (오전/정상진료)
  noLunch: boolean; // 점심시간 없음
  lunch_start: string; // 점심 시작
  lunch_end: string; // 점심 종료
}

const STATUS_OPTIONS: { key: Status; label: string }[] = [
  { key: "morning", label: "오전진료" },
  { key: "open", label: "정상진료" },
  { key: "closed", label: "휴무" },
];

// 시간 옵션 생성 (30분 단위)
const pad2 = (n: number) => String(n).padStart(2, "0");
const buildTimes = (startH: number, endH: number): string[] => {
  const out: string[] = [];
  for (let h = startH; h <= endH; h++) {
    out.push(`${pad2(h)}:00`);
    if (h < endH) out.push(`${pad2(h)}:30`);
  }
  return out;
};

// 진료시간: 08:00 ~ 22:00 (저녁 진료 병원 대응)
const TIME_OPTIONS = buildTimes(8, 22);
// 점심시간: 11:00 ~ 15:00 (점심대만)
const LUNCH_OPTIONS = buildTimes(11, 15);

// 시·분 2컬럼 타임피커: 시를 고르면 분을 고르는 직관적 방식
function TimeSelect({
  value,
  onChange,
  placeholder,
  options = TIME_OPTIONS,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options?: string[];
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

  const colBtn = (active: boolean) =>
    `w-full shrink-0 rounded-lg px-2 py-3 text-center text-sm transition-colors cursor-pointer ${
      active
        ? "bg-[#0e299c] font-semibold text-white"
        : "text-gray-700 hover:bg-gray-100"
    }`;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger
        className={`flex min-h-10 w-full flex-1 cursor-pointer items-center justify-between gap-1 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus-visible:border-[#0e299c] ${
          value ? "text-gray-800" : "text-gray-400"
        }`}
      >
        {value || placeholder}
        <Clock size={15} className="shrink-0 text-gray-400" />
      </DrawerTrigger>
      <DrawerContent className="overscroll-contain">
        <DrawerHeader>
          <DrawerTitle className="text-base">{placeholder} 선택</DrawerTitle>
        </DrawerHeader>
        <div className="flex gap-3 px-4 pb-8">
          {/* 시 */}
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-center text-xs font-semibold text-gray-400">
              시
            </p>
            <div
              data-vaul-no-drag
              className="flex max-h-[45vh] flex-col gap-1 overflow-y-auto overscroll-contain rounded-xl bg-gray-50 p-1.5"
            >
              {hours.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => selectHour(h)}
                  className={colBtn(h === hh)}
                >
                  {Number(h)}시
                </button>
              ))}
            </div>
          </div>
          {/* 분 */}
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-center text-xs font-semibold text-gray-400">
              분
            </p>
            <div
              data-vaul-no-drag
              className="flex max-h-[45vh] flex-col gap-1 overflow-y-auto overscroll-contain rounded-xl bg-gray-50 p-1.5"
            >
              {minutes.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => selectMin(m)}
                  className={colBtn(m === mm)}
                >
                  {m}분
                </button>
              ))}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// 상단 배너는 고정 (알림톡 샘플 배너)
const FIXED_BANNER = "/images/talk_sample_img.jpg";

// 항목 입력 완료 여부 (확인 완료 버튼 활성화 조건)
function isItemComplete(it: Item): boolean {
  if (!it.status) return false; // 진료 여부 미선택
  if (it.status === "closed") return true; // 휴무는 추가 입력 없음
  if (!it.short_start || !it.short_end) return false; // 진료시간 필수
  if (!it.noLunch && (!it.lunch_start || !it.lunch_end)) return false; // 점심시간
  return true;
}

export default function HolidayCheckForm({
  hospitalName,
  monthLabel,
  items: initialItems,
}: {
  hospitalName: string;
  monthLabel: string;
  items: Item[];
}) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const update = (i: number, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  // 모든 공휴일 입력이 끝나야 확인 완료 버튼 활성화
  const allComplete = items.length > 0 && items.every(isItemComplete);

  // 점심시간 입력 (오전진료·정상진료 공용)
  const renderLunch = (it: Item, i: number) => (
    <div className="flex flex-col gap-2 rounded-lg bg-[#F0F4FA] p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">점심시간</span>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={it.noLunch}
            onChange={(e) => update(i, { noLunch: e.target.checked })}
            className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 accent-[#0e299c]"
          />
          점심시간 없음
        </label>
      </div>
      {!it.noLunch && (
        <div className="flex items-center gap-2">
          <TimeSelect
            value={it.lunch_start}
            onChange={(v) => update(i, { lunch_start: v })}
            placeholder="시작 시간"
            options={LUNCH_OPTIONS}
          />
          <span className="text-gray-400">~</span>
          <TimeSelect
            value={it.lunch_end}
            onChange={(v) => update(i, { lunch_end: v })}
            placeholder="종료 시간"
            options={LUNCH_OPTIONS}
          />
        </div>
      )}
    </div>
  );

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      // 버튼은 allComplete 일 때만 활성 → 이 시점 status 는 항상 선택돼 있음
      await submitHolidaySchedule(
        hospitalName,
        items.map((it) => ({ ...it, status: it.status as Status })),
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
    const prev = dayjs().subtract(1, "month"); // 지난달 (보고서 기준)
    const reportMonth = prev.format("YYYY-MM"); // 예: 2026-05
    const reportMonthLabel = prev.format("M월"); // 예: 5월
    return (
      <div className="flex-1 bg-[#F0F4FA] px-4 py-10">
        <div className="mx-auto flex max-w-[480px] flex-col items-center gap-4 rounded-2xl bg-white px-6 py-14 text-center shadow-sm">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0e299c]/10">
            <Check size={28} className="text-[#0e299c]" />
          </span>
          <div>
            <p className="text-lg font-bold text-gray-900">확인 완료되었습니다</p>
            <p className="mt-1 text-sm text-gray-500">
              {monthLabel} 진료일정을 확인해 주셔서 감사합니다.
            </p>
          </div>

          {/* 현재 월 보고서 바로가기 */}
          <Link
            href={`/report/${encodeURIComponent(hospitalName)}/${reportMonth}`}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0e299c] py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#0a1f78]"
          >
            {reportMonthLabel} 보고서 바로가기
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#F0F4FA] px-4 py-6">
      <div className="mx-auto max-w-[480px] overflow-hidden rounded-2xl bg-white shadow-sm">
        {/* 상단 배너 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={FIXED_BANNER} alt="진료일정 안내" className="h-auto w-full" />

        <div className="flex flex-col gap-5 p-5">
          {/* 타이틀 + 보조설명 */}
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-bold text-gray-900">
              공휴일 진료일정 확인
            </h1>
            <p className="text-sm leading-relaxed text-gray-500">
              다가오는 공휴일에 우리 병원이 진료하는지 확인하는 페이지예요.
              공휴일마다 <b className="font-semibold text-gray-700">오전진료·정상진료·휴무</b>를
              선택하시고, 변경할 내용이 있으면 수정 후 아래{" "}
              <b className="font-semibold text-gray-700">확인 완료</b> 버튼을
              눌러주세요.
            </p>
          </div>

          {/* 병원명 */}
          <div className="rounded-xl bg-[#F0F4FA] px-4 py-3">
            <p className="text-base font-bold text-[#0e299c] break-keep">
              {hospitalName}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {monthLabel} 공휴일 진료일정
            </p>
          </div>

          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              {monthLabel}에는 공휴일이 없어요.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((it, i) => (
                <div
                  key={it.date}
                  className="rounded-xl border border-gray-100 p-4"
                >
                  <p className="font-bold text-gray-900">
                    {dayjs(it.date).format("M월 D일 (ddd)")}{" "}
                    <span className="font-semibold text-red-500">
                      {it.holiday_name}
                    </span>
                  </p>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => update(i, { status: s.key })}
                        className={`cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${
                          it.status === s.key
                            ? "bg-[#0e299c] text-white"
                            : "bg-[#F0F4FA] text-gray-500 hover:bg-[#e7edf6]"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {(it.status === "morning" || it.status === "open") && (
                    <div className="mt-3 flex flex-col gap-2">
                      {/* 진료 시간 */}
                      <div className="flex items-center gap-2">
                        <TimeSelect
                          value={it.short_start}
                          onChange={(v) => update(i, { short_start: v })}
                          placeholder="시작 시간"
                        />
                        <span className="text-gray-400">~</span>
                        <TimeSelect
                          value={it.short_end}
                          onChange={(v) => update(i, { short_end: v })}
                          placeholder="종료 시간"
                        />
                      </div>
                      {/* 점심시간 */}
                      {renderLunch(it, i)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="text-center text-sm text-red-400">{error}</p>
          )}

          {items.length > 0 && !allComplete && (
            <p className="text-center text-xs text-gray-400">
              모든 공휴일의 진료 여부와 진료시간·점심시간을 선택해 주세요.
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !allComplete}
            className="w-full cursor-pointer rounded-xl bg-[#0e299c] py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#0a1f78] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "확인 중..." : "확인 완료"}
          </button>
        </div>
      </div>
    </div>
  );
}
