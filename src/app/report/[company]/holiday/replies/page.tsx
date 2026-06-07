import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import dayjs from "@/lib/dayjs";
import { isAdmin } from "@/lib/admin";
import { getPublicHolidays } from "@/lib/publicHoliday";
import { getHolidaySchedules, getHolidaySubmissions } from "@/lib/db";
import MonthNav from "@/components/MonthNav";
import { diffSnapshotItems, type SnapItem } from "../replyFormat";

export const dynamic = "force-dynamic";

const pad = (n: number) => String(n).padStart(2, "0");

interface Props {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ month?: string }>;
}

// 공통 점심시간 라벨
function lunchOf(it: {
  lunch_start: string | null;
  lunch_end: string | null;
  noLunch?: boolean;
  note?: string | null;
}): string {
  if (it.noLunch || it.note?.includes("점심시간 없음")) return "점심시간 없음";
  if (it.lunch_start && it.lunch_end)
    return `점심 ${it.lunch_start} ~ ${it.lunch_end}`;
  return "";
}

const PILL =
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap";
const SUB =
  "inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-500 whitespace-nowrap";

// 진료 상태 칩 (색은 최소화: 휴무만 빨강, 나머지는 회색)
function Chips({
  it,
}: {
  it: {
    status: string;
    short_start?: string | null;
    short_end?: string | null;
    lunch_start: string | null;
    lunch_end: string | null;
    noLunch?: boolean;
    note?: string | null;
  };
}) {
  if (it.status === "closed") {
    return <span className={`${PILL} bg-red-50 text-red-500`}>휴무</span>;
  }
  const morning = it.status === "morning";
  const lunch = lunchOf(it);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`${PILL} bg-gray-100 text-gray-700`}>
        {morning ? "오전 진료" : "정상 진료"}
      </span>
      {it.short_start && it.short_end && (
        <span className={SUB}>
          {it.short_start} ~ {it.short_end}
        </span>
      )}
      {lunch && <span className={SUB}>{lunch}</span>}
    </div>
  );
}

type ScheduleLike = Parameters<typeof Chips>[0]["it"];

// 점심시간 값 (라벨은 별도라 "점심" 접두어 없이)
function lunchValue(it: ScheduleLike): string {
  if (it.noLunch || it.note?.includes("점심시간 없음")) return "없음";
  if (it.lunch_start && it.lunch_end)
    return `${it.lunch_start} ~ ${it.lunch_end}`;
  return "";
}

// 라벨 + 값 한 줄
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-14 shrink-0 font-medium text-gray-600">{label}</span>
      <span className="font-bold text-gray-900">{value}</span>
    </div>
  );
}

// 공휴일 진료 카드 (날짜+이름 헤더 / 상태 배지 / 진료시간·점심시간)
function HolidayCard({
  date,
  name,
  schedule,
}: {
  date: string;
  name: string;
  schedule: ScheduleLike | null | undefined;
}) {
  const sc = schedule;
  const closed = sc?.status === "closed";
  const morning = sc?.status === "morning";
  const lunch = sc ? lunchValue(sc) : "";

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-800">
            {dayjs(date).format("M월 D일 (ddd)")}
          </p>
          <p className="mt-0.5 text-sm font-medium text-red-500">{name}</p>
        </div>
        {!sc ? (
          <span className="text-xs font-medium text-gray-400">미응답</span>
        ) : (
          <span
            className={`${PILL} ${
              closed
                ? "bg-red-50 text-red-500"
                : "bg-white border border-gray-200 text-gray-700"
            }`}
          >
            {closed ? "휴무" : morning ? "오전 진료" : "정상 진료"}
          </span>
        )}
      </div>

      {sc && !closed && ((sc.short_start && sc.short_end) || lunch) && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-gray-100 pt-3">
          {sc.short_start && sc.short_end && (
            <Field label="진료시간" value={`${sc.short_start} ~ ${sc.short_end}`} />
          )}
          {lunch && <Field label="점심시간" value={lunch} />}
        </div>
      )}
    </div>
  );
}

/**
 * 원장 회신 확인 (읽기 전용).
 * 공휴일 근무 확인(현재 회신 상태) + 회신 이력(최초 등록·수정 타임라인)을 월 단위로 본다.
 * 기본은 다음 달(알림톡 전송 화면과 동일), ?month=YYYY-MM 로 다른 달 조회.
 */
export default async function HolidayRepliesPage({ params, searchParams }: Props) {
  if (!(await isAdmin())) redirect("/admin/login");

  const { company } = await params;
  const { month: monthParam } = await searchParams;
  const hospitalName = decodeURIComponent(company);
  // params.company 는 이미 인코딩된 값이라, 링크는 디코딩된 이름으로 다시 인코딩한다
  const enc = encodeURIComponent(hospitalName);

  const base = monthParam ? dayjs(`${monthParam}-01`) : dayjs().add(1, "month");
  const year = base.year();
  const month = base.month() + 1;
  const monthKey = `${year}-${pad(month)}`;

  const [holidays, schedules, submissions] = await Promise.all([
    getPublicHolidays(year, month),
    getHolidaySchedules(hospitalName, monthKey),
    getHolidaySubmissions(hospitalName, monthKey),
  ]);

  const scheduleMap = new Map(schedules.map((s) => [s.date, s]));
  const respondedCount = holidays.filter((h) => scheduleMap.has(h.date)).length;
  const allResponded = holidays.length > 0 && respondedCount === holidays.length;
  const lastSubmittedAt =
    submissions.length > 0
      ? submissions[submissions.length - 1].submitted_at
      : null;

  return (
    <div className="flex-1 overflow-x-clip bg-[#F0F4FA] py-6 px-4">
      <div className="max-w-[1200px] mx-auto">
        {/* 카드 1: 병원명 + 공휴일 진료 체크 */}
        <section className="bg-white rounded-2xl shadow-sm px-5 py-5 md:px-7 md:py-6">
          <Link
            href={`/report/${enc}`}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 transition-colors hover:text-[#0e299c]"
          >
            <ArrowLeft size={17} />
            뒤로가기
          </Link>

          {/* 병원명 + 월 네비 */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 break-keep">
                {hospitalName}
              </h1>
              <p className="text-[#6b7684] mt-1 text-sm">
                원장님이 회신한 공휴일 근무 여부를 확인할 수 있어요.
              </p>
            </div>
            <MonthNav basePath={`/report/${enc}/holiday/replies`} month={monthKey} />
          </div>

          <div className="my-5 border-t border-gray-100" />

          {/* 공휴일 근무 확인 */}
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-gray-900">공휴일 진료 체크</h2>
            <div className="flex items-center gap-1.5 text-sm">
              {holidays.length > 0 &&
                (allResponded ? (
                  <span className="font-semibold text-[#0e299c]">회신 완료</span>
                ) : respondedCount > 0 ? (
                  <span className="font-semibold text-gray-500">
                    {respondedCount}/{holidays.length} 회신
                  </span>
                ) : (
                  <span className="font-semibold text-gray-400">회신 대기</span>
                ))}
              {lastSubmittedAt && (
                <span className="text-gray-500">
                  · {dayjs(lastSubmittedAt).format("YYYY.MM.DD")}
                </span>
              )}
            </div>
          </div>

          {holidays.length === 0 ? (
            <p className="mt-3 text-sm text-gray-400">이번 달 공휴일이 없어요.</p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {holidays.map((h) => (
                <HolidayCard
                  key={h.date}
                  date={h.date}
                  name={h.name}
                  schedule={scheduleMap.get(h.date)}
                />
              ))}
            </div>
          )}
        </section>

        {/* 카드 2: 회신 이력 */}
        <section className="mt-4 bg-white rounded-2xl shadow-sm px-5 py-5 md:px-7 md:py-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">회신 이력</h2>
              <p className="text-[#6b7684] mt-1 text-sm">
                원장님이 등록·수정한 회신 시점과 이력을 확인할 수 있어요.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500">
              최신순
              <ChevronDown size={13} />
            </span>
          </div>

          {submissions.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400">아직 회신 이력이 없어요.</p>
          ) : (
            <ol className="mt-5 flex flex-col">
              {submissions.map((s, i) => {
                const isFirst = i === 0;
                const changes = isFirst
                  ? []
                  : diffSnapshotItems(submissions[i - 1].schedule, s.schedule);
                const isLast = i === submissions.length - 1;
                return (
                  <li key={s.id} className="relative flex gap-4">
                    {/* 점 + 연결선 (단색) */}
                    <div className="flex flex-col items-center">
                      <span
                        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white ${
                          isFirst ? "bg-[#0e299c]" : "bg-gray-300"
                        }`}
                      />
                      {!isLast && (
                        <span className="mt-1 w-px flex-1 bg-gray-200" />
                      )}
                    </div>

                    {/* 내용 */}
                    <div className="min-w-0 flex-1 pb-6">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                          {isFirst ? "최초 등록" : "수정"}
                        </span>
                        <span className="text-sm text-gray-500">
                          {dayjs(s.submitted_at).format("YYYY.MM.DD HH:mm")}
                        </span>
                      </div>

                      {/* 최초 등록: 전체 일정 칩 */}
                      {isFirst && (
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {s.schedule.map((it: SnapItem) => (
                            <HolidayCard
                              key={it.date}
                              date={it.date}
                              name={it.holiday_name}
                              schedule={it}
                            />
                          ))}
                        </div>
                      )}

                      {/* 수정: 변경 내용 (전 → 후) */}
                      {!isFirst && changes.length > 0 && (
                        <div className="mt-3 flex flex-col gap-3">
                          {changes.map((c) => (
                            <div key={c.date}>
                              <p className="mb-1.5 text-xs font-bold text-gray-700">
                                {dayjs(c.date).format("M월 D일 (ddd)")}{" "}
                                <span className="text-red-500">{c.name}</span>
                              </p>
                              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                                {/* 변경 전 */}
                                <div className="flex-1 rounded-xl bg-gray-50 px-3 py-2.5">
                                  <p className="mb-1.5 text-[13px] font-bold text-gray-600">
                                    변경 전
                                  </p>
                                  {c.before ? (
                                    <Chips it={c.before} />
                                  ) : (
                                    <span className="text-xs text-gray-400">
                                      미응답
                                    </span>
                                  )}
                                </div>
                                <ArrowRight
                                  size={16}
                                  className="mx-auto shrink-0 rotate-90 text-gray-300 sm:rotate-0"
                                />
                                {/* 변경 후 (브랜드 포인트) */}
                                <div className="flex-1 rounded-xl border border-[#0e299c]/15 bg-[#0e299c]/5 px-3 py-2.5">
                                  <p className="mb-1.5 text-[13px] font-bold text-[#0e299c]">
                                    변경 후
                                  </p>
                                  <Chips it={c.after} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <p className="mt-2 text-center text-xs text-gray-400">
            * 회신 시각은 24시간(HH:mm) 기준으로 표시됩니다.
          </p>
        </section>
      </div>
    </div>
  );
}
