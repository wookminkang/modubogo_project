export type ReportStatus = "완료" | "작성중";

export interface ReportCategory {
  category: string;
  channel: string;
  agency: string;
  period: string;
  amount: string;
  sort_order?: number;
}

export interface ValidityItem {
  category: string;
  subject: string;
  expiryDate: string; // "YYYY-MM-DD"
  sort_order?: number;
}

export interface ContractItem {
  category: string;
  name: string;
  keyword: string;
  link: string;
  sort_order?: number;
}

export interface Report {
  id: number;
  company: string;
  month: string; // "2026-05"
  status: ReportStatus;
  reporter: string;
  email: string;
  categories: ReportCategory[];
  validity: ValidityItem[];
  contracts: ContractItem[];
}

export const MOCK_REPORTS: Report[] = [
  {
    id: 1,
    company: "모두보고",
    month: "2026-05",
    status: "완료",
    reporter: "홍길동",
    email: "Hong@modubogo.com",
    categories: [
      { category: "검색광고", channel: "네이버 파워링크", agency: "엠포넷", period: "1", amount: "14000000" },
      { category: "바이럴", channel: "브랜드블로그", agency: "스탠다드", period: "1", amount: "1000000" },
      { category: "디스플레이", channel: "네이버 GFA", agency: "스탠다드", period: "1", amount: "3213190" },
    ],
    validity: [
      { category: "검색광고", subject: "네이버 파워링크 계약", expiryDate: "2026-06-30" },
      { category: "바이럴", subject: "브랜드블로그 운영", expiryDate: "2026-05-31" },
    ],
    contracts: [
      { category: "검색광고", name: "5월 네이버 파워링크 리포트", keyword: "네이버 파워링크, 브랜드검색", link: "https://example.com/report1" },
      { category: "디스플레이", name: "5월 GFA 운영 리포트", keyword: "GFA, 디스플레이", link: "https://example.com/report2" },
    ],
  },
  {
    id: 2,
    company: "모두보고",
    month: "2026-04",
    status: "완료",
    reporter: "홍길동",
    email: "Hong@modubogo.com",
    categories: [
      { category: "검색광고", channel: "네이버 파워링크", agency: "엠포넷", period: "1", amount: "12000000" },
      { category: "디스플레이", channel: "네이버 GFA", agency: "스탠다드", period: "1", amount: "2930010" },
    ],
    validity: [],
    contracts: [],
  },
  {
    id: 3,
    company: "모두보고",
    month: "2026-03",
    status: "완료",
    reporter: "홍길동",
    email: "Hong@modubogo.com",
    categories: [
      { category: "검색광고", channel: "네이버 파워링크", agency: "엠포넷", period: "1", amount: "823912" },
    ],
    validity: [],
    contracts: [],
  },
  {
    id: 4,
    company: "테스트컴퍼니",
    month: "2026-05",
    status: "작성중",
    reporter: "김철수",
    email: "kim@test.com",
    categories: [
      { category: "바이럴", channel: "인스타그램", agency: "에이전시A", period: "1", amount: "5000000" },
    ],
    validity: [],
    contracts: [],
  },
  {
    id: 5,
    company: "테스트컴퍼니",
    month: "2026-04",
    status: "완료",
    reporter: "김철수",
    email: "kim@test.com",
    categories: [
      { category: "검색광고", channel: "카카오 키워드", agency: "에이전시A", period: "1", amount: "3200000" },
      { category: "바이럴", channel: "인스타그램", agency: "에이전시B", period: "1", amount: "2000000" },
    ],
    validity: [],
    contracts: [],
  },
];

export function getCompaniesSummary() {
  const map = new Map<string, { latestMonth: string; reportCount: number; status: ReportStatus }>();
  for (const r of MOCK_REPORTS) {
    const existing = map.get(r.company);
    if (!existing || r.month > existing.latestMonth) {
      map.set(r.company, {
        latestMonth: r.month,
        reportCount: (existing?.reportCount ?? 0) + 1,
        status: r.status,
      });
    } else {
      existing.reportCount += 1;
    }
  }
  return Array.from(map.entries()).map(([company, data]) => ({ company, ...data }));
}

export function getReportsByCompany(company: string) {
  return MOCK_REPORTS.filter((r) => r.company === company).sort((a, b) =>
    b.month.localeCompare(a.month)
  );
}

export function getReport(company: string, month: string) {
  return MOCK_REPORTS.find((r) => r.company === company && r.month === month) ?? null;
}

export function getTotalAmount(categories: ReportCategory[]) {
  return categories.reduce((sum, c) => sum + Number(c.amount), 0);
}
