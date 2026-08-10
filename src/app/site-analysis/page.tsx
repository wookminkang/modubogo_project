import { redirect } from "next/navigation";
import { getAdminUser, canAccessMenu } from "@/lib/admin";
import SiteAnalysisForm from "./SiteAnalysisForm";

export const dynamic = "force-dynamic";
// SEO/GEO 감사는 사이트를 직접 읽어 수 분이 걸릴 수 있어 실행 시간을 넉넉히 잡는다.
export const maxDuration = 300;

export default async function SiteAnalysisPage() {
  const me = await getAdminUser();
  if (!me) redirect("/admin/login");
  if (!canAccessMenu(me, "site-analysis")) redirect("/admin/dashboard");

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-bold text-[#0e299c]">사이트 분석</h1>
      <SiteAnalysisForm />
    </div>
  );
}
