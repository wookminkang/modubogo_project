/**
 * 중앙 쿼리키 팩토리.
 * 서버 prefetch와 클라이언트 useSuspenseQuery가 동일한 키를 쓰도록 한 곳에서 관리한다.
 * (이 파일은 클라이언트/서버 양쪽에서 import 가능 — DB 접근 코드를 포함하지 않는다.)
 */
export const queryKeys = {
  hospitals: () => ["hospitals"] as const,
  companiesSummary: () => ["companies", "summary"] as const,
  companyReports: (company: string) => ["companies", company, "reports"] as const,
  alimtalkLogs: () => ["alimtalk", "logs"] as const,
  dashboardRaw: () => ["dashboard", "raw"] as const,
} as const;
