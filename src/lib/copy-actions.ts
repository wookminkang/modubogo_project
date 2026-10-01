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
 * 마지막 보고서 다음 달부터 이번 달까지, **빠진 달을 한 달씩 이어서** 자동 생성한다.
 *
 * 달이 바뀌면 전달 보고서가 그대로 승계되는 게 기본 동작이다. 몇 달을 건너뛴 병원이라면
 * 중간 달도 비워두지 않고 차례로 채운다 (7월이 마지막이면 8월→9월→10월).
 * 각 달은 **바로 전달을 복사**하므로, 중간에 사람이 고친 달이 있으면 그 뒤로 이어진다.
 *
 * - 트리거: 관리자가 회사 보고서 목록(/report/[company])에 접속할 때 호출(지연 생성).
 * - 상태: "완료"(바로 공개). 집행/계약/심의 항목·담당자·유형·지역을 전달에서 그대로 승계.
 * - 비밀번호는 복사하지 않고(앞으로 미사용), 알림톡 발송 횟수는 월별 로그 집계라 애초에 복사 안 됨(새 달 0회).
 * - 이미 이번 달 보고서가 있으면 아무것도 하지 않는다.
 * - 보고서가 하나도 없으면(복사할 원본 없음) 생성하지 않는다.
 * 반환: 새로 만든 달을 포함한 보고서 목록(month 내림차순). 호출부는 이 값을 그대로 렌더에 쓴다.
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

  const settings = await getCompanySettings(company);
  const have = new Set(reports.map((r) => r.month));

  // 마지막 보고서 다음 달부터 이번 달까지 한 달씩. 직전에 만든 달을 다음 달의 원본으로 쓴다.
  const createdRows: typeof reports = [];
  let source = latest;
  let month = dayjs(latest.month, 'YYYY-MM').add(1, 'month').format('YYYY-MM');

  while (month <= currentMonth) {
    if (have.has(month)) {
      // 사람이 이미 만들어 둔 달 — 건드리지 않고, 그 달을 다음 달의 원본으로 삼는다.
      source = reports.find((r) => r.month === month) ?? source;
    } else {
      source = await copyReportToMonth(source, month, settings?.region);
      createdRows.push(source);
    }
    month = dayjs(month, 'YYYY-MM').add(1, 'month').format('YYYY-MM');
  }

  if (!createdRows.length) return reports;

  // 재조회 대신 방금 만든 행들을 붙여 돌려준다 (아래 ⚠️ memoize 주의 참고).
  return [...createdRows, ...reports].sort((a, b) => (a.month < b.month ? 1 : -1));
}

/** 한 달치 복사 — latest 를 month 로 그대로 옮겨 담는다. 새로 만든 행(자식 포함)을 돌려준다. */
async function copyReportToMonth(
  latest: Awaited<ReturnType<typeof getReportsByCompanyFromDB>>[number],
  currentMonth: string,
  region: string | undefined,
): Promise<Awaited<ReturnType<typeof getReportsByCompanyFromDB>>[number]> {
  const created = await upsertReport({
    company: latest.company,
    month: currentMonth,
    status: '완료',
    reporter: latest.reporter,
    email: latest.email,
    // 비밀번호는 복사하지 않는다(앞으로 미사용).
    hospital_type: latest.hospital_type ?? undefined,
    region: region ?? undefined,
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

  // 자식(집행/심의/계약)은 전달을 그대로 복사했으니 원본 값을 재사용한다.
  return {
    ...created,
    categories: latest.categories,
    validity: latest.validity,
    contracts: latest.contracts,
  } as typeof latest;
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
