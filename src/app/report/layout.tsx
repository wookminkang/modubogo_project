export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[420px] mx-auto shadow-xl min-h-screen bg-[#F0F4FA]">
      {children}
    </div>
  );
}
