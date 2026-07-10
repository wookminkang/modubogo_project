import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isAdmin } from "@/lib/admin";
import { getOutsourcePost } from "@/lib/db";
import { getDesignFileSignedUrl } from "@/lib/design-storage";
import BoardPostForm from "./BoardPostForm";

export const dynamic = "force-dynamic";

const IMG_RE = /\.(png|jpe?g|gif|webp|svg|avif)$/i;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BoardPostPage({ params }: Props) {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const { id } = await params;
  const post = await getOutsourcePost(id);
  if (!post) notFound();

  // 첨부 이미지 미리보기용 signed URL (path → url)
  const fileUrls: Record<string, string> = {};
  for (const m of post.files?.files ?? []) {
    if (IMG_RE.test(m.name)) {
      const url = await getDesignFileSignedUrl(m.path);
      if (url) fileUrls[m.path] = url;
    }
  }

  return (
    <div className="mx-auto w-full max-w-[900px] px-5 py-8">
      <Link
        href="/outsource"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 transition-colors hover:text-[#0e299c]"
      >
        <ArrowLeft size={18} />
        외주 관리로 돌아가기
      </Link>

      <BoardPostForm
        id={post.id}
        author={post.author}
        createdAt={post.created_at}
        initialTitle={post.title ?? ""}
        initialContent={post.content ?? ""}
        initialFiles={post.files?.files ?? []}
        initialFileUrls={fileUrls}
      />
    </div>
  );
}
