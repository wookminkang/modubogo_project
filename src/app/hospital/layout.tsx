import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "병원 목록 · 모두보고",
};

/**
 * hospital 라우트 공통 레이아웃.
 * 목록(`/hospital`)과 상세(`/hospital/[slug]`)가 동일한 카드 컨테이너·푸터를 공유한다.
 * 페이지 고유 헤더/본문은 각 page.tsx 에서 children 으로 들어온다.
 */
export default function HospitalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex-1">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
        {children}

        {/* 공통 푸터 영역 */}
        <footer className="border-t border-gray-100 px-5 py-4 text-center text-xs text-gray-400">
          © 2026 모두보고 · 광고 운영 보고서
        </footer>
      </div>
    </div>
  );
}
