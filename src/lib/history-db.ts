import { supabase } from "./supabase";

// 병원별 히스토리 (company_histories). 보고서 공개 뷰의 "히스토리" 탭에서 읽고,
// 관리자만 서버 액션(history-actions.ts)을 통해 쓴다.
//
// 월이 아니라 병원(company) 단위 — 어느 달 보고서에서 열어도 같은 내역이 보인다.
// 스키마: sql/company_histories.sql

export interface HistoryEntry {
  id: string;
  company: string;
  happenedOn: string; // "YYYY-MM-DD"
  title: string;
  body: string;
  createdBy: string | null;
}

interface RawHistory {
  id: string;
  company: string;
  happened_on: string;
  title: string;
  body: string | null;
  created_by: string | null;
}

const mapHistory = (h: RawHistory): HistoryEntry => ({
  id: h.id,
  company: h.company,
  happenedOn: h.happened_on,
  title: h.title,
  body: h.body ?? "",
  createdBy: h.created_by,
});

/**
 * 병원의 히스토리 전체 (최근 날짜 먼저).
 * 테이블이 아직 없어도 보고서 화면이 깨지지 않도록 빈 배열로 떨어뜨린다
 * (SQL 실행 전 배포되는 경우).
 */
export async function listCompanyHistories(company: string): Promise<HistoryEntry[]> {
  const { data, error } = await supabase
    .from("company_histories")
    .select("id, company, happened_on, title, body, created_by")
    .eq("company", company)
    .order("happened_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as RawHistory[]).map(mapHistory);
}

export async function insertCompanyHistory(entry: {
  company: string;
  happenedOn: string;
  title: string;
  body: string;
  createdBy: string;
}): Promise<void> {
  const { error } = await supabase.from("company_histories").insert({
    company: entry.company,
    happened_on: entry.happenedOn,
    title: entry.title,
    body: entry.body,
    created_by: entry.createdBy,
  });
  if (error) throw new Error(error.message);
}

export async function updateCompanyHistory(
  id: string,
  patch: { happenedOn: string; title: string; body: string },
): Promise<void> {
  const { error } = await supabase
    .from("company_histories")
    .update({
      happened_on: patch.happenedOn,
      title: patch.title,
      body: patch.body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCompanyHistory(id: string): Promise<void> {
  const { error } = await supabase.from("company_histories").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
