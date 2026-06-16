"use client";

import { usePathname } from "next/navigation";
import ReportHeader from "@/components/ReportHeader";
import ReportFooter from "@/components/ReportFooter";

// 원장 회신 페이지(/holiday/[company]/[month])는 카카오 알림톡으로 진입하는
// 공개 화면이라 헤더/푸터를 숨기고 풀스크린으로 보여준다.
// (그 외 holiday 페이지 — 허브/send/replies — 는 헤더/푸터 유지)
const REPLY_PAGE = /^\/holiday\/[^/]+\/\d{4}-\d{2}\/?$/;

export function HolidayChrome({
  admin,
  children,
}: {
  admin: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isReplyPage = REPLY_PAGE.test(pathname);

  if (isReplyPage) {
    return <main className="flex min-h-screen flex-col">{children}</main>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <ReportHeader showNav={admin} />
      <main className="flex flex-1 flex-col pt-14">{children}</main>
      <ReportFooter />
    </div>
  );
}
