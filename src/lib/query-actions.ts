"use server";

/**
 * 조회용 서버 액션 래퍼.
 *
 * db.ts 는 anon Supabase 클라이언트를 import 하므로 클라이언트 컴포넌트에서 직접
 * queryFn 으로 쓰면 브라우저 번들에 포함되어 DB 접근이 클라이언트로 노출된다.
 * (특히 RLS 미설정 상태에서 위험)
 *
 * 이 파일을 "use server" 로 두고 db 함수를 감싸면, 클라이언트는 RPC 스텁만 받고
 * 실제 DB 접근은 항상 서버에서 일어난다. queries.ts 의 옵션 팩토리가 이 함수들을
 * queryFn 으로 사용한다.
 */
import {
  getCompaniesSummaryFromDB,
  getReportsByCompanyFromDB,
  getAlimtalkLogs,
  getDashboardRawDataFromDB,
  getHospitalList,
} from "@/lib/db";

export async function fetchHospitals() {
  return getHospitalList();
}

export async function fetchCompaniesSummary() {
  return getCompaniesSummaryFromDB();
}

export async function fetchCompanyReports(company: string) {
  return getReportsByCompanyFromDB(company);
}

export async function fetchAlimtalkLogs() {
  return getAlimtalkLogs();
}

export async function fetchDashboardRawData() {
  return getDashboardRawDataFromDB();
}
