import ReportHeader from "@/components/ReportHeader";
import ReportFooter from "@/components/ReportFooter";
import { isAdmin } from "@/lib/admin";

export default async function ReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await isAdmin();
  return (
    <div className="flex min-h-screen flex-col">
      <ReportHeader showNav={admin} />
      <main className="flex flex-1 flex-col pt-14">{children}</main>
      <ReportFooter />
    </div>
  );
}
