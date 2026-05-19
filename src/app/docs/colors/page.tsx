import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function ColorsPage() {
  return (
    <article className="flex flex-col gap-0">
      <header className="pb-8 border-b border-gray-100">
        <p className="text-xs font-semibold text-[#0e299c] uppercase tracking-widest mb-2">모두보고 Docs</p>
        <h1 className="text-[2rem] font-bold text-gray-900 leading-tight">카테고리 색상 설정</h1>
        <p className="mt-4 text-gray-500 text-sm leading-7">
          광고 카테고리별 태그 색상을 직접 커스터마이징할 수 있습니다.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-gray-900 mb-3">기능</h2>
        <ul className="flex flex-col gap-2">
          {[
            "검색광고, 디스플레이, 소셜 등 카테고리별 배경색·텍스트색 설정",
            "컬러 피커로 직관적으로 변경",
            "신규 카테고리 추가 및 삭제 가능",
            "변경 색상은 모든 보고서에 즉시 반영",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600 leading-6">
              <span className="mt-2 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 border-t border-gray-50" />

      <section className="mt-8">
        <h2 className="text-base font-semibold text-gray-900 mb-4">카테고리 예시</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "검색광고", bg: "#e0f2fe", text: "#0369a1" },
            { label: "디스플레이", bg: "#fef9c3", text: "#854d0e" },
            { label: "소셜", bg: "#f0fdf4", text: "#166534" },
            { label: "바이럴", bg: "#fdf4ff", text: "#7e22ce" },
            { label: "배너", bg: "#fff1f2", text: "#9f1239" },
          ].map((c) => (
            <span
              key={c.label}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: c.bg, color: c.text }}
            >
              {c.label}
            </span>
          ))}
        </div>
      </section>

      <div className="mt-14 pt-6 border-t border-gray-100 flex justify-between items-center">
        <Link href="/docs/naver" className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={14} />
          네이버 광고 API
        </Link>
        <Link href="/docs/security" className="flex items-center gap-2 text-sm text-[#0e299c] font-medium hover:underline">
          보안 및 접근 관리
          <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}
