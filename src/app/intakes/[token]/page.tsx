import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { isAdmin } from "@/lib/admin";
import { getIntakeByNanoid } from "@/lib/db";
import { getIntakeFileSignedUrl } from "@/lib/intake-storage";
import { TEXT_FIELDS, FILE_FIELDS } from "@/lib/intake-fields";
import dayjs from "@/lib/dayjs";

interface Props {
  params: Promise<{ token: string }>;
}

export const dynamic = "force-dynamic";

// 테마(다크/라이트) 적응 색상 — Seed 시맨틱 토큰 (IntakesView 와 동일 규칙)
const PAGE = "bg-[var(--seed-color-bg-layer-basement)]"; // 라이트 #f3f4f5 / 다크 #000
const CARD = "bg-[var(--seed-color-bg-layer-default)]"; // 라이트 #fff / 다크 #16171b
const CHIP = "bg-[var(--seed-color-bg-neutral-weak)]"; // 라이트 #f3f4f5 / 다크 #2b2e35
const FG = "text-[var(--seed-color-fg-neutral)]";
const FG_SUB = "text-[var(--seed-color-fg-neutral-subtle)]";
const BORDER = "border-[var(--seed-color-stroke-neutral-muted)]";

export default async function IntakeDetailPage({ params }: Props) {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const { token } = await params;
  const intake = await getIntakeByNanoid(decodeURIComponent(token));

  if (!intake) {
    return (
      <div className={`flex-1 ${PAGE} px-4 py-6`}>
        <div className="mx-auto max-w-6xl">
          <BackLink />
          <div className={`mt-4 rounded-2xl ${CARD} py-16 text-center text-sm ${FG_SUB} shadow-sm`}>
            존재하지 않는 폼이에요.
          </div>
        </div>
      </div>
    );
  }

  // 파일별 signed URL 미리 발급 (1시간 유효)
  const fileUrls = new Map<string, string | null>();
  await Promise.all(
    FILE_FIELDS.flatMap((f) =>
      (intake.files[f.key] ?? []).map(async (meta) => {
        fileUrls.set(meta.path, await getIntakeFileSignedUrl(meta.path));
      }),
    ),
  );

  const submitted = intake.status === "submitted";

  return (
    <div className={`flex-1 ${PAGE} px-4 py-6`}>
     <div className="mx-auto max-w-6xl">
      <BackLink />

      <div className={`mt-4 rounded-2xl ${CARD} p-5 shadow-sm`}>
        <h1 className={`text-xl font-bold ${FG}`}>
          {intake.company || "병원명 미지정"}
        </h1>
        <p className={`mt-1 text-xs ${FG_SUB}`}>
          {submitted && intake.submitted_at
            ? `제출 ${dayjs(intake.submitted_at).format("YYYY.MM.DD HH:mm")}`
            : "아직 제출 전이에요."}
        </p>
      </div>

      {!submitted ? (
        <div className={`mt-4 rounded-2xl ${CARD} py-16 text-center text-sm ${FG_SUB} shadow-sm`}>
          광고주가 아직 제출하지 않았어요.
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {/* 텍스트 항목 */}
          <section className={`rounded-2xl ${CARD} p-5 shadow-sm`}>
            <h2 className={`mb-3 text-sm font-bold ${FG_SUB}`}>서술형 항목</h2>
            <div className="flex flex-col">
              {TEXT_FIELDS.map((f) => {
                const v = (intake[f.key] as string | null)?.trim();
                return (
                  <div
                    key={f.key}
                    className={`border-b ${BORDER} py-3 last:border-0`}
                  >
                    <p className={`mb-1 text-xs font-bold ${FG_SUB}`}>
                      {f.no}. {f.label}
                    </p>
                    {v ? (
                      <p className={`whitespace-pre-wrap break-words text-sm ${FG}`}>
                        {v}
                      </p>
                    ) : (
                      <p className={`text-sm ${FG_SUB} opacity-60`}>미입력</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 파일 항목 */}
          <section className={`rounded-2xl ${CARD} p-5 shadow-sm`}>
            <h2 className={`mb-3 text-sm font-bold ${FG_SUB}`}>첨부 파일</h2>
            <div className="flex flex-col gap-4">
              {FILE_FIELDS.map((f) => {
                const list = intake.files[f.key] ?? [];
                return (
                  <div key={f.key}>
                    <p className={`mb-1.5 text-xs font-bold ${FG_SUB}`}>
                      {f.no}. {f.label}
                    </p>
                    {list.length === 0 ? (
                      <p className={`text-sm ${FG_SUB} opacity-60`}>미첨부</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {list.map((meta) => {
                          const url = fileUrls.get(meta.path);
                          return (
                            <a
                              key={meta.path}
                              href={url ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 rounded-lg ${CHIP} px-3 py-2 transition-opacity ${
                                url
                                  ? "hover:opacity-80"
                                  : "pointer-events-none opacity-50"
                              }`}
                            >
                              <FileText size={15} className={`shrink-0 ${FG_SUB}`} />
                              <span className={`min-w-0 flex-1 truncate text-sm ${FG}`}>
                                {meta.name}
                              </span>
                              <Download size={15} className={`shrink-0 ${FG_SUB}`} />
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
     </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/intakes"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--seed-color-fg-neutral-subtle)] transition-colors hover:text-[var(--seed-color-fg-neutral)]"
    >
      <ArrowLeft size={16} />
      준비자료 폼 목록
    </Link>
  );
}
