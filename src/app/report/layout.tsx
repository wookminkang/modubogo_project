import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { isAdmin } from "@/lib/admin";

export default async function ReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await isAdmin();
  return (
    <div className="flex min-h-screen flex-col">
      <Header showNav={admin} />
      <main className="flex flex-1 flex-col pt-14">{children}</main>
      <Footer />
    </div>
  );
}
