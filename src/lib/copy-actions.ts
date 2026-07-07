'use server';

import dayjs from './dayjs';
import { getReportsByCompanyFromDB, getCompanySettings, upsertReport } from './db';

interface FormValues {
  company: string;
  month: string;
  reporter: string;
  email: string;
  password: string;
  region: string;
  categories: { category: string; channel: string; agency: string; period: string; amount: string; sort_order: string }[];
  validity: { category: string; subject: string; expiryDate: string; sort_order: string }[];
  contracts: { category: string; name: string; keyword: string; link: string; sort_order: string }[];
}

/**
 * 이번 달(현재 달력 기준) 보고서가 없으면, 가장 최근 보고서를 그대로 복사해 자동 생성한다.
 * - 트리거: 관리자가 회사 보고서 목록(/report/[company])에 접속할 때 호출(지연 생성).
 * - 상태: "완료"(바로 공개). 집행/계약/심의 항목·담당자·유형·지역을 지난달에서 그대로 승계.
 * - 비밀번호는 복사하지 않고(앞으로 미사용), 알림톡 발송 횟수는 월별 로그 집계라 애초에 복사 안 됨(새 달 0회).
 * - 이미 이번 달 보고서가 있거나, 최신 보고서가 이번 달 이상이면 아무것도 하지 않는다.
 * - 보고서가 하나도 없으면(복사할 원본 없음) 생성하지 않는다.
 * 반환: 이번 달 포함 최신 보고서 목록(month 내림차순). 호출부는 이 값을 그대로 렌더에 쓴다.
 *
 * ⚠️ 재조회 금지: 생성 직후 getReportsByCompanyFromDB 를 다시 부르면 Next.js 가
 * 같은 렌더의 동일 fetch 를 memoize 해서 insert 이전(이번 달 누락) 스냅샷을 돌려준다
 * (→ 첫 접속엔 안 뜨고 새로고침해야 뜨는 버그). 그래서 방금 만든 행을 메모리에서 붙여 반환한다.
 *
 * ⚠️ (company, month) 유니크 제약이 없어 동시 접속 시 중복 생성 가능성은 있으나,
 * 관리자 단독 접근이라 실사용상 무시할 수준이다.
 */
export async function ensureCurrentMonthReport(
  company: string,
): Promise<Awaited<ReturnType<typeof getReportsByCompanyFromDB>>> {
  const reports = await getReportsByCompanyFromDB(company);
  if (reports.length === 0) return reports;

  const currentMonth = dayjs().format('YYYY-MM');
  const latest = reports.reduce((acc, r) => (r.month > acc.month ? r : acc), reports[0]);

  // 이미 이번 달(또는 미래) 보고서가 있으면 생성 불필요.
  if (currentMonth <= latest.month) return reports;
  if (reports.some((r) => r.month === currentMonth)) return reports;

  const settings = await getCompanySettings(company);

  const created = await upsertReport({
    company: latest.company,
    month: currentMonth,
    status: '완료',
    reporter: latest.reporter,
    email: latest.email,
    // 비밀번호는 복사하지 않는다(앞으로 미사용).
    hospital_type: latest.hospital_type ?? undefined,
    region: settings?.region ?? undefined,
    categories: latest.categories.map((c: { category: string; channel: string; agency: string; period: string; amount: string; sort_order: number }) => ({
      category: c.category,
      channel: c.channel,
      agency: c.agency,
      period: c.period,
      amount: c.amount,
      sort_order: String(c.sort_order),
    })),
    validity: latest.validity.map((v: { category: string; subject: string; expiryDate: string; sort_order: number }) => ({
      category: v.category,
      subject: v.subject,
      expiryDate: v.expiryDate,
      sort_order: String(v.sort_order),
    })),
    contracts: latest.contracts.map((ct: { category: string; name: string; keyword: string; link: string; sort_order: number }) => ({
      category: ct.category,
      name: ct.name,
      keyword: ct.keyword,
      link: ct.link,
      sort_order: String(ct.sort_order),
    })),
  });

  // 재조회 대신 방금 만든 이번 달 행을 목록 맨 앞(month 내림차순)에 붙여 반환한다.
  // 자식(집행/심의/계약)은 지난달을 그대로 복사했으니 latest 값을 재사용한다.
  const newRow = {
    ...created,
    categories: latest.categories,
    validity: latest.validity,
    contracts: latest.contracts,
  } as (typeof reports)[number];
  return [newRow, ...reports];
}

export async function loadLatestReportData(company: string): Promise<FormValues | null> {
  const reports = await getReportsByCompanyFromDB(company);
  if (reports.length === 0) return null;

  const latest = reports[0];
  const nextMonth = dayjs(latest.month).add(1, 'month').format('YYYY-MM');
  const settings = await getCompanySettings(company);

  return {
    company: latest.company,
    month: nextMonth,
    reporter: latest.reporter,
    email: latest.email,
    password: '',
    region: settings?.region ?? '',
    categories: latest.categories.map((c: { category: string; channel: string; agency: string; period: string; amount: string; sort_order: number }) => ({
      category: c.category,
      channel: c.channel,
      agency: c.agency,
      period: c.period,
      amount: c.amount,
      sort_order: String(c.sort_order),
    })),
    validity: latest.validity.map((v: { category: string; subject: string; expiryDate: string; sort_order: number }) => ({
      category: v.category,
      subject: v.subject,
      expiryDate: v.expiryDate,
      sort_order: String(v.sort_order),
    })),
    contracts: latest.contracts.map((ct: { category: string; name: string; keyword: string; link: string; sort_order: number }) => ({
      category: ct.category,
      name: ct.name,
      keyword: ct.keyword,
      link: ct.link,
      sort_order: String(ct.sort_order),
    })),
  };
}
