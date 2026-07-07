import Footer from "@/components/Footer";

/**
 * ledger 공용 레이아웃 — 푸터만 공용으로 렌더한다(모든 하위 페이지 동일 푸터).
 * 헤더는 페이지마다 다르므로 각 페이지에서 렌더한다.
 * (관리자 목록/편집 → 앱 공통 Header, 광고주 /view → 로고+상호명 전용 헤더)
 */
export default function LedgerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col pt-14">{children}</main>
      <Footer />
    </div>
  );
}
