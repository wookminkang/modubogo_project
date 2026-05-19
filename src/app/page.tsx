import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0e299c] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative flex flex-col items-center text-center gap-6 max-w-sm w-full">
        {/* 캐릭터 이미지 */}
        <div className="w-90 h-48 relative">
          <Image
            src="/images/test_ct_05.png"
            alt="모두보고 캐릭터"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* 타이틀 */}
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            모두보고<span className="text-red-400">.</span>
          </h1>
          <p className="mt-2 text-blue-200 text-base font-medium">
            광고 운영 보고서, 더 쉽게
          </p>
        </div>

        {/* 설명 */}
        <p className="text-blue-300 text-sm leading-relaxed">
          월별 광고 집행 현황을 자동으로 정리하고
          <br />
          클라이언트에게 깔끔하게 전달하세요.
        </p>

        {/* CTA 버튼 */}
        <div className="flex flex-col gap-3 w-full mt-2">
          <Link
            href="/docs"
            className="w-full h-12 bg-white text-[#0e299c] text-sm font-bold rounded-2xl flex items-center justify-center hover:bg-blue-50 transition-colors"
          >
            서비스 소개 보기
          </Link>
          <Link
            href="/admin/login"
            className="w-full h-12 bg-white/10 text-white text-sm font-medium rounded-2xl flex items-center justify-center hover:bg-white/20 transition-colors border border-white/20"
          >
            관리자 로그인
          </Link>
        </div>
      </div>

      {/* 하단 */}
      <p className="absolute bottom-6 text-blue-300/50 text-xs">
        © 2026 모두보고. All rights reserved.
      </p>
    </div>
  );
}
