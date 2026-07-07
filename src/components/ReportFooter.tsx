import Image from "next/image";

export default function ReportFooter() {
  return (
    <footer className="w-full bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <span className="text-sm font-bold text-[#0e299c]">
          모두보고<span className="text-red-500">.</span>
        </span>
        <span className="text-xs text-gray-400">
          © 2026 Modubogo. All rights reserved.
        </span>

        {/* <div className="relative z-10 flex justify-center mt-8">
          <Image
            src="/images/test_ct_08.png"
            width={140}
            height={140}
            alt="모두보고 캐릭터 아이콘"
          />
        </div> */}
      </div>
    </footer>
  );
}
