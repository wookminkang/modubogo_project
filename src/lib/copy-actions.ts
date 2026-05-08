'use server';

import dayjs from './dayjs';
import { getReportsByCompanyFromDB } from './db';

interface FormValues {
  company: string;
  month: string;
  reporter: string;
  email: string;
  password: string;
  categories: { category: string; channel: string; agency: string; period: string; amount: string; sort_order: string }[];
  validity: { category: string; subject: string; expiryDate: string; sort_order: string }[];
  contracts: { category: string; name: string; keyword: string; link: string; sort_order: string }[];
}

export async function loadLatestReportData(company: string): Promise<FormValues | null> {
  const reports = await getReportsByCompanyFromDB(company);
  if (reports.length === 0) return null;

  const latest = reports[0];
  const nextMonth = dayjs(latest.month).add(1, 'month').format('YYYY-MM');

  return {
    company: latest.company,
    month: nextMonth,
    reporter: latest.reporter,
    email: latest.email,
    password: '',
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
