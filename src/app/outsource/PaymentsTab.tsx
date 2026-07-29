"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Check, Loader2, AlertCircle } from "lucide-react";
import { savePaymentsAction } from "@/lib/payment-actions";
import type {
  Designer,
  OutsourcePayment,
  OutsourcePaymentInput,
} from "@/lib/db";

/** 저장 디바운스(ms) — 입력을 멈추면 자동 저장. (LedgerSheet 와 동일 규칙) */
const SAVE_DELAY = 900;

/** 기본으로 보여줄 최소 행 수 (빈 행은 저장 시 자동 제외). */
const MIN_ROWS = 6;

interface Row {
  /** DB PK. 새 행도 클라이언트에서 uuid 를 발급해 upsert 키로 쓴다. */
  id: string;
  partnerId: string;
  taskName: string;
  amount: string; // digits only, '' if none
  payDate: string; // 'YYYY-MM-DD' or ''
  paid: boolean;
  memo: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

const formatKRW = (n: number) =>
  `${n < 0 ? "-" : ""}₩${Math.abs(n).toLocaleString("ko-KR")}`;
const withWon = (digits: string) =>
  digits ? formatKRW(parseInt(digits, 10)) : "";
const onlyDigits = (v: string) => v.replace(/[^\d]/g, "");

const emptyRow = (): Row => ({
  id: crypto.randomUUID(),
  partnerId: "",
  taskName: "",
  amount: "",
  payDate: "",
  paid: false,
  memo: "",
});

/** 아무것도 입력되지 않은 행은 저장하지 않는다. */
const isBlank = (r: Row) =>
  !r.partnerId && !r.taskName.trim() && !r.amount && !r.payDate && !r.memo.trim();

export default function PaymentsTab({
  payments,
  partners,
}: {
  payments: OutsourcePayment[];
  /** 지급 대상 선택지 (디자이너 + 개발자) */
  partners: Designer[];
}) {
  const [rows, setRows] = useState<Row[]>(() => {
    const base: Row[] = payments.map((p) => ({
      id: p.id,
      partnerId: p.partner_id ?? "",
      taskName: p.task_name ?? "",
      amount: p.amount != null ? String(p.amount) : "",
      payDate: p.pay_date ?? "",
      paid: p.paid,
      memo: p.memo ?? "",
    }));
    const pad = Array.from({ length: Math.max(0, MIN_ROWS - base.length) }, () =>
      emptyRow(),
    );
    return [...base, ...pad];
  });
  const [status, setStatus] = useState<SaveStatus>("idle");

  const partnerName = useMemo(
    () => new Map(partners.map((p) => [p.id, p.name])),
    [partners],
  );
  const designers = partners.filter((p) => p.role === "designer");
  const developers = partners.filter((p) => p.role === "developer");

  // ── 자동 저장(디바운스 + 직렬화 큐) ──────────────────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const pendingRef = useRef<Row[] | null>(null);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const toPayload = (list: Row[]): OutsourcePaymentInput[] =>
    list
      .filter((r) => !isBlank(r))
      .map((r, i) => ({
        id: r.id,
        partner_id: r.partnerId || null,
        // 파트너가 나중에 삭제돼도 누구에게 나간 돈인지 남도록 이름을 함께 저장
        partner_name: r.partnerId ? (partnerName.get(r.partnerId) ?? null) : null,
        task_name: r.taskName.trim(),
        amount: r.amount ? parseInt(r.amount, 10) : null,
        pay_date: r.payDate || null,
        paid: r.paid,
        memo: r.memo.trim(),
        sort_order: i,
      }));

  const runSave = async () => {
    if (savingRef.current) return; // 진행 중이면 끝난 뒤 큐에서 처리
    const snapshot = pendingRef.current;
    if (!snapshot) return;
    pendingRef.current = null;
    savingRef.current = true;
    setStatus("saving");
    try {
      await savePaymentsAction(toPayload(snapshot));
      setStatus(pendingRef.current ? "saving" : "saved");
    } catch {
      setStatus("error");
    } finally {
      savingRef.current = false;
      if (pendingRef.current) void runSave();
    }
  };

  const scheduleSave = (next: Row[]) => {
    pendingRef.current = next;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => void runSave(), SAVE_DELAY);
  };

  const apply = (next: Row[]) => {
    setRows(next);
    scheduleSave(next);
  };

  const updateRow = (id: string, patch: Partial<Row>) =>
    apply(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addRow = () => apply([...rows, emptyRow()]);
  const removeRow = (id: string) => apply(rows.filter((r) => r.id !== id));
  const retrySave = () => {
    pendingRef.current = rows;
    void runSave();
  };

  // ── 집계: 월별 요약 + 총계 ───────────────────────────────────
  const summary = useMemo(() => {
    const map = new Map<string, { paid: number; unpaid: number; count: number }>();
    let totalPaid = 0;
    let totalUnpaid = 0;

    for (const r of rows) {
      if (isBlank(r)) continue;
      const won = r.amount ? parseInt(r.amount, 10) : 0;
      if (r.paid) totalPaid += won;
      else totalUnpaid += won;

      const m = r.payDate ? r.payDate.slice(0, 7) : "";
      if (!m) continue;
      const acc = map.get(m) ?? { paid: 0, unpaid: 0, count: 0 };
      acc.count += 1;
      if (r.paid) acc.paid += won;
      else acc.unpaid += won;
      map.set(m, acc);
    }

    const monthRows = Array.from(map.keys())
      .sort()
      .map((month) => {
        const v = map.get(month)!;
        return { month, ...v, total: v.paid + v.unpaid };
      });

    return { monthRows, totalPaid, totalUnpaid, total: totalPaid + totalUnpaid };
  }, [rows]);

  // ── 스타일 상수 (LedgerSheet 와 동일 시트 톤) ────────────────
  const HEAD = "bg-[#3b5bd9] text-white";
  const cell = "border border-[#d6dcec] px-3 py-2.5";
  const headCell = `${cell} ${HEAD} sticky top-0 z-10 font-semibold`;
  const inputCls =
    "w-full bg-transparent px-1 py-0.5 text-sm outline-none focus:bg-[#eef2fd] rounded";

  return (
    <div className="mt-5">
      {/* 저장 상태 */}
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

      {/* ── 월별 요약 ─────────────────────────────────────────── */}
      <div className={`rounded-t-md py-2 text-center text-sm font-bold ${HEAD}`}>
        월별 요약
      </div>
      <div className="mb-8 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className={HEAD}>
              <th className={`${cell} font-semibold`}>월</th>
              <th className={`${cell} font-semibold`}>건수</th>
              <th className={`${cell} font-semibold`}>지급완료</th>
              <th className={`${cell} font-semibold`}>미지급</th>
              <th className={`${cell} font-semibold`}>합계</th>
            </tr>
          </thead>
          <tbody>
            {summary.monthRows.map((r, i) => (
              <tr key={r.month} className={i % 2 ? "bg-[#f4f7fe]" : "bg-white"}>
                <td className={`${cell} text-center font-semibold text-gray-800`}>
                  {r.month}
                </td>
                <td className={`${cell} text-center text-gray-500`}>{r.count}</td>
                <td className={`${cell} text-right font-semibold text-[#1f9d55]`}>
                  {r.paid ? formatKRW(r.paid) : "-"}
                </td>
                <td className={`${cell} text-right font-semibold text-[#c0392b]`}>
                  {r.unpaid ? formatKRW(r.unpaid) : "-"}
                </td>
                <td className={`${cell} text-right font-semibold text-gray-800`}>
                  {formatKRW(r.total)}
                </td>
              </tr>
            ))}
            {summary.monthRows.length === 0 && (
              <tr className="bg-white">
                <td className={`${cell} text-center text-gray-400`} colSpan={5}>
                  지급일을 입력하면 월별 요약이 자동 계산됩니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── 지급 상세내역 ─────────────────────────────────────── */}
      <div className={`rounded-t-md py-2 text-center text-sm font-bold ${HEAD}`}>
        지급 상세내역
      </div>
      <div className="max-h-[60vh] overflow-auto">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead>
            <tr>
              <th className={`${headCell} w-[140px]`}>지급일</th>
              <th className={`${headCell} w-[150px]`}>파트너</th>
              <th className={headCell}>작업명</th>
              <th className={`${headCell} w-[150px]`}>금액 (VAT포함)</th>
              <th className={`${headCell} w-[92px]`}>지급완료</th>
              <th className={headCell}>메모</th>
              <th className={`${headCell} w-[52px]`}> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className={i % 2 ? "bg-[#f4f7fe]" : "bg-white"}>
                <td className={cell}>
                  <input
                    type="date"
                    value={r.payDate}
                    onChange={(e) => updateRow(r.id, { payDate: e.target.value })}
                    className={inputCls}
                  />
                </td>
                <td className={cell}>
                  <select
                    value={r.partnerId}
                    onChange={(e) =>
                      updateRow(r.id, { partnerId: e.target.value })
                    }
                    className={`${inputCls} font-semibold`}
                  >
                    <option value="">선택</option>
                    {designers.length > 0 && (
                      <optgroup label="디자이너">
                        {designers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {developers.length > 0 && (
                      <optgroup label="개발자">
                        {developers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </td>
                <td className={cell}>
                  <input
                    value={r.taskName}
                    onChange={(e) => updateRow(r.id, { taskName: e.target.value })}
                    placeholder="작업명"
                    className={inputCls}
                  />
                </td>
                <td className={cell}>
                  <input
                    inputMode="numeric"
                    value={withWon(r.amount)}
                    onChange={(e) =>
                      updateRow(r.id, { amount: onlyDigits(e.target.value) })
                    }
                    placeholder="₩0"
                    className={`${inputCls} text-right font-semibold ${
                      r.paid ? "text-[#1f9d55]" : "text-[#c0392b]"
                    }`}
                  />
                </td>
                <td className={`${cell} text-center`}>
                  <input
                    type="checkbox"
                    checked={r.paid}
                    onChange={(e) => updateRow(r.id, { paid: e.target.checked })}
                    aria-label="지급완료"
                    className="h-4 w-4 accent-[#1f9d55]"
                  />
                </td>
                <td className={cell}>
                  <input
                    value={r.memo}
                    onChange={(e) => updateRow(r.id, { memo: e.target.value })}
                    placeholder="메모"
                    className={inputCls}
                  />
                </td>
                <td className={`${cell} text-center`}>
                  <button
                    onClick={() => removeRow(r.id)}
                    className="inline-flex text-gray-300 transition-colors hover:text-[#c0392b]"
                    aria-label="행 삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 총계 ──────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-b-md border border-t-0 border-[#2f4bc0]">
        <div className="grid grid-cols-2">
          <div className="border-b border-[#2f4bc0] bg-[#3b5bd9] px-5 py-3 text-sm font-bold text-white md:text-base">
            지급완료 합계
          </div>
          <div className="border-b border-l border-[#2f4bc0] bg-[#4364db] px-5 py-3 text-right text-sm font-bold text-white md:text-base">
            {formatKRW(summary.totalPaid)}
          </div>
        </div>
        <div className="grid grid-cols-2">
          <div className="border-b border-[#2f4bc0] bg-[#3b5bd9] px-5 py-3 text-sm font-bold text-white md:text-base">
            미지급 합계
          </div>
          <div
            className={`border-b border-l border-[#2f4bc0] bg-[#4364db] px-5 py-3 text-right text-sm font-bold md:text-base ${
              summary.totalUnpaid > 0 ? "text-[#ffd76e]" : "text-white"
            }`}
          >
            {formatKRW(summary.totalUnpaid)}
          </div>
        </div>
        <div className="grid grid-cols-2 bg-[#5872e6]">
          <div className="px-5 py-3 text-sm font-bold text-white md:text-base">
            총 외주비 (VAT 포함)
          </div>
          <div className="border-l border-[#2f4bc0] px-5 py-3 text-right text-sm font-bold text-white md:text-base">
            {formatKRW(summary.total)}
          </div>
        </div>
      </div>

      <button
        onClick={addRow}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#b9c4e0] px-4 py-2.5 text-sm font-semibold text-[#0e299c] transition-colors hover:bg-[#eef2fd]"
      >
        <Plus size={16} />행 추가
      </button>

      {partners.length === 0 && (
        <p className="mt-3 text-xs text-gray-400">
          · “디자이너”·“개발자” 탭에서 파트너를 먼저 등록하면 지급 대상에서 고를 수 있어요.
        </p>
      )}
    </div>
  );
}
