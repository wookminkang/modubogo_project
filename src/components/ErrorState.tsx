"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";

interface ErrorStateProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  homeHref?: string;
  homeLabel?: string;
}

/**
 * 세그먼트 error.tsx 공용 폴백.
 * "다시 시도" 시 TanStack Query 의 에러 상태를 reset 해 쿼리를 재요청하고(useQueryErrorResetBoundary),
 * 이어서 Next 의 reset() 으로 세그먼트를 다시 렌더한다.
 */
export default function ErrorState({
  error,
  reset,
  title = "문제가 발생했어요",
  description = "일시적인 오류일 수 있어요.\n잠시 후 다시 시도해 주세요.",
  homeHref = "/",
  homeLabel = "홈으로 돌아가기",
}: ErrorStateProps) {
  const { reset: resetQuery } = useQueryErrorResetBoundary();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F0F4FA] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm px-6 py-10 flex flex-col items-center">
        <div className="w-14 h-14 rounded-full bg-[#0e299c]/10 flex items-center justify-center mb-5">
          <AlertTriangle size={26} className="text-[#0e299c]" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-400 leading-relaxed mb-7 whitespace-pre-line">
          {description}
        </p>
        <button
          onClick={() => {
            resetQuery();
            reset();
          }}
          className="w-full inline-flex items-center justify-center gap-2 bg-[#0e299c] text-white text-sm font-semibold px-6 py-3 rounded-2xl hover:bg-[#0b2180] transition-colors cursor-pointer"
        >
          <RefreshCw size={15} />
          다시 시도
        </button>
        <Link
          href={homeHref}
          className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          {homeLabel}
        </Link>
        {error.digest && (
          <p className="mt-4 text-[11px] text-gray-300">
            오류 코드: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
