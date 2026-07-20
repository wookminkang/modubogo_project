"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startGeoRun, executeGeoRun, retryGeoRun, getRunProgress } from "@/lib/geo-actions";
import type { GeoKeyword, GeoRunDetail } from "@/lib/geo-db";
import ChecklistTable from "./ChecklistTable";

// 실행 + 진행률 + 체크리스트. 점검 단위는 "하루에 한 번"이라 날짜로 넘겨 본다.
//
// 서버 액션은 진행 상황을 스트리밍할 수 없어서, executeGeoRun 을 await 하는 동안
// getRunProgress 를 2초마다 폴링해 화면을 채운다.
// (그래서 getRunProgress 는 revalidatePath 를 부르면 안 된다 — 폴링이 막힌다.)
const POLL_MS = 2000;

export default function RunPanel({
  targetId,
  targetName,
  highlightTerms,
  activeCount,
  initialDetail,
  prevRate,
  prevRunDate,
  keywords,
  date,
  today,
  prevDate,
  nextDate,
  checkedDates,
}: {
  targetId: string;
  targetName: string;
  highlightTerms: string[];
  activeCount: number;
  initialDetail: GeoRunDetail | null;
  prevRate: number | null;
  prevRunDate: string | null;
  keywords: GeoKeyword[];
  /** 지금 보고 있는 점검일 (YYYY-MM-DD, 한국 기준). */
  date: string;
  today: string;
  prevDate: string;
  /** 오늘이면 null — 미래 날짜로는 넘어갈 수 없다. */
  nextDate: string | null;
  /** 점검 기록이 있는 날짜들. 화살표 옆 점 표시에 쓴다. */
  checkedDates: string[];
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<GeoRunDetail | null>(initialDetail);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // 서버가 새 데이터를 내려주면(날짜 이동·router.refresh) 그걸 정본으로 받아들인다.
  const [syncedFrom, setSyncedFrom] = useState(initialDetail);
  if (syncedFrom !== initialDetail) {
    setSyncedFrom(initialDetail);
    setDetail(initialDetail);
  }

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  function startPolling(runId: string) {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(async () => {
      const res = await getRunProgress(runId);
      if (res.ok) setDetail(res.data);
    }, POLL_MS);
  }

  function stopPolling() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }

  async function runAll() {
    if (running) return;
    setRunning(true);
    setError(null);
    try {
      const started = await startGeoRun(targetId);
      if (!started.ok) {
        setError(started.error);
        return;
      }
      const { runId } = started.data;
      const first = await getRunProgress(runId);
      if (first.ok) setDetail(first.data);
      startPolling(runId);

      const done = await executeGeoRun(runId);
      stopPolling();
      if (!done.ok) setError(done.error);

      const final = await getRunProgress(runId);
      if (final.ok) setDetail(final.data);
      router.refresh();
    } catch {
      setError("실행을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      stopPolling();
      setRunning(false);
    }
  }

  async function retryFailed() {
    const runId = detail?.run.id;
    if (!runId || running) return;
    setRunning(true);
    setError(null);
    try {
      startPolling(runId);
      const done = await retryGeoRun(runId);
      stopPolling();
      if (!done.ok) setError(done.error);
      const final = await getRunProgress(runId);
      if (final.ok) setDetail(final.data);
      router.refresh();
    } catch {
      setError("재실행을 처리하지 못했습니다.");
    } finally {
      stopPolling();
      setRunning(false);
    }
  }

  const results = detail?.results ?? [];
  const total = results.length;
  const completed = results.filter((r) => r.status !== "pending").length;
  const found = results.filter((r) => r.found === true).length;
  const failed = results.filter((r) => r.status === "error").length;
  const unfinished = results.filter((r) => r.status !== "done").length;
  const rate = total ? found / total : 0;
  const delta = detail && prevRate !== null && !running ? rate - prevRate : null;

  const isToday = date === today;
  const checked = new Set(checkedDates);

  return (
    <div>
      {/* 날짜 이동 — 하루에 한 번 점검이 기본 단위다 */}
      <div className="mb-3 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
        <DateArrow href={`/geo-check/${targetId}?date=${prevDate}`} dot={checked.has(prevDate)}>
          ← {prevDate}
        </DateArrow>

        <div className="text-center">
          <div className="text-[15px] font-bold text-[#333d4b]">
            {date}
            {isToday && <span className="ml-2 text-xs font-semibold text-[#0e299c]">오늘</span>}
          </div>
          <div className="mt-0.5 text-xs text-[#6b7684]">
            {detail ? "점검 완료" : isToday ? "아직 점검 전" : "이 날은 점검하지 않았습니다"}
          </div>
        </div>

        {nextDate ? (
          <DateArrow href={`/geo-check/${targetId}?date=${nextDate}`} dot={checked.has(nextDate)}>
            {nextDate} →
          </DateArrow>
        ) : (
          <span className="w-[104px] text-right text-sm text-gray-300">—</span>
        )}
      </div>

      {/* 요약 밴드 */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            {detail ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-[32px] font-bold leading-none text-[#0e299c]">
                    {Math.round(rate * 100)}%
                  </span>
                  <span className="text-sm text-[#6b7684]">
                    {found}/{total} 노출
                  </span>
                  {delta !== null && delta !== 0 && (
                    <span
                      className={`text-sm font-semibold ${delta > 0 ? "text-[#0e299c]" : "text-red-500"}`}
                    >
                      {delta > 0 ? "▲" : "▼"} {Math.abs(Math.round(delta * 100))}%p
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-[#6b7684]">
                  {new Date(detail.run.startedAt).toLocaleString("ko-KR")}
                  {detail.run.startedBy ? ` · ${detail.run.startedBy}` : ""}
                  {detail.run.model ? ` · ${detail.run.model}` : ""}
                  {failed > 0 ? ` · 실패 ${failed}건` : ""}
                  {prevRunDate ? ` · 직전 점검 ${prevRunDate}` : ""}
                </p>
              </>
            ) : (
              <p className="text-sm text-[#6b7684]">
                {isToday
                  ? `오늘은 아직 점검 전입니다. 활성 키워드 ${activeCount}개로 실행해 보세요.`
                  : "이 날은 점검 기록이 없습니다. 점검은 그날 당일에만 실행할 수 있습니다."}
              </p>
            )}
          </div>

          {/* 점검은 오늘 날짜에만 실행한다 — 지난 날짜를 소급해 채울 수는 없다 */}
          {isToday && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={runAll}
                disabled={running || activeCount === 0}
                className="rounded-lg bg-[#0e299c] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0a1f7a] disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {running ? "점검 중…" : detail ? "다시 점검" : "오늘 점검 실행"}
              </button>
              {detail && unfinished > 0 && (
                <button
                  type="button"
                  onClick={retryFailed}
                  disabled={running}
                  className="rounded-lg border border-[#0e299c] px-4 py-2.5 text-sm font-semibold text-[#0e299c] transition-colors hover:bg-[#0e299c]/5 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300"
                >
                  미완료 {unfinished}건만 재실행
                </button>
              )}
            </div>
          )}
        </div>

        {running && total > 0 && (
          <div className="mt-5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[#0e299c] transition-all duration-500"
                style={{ width: `${total ? (completed / total) * 100 : 0}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[#6b7684]">
              {completed}/{total} 완료 — 키워드마다 ChatGPT가 웹 검색을 하므로 1~3분 걸릴 수
              있습니다. 이 탭을 벗어나도 결과는 저장됩니다.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* 점검 안 한 날도 표는 보여준다 — 그날 칸이 전부 공란(미점검)이 된다. */}
      {(keywords.length > 0 || results.length > 0) && (
        <div className="mt-6">
          <ChecklistTable
            targetId={targetId}
            targetName={targetName}
            highlightTerms={highlightTerms}
            date={date}
            hasRun={!!detail}
            results={results}
            keywords={keywords}
          />
        </div>
      )}
    </div>
  );
}

/** 날짜 이동 링크. 점검 기록이 있는 날은 점으로 표시해 빈 날을 헤매지 않게 한다. */
function DateArrow({
  href,
  dot,
  children,
}: {
  href: string;
  dot: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex w-[104px] items-center gap-1.5 text-sm font-semibold text-[#6b7684] transition-colors hover:text-[#0e299c]"
    >
      {children}
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-[#0e299c]" />}
    </Link>
  );
}
