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

export default async function IntakeDetailPage({ params }: Props) {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const { token } = await params;
  const intake = await getIntakeByNanoid(decodeURIComponent(token));

  if (!intake) {
    return (
      <div className="min-h-screen bg-[#F0F4FA] px-4 py-6">
        <BackLink />
        <div className="mt-4 rounded-2xl bg-white py-16 text-center text-sm text-gray-400 shadow-sm">
          존재하지 않는 폼이에요.
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
    <div className="min-h-screen bg-[#F0F4FA] px-4 py-6">
      <BackLink />

      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">
          {intake.company || "병원명 미지정"}
        </h1>
        <p className="mt-1 text-xs text-gray-400">
          {submitted && intake.submitted_at
            ? `제출 ${dayjs(intake.submitted_at).format("YYYY.MM.DD HH:mm")}`
            : "아직 제출 전이에요."}
        </p>
      </div>

      {!submitted ? (
        <div className="mt-4 rounded-2xl bg-white py-16 text-center text-sm text-gray-400 shadow-sm">
          광고주가 아직 제출하지 않았어요.
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {/* 텍스트 항목 */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-gray-500">서술형 항목</h2>
            <div className="flex flex-col">
              {TEXT_FIELDS.map((f) => {
                const v = (intake[f.key] as string | null)?.trim();
                return (
                  <div
                    key={f.key}
                    className="border-b border-gray-100 py-3 last:border-0"
                  >
                    <p className="mb-1 text-xs font-bold text-gray-400">
                      {f.no}. {f.label}
                    </p>
                    {v ? (
                      <p className="whitespace-pre-wrap break-words text-sm text-gray-800">
                        {v}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-300">미입력</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 파일 항목 */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-gray-500">
              첨부 파일
            </h2>
            <div className="flex flex-col gap-4">
              {FILE_FIELDS.map((f) => {
                const list = intake.files[f.key] ?? [];
                return (
                  <div key={f.key}>
                    <p className="mb-1.5 text-xs font-bold text-gray-400">
                      {f.no}. {f.label}
                    </p>
                    {list.length === 0 ? (
                      <p className="text-sm text-gray-300">미첨부</p>
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
                              className={`flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 transition-colors ${
                                url
                                  ? "hover:bg-[#0e299c]/5"
                                  : "pointer-events-none opacity-50"
                              }`}
                            >
                              <FileText
                                size={15}
                                className="shrink-0 text-gray-400"
                              />
                              <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
                                {meta.name}
                              </span>
                              <Download
                                size={15}
                                className="shrink-0 text-[#0e299c]"
                              />
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
  );
}

function BackLink() {
  return (
    <Link
      href="/admin/intakes"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 transition-colors hover:text-[#0e299c]"
    >
      <ArrowLeft size={16} />
      준비자료 폼 목록
    </Link>
  );
}
