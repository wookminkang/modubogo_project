import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function AlimtalkPage() {
  return (
    <article className="flex flex-col gap-0">
      <header className="pb-8 border-b border-gray-100">
        <p className="text-xs font-semibold text-[#0e299c] uppercase tracking-widest mb-2">모두보고 Docs</p>
        <h1 className="text-[2rem] font-bold text-gray-900 leading-tight">알림톡 발송 시스템</h1>
        <p className="mt-4 text-gray-500 text-sm leading-7">
          카카오 알림톡으로 클라이언트에게 보고서를 전달하고 발송 이력을 관리합니다.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-gray-900 mb-3">발송</h2>
        <ul className="flex flex-col gap-2">
          {[
            "보고서 작성 후 카카오 알림톡으로 클라이언트에게 보고서 링크 발송",
            "회사별 최대 3개 수신자 번호 설정",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600 leading-6">
              <span className="mt-2 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 border-t border-gray-50" />

      <section className="mt-8">
        <h2 className="text-base font-semibold text-gray-900 mb-3">발송 이력 관리</h2>
        <ul className="flex flex-col gap-2">
          {[
            "발송 완료 / 발송 실패 탭으로 구분",
            "발송 일시, 수신자 번호, 발송 건수 확인",
            "실패 시 오류 메시지 표시",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600 leading-6">
              <span className="mt-2 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-14 pt-6 border-t border-gray-100 flex justify-between items-center">
        <Link href="/docs/dashboard" className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={14} />
          관리자 대시보드
        </Link>
        <Link href="/docs/naver" className="flex items-center gap-2 text-sm text-[#0e299c] font-medium hover:underline">
          네이버 광고 API
          <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}
