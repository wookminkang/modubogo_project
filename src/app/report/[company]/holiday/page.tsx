import dayjs from "@/lib/dayjs";
import { getPublicHolidays } from "@/lib/publicHoliday";
import { getCompanySettings } from "@/lib/db";
import HolidayClient from "./HolidayClient";

interface CompanyParamsType {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ month?: string }>;
}

export const dynamic = "force-dynamic";

export default async function Holiday({
  params,
  searchParams,
}: CompanyParamsType) {
  const { company } = await params;
  const { month: monthParam } = await searchParams;
  const hospitalName = decodeURIComponent(company);

  // 기본 다음 달, ?month=YYYY-MM 로 다른 달 조회
  const base = monthParam ? dayjs(`${monthParam}-01`) : dayjs().add(1, "month");
  const year = base.year();
  const month = base.month() + 1; // dayjs month는 0-based

  const holidays = await getPublicHolidays(year, month);

  // 수신자(원장 번호)
  const settings = await getCompanySettings(hospitalName);
  const recipients = [
    settings?.recipient1,
    settings?.recipient2,
    settings?.recipient3,
  ].filter(Boolean) as string[];

  return (
    <HolidayClient
      hospitalName={hospitalName}
      year={year}
      month={month}
      holidays={holidays}
      recipients={recipients}
    />
  );
}
