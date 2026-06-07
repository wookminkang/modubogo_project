"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight, Clock, Plus, X } from "lucide-react";
import { ko } from "date-fns/locale";
import dayjs from "@/lib/dayjs";
import { submitHolidaySchedule } from "./actions";
import { Calendar } from "@/components/ui/calendar";
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
  isCustom?: boolean; // 원장이 임의로 추가한 휴무일(공휴일 아님)
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

// 진료 시작: 08:00 ~ 13:00 (그 이후 시작하는 경우는 거의 없음)
const START_OPTIONS = buildTimes(8, 13);
// 진료 종료: 12:00 ~ 22:00 (저녁 진료 병원 대응)
const END_OPTIONS = buildTimes(12, 22);
// 점심시간: 11:00 ~ 15:00 (점심대만)
const LUNCH_OPTIONS = buildTimes(11, 15);

// 버튼 그리드 타임피커: 시·분을 한눈에 보고 바로 탭 (스크롤 없음)
function TimeSelect({
  value,
  onChange,
  placeholder,
  options = START_OPTIONS,
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
    `w-full shrink-0 rounded-lg py-3 text-center text-sm font-medium transition-colors cursor-pointer ${
      active ? "bg-[#0e299c] text-white" : "text-gray-700 hover:bg-gray-100"
    }`;

  return (
    <Drawer open={open} onOpenChange={setOpen} handleOnly>
      <DrawerTrigger
        className={`flex min-h-10 w-full flex-1 cursor-pointer items-center justify-between gap-1 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus-visible:border-[#0e299c] ${
          value ? "text-gray-800" : "text-gray-400"
        }`}
      >
        {value || placeholder}
        <Clock size={15} className="shrink-0 text-gray-400" />
      </DrawerTrigger>
      <DrawerContent className="mt-0 h-[60vh] max-h-[60vh]">
        <DrawerHeader>
          <DrawerTitle className="text-base">{placeholder} 선택</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-1 gap-3 overflow-hidden px-4 pb-6">
          {/* 시 */}
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="mb-2 text-center text-xs font-semibold text-gray-400">
              시
            </p>
            <div
              data-vaul-no-drag
              className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain rounded-xl bg-gray-50 p-1.5"
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
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="mb-2 text-center text-xs font-semibold text-gray-400">
              분
            </p>
            <div
              data-vaul-no-drag
              className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain rounded-xl bg-gray-50 p-1.5"
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

// 카카오톡 인앱 브라우저 여부 (UA에 KAKAOTALK 포함)
function isKakaoInApp(): boolean {
  if (typeof navigator === "undefined") return false;
  return /KAKAOTALK/i.test(navigator.userAgent);
}

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
  month,
  items: initialItems,
}: {
  hospitalName: string;
  monthLabel: string;
  month: string; // 'YYYY-MM'
  items: Item[];
}) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // 임의 휴무일 추가용 캘린더 Drawer
  const [addOpen, setAddOpen] = useState(false);
  const [picked, setPicked] = useState<Date[]>([]);

  const hadInitial = initialItems.length > 0;

  const update = (i: number, patch: Partial<Item>) =>
    setItems((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    );

  // 임의 휴무일 추가: 선택한 날짜를 휴무 기본값으로 카드 생성 (중복 제외)
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

  // 모든 항목 입력이 끝나야 확인 완료 버튼 활성화.
  // 처음에 항목이 있었다면(hadInitial) 모두 지운 빈 상태도 저장 허용(삭제 반영).
  const allComplete =
    items.every(isItemComplete) && (items.length > 0 || hadInitial);

  // 이미 추가/등록된 날짜 (캘린더에서 중복 비활성화용)
  const usedDates = new Set(items.map((it) => it.date));
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

  // 항목 카드 (공휴일 / 임의 휴무 공용)
  const renderCard = (it: Item, i: number) => (
    <div key={it.date} className="rounded-xl border border-gray-100 p-4">
      {it.isCustom ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 font-bold text-gray-900">
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-500">
                임시
              </span>
              {dayjs(it.date).format("M월 D일 (ddd)")}
            </p>
            <button
              type="button"
              onClick={() => removeCustom(it.date)}
              aria-label="이 휴무일 삭제"
              className="grid h-7 w-7 place-items-center rounded-lg text-gray-300 transition-colors hover:bg-gray-50 hover:text-red-500"
            >
              <X size={16} />
            </button>
          </div>
          <input
            type="text"
            value={it.holiday_name === "임시 휴무" ? "" : it.holiday_name}
            onChange={(e) =>
              update(i, { holiday_name: e.target.value || "임시 휴무" })
            }
            placeholder="사유 (예: 행사·학회·개인사정)"
            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#0e299c]"
          />
        </>
      ) : (
        <p className="font-bold text-gray-900">
          {dayjs(it.date).format("M월 D일 (ddd)")}{" "}
          <span className="font-semibold text-red-500">{it.holiday_name}</span>
        </p>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={it.status === s.key}
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
          <div className="flex items-center gap-2">
            <TimeSelect
              value={it.short_start}
              onChange={(v) => update(i, { short_start: v })}
              placeholder="시작 시간"
              options={START_OPTIONS}
            />
            <span className="text-gray-400">~</span>
            <TimeSelect
              value={it.short_end}
              onChange={(v) => update(i, { short_end: v })}
              placeholder="종료 시간"
              options={END_OPTIONS}
            />
          </div>
          {renderLunch(it, i)}
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
        month,
        items.map((it) => ({
          date: it.date,
          holiday_name: it.holiday_name || "임시 휴무",
          status: it.status as Status,
          short_start: it.short_start,
          short_end: it.short_end,
          noLunch: it.noLunch,
          lunch_start: it.lunch_start,
          lunch_end: it.lunch_end,
        })),
      );
      setDone(true);
      // 카카오톡 인앱 브라우저면 완료 화면을 잠깐 보여준 뒤 자동 종료
      if (isKakaoInApp()) {
        setTimeout(() => {
          window.location.href = "kakaotalk://inappbrowser/close";
        }, 800);
      }
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
            <p className="text-lg font-bold text-gray-900">
              확인 완료되었습니다
            </p>
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

  // 공휴일 / 임의 휴무 분리 (원본 인덱스 유지 → update/삭제 정확)
  const indexed = items.map((it, i) => ({ it, i }));
  const holidayRows = indexed.filter((x) => !x.it.isCustom);
  const customRows = indexed.filter((x) => x.it.isCustom);

  return (
    <div className="flex-1 bg-[#F0F4FA] px-4 py-6">
      <div className="mx-auto max-w-[480px] overflow-hidden rounded-2xl bg-white shadow-sm">
        {/* 상단 배너 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={FIXED_BANNER} alt="진료일정 안내" className="h-auto w-full" />

        <div className="flex flex-col gap-5 p-5">
          {/* 타이틀 + 보조설명 */}
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-bold text-gray-900">진료일정 확인</h1>
            <p className="text-sm leading-relaxed text-gray-500">
              다가오는 공휴일의 진료 여부를 확인하고, 행사 등으로 쉬는 평일이
              있으면 <b className="font-semibold text-gray-700">휴무일로 추가</b>해
              주세요. 입력 후 아래{" "}
              <b className="font-semibold text-gray-700">확인 완료</b> 버튼을
              눌러주세요.
            </p>
          </div>

          {/* 병원명 */}
          <div className="rounded-xl bg-[#F0F4FA] px-4 py-3">
            <p className="text-base font-bold text-[#0e299c] break-keep">
              {hospitalName}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">{monthLabel} 진료일정</p>
          </div>

          {/* ① 공휴일 진료일정 */}
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-gray-700">공휴일 진료일정</h2>
            {holidayRows.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">
                {monthLabel}에는 공휴일이 없어요.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {holidayRows.map(({ it, i }) => renderCard(it, i))}
              </div>
            )}
          </section>

          {/* ② 추가 휴무일 (행사 등) */}
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-gray-700">
              추가 휴무일{" "}
              <span className="font-normal text-gray-400">(행사 등)</span>
            </h2>
            {customRows.length > 0 && (
              <div className="flex flex-col gap-3">
                {customRows.map(({ it, i }) => renderCard(it, i))}
              </div>
            )}
            <Drawer
              open={addOpen}
              onOpenChange={(o) => {
                setAddOpen(o);
                if (!o) setPicked([]);
              }}
              handleOnly
            >
              <DrawerTrigger className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-[#0e299c] hover:text-[#0e299c]">
                <Plus size={16} />
                휴무일 추가
              </DrawerTrigger>
              <DrawerContent className="max-h-[85vh]">
                <DrawerHeader>
                  <DrawerTitle className="text-base">
                    휴무일 선택 ({monthLabel})
                  </DrawerTitle>
                </DrawerHeader>
                <div className="flex flex-col items-center gap-4 px-4 pb-6">
                  <Calendar
                    mode="multiple"
                    selected={picked}
                    onSelect={(d) => setPicked(d ?? [])}
                    disabled={isDateDisabled}
                    defaultMonth={monthStart.toDate()}
                    startMonth={monthStart.toDate()}
                    endMonth={monthEnd.toDate()}
                    locale={ko}
                    className="[--cell-size:2.75rem] text-base"
                  />
                  <button
                    type="button"
                    disabled={picked.length === 0}
                    onClick={() => {
                      addCustomDays(picked);
                      setPicked([]);
                      setAddOpen(false);
                    }}
                    className="w-full rounded-xl bg-[#0e299c] py-3 text-sm font-bold text-white transition-colors hover:bg-[#0a1f78] disabled:opacity-40"
                  >
                    {picked.length > 0
                      ? `${picked.length}일 추가`
                      : "날짜를 선택하세요"}
                  </button>
                </div>
              </DrawerContent>
            </Drawer>
          </section>

          {error && <p className="text-center text-sm text-red-400">{error}</p>}

          {items.length > 0 && !allComplete && (
            <p className="text-center text-xs text-gray-400">
              모든 항목의 진료 여부와 진료시간·점심시간을 선택해 주세요.
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
