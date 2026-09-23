import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminUser, canAccessMenu } from "@/lib/admin";
import { CardTitle } from "@/components/CardTitle";
import { listGeoTargets, listGeoRuns } from "@/lib/geo-db";
import TargetForm from "./_components/TargetForm";

export const dynamic = "force-dynamic";

export default async function GeoCheckPage() {
  const me = await getAdminUser();
  if (!me) redirect("/admin/login");
  if (!canAccessMenu(me, "geo-check")) redirect("/admin/dashboard");

  const targets = await listGeoTargets();
  // 대상마다 최근 실행 2건 — 노출률과 직전 회차 대비 변화를 카드에 보여주기 위함.
  const recent = await Promise.all(
    targets.map(async (t) => ({ id: t.id, runs: await listGeoRuns(t.id, 2) })),
  );
  const runsById = new Map(recent.map((r) => [r.id, r.runs]));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <CardTitle
        title="GEO 체크"
        description="ChatGPT에 키워드를 물었을 때 우리 병원이 답변에 등장하는지 O/X로 확인합니다."
      />

      <TargetForm />

      {targets.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed border-gray-200 px-6 py-12 text-center text-sm text-gray-400">
          등록된 대상이 없습니다. 위에서 병원을 먼저 등록해 주세요.
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {targets.map((t) => {
            const runs = runsById.get(t.id) ?? [];
            const last = runs[0];
            const prev = runs[1];
            const rate = last && last.totalCount ? last.foundCount / last.totalCount : null;
            const prevRate = prev && prev.totalCount ? prev.foundCount / prev.totalCount : null;
            const delta = rate !== null && prevRate !== null ? rate - prevRate : null;

            return (
              <Link
                key={t.id}
                href={`/geo-check/${t.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 transition-colors hover:border-[#0e299c]"
              >
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-[#333d4b]">{t.name}</span>
                  <span className="mt-1 text-xs text-[#6b7684]">
                    {t.region ? `${t.region} · ` : ""}
                    {last
                      ? `최근 실행 ${new Date(last.startedAt).toLocaleDateString("ko-KR")}`
                      : "실행 이력 없음"}
                  </span>
                </div>

                {last && rate !== null ? (
                  <div className="flex items-center gap-3">
                    {delta !== null && delta !== 0 && (
                      <span
                        className={`text-xs font-semibold ${delta > 0 ? "text-[#0e299c]" : "text-red-500"}`}
                      >
                        {delta > 0 ? "▲" : "▼"} {Math.abs(Math.round(delta * 100))}%p
                      </span>
                    )}
                    <span className="rounded-full bg-[#0e299c]/5 px-3 py-1.5 text-sm font-bold text-[#0e299c]">
                      {last.foundCount}/{last.totalCount} · {Math.round(rate * 100)}%
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
