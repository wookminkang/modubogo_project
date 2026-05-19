import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function SecurityPage() {
  return (
    <article className="flex flex-col gap-0">
      <header className="pb-8 border-b border-gray-100">
        <p className="text-xs font-semibold text-[#0e299c] uppercase tracking-widest mb-2">모두보고 Docs</p>
        <h1 className="text-[2rem] font-bold text-gray-900 leading-tight">보안 및 접근 관리</h1>
        <p className="mt-4 text-gray-500 text-sm leading-7">
          관리자 인증과 보고서별 접근 제어 방식을 설명합니다.
        </p>
      </header>

      {[
        {
          title: "관리자 인증",
          desc: "비밀번호 기반 관리자 로그인, 쿠키 세션 관리. 인증된 관리자만 보고서 수정·삭제, 알림톡 발송 등 민감한 기능에 접근할 수 있습니다.",
        },
        {
          title: "보고서 비밀번호",
          desc: "보고서별 개별 비밀번호를 설정할 수 있습니다. 클라이언트가 링크로 접속 시 비밀번호 입력 후 열람 가능합니다.",
        },
        {
          title: "관리자 전용 기능",
          desc: "보고서 수정·삭제, 알림톡 발송은 관리자로 로그인한 경우에만 접근 가능합니다. 비관리자 접속 시 해당 기능은 표시되지 않습니다.",
        },
      ].map((section, i) => (
        <section key={section.title} className="mt-8">
          <h2 className="text-base font-semibold text-gray-900 mb-2">{section.title}</h2>
          <p className="text-sm text-gray-600 leading-7">{section.desc}</p>
          {i < 2 && <div className="mt-8 border-t border-gray-50" />}
        </section>
      ))}

      <div className="mt-14 pt-6 border-t border-gray-100 flex justify-between items-center">
        <Link href="/docs/colors" className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={14} />
          카테고리 색상
        </Link>
        <span className="text-xs text-gray-300">마지막 페이지</span>
      </div>
    </article>
  );
}
