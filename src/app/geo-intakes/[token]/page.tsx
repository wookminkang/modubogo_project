import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAdminUser, canAccessMenu } from "@/lib/admin";
import { getGeoIntakeByNanoid } from "@/lib/geo-intake-db";
import { FIELD_BY_KEY, KEYWORD_MONTH_MIN, STEPS, displayValue, isVisible, keywordList } from "@/lib/geo-intake-fields";
import dayjs from "@/lib/dayjs";
import CopyButton from "./CopyButton";
import SecretValue from "./SecretValue";

export const dynamic = "force-dynamic";

// 테마(다크/라이트) 적응 색상 — Seed 시맨틱 토큰 (GeoIntakesView 와 동일 규칙)
const PAGE = "bg-[var(--seed-color-bg-layer-basement)]";
const CARD = "bg-[var(--seed-color-bg-layer-default)]";
const FG = "text-[var(--seed-color-fg-neutral)]";
const FG_SUB = "text-[var(--seed-color-fg-neutral-subtle)]";
const ROW = "border-b border-[var(--seed-color-stroke-neutral-muted)] last:border-0";

export default async function GeoIntakeDetailPage({ params }: { params: Promise<{ token: string }> }) {
  const me = await getAdminUser();
  if (!me) redirect("/admin/login");
  if (!canAccessMenu(me, "geo-check")) redirect("/admin/dashboard");

  const { token } = await params;
  const intake = await getGeoIntakeByNanoid(decodeURIComponent(token));
  if (!intake) notFound();

  const a = intake.answers;
  const keywords = keywordList(a.keywords);

  return (
    <div className={`flex-1 ${PAGE} px-4 py-6`}>
      <div className="mx-auto max-w-3xl">
        <Link
          href="/geo-intakes"
          className={`mb-4 inline-flex items-center gap-1.5 text-sm font-semibold ${FG_SUB} transition-colors hover:text-[#0e299c]`}
        >
          <ArrowLeft size={18} />
          병원 정보 폼
        </Link>

        <div className="mb-5">
          <h1 className={`text-xl font-bold ${FG}`}>{a.hospital_name || intake.company || "병원명 미지정"}</h1>
          <p className={`mt-1 text-sm ${FG_SUB}`}>
            {intake.status === "submitted" && intake.submittedAt
              ? `제출 ${dayjs(intake.submittedAt).format("YYYY.MM.DD HH:mm")}`
              : "아직 제출 전이에요"}
            {intake.consentedAt && ` · 개인정보 동의 ${dayjs(intake.consentedAt).format("YYYY.MM.DD HH:mm")}`}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {STEPS.map((step) => (
            <section key={step.title} className={`rounded-2xl ${CARD} px-5 py-4 shadow-sm`}>
              <h2 className={`mb-2 text-sm font-bold ${FG_SUB}`}>{step.title}</h2>

              {step.keys.map((key) => {
                const def = FIELD_BY_KEY.get(key)!;
                if (!isVisible(def, a)) return null;
                const value = displayValue(def, a[key]);

                // 키워드: 번호 목록 + 개수 + 한 번에 복사
                if (key === "keywords") {
                  return (
                    <div key={key} className={`py-3 ${ROW}`}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className={`text-sm font-semibold ${FG}`}>
                          {def.label}{" "}
                          <span className={keywords.length >= KEYWORD_MONTH_MIN ? "text-[#0e299c]" : FG_SUB}>
                            {keywords.length}개
                          </span>
                        </span>
                        {keywords.length > 0 && <CopyButton text={keywords.join("\n")} label="전체 복사" />}
                      </div>
                      {keywords.length ? (
                        <ol className={`list-decimal pl-6 text-sm leading-7 ${FG}`}>
                          {keywords.map((k, i) => (
                            <li key={i}>{k}</li>
                          ))}
                        </ol>
                      ) : (
                        <p className={`text-sm ${FG_SUB}`}>—</p>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={key} className={`flex items-start justify-between gap-4 py-3 ${ROW}`}>
                    <span className={`shrink-0 text-sm font-semibold ${FG}`}>{def.shortLabel ?? def.label}</span>
                    {!value ? (
                      <span className={`text-sm ${FG_SUB}`}>—</span>
                    ) : def.secret ? (
                      <SecretValue value={value} />
                    ) : (
                      <span className={`max-w-[70%] whitespace-pre-wrap break-words text-right text-sm ${FG}`}>
                        {value}
                      </span>
                    )}
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
