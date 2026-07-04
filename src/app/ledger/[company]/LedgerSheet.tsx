"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Check, Loader2, AlertCircle } from "lucide-react";
import type { LedgerEntry, LedgerEntryInput } from "@/lib/db";
import { saveLedgerEntries } from "@/lib/ledger-actions";

interface Row {
  key: string;
  deposit_date: string; // 'YYYY-MM-DD' or ''
  vendor: string;
  deposit: string; // digits only, '' if none
  spend: string; // digits only, '' if none
  note: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface Props {
  company: string;
  initialEntries: LedgerEntry[];
  today: string;
}

/** 저장 디바운스(ms) — 입력을 멈추면 자동 저장. */
const SAVE_DELAY = 900;

/** 기본으로 보여줄 최소 행 수 (빈 행은 저장 시 자동 제외). */
const MIN_ROWS = 8;

function emptyRow(key: string): Row {
  return { key, deposit_date: "", vendor: "", deposit: "", spend: "", note: "" };
}

/** 숫자(원) → "₩10,281,964" / 음수 "-₩2,255,000". */
function formatKRW(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}₩${Math.abs(n).toLocaleString("ko-KR")}`;
}

/** 입력 표시용: 숫자 문자열 → "₩10,281,964" (없으면 ''). */
function withWon(digits: string): string {
  return digits ? formatKRW(parseInt(digits, 10)) : "";
}

/** 입력값에서 숫자만 추출. */
function onlyDigits(v: string): string {
  return v.replace(/[^\d]/g, "");
}

function toPayload(rows: Row[]): LedgerEntryInput[] {
  return rows.map((r, i) => ({
    deposit_date: r.deposit_date || null,
    vendor: r.vendor.trim(),
    deposit_amount: r.deposit ? parseInt(r.deposit, 10) : null,
    spend_amount: r.spend ? parseInt(r.spend, 10) : null,
    contract_note: r.note.trim(),
    sort_order: i,
  }));
}

export default function LedgerSheet({ company, initialEntries, today }: Props) {
  const [rows, setRows] = useState<Row[]>(() => {
    const base: Row[] = initialEntries.map((e) => ({
      key: `init-${e.id}`,
      deposit_date: e.deposit_date ?? "",
      vendor: e.vendor ?? "",
      deposit: e.deposit_amount != null ? String(e.deposit_amount) : "",
      spend: e.spend_amount != null ? String(e.spend_amount) : "",
      note: e.contract_note ?? "",
    }));
    // 기본 8행 채우기 — 저장된 행이 8개 미만이면 빈 행으로 패딩
    const pad = Array.from({ length: Math.max(0, MIN_ROWS - base.length) }, (_, i) =>
      emptyRow(`empty-${i}`),
    );
    return [...base, ...pad];
  });
  const [status, setStatus] = useState<SaveStatus>("idle");

  // ── 자동 저장(디바운스 + 직렬화 큐) ──────────────────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const pendingRef = useRef<Row[] | null>(null);

  // 언마운트 시 대기 중인 타이머 정리
  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const runSave = async () => {
    if (savingRef.current) return; // 진행 중이면 끝난 뒤 큐에서 처리
    const snapshot = pendingRef.current;
    if (!snapshot) return;
    pendingRef.current = null;
    savingRef.current = true;
    setStatus("saving");
    try {
      await saveLedgerEntries(company, toPayload(snapshot));
      setStatus(pendingRef.current ? "saving" : "saved");
    } catch {
      setStatus("error");
    } finally {
      savingRef.current = false;
      if (pendingRef.current) void runSave(); // 큐 소진
    }
  };

  const scheduleSave = (next: Row[]) => {
    pendingRef.current = next;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => void runSave(), SAVE_DELAY);
  };

  /** 행 변경 → 상태 반영 + 자동 저장 예약 */
  const apply = (next: Row[]) => {
    setRows(next);
    scheduleSave(next);
  };

  const updateRow = (key: string, patch: Partial<Row>) =>
    apply(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const addRow = () => apply([...rows, emptyRow(`new-${crypto.randomUUID()}`)]);

  const removeRow = (key: string) => apply(rows.filter((r) => r.key !== key));

  const retrySave = () => {
    pendingRef.current = rows;
    void runSave();
  };

  // ── 월별 요약 (거래 상세내역에서 자동 집계) ──────────────────
  const summary = useMemo(() => {
    const map = new Map<string, { deposit: number; spend: number }>();
    for (const r of rows) {
      const m = r.deposit_date ? r.deposit_date.slice(0, 7) : "";
      if (!m) continue;
      const acc = map.get(m) ?? { deposit: 0, spend: 0 };
      acc.deposit += r.deposit ? parseInt(r.deposit, 10) : 0;
      acc.spend += r.spend ? parseInt(r.spend, 10) : 0;
      map.set(m, acc);
    }
    const months = Array.from(map.keys()).sort();
    const balances = months.map((m) => {
      const { deposit, spend } = map.get(m)!;
      return { month: m, deposit, spend, balance: deposit - spend };
    });
    // 누적 잔액 = 해당 월까지의 당월 잔액 누계 (변수 재할당 없이 prefix-sum)
    const monthRows = balances.map((b, i) => ({
      ...b,
      cumulative: balances.slice(0, i + 1).reduce((s, x) => s + x.balance, 0),
    }));
    const totalDeposit = monthRows.reduce((s, r) => s + r.deposit, 0);
    const totalSpend = monthRows.reduce((s, r) => s + r.spend, 0);
    return {
      monthRows,
      totalDeposit,
      totalSpend,
      totalBalance: totalDeposit - totalSpend,
    };
  }, [rows]);

  // ── 스타일 상수 ─────────────────────────────────────────────
  const HEAD = "bg-[#3b5bd9] text-white";
  const cell = "border border-[#d6dcec] px-3 py-2.5";
  // 거래 상세내역 헤더 — 자체 스크롤 영역 안에서 상단 고정
  const headCell = `${cell} ${HEAD} sticky top-0 z-10 font-semibold`;
  const inputCls =
    "w-full bg-transparent px-1 py-0.5 text-sm outline-none focus:bg-[#eef2fd] rounded";

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm md:p-7">
      {/* ── 자동 저장 상태 표시 ─────────────────────────────── */}
      <div className="mb-3 flex h-7 items-center justify-end">
        {status === "saving" && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400">
            <Loader2 size={15} className="animate-spin" />
            저장 중…
          </span>
        )}
        {status === "saved" && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1f9d55]">
            <Check size={15} />
            저장됨
          </span>
        )}
        {status === "error" && (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[#c0392b]">
            <AlertCircle size={15} />
            저장 실패
            <button
              onClick={retrySave}
              className="rounded-md bg-[#c0392b]/10 px-2 py-0.5 text-xs font-semibold text-[#c0392b] hover:bg-[#c0392b]/15"
            >
              다시 시도
            </button>
          </span>
        )}
        {status === "idle" && (
          <span className="text-sm text-gray-300">입력하면 자동 저장돼요</span>
        )}
      </div>

      {/* 제목 바 */}
      <div className="rounded-md border-2 border-[#1c1c2e] bg-[#3b5bd9] px-4 py-3 text-center">
        <h1 className="text-lg font-bold text-white md:text-2xl">
          {company}
          <span className="mx-2 font-normal opacity-80">·</span>
          입금·소진 관리내역
        </h1>
      </div>
      <p className="mt-2 mb-5 text-center text-xs text-gray-400 md:text-sm">
        단위: 원(VAT 포함)
        <span className="mx-3 text-gray-300">|</span>
        최종 업데이트: <span className="text-gray-500">{today}</span>
      </p>

      {/* ── 월별 요약 ───────────────────────────────────────── */}
      <div className={`rounded-t-md py-2 text-center text-sm font-bold ${HEAD}`}>
        월별 요약
      </div>
      <div className="mb-8 overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <thead>
            <tr className={HEAD}>
              <th className={`${cell} font-semibold`}>월</th>
              <th className={`${cell} font-semibold`}>입금금액</th>
              <th className={`${cell} font-semibold`}>소진금액</th>
              <th className={`${cell} font-semibold`}>당월 잔액</th>
              <th className={`${cell} font-semibold`}>누적 잔액</th>
            </tr>
          </thead>
          <tbody>
            {summary.monthRows.map((r, i) => (
              <tr key={r.month} className={i % 2 ? "bg-[#f4f7fe]" : "bg-white"}>
                <td className={`${cell} text-center font-semibold text-gray-800`}>
                  {r.month}
                </td>
                <td className={`${cell} text-right font-semibold text-[#2563eb]`}>
                  {r.deposit ? formatKRW(r.deposit) : "-"}
                </td>
                <td className={`${cell} text-right font-semibold text-[#c0392b]`}>
                  {r.spend ? formatKRW(r.spend) : "-"}
                </td>
                <td
                  className={`${cell} text-right font-semibold ${
                    r.balance < 0 ? "text-[#c0392b]" : "text-gray-800"
                  }`}
                >
                  {formatKRW(r.balance)}
                </td>
                <td
                  className={`${cell} text-right font-semibold ${
                    r.cumulative < 0 ? "text-[#c0392b]" : "text-gray-800"
                  }`}
                >
                  {formatKRW(r.cumulative)}
                </td>
              </tr>
            ))}
            {summary.monthRows.length === 0 && (
              <tr className="bg-white">
                <td className={`${cell} text-center text-gray-400`} colSpan={5}>
                  거래내역을 추가하면 월별 요약이 자동 계산됩니다.
                </td>
              </tr>
            )}
            {summary.monthRows.length > 0 && (
              <tr className="bg-[#eef2fd] font-bold">
                <td className={`${cell} text-center text-gray-900`}>합계</td>
                <td className={`${cell} text-right text-[#2563eb]`}>
                  {formatKRW(summary.totalDeposit)}
                </td>
                <td className={`${cell} text-right text-[#c0392b]`}>
                  {formatKRW(summary.totalSpend)}
                </td>
                <td
                  className={`${cell} text-right ${
                    summary.totalBalance < 0 ? "text-[#c0392b]" : "text-gray-900"
                  }`}
                >
                  {formatKRW(summary.totalBalance)}
                </td>
                <td
                  className={`${cell} text-right ${
                    summary.totalBalance < 0 ? "text-[#c0392b]" : "text-gray-900"
                  }`}
                >
                  {formatKRW(summary.totalBalance)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── 거래 상세내역 (항상 편집 가능 · 자동 저장) ───────── */}
      <div className={`rounded-t-md py-2 text-center text-sm font-bold ${HEAD}`}>
        거래 상세내역
      </div>
      <div className="max-h-[60vh] overflow-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr>
              <th className={`${headCell} w-[140px]`}>입금날짜</th>
              <th className={headCell}>업체명</th>
              <th className={`${headCell} w-[150px]`}>입금 (VAT포함)</th>
              <th className={`${headCell} w-[150px]`}>소진 (VAT포함)</th>
              <th className={headCell}>계약내용</th>
              <th className={`${headCell} w-[52px]`}> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key} className={i % 2 ? "bg-[#f4f7fe]" : "bg-white"}>
                <td className={cell}>
                  <input
                    type="date"
                    value={r.deposit_date}
                    onChange={(e) =>
                      updateRow(r.key, { deposit_date: e.target.value })
                    }
                    className={inputCls}
                  />
                </td>
                <td className={cell}>
                  <input
                    value={r.vendor}
                    onChange={(e) => updateRow(r.key, { vendor: e.target.value })}
                    placeholder="업체명"
                    className={`${inputCls} font-semibold`}
                  />
                </td>
                <td className={cell}>
                  <input
                    inputMode="numeric"
                    value={withWon(r.deposit)}
                    onChange={(e) =>
                      updateRow(r.key, { deposit: onlyDigits(e.target.value) })
                    }
                    placeholder="₩0"
                    className={`${inputCls} text-right text-[#2563eb]`}
                  />
                </td>
                <td className={cell}>
                  <input
                    inputMode="numeric"
                    value={withWon(r.spend)}
                    onChange={(e) =>
                      updateRow(r.key, { spend: onlyDigits(e.target.value) })
                    }
                    placeholder="₩0"
                    className={`${inputCls} text-right text-[#c0392b]`}
                  />
                </td>
                <td className={cell}>
                  <input
                    value={r.note}
                    onChange={(e) => updateRow(r.key, { note: e.target.value })}
                    placeholder="계약내용"
                    className={inputCls}
                  />
                </td>
                <td className={`${cell} text-center`}>
                  <button
                    onClick={() => removeRow(r.key)}
                    className="inline-flex text-gray-300 transition-colors hover:text-[#c0392b]"
                    aria-label="행 삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="bg-white">
                <td className={`${cell} text-center text-gray-400`} colSpan={6}>
                  아래 “행 추가”를 눌러 거래내역을 입력하세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── 합계 (거래 상세내역 표 바로 아래에 붙임) ─────────── */}
      <div className="overflow-hidden rounded-b-md border border-t-0 border-[#2f4bc0]">
        <div className="grid grid-cols-2">
          <div className="border-b border-[#2f4bc0] bg-[#3b5bd9] px-5 py-3 text-sm font-bold text-white md:text-base">
            총 입금금액 (VAT 포함)
          </div>
          <div className="border-b border-l border-[#2f4bc0] bg-[#4364db] px-5 py-3 text-right text-sm font-bold text-white md:text-base">
            {formatKRW(summary.totalDeposit)}
          </div>
        </div>
        <div className="grid grid-cols-2">
          <div className="border-b border-[#2f4bc0] bg-[#3b5bd9] px-5 py-3 text-sm font-bold text-white md:text-base">
            총 소진금액 (VAT 포함)
          </div>
          <div className="border-b border-l border-[#2f4bc0] bg-[#4364db] px-5 py-3 text-right text-sm font-bold text-white md:text-base">
            {formatKRW(summary.totalSpend)}
          </div>
        </div>
        <div className="grid grid-cols-2 bg-[#5872e6]">
          <div className="px-5 py-3 text-sm font-bold text-white md:text-base">
            잔여 금액 (VAT 포함)
          </div>
          <div
            className={`border-l border-[#2f4bc0] px-5 py-3 text-right text-sm font-bold md:text-base ${
              summary.totalBalance < 0 ? "text-[#ff5c5c]" : "text-white"
            }`}
          >
            {formatKRW(summary.totalBalance)}
          </div>
        </div>
      </div>

      <button
        onClick={addRow}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#b9c4e0] px-4 py-2.5 text-sm font-semibold text-[#0e299c] transition-colors hover:bg-[#eef2fd]"
      >
        <Plus size={16} />
        행 추가
      </button>
    </div>
  );
}
