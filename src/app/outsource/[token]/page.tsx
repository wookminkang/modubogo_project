import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isAdmin } from "@/lib/admin";
import { getDesignRequestByNanoid, listDesigners } from "@/lib/db";
import { DESIGN_FILE_FIELDS } from "@/lib/design-fields";
import { getDesignFileSignedUrl } from "@/lib/design-storage";
import DesignRequestForm from "./DesignRequestForm";

const IMG_RE = /\.(png|jpe?g|gif|webp|svg|avif)$/i;

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function OutsourceEditPage({ params }: Props) {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const { token } = await params;
  const [request, designers] = await Promise.all([
    getDesignRequestByNanoid(token),
    listDesigners(),
  ]);
  if (!request) notFound();

  // 저장된 이미지 첨부는 미리보기용 signed URL 을 발급해 폼에 넘긴다(path → url).
  const initialFileUrls: Record<string, string> = {};
  for (const f of DESIGN_FILE_FIELDS) {
    for (const m of request.files?.[f.key] ?? []) {
      if (IMG_RE.test(m.name)) {
        const url = await getDesignFileSignedUrl(m.path);
        if (url) initialFileUrls[m.path] = url;
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-[600px] px-5 py-8">
      <Link
        href="/outsource"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 transition-colors hover:text-[#0e299c]"
      >
        <ArrowLeft size={18} />
        외주 관리로 돌아가기
      </Link>

      <DesignRequestForm
        nanoid={request.nanoid}
        status={request.status}
        initialContent={request.content ?? {}}
        initialFiles={request.files ?? {}}
        designers={designers}
        initialDesignerId={request.designer_id}
        initialFileUrls={initialFileUrls}
      />
    </div>
  );
}
