"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send, Phone } from "lucide-react";
import dayjs from "@/lib/dayjs";
import type { HolidaySendCompany } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Toast from "@/components/Toast";
import ConfirmToast from "@/components/ConfirmToast";
import { sendBulkHolidayAlimtalk } from "./actions";

export interface HubRow {
  company: string;
  responded: number;
  lastSubmittedAt: string | null;
  send: HolidaySendCompany | null;
}

/**
 * 진료일정 허브 테이블 (클라이언트).
 * 체크박스로 병원을 선택해 선택한 곳에만 일괄 발송한다.
 */
export default function HolidayHubTable({
  rows,
  total,
  monthKey,
}: {
  rows: HubRow[];
  total: number;
  monthKey: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<"idle" | "confirm" | "sending" | "result">(
    "idle"
  );
  const [resultMsg, setResultMsg] = useState("");
  const headerRef = useRef<HTMLInputElement>(null);

  const allChecked = rows.length > 0 && selected.size === rows.length;
  const someChecked = selected.size > 0 && !allChecked;

  // 헤더 체크박스 indeterminate 상태
  useEffect(() => {
    if (headerRef.current) headerRef.current.indeterminate = someChecked;
  }, [someChecked]);

  const toggle = (company: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(company)) next.delete(company);
      else next.add(company);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.company))
    );
  };

  const handleSend = async () => {
    setStep("sending");
    try {
      const { sent, failed } = await sendBulkHolidayAlimtalk(
        Array.from(selected),
        monthKey
      );
      setResultMsg(
        failed.length === 0
          ? `${sent.length}곳에 발송했어요 ✅`
          : `${sent.length}곳 발송 · ${failed.length}곳 실패`
      );
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      setResultMsg(`발송 실패: ${msg}`);
    }
    setStep("result");
  };

  const checkbox =
    "h-4 w-4 shrink-0 cursor-pointer accent-[#0e299c] disabled:cursor-not-allowed";

  return (
    <>
      {/* 선택 발송 툴바 */}
      <div className="flex items-center justify-between pb-3">
        <span className="text-xs text-gray-500">
          {selected.size > 0
            ? `${selected.size}곳 선택됨`
            : `전체 ${rows.length}곳`}
        </span>
        <button
          type="button"
          onClick={() => setStep("confirm")}
          disabled={selected.size === 0 || step === "sending"}
          className="cursor-pointer rounded-lg bg-[#0e299c] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#0a1f78] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
        >
          {step === "sending"
            ? "발송 중..."
            : `선택 발송하기${selected.size > 0 ? ` (${selected.size})` : ""}`}
        </button>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <input
                  ref={headerRef}
                  type="checkbox"
                  className={checkbox}
                  checked={allChecked}
                  onChange={toggleAll}
                  aria-label="전체 선택"
                />
              </TableHead>
              <TableHead className="text-gray-500">병원</TableHead>
              <TableHead className="text-gray-500">발송</TableHead>
              <TableHead className="text-gray-500">발송 시각</TableHead>
              <TableHead className="text-gray-500">수신번호</TableHead>
              <TableHead className="text-gray-500">회신 상태</TableHead>
              <TableHead className="text-right text-gray-500">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const complete = total > 0 && row.responded >= total;
              const send = row.send;
              const failed = send?.status === "failed";
              const moreRecipients =
                send && send.recipients.length > 1
                  ? ` 외 ${send.recipients.length - 1}`
                  : "";
              const enc = encodeURIComponent(row.company);
              const href = `/report/${enc}/holiday/replies?month=${monthKey}`;
              const sendHref = `/report/${enc}/holiday?month=${monthKey}`;
              const checked = selected.has(row.company);

              return (
                <TableRow
                  key={row.company}
                  className="border-gray-100"
                  data-state={checked ? "selected" : undefined}
                >
                  {/* 선택 체크박스 */}
                  <TableCell>
                    <input
                      type="checkbox"
                      className={checkbox}
                      checked={checked}
                      onChange={() => toggle(row.company)}
                      aria-label={`${row.company} 선택`}
                    />
                  </TableCell>

                  {/* 병원명 */}
                  <TableCell>
                    <Link
                      href={href}
                      className="font-bold text-gray-900 hover:text-[#0e299c]"
                    >
                      {row.company}
                    </Link>
                  </TableCell>

                  {/* 발송 여부 */}
                  <TableCell>
                    {!send ? (
                      <Badge variant="outline" className="text-gray-400">
                        미발송
                      </Badge>
                    ) : failed ? (
                      <Badge variant="destructive">
                        <Send />
                        발송 실패
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-gray-700">
                        <Send />
                        발송
                        {send.sendCount > 1 && ` ${send.sendCount}회`}
                      </Badge>
                    )}
                  </TableCell>

                  {/* 발송 시각 */}
                  <TableCell className="text-gray-500">
                    {send
                      ? dayjs(send.lastSentAt).format("YYYY.MM.DD HH:mm:ss")
                      : "—"}
                  </TableCell>

                  {/* 수신번호 */}
                  <TableCell className="text-gray-500">
                    {send && send.recipients.length > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone size={12} className="text-gray-300" />
                        {send.recipients[0]}
                        {moreRecipients && (
                          <span className="text-gray-400">{moreRecipients}</span>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>

                  {/* 회신 상태 */}
                  <TableCell>
                    {complete ? (
                      <Badge className="bg-[#0e299c]/10 text-[#0e299c]">
                        회신 완료
                      </Badge>
                    ) : row.responded > 0 ? (
                      <Badge className="bg-amber-50 text-amber-600">
                        {row.responded}/{total} 회신
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-gray-500">
                        회신 대기
                      </Badge>
                    )}
                  </TableCell>

                  {/* 행별 액션 */}
                  <TableCell>
                    <div className="flex items-center justify-end gap-1.5">
                      {!send ? (
                        <Link
                          href={sendHref}
                          className="rounded-lg bg-[#0e299c] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0a1f78]"
                        >
                          발송하기
                        </Link>
                      ) : (
                        <>
                          <Link
                            href={sendHref}
                            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#0e299c]"
                          >
                            재발송
                          </Link>
                          <Link
                            href={href}
                            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#0e299c]"
                          >
                            회신확인
                          </Link>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {step === "confirm" && (
        <ConfirmToast
          title={`${selected.size}곳 선택`}
          subtitle={`${monthKey} 진료일정`}
          message="선택한 병원에 진료일정 알림톡을 보내시겠어요?"
          onYes={handleSend}
          onNo={() => {
            setResultMsg("일괄 발송을 취소했어요");
            setStep("result");
          }}
        />
      )}
      {step === "result" && (
        <Toast message={resultMsg} onDone={() => setStep("idle")} />
      )}
    </>
  );
}
