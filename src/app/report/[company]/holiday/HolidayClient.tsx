"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import dayjs from "@/lib/dayjs";
import { supabase } from "@/lib/supabase";
import { sendHolidayAlimtalk } from "@/lib/bizgo";
import Toast from "@/components/Toast";
import ConfirmToast from "@/components/ConfirmToast";
import AlimtalkPanel from "./AlimtalkPanel";

interface Holiday {
  date: string;
  name: string;
}

interface ScheduleRow {
  date: string;
  holiday_name: string;
  status: string; // morning | open | closed
  short_start: string | null;
  short_end: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
  note: string | null;
}

// 점심시간 표시 문구
function lunchText(sc: ScheduleRow) {
  if (sc.lunch_start && sc.lunch_end)
    return `점심 ${sc.lunch_start}~${sc.lunch_end}`;
  if (sc.note?.includes("점심시간 없음")) return "점심시간 없음";
  return "";
}

// 제출 이력 스냅샷 (holiday_submissions.schedule)
interface SnapItem {
  date: string;
  holiday_name: string;
  status: string; // morning | open | closed
  short_start: string;
  short_end: string;
  lunch_start: string;
  lunch_end: string;
  noLunch: boolean;
}

function formatSnapshot(it: SnapItem): string {
  if (it.status === "closed") return "휴무";
  const lunch = it.noLunch
    ? " (점심없음)"
    : it.lunch_start && it.lunch_end
      ? ` (점심 ${it.lunch_start}~${it.lunch_end})`
      : "";
  if (it.status === "morning")
    return `오전진료 ${it.short_start}~${it.short_end}${lunch}`;
  return `정상진료${lunch}`;
}

// 이전 제출과 비교해 바뀐 공휴일만 추출
function diffSnapshots(prev: SnapItem[], cur: SnapItem[]) {
  const prevMap = new Map(prev.map((it) => [it.date, it]));
  const out: { date: string; name: string; from: string; to: string }[] = [];
  for (const it of cur) {
    const p = prevMap.get(it.date);
    const to = formatSnapshot(it);
    const from = p ? formatSnapshot(p) : "—";
    if (from !== to)
      out.push({ date: it.date, name: it.holiday_name, from, to });
  }
  return out;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const DEFAULT_BANNER = "/images/talk_sample_img.jpg";
const BUCKET = "holiday-banners";
const pad = (n: number) => String(n).padStart(2, "0");

// 스토리지 키는 ASCII만 허용 → 한글 상호명을 ASCII 해시로 변환
function companyKey(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (Math.imul(h, 31) + name.charCodeAt(i)) | 0;
  }
  return "c" + (h >>> 0).toString(36);
}

export default function HolidayClient({
  hospitalName,
  year,
  month,
  holidays,
  initialBanner,
  recipients,
  schedules,
  submissions,
}: {
  hospitalName: string;
  year: number;
  month: number;
  holidays: Holiday[];
  initialBanner?: string;
  recipients?: string[];
  schedules: ScheduleRow[];
  submissions: { id: number; submitted_at: string; schedule: SnapItem[] }[];
}) {
  const scheduleMap = new Map(schedules.map((s) => [s.date, s]));
  const respondedCount = holidays.filter((h) => scheduleMap.has(h.date)).length;
  // 자세히보기 화면에 노출되는 배너 (업로드 이미지)
  const [bannerUrl, setBannerUrl] = useState(initialBanner || DEFAULT_BANNER);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // 알림톡 전송 상태
  const [sendStep, setSendStep] = useState<
    "idle" | "confirm" | "sending" | "result"
  >("idle");
  const [sendMsg, setSendMsg] = useState("");

  const monthKey = `${year}-${pad(month)}`;

  const handleSend = async () => {
    setSendStep("sending");
    try {
      const schedule =
        holidays.length > 0
          ? holidays
              .map((h) => `- ${dayjs(h.date).format("M월 D일(ddd)")} ${h.name}`)
              .join("\n")
          : `${month}월 공휴일이 없습니다.`;
      const detailUrl = `https://modubogo.com/holiday/${encodeURIComponent(hospitalName)}/${monthKey}`;

      await sendHolidayAlimtalk({
        company: hospitalName,
        monthLabel: monthKey,
        monthNum: month,
        schedule,
        detailUrl,
        recipients,
      });
      setSendMsg("알림톡을 발송했어요 ✅");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      setSendMsg(`발송 실패: ${msg}`);
    }
    setSendStep("result");
  };

  // 파일 선택 → 로컬 미리보기만 (저장은 '저장하기' 버튼에서)
  const handleSelectFile = (file: File) => {
    setError("");
    setSaved(false);
    setPendingFile(file);
    setFileName(file.name);
    setBannerUrl(URL.createObjectURL(file));
  };

  // 저장하기 → Supabase Storage 업로드 + holiday_banners 저장
  const handleSave = async () => {
    if (!pendingFile) return;
    setSaving(true);
    setError("");
    try {
      const ext =
        (pendingFile.name.split(".").pop() || "jpg")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${companyKey(hospitalName)}/${monthKey}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, pendingFile, {
          upsert: true,
          contentType: pendingFile.type,
        });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = data.publicUrl;

      const { error: dbErr } = await supabase
        .from("holiday_banners")
        .upsert(
          { company: hospitalName, month: monthKey, banner_url: publicUrl },
          { onConflict: "company,month" },
        );
      if (dbErr) throw dbErr;

      setBannerUrl(publicUrl);
      setPendingFile(null);
      setSaved(true);
    } catch (err) {
      console.error("배너 저장 실패:", err);
      setError("저장 실패 — 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  // 달력 그리드 구성
  const holidayMap = new Map(holidays.map((h) => [h.date, h.name]));
  const first = dayjs(`${year}-${pad(month)}-01`);
  const daysInMonth = first.daysInMonth();
  const startWeekday = first.day();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <div className="flex-1 overflow-x-clip bg-[#F0F4FA] py-6 px-4">
        <div className="max-w-[1100px] mx-auto bg-white rounded-2xl shadow-sm px-4 py-6 md:px-8 md:py-8">
          {/* 헤더 + 저장하기 버튼 */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#0e299c] break-keep">
                {hospitalName}
              </h1>
              <p className="text-[#6b7684] mt-1 text-sm">
                {year}년 {month}월 공휴일 진료 일정을 확인하고 알림톡을
                보내보세요.
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!pendingFile || saving}
                  className="cursor-pointer rounded-xl bg-[#0e299c] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0a1f78] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? "저장 중..." : "저장하기"}
                </button>
                <button
                  type="button"
                  onClick={() => setSendStep("confirm")}
                  disabled={sendStep === "sending"}
                  className="cursor-pointer rounded-xl bg-[#FEE500] px-4 py-2.5 text-sm font-bold text-[#3C1E1E] transition-all hover:brightness-95 active:scale-[0.99] disabled:opacity-50"
                >
                  {sendStep === "sending" ? "전송 중..." : "알림톡 전송하기"}
                </button>
              </div>
              {saved && (
                <span className="text-xs text-[#0e299c]">저장됐어요 ✓</span>
              )}
              {error && <span className="text-xs text-red-400">{error}</span>}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-8 md:flex-row md:gap-10">
            {/* 왼쪽: 캘린더 (작게) */}
            <div className="md:w-[360px] md:shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  {year}.{pad(month)}
                </h2>
                <span className="text-xs font-semibold text-red-500 bg-red-50 px-2.5 py-1 rounded-full">
                  공휴일 {holidays.length}일
                </span>
              </div>

              {/* 요일 헤더 */}
              <div className="mt-3 grid grid-cols-7 border-b border-gray-100 pb-2">
                {WEEKDAYS.map((w, i) => (
                  <div
                    key={w}
                    className={`text-center text-xs font-semibold ${
                      i === 0
                        ? "text-red-400"
                        : i === 6
                          ? "text-blue-400"
                          : "text-gray-400"
                    }`}
                  >
                    {w}
                  </div>
                ))}
              </div>

              {/* 날짜 그리드 */}
              <div className="grid grid-cols-7 gap-y-1 pt-2">
                {cells.map((d, idx) => {
                  if (d === null)
                    return <div key={idx} className="min-h-[68px]" />;
                  const dateStr = `${year}-${pad(month)}-${pad(d)}`;
                  const holidayName = holidayMap.get(dateStr);
                  const weekday = idx % 7;
                  const numColor = holidayName
                    ? ""
                    : weekday === 0
                      ? "text-red-400"
                      : weekday === 6
                        ? "text-blue-400"
                        : "text-gray-700";
                  return (
                    <div
                      key={idx}
                      className="flex min-h-[68px] flex-col items-center gap-1 pt-1"
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors ${
                          holidayName
                            ? "bg-red-500 text-white font-bold shadow-sm shadow-red-200"
                            : `font-medium ${numColor}`
                        }`}
                      >
                        {d}
                      </span>
                      {holidayName && (
                        <span className="px-0.5 text-[10px] font-semibold leading-tight text-red-500 text-center break-keep">
                          {holidayName}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 원장 회신 현황 */}
              <div className="mt-8">
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-700">
                    원장 회신 현황
                  </h3>
                  {holidays.length > 0 &&
                    (respondedCount === holidays.length ? (
                      <span className="rounded-full bg-[#0e299c]/10 px-2.5 py-1 text-xs font-semibold text-[#0e299c]">
                        회신 완료
                      </span>
                    ) : respondedCount > 0 ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600">
                        {respondedCount}/{holidays.length} 회신
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-400">
                        회신 대기
                      </span>
                    ))}
                </div>

                <p className="mb-3 text-[#6b7684] mt-1 text-sm">
                  원장님이 확인하고 회신한 공휴일 진료여부를 확인할 수 있어요.
                </p>

                {holidays.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    이번 달 공휴일이 없어요.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {holidays.map((h) => {
                      const sc = scheduleMap.get(h.date);
                      return (
                        <div
                          key={h.date}
                          className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-md font-semibold text-gray-800">
                              {dayjs(h.date).format("M월 D일(ddd)")}
                            </p>
                            <p className="text-sm text-red-500">{h.name}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            {!sc ? (
                              <span className="text-xs font-medium text-gray-400">
                                미응답
                              </span>
                            ) : sc.status === "closed" ? (
                              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-500">
                                휴무
                              </span>
                            ) : sc.status === "morning" ? (
                              <div>
                                <span className="rounded-full bg-[#0d9488]/10 px-2.5 py-1 text-xs font-semibold text-[#0d9488]">
                                  오전진료
                                </span>
                                <p className="mt-1 text-md font-medium text-gray-500">
                                  {sc.short_start}~{sc.short_end}
                                  {lunchText(sc) ? ` · ${lunchText(sc)}` : ""}
                                </p>
                              </div>
                            ) : (
                              <div>
                                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-500">
                                  정상진료
                                </span>
                                {lunchText(sc) && (
                                  <p className="mt-1 text-md font-medium text-gray-500">
                                    {lunchText(sc)}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 회신 이력 */}
              <div className="mt-8">
                <h3 className="mb-1 text-lg font-bold text-gray-700">
                  회신 이력
                </h3>
                <p className="mb-3 text-[#6b7684] mt-1 text-sm">
                  원장님이 등록·수정한 시점을 확인할 수 있어요.
                </p>
                {submissions.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    아직 회신 이력이 없어요.
                  </p>
                ) : (
                  <ol className="flex flex-col gap-2.5">
                    {submissions.map((s, i) => {
                      const changes =
                        i === 0
                          ? []
                          : diffSnapshots(
                              submissions[i - 1].schedule,
                              s.schedule
                            );
                      return (
                        <li
                          key={s.id}
                          className="rounded-xl border border-gray-100 p-3"
                        >
                          {/* 배지 + 시각 */}
                          <div className="flex items-center justify-between">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                i === 0
                                  ? "bg-[#0e299c]/10 text-[#0e299c]"
                                  : "bg-amber-50 text-amber-600"
                              }`}
                            >
                              {i === 0 ? "최초 등록" : "수정"}
                            </span>
                            <span className="text-xs text-gray-400">
                              {dayjs(s.submitted_at).format("YYYY.MM.DD HH:mm")}
                            </span>
                          </div>

                          {/* 변경 내역 */}
                          {changes.length > 0 && (
                            <div className="mt-2.5 flex flex-col gap-2">
                              {changes.map((c) => (
                                <div
                                  key={c.date}
                                  className="rounded-lg bg-[#F0F4FA] px-3 py-2"
                                >
                                  <p className="text-xs font-bold text-gray-800">
                                    {dayjs(c.date).format("M월 D일 (ddd)")}{" "}
                                    <span className="text-red-500">
                                      {c.name}
                                    </span>
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                                    <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5 font-medium text-gray-600">
                                      {c.from}
                                    </span>
                                    <ArrowRight
                                      size={13}
                                      className="shrink-0 text-gray-400"
                                    />
                                    <span className="rounded-md bg-[#0e299c] px-2 py-0.5 font-medium text-white">
                                      {c.to}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </div>

            {/* 오른쪽: 배너 업로드 + 알림톡/자세히보기 미리보기 (나란히) */}
            <div className="min-w-0 flex-1 md:border-l md:border-gray-100 md:pl-10">
              <AlimtalkPanel
                hospitalName={hospitalName}
                year={year}
                month={month}
                holidays={holidays}
                bannerUrl={bannerUrl}
                fileName={fileName}
                onSelectFile={handleSelectFile}
              />
            </div>
          </div>
        </div>
      </div>

      {sendStep === "confirm" && (
        <ConfirmToast
          title={hospitalName}
          subtitle={`${month}월 진료일정`}
          message="진료일정 알림톡을 보내시겠어요?"
          onYes={handleSend}
          onNo={() => {
            setSendStep("result");
            setSendMsg("알림톡 보내기를 취소했어요");
          }}
        />
      )}
      {sendStep === "result" && (
        <Toast message={sendMsg} onDone={() => setSendStep("idle")} />
      )}
    </>
  );
}
