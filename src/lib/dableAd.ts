'use server';

import dayjs from './dayjs';

export type DableReport =
  | { rateLimited: true }
  | { rateLimited: false; balance: number; today_cost_spent: number };

export async function getDableReport(account: string, apiKey: string): Promise<DableReport | null> {
  const url = `https://marketing.dable.io/api/client/${account}/budget_report?api_key=${apiKey}`;
  console.log(`[Dable API] 요청 URL: ${url}`);
  try {
    const res = await fetch(url, { next: { revalidate: 600 } });

    console.log(`[Dable API] status: ${res.status}`);
    const data = await res.json();
    console.log(`[Dable API] 응답:`, JSON.stringify(data));

    if (!res.ok) return null;

    if (data.message) {
      console.warn('[Dable API] 레이트 리밋:', data.message);
      return { rateLimited: true };
    }

    if (typeof data.balance !== 'number' || typeof data.today_cost_spent !== 'number') {
      console.warn('[Dable API] 예상과 다른 응답 타입:', typeof data.balance, typeof data.today_cost_spent);
      return null;
    }

    return { rateLimited: false, balance: data.balance, today_cost_spent: data.today_cost_spent };
  } catch (e) {
    console.error('[Dable API] error:', e);
    return null;
  }
}

export type DableMonthlyReport = {
  monthly: number;
  today: number;
};

export async function getDableMonthlySpend(account: string, apiKey: string, month: string): Promise<DableMonthlyReport | null> {
  const startDate = dayjs(month).startOf('month').format('YYYYMMDD');
  const endOfMonth = dayjs(month).endOf('month').format('YYYYMMDD');
  const todayKey = dayjs().format('YYYYMMDD');
  const endDate = todayKey < endOfMonth ? todayKey : endOfMonth;

  const url = `https://marketing.dable.io/api/client/${account}/daily_report?api_key=${apiKey}&start_date=${startDate}&end_date=${endDate}`;
  console.log(`[Dable Monthly] 요청 URL: ${url}`);
  try {
    const res = await fetch(url, { cache: 'no-store' });

    console.log(`[Dable Monthly] status: ${res.status}`);
    const data = await res.json();

    if (!res.ok || data.message) {
      console.warn('[Dable Monthly] 실패 또는 레이트 리밋:', data.message ?? res.status);
      return null;
    }

    const dailyData = data as Record<string, { cost_spent: number }>;
    const monthly = Object.values(dailyData).reduce((sum, day) => sum + (day.cost_spent ?? 0), 0);
    const today = dailyData[todayKey]?.cost_spent ?? 0;

    console.log(`[Dable Monthly] ${month} 월 소진: ${monthly}, 오늘 소진: ${today}`);
    return { monthly, today };
  } catch (e) {
    console.error('[Dable Monthly] error:', e);
    return null;
  }
}
