import { notFound } from "next/navigation";
import { Download, Paperclip } from "lucide-react";
import { getDesignRequestByNanoid } from "@/lib/db";
import {
  DESIGN_SECTIONS,
  DESIGN_FILE_FIELDS,
  designTitle,
  type DesignContent,
} from "@/lib/design-fields";
import { getDesignFileSignedUrl } from "@/lib/design-storage";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string }>;
}

const IMG_RE = /\.(png|jpe?g|gif|webp|svg|avif)$/i;

const fmtSize = (n: number) =>
  n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))}KB`
    : `${(n / 1024 / 1024).toFixed(1)}MB`;

// content 값을 화면 표시용 문자열로. multi(배열)는 "· "로 join, 빈 값은 null.
function displayValue(v: DesignContent[string] | undefined): string | null {
  if (Array.isArray(v)) return v.length ? v.join(" · ") : null;
  const s = (v ?? "").toString().trim();
  return s || null;
}

export default async function DesignerViewPage({ params }: Props) {
  const { token } = await params;
  const request = await getDesignRequestByNanoid(token);
  if (!request) notFound();

  const content = request.content ?? {};

  // 첨부 파일 → signed URL (서버에서 발급, 1시간)
  const materials: {
    name: string;
    size: number;
    url: string | null;
    isImage: boolean;
  }[] = [];
  for (const f of DESIGN_FILE_FIELDS) {
    for (const m of request.files?.[f.key] ?? []) {
      materials.push({
        name: m.name,
        size: m.size,
        url: await getDesignFileSignedUrl(m.path),
        isImage: IMG_RE.test(m.name),
      });
    }
  }

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 py-8">
      {/* 환영 캐릭터 */}
      <div className="flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/welcome-a.png"
          alt="반갑게 인사하는 캐릭터"
          width={176}
          height={176}
          className="h-44 w-44 object-contain"
        />
      </div>

      {/* 제목 */}
      <div className="mt-1 rounded-2xl bg-white px-6 py-6 shadow-sm">
        <p className="text-xs font-semibold text-[#0e299c]">디자인 작업 요청서</p>
        <h1 className="mt-2 text-2xl font-bold break-keep text-gray-900">
          {designTitle(content)}
        </h1>
      </div>

      {/* 브리프 섹션 (값이 있는 항목만) */}
      <div className="mt-4 flex flex-col gap-4">
        {DESIGN_SECTIONS.map((section) => {
          const rows = section.fields
            // 제목으로 이미 보여준 작업명은 섹션에서 제외(중복 방지)
            .filter((f) => f.key !== "task_name")
            .map((f) => ({ label: f.label, value: displayValue(content[f.key]), type: f.type }))
            .filter((r) => r.value !== null);
          if (rows.length === 0) return null;
          return (
            <section
              key={section.title}
              className="rounded-2xl bg-white px-6 py-5 shadow-sm"
            >
              <h2 className="text-sm font-bold text-[#0e299c]">{section.title}</h2>
              <dl className="mt-3 flex flex-col divide-y divide-gray-100">
                {rows.map((r) => (
                  <div key={r.label} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                    {/* 필드 라벨이 섹션 제목과 같으면(단일 항목 섹션) 라벨 생략해 중복 방지 */}
                    {r.label !== section.title && (
                      <dt className="text-xs font-semibold text-gray-400">{r.label}</dt>
                    )}
                    <dd className="text-sm whitespace-pre-wrap break-words text-gray-800">
                      {r.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}

        {/* 전달 자료 */}
        {materials.length > 0 && (
          <section className="rounded-2xl bg-white px-6 py-5 shadow-sm">
            <h2 className="text-sm font-bold text-[#0e299c]">전달 자료</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {materials.map((m, i) => (
                <li key={`${m.name}-${i}`}>
                  <a
                    href={m.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2.5 transition-colors hover:bg-gray-100 ${
                      m.url ? "" : "pointer-events-none opacity-50"
                    }`}
                  >
                    {/* 이미지면 썸네일, 아니면 아이콘 */}
                    {m.isImage && m.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.url}
                        alt={m.name}
                        className="h-11 w-11 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-gray-200">
                        <Paperclip size={16} className="text-gray-400" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                      {m.name}
                    </span>
                    <span className="shrink-0 text-xs text-gray-400">
                      {fmtSize(m.size)}
                    </span>
                    <Download size={15} className="shrink-0 text-[#0e299c]" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        모두보고 · 외주 작업 요청서
      </p>
    </div>
  );
}
