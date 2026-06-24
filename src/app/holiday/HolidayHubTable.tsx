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
  region: string | null;
  responded: number; // 응답한 공휴일 수
  customCount: number; // 임의(비공휴일) 휴무 수
  lastSubmittedAt: string | null;
  send: HolidaySendCompany | null;
  configuredRecipients: string[]; // 설정에 등록된 알림톡 수신번호 (비어있으면 미설정)
}

/**
 * 진료일정 허브 테이블 (클라이언트).
 * 체크박스로 병원을 선택해 선택한 곳에만 일괄 발송한다.
 */
export default function HolidayHubTable({
  rows,
  total,
  monthKey,
  query = "",
}: {
  rows: HubRow[];
  total: number;
  monthKey: string;
  /** 디바운스된 상호명 검색어 (HolidayHub의 sticky 헤더에서 내려옴) */
  query?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<"idle" | "confirm" | "sending" | "result">(
    "idle"
  );
  const [resultMsg, setResultMsg] = useState("");
  const headerRef = useRef<HTMLInputElement>(null);

  const filteredRows = rows.filter((r) =>
    r.company.toLowerCase().includes(query.toLowerCase())
  );

  // 전체 선택/indeterminate 는 현재 보이는(필터된) 행 기준
  const allChecked =
    filteredRows.length > 0 &&
    filteredRows.every((r) => selected.has(r.company));
  const someChecked =
    filteredRows.some((r) => selected.has(r.company)) && !allChecked;

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
    setSelected((prev) => {
      const next = new Set(prev);
      const everySelected = filteredRows.every((r) => next.has(r.company));
      if (everySelected) {
        filteredRows.forEach((r) => next.delete(r.company));
      } else {
        filteredRows.forEach((r) => next.add(r.company));
      }
      return next;
    });
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
    "h-4 w-4 shrink-0 cursor-pointer accent-[#0e299c] [color-scheme:light] disabled:cursor-not-allowed";

  return (
    <>
      {/* 선택 발송 툴바 */}
      <div className="flex items-center justify-between pb-3">
        <span className="text-xs text-gray-500">
          {selected.size > 0
            ? `${selected.size}곳 선택됨`
            : query
              ? `검색 결과 ${filteredRows.length}곳`
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
            {filteredRows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-sm text-gray-400"
                >
                  {query ? "검색 결과가 없습니다." : "병원이 없습니다."}
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row) => {
              const complete = total > 0 && row.responded >= total;
              const send = row.send;
              const failed = send?.status === "failed";
              const moreRecipients =
                send && send.recipients.length > 1
                  ? ` 외 ${send.recipients.length - 1}`
                  : "";
              const enc = encodeURIComponent(row.company);
              const href = `/holiday/${enc}/replies?month=${monthKey}`;
              const sendHref = `/holiday/${enc}/send?month=${monthKey}`;
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

                  {/* 병원명 + 지역 */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={href}
                        className="font-bold text-gray-900 hover:text-[#0e299c]"
                      >
                        {row.company}
                      </Link>
                      {row.region && (
                        <Badge
                          variant="secondary"
                          className="bg-gray-100 font-medium text-gray-500"
                        >
                          {row.region}
                        </Badge>
                      )}
                    </div>
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

                  {/* 수신번호 — 발송된 번호가 있으면 그 번호, 없으면 설정 상태 */}
                  <TableCell className="text-gray-500">
                    {send && send.recipients.length > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone size={12} className="text-gray-300" />
                        {send.recipients[0]}
                        {moreRecipients && (
                          <span className="text-gray-400">{moreRecipients}</span>
                        )}
                      </span>
                    ) : row.configuredRecipients.length > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone size={12} className="text-gray-300" />
                        {row.configuredRecipients[0]}
                        {row.configuredRecipients.length > 1 && (
                          <span className="text-gray-400">
                            {` 외 ${row.configuredRecipients.length - 1}`}
                          </span>
                        )}
                      </span>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-amber-200 bg-amber-50 text-amber-600"
                      >
                        번호 미설정
                      </Badge>
                    )}
                  </TableCell>

                  {/* 회신 상태 */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
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
                      {row.customCount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-gray-400"
                          title="원장이 추가한 임의 휴무일"
                        >
                          +{row.customCount} 임시휴무
                        </Badge>
                      )}
                    </div>
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
              })
            )}
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
