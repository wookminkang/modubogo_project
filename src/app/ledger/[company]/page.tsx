import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { getAdminUser } from "@/lib/admin";
import {
  resolveCompanyParam,
  getLedgerEntries,
  getLedgerAdSettings,
} from "@/lib/db";
import dayjs from "@/lib/dayjs";
import Header from "@/components/Header";
import LedgerSheet from "./LedgerSheet";
import LedgerAdForm from "./LedgerAdForm";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ company: string }>;
}

/**
 * 관리자 전용 편집 시트. 광고주에게 보여줄 읽기전용 화면은 별도 라우트
 * `/ledger/[company]/view`(공개)에 있다.
 */
export default async function LedgerCompanyPage({ params }: Props) {
  const me = await getAdminUser();
  if (!me) redirect("/admin/login");

  const { company } = await params;
  const decoded = await resolveCompanyParam(company);
  const entries = await getLedgerEntries(decoded);
  const ad = await getLedgerAdSettings(decoded);

  return (
    <>
      <Header showNav user={{ name: me.name, role: me.role }} />
      <div className="flex-1 overflow-x-clip bg-[#F0F4FA] py-6 px-4">
        <div className="mx-auto max-w-[1080px]">
          <div className="mb-5 flex items-center justify-between gap-3">
          <Link
            href={`/hospital/${company}`}
            className="inline-flex items-center gap-1.5 text-base font-semibold text-gray-600 transition-colors hover:text-[#0e299c]"
          >
            <ArrowLeft size={18} />
            병원 상세로 이동
          </Link>
          <Link
            href={`/ledger/${company}/view`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-[#0e299c] shadow-sm transition-colors hover:bg-[#eef2fd]"
          >
            <Eye size={16} />
            광고주 화면 보기
          </Link>
        </div>

          <LedgerAdForm
            company={decoded}
            initialEnabled={ad.enabled}
            initialUrl={ad.url}
          />

          <LedgerSheet
            company={decoded}
            initialEntries={entries}
            today={dayjs().format("YYYY. M. D")}
          />
        </div>
      </div>
    </>
  );
}
