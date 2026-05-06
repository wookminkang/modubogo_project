export default function ReportHeader() {
  return (
    <header className="fixed top-0 left-0 w-full bg-white border-b border-gray-100 z-10">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <span className="text-base font-bold text-[#0e299c] tracking-tight">
          모두보고<span className="text-red-500">.</span>
        </span>
        <span className="text-sm text-gray-400">광고 운영보고 시스템</span>
      </div>
    </header>
  );
}
