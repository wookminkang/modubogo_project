import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import { getCategoryColorsFromDB } from "@/lib/db";
import { DEFAULT_COLORS, CATEGORIES } from "@/lib/categoryColors";
import { ArrowLeft } from "lucide-react";
import CategoryColorEditor from "./CategoryColorEditor";

export const dynamic = "force-dynamic";

export default async function CategoryColorsPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const dbColors = await getCategoryColorsFromDB();
  const colorMap = { ...DEFAULT_COLORS, ...dbColors };

  // 기본 카테고리 + DB에 저장된 신규 카테고리 모두 표시
  const allCategories = [...new Set([...CATEGORIES, ...Object.keys(dbColors)])];
  const initialColors = allCategories.map((category) => ({
    category,
    bgHex: colorMap[category]?.bgHex ?? "#f3f4f6",
    textHex: colorMap[category]?.textHex ?? "#6b7280",
  }));

  return (
    <div className="min-h-screen bg-[#F0F4FA]">
      <div className="px-4 py-6 flex flex-col gap-5 pb-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0e299c]">카테고리 색상 설정</h1>
            <p className="text-sm text-gray-400 mt-0.5">카테고리별 색상을 클릭으로 변경할 수 있어요</p>
          </div>
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-1 text-sm text-gray-500 bg-white px-3 py-2 rounded-xl shadow-sm"
          >
            <ArrowLeft size={14} />
            대시보드
          </Link>
        </div>

        <CategoryColorEditor initialColors={initialColors} />
      </div>
    </div>
  );
}
