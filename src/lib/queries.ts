/**
 * 쿼리 옵션 팩토리.
 *
 * 서버 prefetch(`queryClient.prefetchQuery`)와 클라이언트 `useSuspenseQuery` 가
 * **같은 객체**를 공유하도록 한 곳에서 정의한다 → 키/패칭 함수 drift 방지.
 *
 * queryFn 은 항상 화살표로 감싸 서버 액션에 QueryFunctionContext 가 전달되지 않게 한다
 * ("use server" 함수는 인자를 직렬화하므로 컨텍스트 객체를 넘기면 안 됨).
 */
import { infiniteQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  fetchHospitals,
  fetchHospitalsPage,
  fetchAllHospitalsLite,
  fetchCompaniesSummary,
  fetchCompanyReports,
  fetchAlimtalkLogs,
  fetchDashboardRawData,
} from "@/lib/query-actions";

export const hospitalsQuery = () => ({
  queryKey: queryKeys.hospitals(),
  queryFn: () => fetchHospitals(),
});

/** 전 병원 경량 목록(개수 집계용). */
export const hospitalsLiteQuery = () => ({
  queryKey: queryKeys.hospitalsLite(),
  queryFn: () => fetchAllHospitalsLite(),
});

/** 무한 스크롤용 한 페이지 크기 */
export const HOSPITALS_PAGE_SIZE = 20;

/**
 * 병원 목록 무한 쿼리 옵션.
 * 서버 `prefetchInfiniteQuery` 와 클라이언트 `useSuspenseInfiniteQuery` 가 공유한다.
 * queryFn 에서 pageParam(number)만 추출해 서버 액션에 넘긴다
 * (QueryFunctionContext 객체를 "use server" 함수로 직렬화하지 않도록).
 */
export const hospitalsInfiniteQuery = () =>
  infiniteQueryOptions({
    queryKey: queryKeys.hospitalsInfinite(),
    queryFn: ({ pageParam }) => fetchHospitalsPage(pageParam, HOSPITALS_PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
  });

export const companiesSummaryQuery = () => ({
  queryKey: queryKeys.companiesSummary(),
  queryFn: () => fetchCompaniesSummary(),
});

export const companyReportsQuery = (company: string) => ({
  queryKey: queryKeys.companyReports(company),
  queryFn: () => fetchCompanyReports(company),
});

// admin 페이지는 기존 force-dynamic 동작을 유지하기 위해 항상 신선하게 조회한다.
export const alimtalkLogsQuery = () => ({
  queryKey: queryKeys.alimtalkLogs(),
  queryFn: () => fetchAlimtalkLogs(),
  staleTime: 0,
});

export const dashboardRawQuery = () => ({
  queryKey: queryKeys.dashboardRaw(),
  queryFn: () => fetchDashboardRawData(),
  staleTime: 0,
});
