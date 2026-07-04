"use server";

import { revalidatePath } from "next/cache";
import {
  getLedgerEntries,
  replaceLedgerEntries,
  type LedgerEntry,
  type LedgerEntryInput,
} from "./db";

/** 조회용 서버 액션 (query-actions 와 동일한 목적: DB 접근을 서버로 고정). */
export async function fetchLedgerEntries(
  company: string,
): Promise<LedgerEntry[]> {
  return getLedgerEntries(company);
}

/**
 * 회사의 입금·소진 거래내역 저장(전량 교체).
 * 빈 행(날짜·업체·금액·내용 모두 비어있음)은 저장 전에 제거한다.
 */
export async function saveLedgerEntries(
  company: string,
  entries: LedgerEntryInput[],
): Promise<void> {
  const cleaned = entries.filter(
    (e) =>
      (e.deposit_date && e.deposit_date.trim()) ||
      (e.vendor && e.vendor.trim()) ||
      e.deposit_amount != null ||
      e.spend_amount != null ||
      (e.contract_note && e.contract_note.trim()),
  );

  await replaceLedgerEntries(company, cleaned);
  revalidatePath(`/ledger/${encodeURIComponent(company)}`);
}
