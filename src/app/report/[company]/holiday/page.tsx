import dayjs from "@/lib/dayjs";
import { getPublicHolidays } from "@/lib/publicHoliday";
import { getHolidayBannerUrl, getCompanySettings } from "@/lib/db";
import HolidayClient from "./HolidayClient";

interface CompanyParamsType {
  params: Promise<{ company: string }>;
}

export const dynamic = "force-dynamic";

const pad = (n: number) => String(n).padStart(2, "0");

export default async function Holiday({ params }: CompanyParamsType) {
  const { company } = await params;
  const hospitalName = decodeURIComponent(company);

  // 다음 달 (예: 현재 6월이면 7월)
  const next = dayjs().add(1, "month");
  const year = next.year();
  const month = next.month() + 1; // dayjs month는 0-based

  const holidays = await getPublicHolidays(year, month);

  // 배너 + 수신자(원장 번호)
  const monthKey = `${year}-${pad(month)}`;
  const [initialBanner, settings] = await Promise.all([
    getHolidayBannerUrl(hospitalName, monthKey),
    getCompanySettings(hospitalName),
  ]);
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
      initialBanner={initialBanner ?? undefined}
      recipients={recipients}
    />
  );
}
