"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * 루트 레이아웃 자체에서 발생한 오류용 최후 방어선.
 * 자체 <html>/<body> 를 렌더해야 하며, 이 단계에선 앱 Provider 가 없으므로
 * 쿼리 reset 없이 Next 의 reset() 만 사용한다.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ko">
      <body className="min-h-screen bg-[#F0F4FA] flex flex-col items-center justify-center px-6 text-center antialiased">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm px-6 py-10 flex flex-col items-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            일시적인 오류가 발생했어요
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed mb-7">
            잠시 후 다시 시도해 주세요.
            <br />
            문제가 계속되면 관리자에게 문의해주세요.
          </p>
          <button
            onClick={() => reset()}
            className="w-full bg-[#0e299c] text-white text-sm font-semibold px-6 py-3 rounded-2xl hover:bg-[#0b2180] transition-colors cursor-pointer"
          >
            다시 시도
          </button>
          {error.digest && (
            <p className="mt-4 text-[11px] text-gray-300">
              오류 코드: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
