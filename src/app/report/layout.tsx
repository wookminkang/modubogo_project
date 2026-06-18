import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAdminUser } from "@/lib/admin";

export default async function ReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUser();
  return (
    <div className="flex min-h-screen flex-col">
      <Header
        showNav={!!user}
        user={user && { name: user.name, role: user.role }}
      />
      <main className="flex flex-1 flex-col pt-14">{children}</main>
      <Footer />
    </div>
  );
}
