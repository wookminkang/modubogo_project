import { supabase } from "./supabase";
import {
  normalizeSectionOrder,
  type ReportSectionKey,
} from "./report-sections";

// 보고서 섹션 순서 읽기·쓰기 (app_settings.report_section_order, 모든 병원 공통).
// 쓰기는 서버 액션(report-actions.ts saveReportSectionOrder)을 통해서만 한다.
// 스키마: sql/app_settings.sql

const KEY = "report_section_order";

/**
 * 현재 섹션 순서.
 * 테이블이 아직 없거나 값이 없으면 기본 순서로 떨어뜨려 보고서 화면이 깨지지 않게 한다
 * (SQL 실행 전 배포되는 경우).
 */
export async function getReportSectionOrder(): Promise<ReportSectionKey[]> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", KEY)
    .maybeSingle();

  if (error || !data) return normalizeSectionOrder(null);
  return normalizeSectionOrder(data.value);
}

export async function saveReportSectionOrderToDB(
  order: ReportSectionKey[],
): Promise<void> {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: KEY, value: order, updated_at: new Date().toISOString() });

  if (error) {
    // 테이블 없음: PostgREST 는 PGRST205, Postgres 는 42P01
    if (error.code === "PGRST205" || error.code === "42P01") {
      throw new Error("app_settings 테이블이 없습니다. sql/app_settings.sql 을 먼저 실행해 주세요.");
    }
    throw new Error(error.message);
  }
}
