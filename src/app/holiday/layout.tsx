import ReportHeader from "@/components/ReportHeader";
import ReportFooter from "@/components/ReportFooter";

export default function HolidayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <ReportHeader />
      <main className="flex flex-1 flex-col pt-14">{children}</main>
      <ReportFooter />
    </div>
  );
}
