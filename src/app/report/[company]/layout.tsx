import ReportHeader from "@/components/ReportHeader";
import ReportFooter from "@/components/ReportFooter";

export default function ReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <ReportHeader />
      <div className="mt-[50px] max-w-6xl mx-auto pt-6">{children}</div>
      <ReportFooter />
    </div>
  );
}
