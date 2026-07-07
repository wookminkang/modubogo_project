"use server";

import { revalidatePath } from "next/cache";
import {
  getLedgerEntries,
  replaceLedgerEntries,
  updateLedgerAdSettings,
  type LedgerEntry,
  type LedgerEntryInput,
  type LedgerAdSettings,
} from "./db";
import { getAdminUser } from "./admin";

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

/**
 * 광고 배너 설정 저장(관리자 전용). url 은 http(s)로 정규화한다.
 * 노출(enabled)이면서 url 이 비어있으면 저장을 막는다.
 */
export async function saveLedgerAdSettings(
  company: string,
  settings: LedgerAdSettings,
): Promise<void> {
  const admin = await getAdminUser();
  if (!admin) throw new Error("권한이 없습니다.");

  let url = settings.url.trim();
  if (settings.enabled && !url) {
    throw new Error("배너를 노출하려면 이동할 링크를 입력해주세요.");
  }
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;

  await updateLedgerAdSettings(company, { enabled: settings.enabled, url });
  revalidatePath(`/ledger/${encodeURIComponent(company)}`);
  revalidatePath(`/ledger/${encodeURIComponent(company)}/view`);
}
