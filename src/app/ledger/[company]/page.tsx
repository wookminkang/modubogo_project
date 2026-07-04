import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAdminUser } from "@/lib/admin";
import { resolveCompanyParam, getLedgerEntries } from "@/lib/db";
import dayjs from "@/lib/dayjs";
import LedgerSheet from "./LedgerSheet";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ company: string }>;
}

export default async function LedgerCompanyPage({ params }: Props) {
  const me = await getAdminUser();
  if (!me) redirect("/admin/login");

  const { company } = await params;
  const decoded = await resolveCompanyParam(company);
  const entries = await getLedgerEntries(decoded);

  return (
    <div className="flex-1 overflow-x-clip bg-[#F0F4FA] py-6 px-4">
      <div className="mx-auto max-w-[1080px]">
        <Link
          href={`/hospital/${company}`}
          className="mb-5 inline-flex items-center gap-1.5 text-base font-semibold text-gray-600 transition-colors hover:text-[#0e299c]"
        >
          <ArrowLeft size={18} />
          병원 상세로 이동
        </Link>

        <LedgerSheet
          company={decoded}
          initialEntries={entries}
          today={dayjs().format("YYYY. M. D")}
        />
      </div>
    </div>
  );
}
