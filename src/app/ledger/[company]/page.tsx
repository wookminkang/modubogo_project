import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { getAdminUser } from "@/lib/admin";
import {
  resolveCompanyParam,
  getLedgerEntries,
  getLedgerAdSettings,
  getCompanySettings,
} from "@/lib/db";
import dayjs from "@/lib/dayjs";
import Header from "@/components/Header";
import LedgerSheet from "./LedgerSheet";
import LedgerAdForm from "./LedgerAdForm";
import LedgerAlimtalkButton from "./LedgerAlimtalkButton";

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
  const settings = (await getCompanySettings(decoded)) as {
    nanoid?: string | null;
    recipient1?: string | null;
    recipient2?: string | null;
    recipient3?: string | null;
    recipient4?: string | null;
    recipient5?: string | null;
  } | null;
  const recipients = [
    settings?.recipient1,
    settings?.recipient2,
    settings?.recipient3,
    settings?.recipient4,
    settings?.recipient5,
  ].filter((n): n is string => !!n && n.trim() !== "");

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
          <div className="flex items-center gap-2">
            <LedgerAlimtalkButton
              company={decoded}
              // URL 파라미터를 그대로 쓰면 이름으로 들어온 경우 알림톡 링크에 상호명이
              // 박혀, 나중에 이름을 바꿨을 때 이미 발송된 버튼이 끊긴다. nanoid 우선.
              slug={
                (settings?.nanoid as string | null | undefined) ??
                encodeURIComponent(decoded)
              }
              recipients={recipients}
            />
            <Link
              href={`/ledger/${company}/view`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-[#0e299c] shadow-sm transition-colors hover:bg-[#eef2fd]"
            >
              <Eye size={16} />
              광고주 화면 보기
            </Link>
          </div>
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
