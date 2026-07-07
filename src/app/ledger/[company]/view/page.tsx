import Image from "next/image";
import {
  resolveCompanyParam,
  getLedgerEntries,
  getLedgerAdSettings,
} from "@/lib/db";
import dayjs from "@/lib/dayjs";
import LedgerView from "../LedgerView";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ company: string }>;
}

/**
 * 광고주(비로그인) 공개 읽기전용 입금·소진 관리내역 뷰.
 * 로그인 여부와 무관하게 항상 읽기전용 화면을 보여주므로,
 * 관리자는 이 URL로 광고주가 보는 화면을 그대로 미리보고 공유할 수 있다.
 * 인증 없음 — 링크만 있으면 열람 가능.
 * 헤더는 이 페이지 전용(로고 + 상호명), 푸터는 ledger/layout.tsx 공용.
 */
export default async function LedgerViewPage({ params }: Props) {
  const { company } = await params;
  const decoded = await resolveCompanyParam(company);
  const entries = await getLedgerEntries(decoded);
  const ad = await getLedgerAdSettings(decoded);

  return (
    <>
      {/* 광고주 전용 헤더 — 로고(좌) + 상호명(우) */}
      <header className="fixed top-0 left-0 z-15 w-full border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-6">
          <Image
            src="/modubogo_logo.svg"
            alt="모두보고"
            width={90}
            height={28}
            priority
            className="h-7 w-auto"
          />
          <span className="truncate text-base font-bold text-gray-700">
            {decoded}
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-x-clip bg-[#F0F4FA] sm:px-4 sm:py-6">
        <div className="mx-auto max-w-[1080px]">
          <LedgerView
            company={decoded}
            entries={entries}
            today={dayjs().format("YYYY. M. D")}
            ad={ad}
          />
        </div>
      </div>
    </>
  );
}
