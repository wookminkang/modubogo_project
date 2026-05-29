'use server';

export type DableReport = {
  balance: number;
  today_cost_spent: number;
};

export async function getDableReport(account: string, apiKey: string): Promise<DableReport | null> {
  try {
    const res = await fetch(
      `https://marketing.dable.io/api/client/${account}/budget_report?api_key=${apiKey}`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) {
      console.error(`[Dable API] status: ${res.status}`);
      return null;
    }

    const data = await res.json();
    console.log(`[Dable API] account: ${account}`, JSON.stringify(data));

    if (typeof data.balance !== 'number' || typeof data.today_cost_spent !== 'number') return null;

    return { balance: data.balance, today_cost_spent: data.today_cost_spent };
  } catch (e) {
    console.error('[Dable API] error:', e);
    return null;
  }
}
