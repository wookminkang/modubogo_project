'use server';

import dayjs from './dayjs';
import { getReportsByCompanyFromDB, getReportFromDB, upsertReport } from './db';

export async function copyLatestReport(company: string): Promise<{ company: string; month: string }> {
  const reports = await getReportsByCompanyFromDB(company);
  if (reports.length === 0) throw new Error('복사할 보고서가 없습니다.');

  const latest = reports[0];
  const nextMonth = dayjs(latest.month).add(1, 'month').format('YYYY-MM');

  const existing = await getReportFromDB(company, nextMonth);
  if (existing) throw new Error(`${nextMonth} 보고서가 이미 존재합니다.`);

  await upsertReport({
    company: latest.company,
    month: nextMonth,
    status: '작성중',
    reporter: latest.reporter,
    email: latest.email,
    password: latest.password ?? '',
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

  return { company: latest.company, month: nextMonth };
}
