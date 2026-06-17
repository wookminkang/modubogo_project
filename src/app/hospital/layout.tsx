import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { isAdmin } from "@/lib/admin";

export const metadata: Metadata = {
  title: "병원 목록 · 모두보고",
};

/**
 * hospital 라우트 공통 레이아웃.
 * 앱 공통 Header/Footer 로 감싸고, 본문(목록/상세)은 max-w-[1200px] 로 정렬한다.
 */
export default async function HospitalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const admin = await isAdmin();
  return (
    <div className="flex min-h-screen flex-col">
      <Header showNav={admin} />
      <main className="flex flex-1 flex-col pt-14">
        <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
