/**
 * 입금·소진 관리내역 공유 유틸 (순수 함수 — 서버/클라이언트 공용).
 * 시트(편집)·공개 뷰·알림톡 메시지가 동일한 포맷/집계를 쓰도록 한 곳에서 정의한다.
 */

export interface LedgerItem {
  deposit_date: string | null; // 'YYYY-MM-DD'
  deposit_amount: number | null;
  spend_amount: number | null;
}

export interface MonthSummary {
  month: string; // 'YYYY-MM'
  deposit: number;
  spend: number;
  balance: number; // 당월 잔액
  cumulative: number; // 누적 잔액
}

export interface LedgerSummary {
  monthRows: MonthSummary[];
  totalDeposit: number;
  totalSpend: number;
  totalBalance: number;
}

/** 숫자(원) → "₩10,281,964" / 음수 "-₩2,255,000". */
export function formatKRW(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}₩${Math.abs(n).toLocaleString("ko-KR")}`;
}

/** 거래내역 → 월별 요약 + 합계 (deposit_date 의 YYYY-MM 기준 집계). */
export function summarizeLedger(items: LedgerItem[]): LedgerSummary {
  const map = new Map<string, { deposit: number; spend: number }>();
  for (const it of items) {
    const m = it.deposit_date ? it.deposit_date.slice(0, 7) : "";
    if (!m) continue;
    const acc = map.get(m) ?? { deposit: 0, spend: 0 };
    acc.deposit += it.deposit_amount ?? 0;
    acc.spend += it.spend_amount ?? 0;
    map.set(m, acc);
  }
  const months = Array.from(map.keys()).sort();
  const balances = months.map((m) => {
    const { deposit, spend } = map.get(m)!;
    return { month: m, deposit, spend, balance: deposit - spend };
  });
  // 누적 잔액 = 해당 월까지의 당월 잔액 누계 (prefix-sum, 변수 재할당 없이)
  const monthRows = balances.map((b, i) => ({
    ...b,
    cumulative: balances.slice(0, i + 1).reduce((s, x) => s + x.balance, 0),
  }));
  const totalDeposit = monthRows.reduce((s, r) => s + r.deposit, 0);
  const totalSpend = monthRows.reduce((s, r) => s + r.spend, 0);
  return {
    monthRows,
    totalDeposit,
    totalSpend,
    totalBalance: totalDeposit - totalSpend,
  };
}
