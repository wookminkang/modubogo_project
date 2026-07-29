import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import {
  listDesignRequests,
  listDesigners,
  listOutsourcePosts,
  listOutsourcePayments,
} from "@/lib/db";
import { getDesignFileSignedUrl } from "@/lib/design-storage";
import OutsourceView from "./OutsourceView";

export const dynamic = "force-dynamic";

const IMG_RE = /\.(png|jpe?g|gif|webp|svg|avif)$/i;

export default async function OutsourcePage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const [requests, partners, posts, payments] = await Promise.all([
    listDesignRequests(),
    listDesigners(),
    listOutsourcePosts(),
    listOutsourcePayments(),
  ]);

  // 파트너 첨부는 비공개 버킷이라 조회용 signed URL 을 서버에서 발급해 넘긴다(path → url).
  // 이미지는 미리보기(인라인), 그 외 형식은 다운로드로 열리게 한다.
  const partnerFileUrls: Record<string, string> = {};
  for (const p of partners) {
    for (const m of p.files?.files ?? []) {
      const url = await getDesignFileSignedUrl(
        m.path,
        3600,
        IMG_RE.test(m.name) ? undefined : m.name,
      );
      if (url) partnerFileUrls[m.path] = url;
    }
  }

  return (
    <OutsourceView
      requests={requests}
      partners={partners}
      posts={posts}
      payments={payments}
      partnerFileUrls={partnerFileUrls}
    />
  );
}
