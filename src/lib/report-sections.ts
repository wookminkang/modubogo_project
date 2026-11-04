// 보고서 섹션 순서 — 모든 병원 보고서에 공통으로 적용된다.
// 관리자가 수정 화면(/report/{company}/{month}/edit)에서 드래그로 바꾸고,
// 보고서 상세(공개 뷰)가 이 순서대로 섹션을 그린다.
// 저장: app_settings 테이블의 report_section_order (sql/app_settings.sql)

export type ReportSectionKey = "categories" | "contracts" | "validity";

export const DEFAULT_SECTION_ORDER: ReportSectionKey[] = [
  "categories",
  "contracts",
  "validity",
];

export const SECTION_LABELS: Record<ReportSectionKey, string> = {
  categories: "집행 항목",
  contracts: "광고 계약·리포트",
  validity: "광고 심의 및 운영 현황",
};

/**
 * DB 값이 비었거나 깨져 있어도 세 섹션이 빠짐없이 한 번씩 나오게 맞춘다.
 * (모르는 키는 버리고, 빠진 섹션은 기본 순서대로 뒤에 붙인다)
 */
export function normalizeSectionOrder(raw: unknown): ReportSectionKey[] {
  const picked = Array.isArray(raw)
    ? raw.filter((k): k is ReportSectionKey =>
        DEFAULT_SECTION_ORDER.includes(k as ReportSectionKey),
      )
    : [];
  const unique = [...new Set(picked)];
  return [...unique, ...DEFAULT_SECTION_ORDER.filter((k) => !unique.includes(k))];
}
