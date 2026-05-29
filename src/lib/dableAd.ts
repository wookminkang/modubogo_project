'use server';

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
