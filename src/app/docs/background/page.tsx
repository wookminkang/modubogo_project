import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function BackgroundPage() {
  return (
    <article className="flex flex-col gap-0">
      <header className="pb-8 border-b border-gray-100">
        <p className="text-xs font-semibold text-[#0e299c] uppercase tracking-widest mb-2">모두보고 Docs</p>
        <h1 className="text-[2rem] font-bold text-gray-900 leading-tight">서비스 배경</h1>
        <p className="mt-4 text-gray-500 text-sm leading-7">
          모두보고를 만들게 된 이유와 해결하려는 문제를 설명합니다.
        </p>
      </header>

      <section className="mt-8">
        <p className="text-sm text-gray-600 leading-7">
          광고 에이전시는 매월 클라이언트(병원, 브랜드 등)에게 광고 집행 현황을 보고해야 합니다.
          기존에는 엑셀이나 PDF로 직접 작성해 이메일 또는 카카오톡으로 전달하는 방식이었습니다.
        </p>
        <p className="mt-4 text-sm text-gray-600 leading-7">
          이 과정에서 다음과 같은 문제가 반복되었습니다.
        </p>

        <ul className="mt-4 flex flex-col gap-3">
          {[
            { title: "매월 반복되는 수작업", desc: "같은 양식을 복사해 숫자만 바꾸는 단순 반복 작업" },
            { title: "오류 가능성", desc: "수기 입력 과정에서 금액 오류, 날짜 누락 등이 발생" },
            { title: "전달 방식의 한계", desc: "PDF·엑셀 첨부 파일은 모바일에서 보기 불편" },
            { title: "이력 관리 어려움", desc: "이전 달 보고서를 찾으려면 파일을 일일이 열어봐야 함" },
          ].map((item) => (
            <li key={item.title} className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#0e299c] shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-gray-900 mb-3">해결 방향</h2>
        <p className="text-sm text-gray-600 leading-7">
          모두보고는 이를 웹 기반으로 자동화하고 시각화하여, 담당자는 빠르게 보고서를 작성하고
          클라이언트는 링크 하나로 깔끔하게 확인할 수 있도록 만들었습니다.
        </p>
      </section>

      <div className="mt-14 pt-6 border-t border-gray-100 flex justify-between items-center">
        <Link href="/docs" className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={14} />
          서비스 소개
        </Link>
        <Link href="/docs/report-view" className="flex items-center gap-2 text-sm text-[#0e299c] font-medium hover:underline">
          보고서 뷰
          <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}
