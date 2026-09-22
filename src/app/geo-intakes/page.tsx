import { redirect } from "next/navigation";
import { getAdminUser, canAccessMenu } from "@/lib/admin";
import { listGeoIntakes } from "@/lib/geo-intake-db";
import GeoIntakesView from "./GeoIntakesView";

export const dynamic = "force-dynamic";

export default async function GeoIntakesPage() {
  const me = await getAdminUser();
  if (!me) redirect("/admin/login");
  if (!canAccessMenu(me, "geo-check")) redirect("/admin/dashboard");

  // 목록에는 계정 정보가 필요 없으므로 응답 본문은 내려보내지 않는다.
  const intakes = (await listGeoIntakes()).map((it) => ({
    nanoid: it.nanoid,
    company: it.company,
    status: it.status,
    createdBy: it.createdBy,
    createdAt: it.createdAt,
    submittedAt: it.submittedAt,
  }));
  return <GeoIntakesView intakes={intakes} />;
}
