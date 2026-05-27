import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0e299c] flex flex-col relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      {/* 메인 콘텐츠 */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center text-center gap-5 max-w-sm w-full">
          {/* 캐릭터 이미지 */}
          <div className="w-90 h-30 relative">
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
      </div>

      {/* 푸터 */}
      <footer className="relative px-6 py-5 text-center border-t border-white/20 bg-white/5">
        <p className="text-white text-xs font-semibold mb-1.5">모두보고</p>
        <p className="text-blue-100 text-xs leading-relaxed">
          대표 전형진 · 사업자등록번호 342-08-03101
          <br />
          경기도 용인시 기흥구 동백중앙로 191, 8층 에프 826호
        </p>
        <p className="text-blue-100 text-xs leading-relaxed mt-1.5">
          TEL 02-3402-1070 · MOBILE 010-8782-1285
          <br />
          oper2068@kakao.com · oper2068@announcego.com
        </p>
        <p className="text-blue-200/60 text-xs mt-2">
          © 2026 모두보고. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
