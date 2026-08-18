"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Clock, X } from "lucide-react";
import dayjs from "@/lib/dayjs";
import { pad } from "@/lib/utils";
import Toast from "@/components/Toast";
import ConfirmToast from "@/components/ConfirmToast";
import type { PublicHoliday } from "@/lib/publicHoliday";
import type { TeamEvent } from "@/lib/db";
import {
  createTeamEventAction,
  updateTeamEventAction,
  deleteTeamEventAction,
  type TeamEventFormValues,
} from "@/lib/team-event-actions";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  unitLabel,
  type TeamLeaveItem,
} from "./team-calendar-types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 직원별 휴가 막대 색상 — 직원 인덱스로 순환 (같은 직원은 같은 색)
const PALETTE = [
  "bg-orange-100 text-orange-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
  "bg-amber-100 text-amber-700",
  "bg-indigo-100 text-indigo-700",
];

/** 한 주(7칸) 안에서 휴가 1건이 차지하는 구간. 주를 넘어가면 다음 주에 새 세그먼트로 이어진다. */
interface Segment {
  item: TeamLeaveItem;
  startCol: number;
  endCol: number;
  isStart: boolean;
  isEnd: boolean;
  lane: number;
}

const EMPTY_FORM = (date: string): TeamEventFormValues => ({
  title: "",
  eventDate: date,
  startTime: "",
  endTime: "",
  category: "meeting",
  memo: "",
});

/**
 * 팀 캘린더 — 휴가(주 단위 연속 막대) + 팀 일정(회의·미팅·중요) 월 보기.
 * 날짜를 클릭하면 우측 사이드 패널에 그날의 휴가·일정이 뜨고, 일정은 여기서 등록/수정/삭제한다
 * (작성자 본인 것만 수정/삭제 — 서버 액션이 created_by 로 강제).
 */
export default function TeamCalendar({
  month,
  today,
  leaves,
  events,
  holidays,
  colorIndexByEmployee,
  currentEmployeeId,
  nameById,
}: {
  month: string;
  today: string;
  leaves: TeamLeaveItem[];
  events: TeamEvent[];
  holidays: PublicHoliday[];
  colorIndexByEmployee: Record<string, number>;
  currentEmployeeId: string;
  nameById: Record<string, string>;
}) {
  const holidayByDate = useMemo(() => new Map(holidays.map((h) => [h.date, h.name])), [holidays]);
  const eventsByDate = useMemo(() => {
    const m = new Map<string, TeamEvent[]>();
    for (const e of events) m.set(e.event_date, [...(m.get(e.event_date) ?? []), e]);
    return m;
  }, [events]);

  const inThisMonth = today.startsWith(month);
  const [selectedDate, setSelectedDate] = useState(inThisMonth ? today : `${month}-01`);
  const [mode, setMode] = useState<"view" | "create" | "edit">("view");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TeamEventFormValues>(EMPTY_FORM(selectedDate));
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<TeamEvent | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── 달력 그리드 (WorkLogCalendar 와 동일 계산) ──
  const [year, monthNum] = month.split("-").map(Number);
  const first = dayjs(`${month}-01`);
  const daysInMonth = first.daysInMonth();
  const startWeekday = first.day();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const dateOf = (d: number) => `${year}-${pad(monthNum)}-${pad(d)}`;

  // ── 주별 휴가 세그먼트 + 레인 배정 ──
  const weekSegments: Segment[][] = weeks.map((week) => {
    const days = week.map((d) => (d === null ? null : dateOf(d)));
    const firstDay = days.find((x): x is string => x !== null);
    const lastDay = [...days].reverse().find((x): x is string => x !== null);
    if (!firstDay || !lastDay) return [];
    const segs: Omit<Segment, "lane">[] = [];
    for (const item of leaves) {
      if (item.endDate < firstDay || item.startDate > lastDay) continue;
      const startCol = days.findIndex((x) => x !== null && x >= item.startDate);
      let endCol = -1;
      for (let c = 6; c >= 0; c--) {
        const x = days[c];
        if (x !== null && x <= item.endDate) {
          endCol = c;
          break;
        }
      }
      if (startCol === -1 || endCol === -1 || endCol < startCol) continue;
      segs.push({
        item,
        startCol,
        endCol,
        isStart: days[startCol] === item.startDate,
        isEnd: days[endCol] === item.endDate,
      });
    }
    segs.sort(
      (a, b) =>
        a.startCol - b.startCol ||
        b.endCol - b.startCol - (a.endCol - a.startCol) ||
        a.item.employeeName.localeCompare(b.item.employeeName),
    );
    const laneEnds: number[] = [];
    return segs.map((s) => {
      let lane = laneEnds.findIndex((end) => end < s.startCol);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = s.endCol;
      return { ...s, lane };
    });
  });

  // ── 사이드 패널 데이터 ──
  const dayLeaves = leaves.filter((it) => selectedDate >= it.startDate && selectedDate <= it.endDate);
  const dayEvents = eventsByDate.get(selectedDate) ?? [];

  function selectDate(dateStr: string) {
    setSelectedDate(dateStr);
    setMode("view");
    setEditingId(null);
  }
  function openCreate() {
    setForm(EMPTY_FORM(selectedDate));
    setEditingId(null);
    setMode("create");
  }
  function openEdit(e: TeamEvent) {
    setForm({
      title: e.title,
      eventDate: e.event_date,
      startTime: e.start_time ?? "",
      endTime: e.end_time ?? "",
      category: e.category,
      memo: e.memo,
    });
    setEditingId(e.id);
    setMode("edit");
  }
  function submit() {
    startTransition(async () => {
      const result =
        mode === "edit" && editingId
          ? await updateTeamEventAction(editingId, form)
          : await createTeamEventAction(form);
      if (result.ok) {
        setToast(mode === "edit" ? "일정을 수정했어요." : "일정을 등록했어요.");
        // 다른 날짜로 옮겼으면 그 날짜를 보여준다
        setSelectedDate(form.eventDate);
        setMode("view");
        setEditingId(null);
      } else {
        setToast(result.error);
      }
    });
  }
  function doDelete(e: TeamEvent) {
    setConfirmDelete(null);
    startTransition(async () => {
      const result = await deleteTeamEventAction(e.id);
      setToast(result.ok ? "일정을 삭제했어요." : result.error);
      if (result.ok && editingId === e.id) {
        setMode("view");
        setEditingId(null);
      }
    });
  }

  const selectedLabel = dayjs(selectedDate).format("M월 D일 (dd)");

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      {/* ───── 캘린더 ───── */}
      <div className="bg-white rounded-2xl shadow-sm p-4 min-w-0 md:flex-1">
        <div className="grid grid-cols-7 border-b border-gray-100 pb-2">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`text-center text-xs font-semibold ${
                i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        <div className="flex flex-col pt-1">
          {weeks.map((week, wi) => {
            const segs = weekSegments[wi];
            const laneCount = segs.reduce((m, s) => Math.max(m, s.lane + 1), 0);
            return (
              <div
                key={wi}
                className="grid grid-cols-7 gap-x-1 border-b border-gray-50 py-1 last:border-b-0"
                style={{ gridTemplateRows: `auto repeat(${laneCount}, auto)`, minHeight: 104 }}
              >
                {/* 1행: 날짜 + 공휴일 + 일정 칩 (클릭 영역) */}
                {week.map((d, ci) => {
                  if (d === null)
                    return <div key={ci} style={{ gridColumn: ci + 1, gridRow: 1 }} />;
                  const dateStr = dateOf(d);
                  const holidayName = holidayByDate.get(dateStr);
                  const isToday = dateStr === today;
                  const selected = dateStr === selectedDate;
                  const evs = eventsByDate.get(dateStr) ?? [];
                  const shown = evs.slice(0, 3);
                  return (
                    <button
                      key={ci}
                      type="button"
                      onClick={() => selectDate(dateStr)}
                      style={{ gridColumn: ci + 1, gridRow: 1 }}
                      className={`flex min-h-[64px] flex-col items-start gap-1 rounded-xl px-1.5 pt-1.5 pb-1 text-left transition-colors ${
                        selected
                          ? "bg-[#0e299c]/10 ring-1 ring-[#0e299c]"
                          : isToday
                            ? "bg-[#0e299c]/5 hover:bg-[#0e299c]/10"
                            : "hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          isToday
                            ? "bg-[#0e299c] text-white"
                            : holidayName || ci === 0
                              ? "text-red-500"
                              : ci === 6
                                ? "text-blue-400"
                                : "text-gray-700"
                        }`}
                      >
                        {d}
                      </span>
                      {holidayName && (
                        <span className="w-full truncate rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-500">
                          {holidayName}
                        </span>
                      )}
                      {shown.map((e) => {
                        const meta = CATEGORY_META[e.category];
                        return (
                          <span
                            key={e.id}
                            className={`flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${meta.chip}`}
                            title={`${e.start_time ? `${e.start_time} ` : ""}${e.title}`}
                          >
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
                            <span className="truncate">
                              {e.start_time && (
                                <span className="opacity-70">{e.start_time} </span>
                              )}
                              {e.title}
                            </span>
                          </span>
                        );
                      })}
                      {evs.length > shown.length && (
                        <span className="text-[10px] font-medium text-gray-400">
                          +{evs.length - shown.length}개 더
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* 2행~: 휴가 막대 (여러 날이면 칸을 가로질러 하나로 이어짐) */}
                {segs.map((s) => {
                  const color =
                    PALETTE[(colorIndexByEmployee[s.item.employeeId] ?? 0) % PALETTE.length];
                  const half = unitLabel(s.item.unit);
                  const mine = s.item.employeeId === currentEmployeeId;
                  const pending = s.item.status === "pending";
                  return (
                    <span
                      key={s.item.id}
                      style={{
                        gridColumn: `${s.startCol + 1} / ${s.endCol + 2}`,
                        gridRow: s.lane + 2,
                      }}
                      title={`${s.item.employeeName} · ${s.item.startDate} ~ ${s.item.endDate}${
                        half ? ` · ${half}` : ""
                      }${pending ? " · 승인 대기" : ""}`}
                      className={`mx-0.5 mb-1 truncate px-1.5 py-0.5 text-[10px] font-semibold ${
                        s.isStart ? "rounded-l-md" : ""
                      } ${s.isEnd ? "rounded-r-md" : ""} ${
                        pending
                          ? "border border-dashed border-gray-300 bg-white text-gray-400"
                          : color
                      } ${mine ? "ring-1 ring-[#0e299c]/40" : ""}`}
                    >
                      🏖 {s.item.employeeName}
                      {half && <span className="font-normal opacity-80"> {half}</span>}
                      {pending && <span className="font-normal"> (대기)</span>}
                      {!s.isStart && <span className="font-normal opacity-60"> (이어짐)</span>}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ───── 사이드 패널 ───── */}
      <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4 md:w-[340px] md:shrink-0 md:sticky md:top-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">{selectedLabel}</p>
            {holidayByDate.get(selectedDate) && (
              <p className="text-xs text-red-500">{holidayByDate.get(selectedDate)}</p>
            )}
          </div>
          {mode === "view" ? (
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-1 rounded-lg bg-[#0e299c] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0b2180] transition-colors"
            >
              <Plus size={14} /> 일정 추가
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode("view");
                setEditingId(null);
              }}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50"
            >
              <X size={14} /> 취소
            </button>
          )}
        </div>

        {mode !== "view" ? (
          /* ── 등록/수정 폼 ── */
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-500">
              {mode === "edit" ? "일정 수정" : "새 일정"}
            </p>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="제목 (예: 주간 회의, OO한의원 미팅)"
              maxLength={100}
              className="h-10 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[#0e299c]"
              autoFocus
            />
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_ORDER.map((c) => {
                const meta = CATEGORY_META[c];
                const active = form.category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, category: c })}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                      active ? `${meta.chip} ring-1 ring-current` : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                className="h-9 flex-1 rounded-xl border border-gray-200 px-2 text-xs outline-none focus:border-[#0e299c]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="shrink-0 text-gray-400" />
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="h-9 flex-1 rounded-xl border border-gray-200 px-2 text-xs outline-none focus:border-[#0e299c]"
              />
              <span className="text-xs text-gray-400">~</span>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                disabled={!form.startTime}
                className="h-9 flex-1 rounded-xl border border-gray-200 px-2 text-xs outline-none focus:border-[#0e299c] disabled:bg-gray-50"
              />
            </div>
            <p className="-mt-1 text-[11px] text-gray-400">시간을 비우면 종일 일정으로 표시돼요.</p>
            <textarea
              value={form.memo}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
              rows={4}
              maxLength={1000}
              placeholder="메모 (장소, 참석자, 준비물 등)"
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#0e299c] resize-none"
            />
            <button
              type="button"
              onClick={submit}
              disabled={isPending || !form.title.trim()}
              className="h-10 rounded-xl bg-[#0e299c] text-sm font-semibold text-white hover:bg-[#0b2180] disabled:opacity-50 transition-colors"
            >
              {isPending ? "저장 중..." : mode === "edit" ? "수정 저장" : "등록"}
            </button>
          </div>
        ) : (
          /* ── 조회 ── */
          <>
            <section className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-500">휴가 ({dayLeaves.length})</p>
              {dayLeaves.length === 0 ? (
                <p className="text-xs text-gray-400">휴가자가 없어요.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {dayLeaves.map((it) => {
                    const half = unitLabel(it.unit);
                    return (
                      <li key={it.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-gray-800">
                          🏖 {it.employeeName}
                          {it.employeeId === currentEmployeeId && (
                            <span className="ml-1 text-[10px] font-medium text-[#0e299c]">나</span>
                          )}
                          {half && <span className="ml-1 text-xs text-gray-400">{half}</span>}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            it.status === "approved"
                              ? "bg-[#0e299c]/10 text-[#0e299c]"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {it.status === "approved" ? "승인" : "대기"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="flex flex-col gap-2 border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-500">일정 ({dayEvents.length})</p>
              {dayEvents.length === 0 ? (
                <p className="text-xs text-gray-400">등록된 일정이 없어요. 오른쪽 위 버튼으로 추가해보세요.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-gray-100">
                  {dayEvents.map((e) => {
                    const meta = CATEGORY_META[e.category];
                    const mine = e.created_by === currentEmployeeId;
                    return (
                      <li key={e.id} className="flex flex-col gap-1 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.chip}`}>
                                {meta.label}
                              </span>
                              <span className="text-xs text-gray-400">
                                {e.start_time
                                  ? `${e.start_time}${e.end_time ? ` ~ ${e.end_time}` : ""}`
                                  : "종일"}
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-semibold text-gray-900 break-words">
                              {e.title}
                            </p>
                          </div>
                          {mine && (
                            <div className="flex shrink-0 items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => openEdit(e)}
                                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#0e299c]"
                                aria-label="수정"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDelete(e)}
                                className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                                aria-label="삭제"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                        {e.memo && (
                          <p className="whitespace-pre-wrap text-xs text-gray-600">{e.memo}</p>
                        )}
                        <p className="text-[11px] text-gray-400">
                          {nameById[e.created_by] ?? "알 수 없음"} 등록
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <p className="text-[11px] text-gray-400 border-t border-gray-100 pt-3">
              일정은 등록한 사람만 수정·삭제할 수 있어요. 휴가 사유는 본인과 관리자만 볼 수 있어요.
            </p>
          </>
        )}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
      {confirmDelete && (
        <ConfirmToast
          title="일정을 삭제할까요?"
          subtitle={confirmDelete.title}
          yesLabel="삭제"
          noLabel="취소"
          showIcon={false}
          onYes={() => doDelete(confirmDelete)}
          onNo={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
