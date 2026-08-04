import Image from "next/image";
import localFont from "next/font/local";

// GEO 키워드 리포트 — 모두보고 앱과 분리된 독립 영역.
// 공통 Header/Footer(네비 포함)는 쓰지 않고, 모두보고 로고만 얹은 자체 상단 바를 둔다.
// 폰트는 public/fonts 의 Pretendard 를 이 영역에만 적용한다 (앱 본체와 분리).
const pretendard = localFont({
  src: "../../../public/fonts/PretendardVariable.woff2",
  display: "swap",
});

export default function KeywordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${pretendard.className} flex min-h-screen flex-col bg-[#f2f4f6] text-[#191f28] antialiased`}
    >
      <header className="sticky top-0 z-10 border-b border-[#e5e8eb] bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-3.5">
          <Image
            src="/modubogo_logo.svg"
            alt="모두보고"
            width={90}
            height={28}
            priority
            className="h-6 w-auto"
          />
          <span className="h-4 w-px bg-[#e5e8eb]" />
          <span className="text-[13px] font-semibold tracking-tight text-[#0e299c]">
            GEO 키워드 제안서
          </span>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="mt-auto border-t border-[#e5e8eb] bg-white py-6">
        <p className="text-center text-xs tracking-tight text-[#8b95a1]">
          © 모두보고 · AI 검색 노출(GEO) 키워드 리포트
        </p>
      </footer>
    </div>
  );
}
