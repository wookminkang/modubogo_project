import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAdminUser } from "@/lib/admin";

// 관리자용 GEO 노출 체크 영역. 다른 탭과 동일하게 앱 공통 Header + Footer 를 두른다.
// 접근 제어(isAdmin)는 각 page 에서 처리.
export default async function GeoCheckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUser();
  return (
    <div className="flex min-h-screen flex-col">
      <Header
        showNav={!!user}
        user={user && { name: user.name, role: user.role, allowedMenus: user.allowed_menus }}
      />
      <main className="flex flex-1 flex-col pt-14">{children}</main>
      <Footer />
    </div>
  );
}
