"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Hourglass, X } from "lucide-react";

/**
 * 광고 배너 (클릭 피드백용 클라이언트 래퍼).
 * `href`가 있으면 해당 링크(새 탭)로 이동하고,
 * 없으면 아직 오픈 전이라 "오픈 준비중" 모달을 띄운다.
 */
export default function AdBanner({
  src,
  width,
  height,
  alt,
  href,
}: {
  src: string;
  width: number;
  height: number;
  alt: string;
  href?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 포털은 클라이언트 마운트 후에만 (SSR 안전)
  useEffect(() => setMounted(true), []);

  const image = (
    <Image
      src={src}
      width={width}
      height={height}
      alt={alt}
      className="w-full h-auto rounded-2xl shadow-sm"
    />
  );

  // 링크가 지정된 배너는 실제 이동 (새 탭)
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full cursor-pointer rounded-2xl transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
        aria-label={alt}
      >
        {image}
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full cursor-pointer rounded-2xl transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
        aria-label={`${alt} (오픈 준비중)`}
      >
        {image}
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 animate-in fade-in-0 duration-150"
            onClick={() => setOpen(false)}
          >
            <div
              className="relative w-full max-w-[320px] rounded-3xl bg-white px-7 py-9 text-center shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 text-gray-300 transition-colors hover:text-gray-500"
                aria-label="닫기"
              >
                <X size={20} />
              </button>

              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#0e299c]/10">
                <Hourglass size={28} className="text-[#0e299c]" />
              </div>

              <h2 className="text-lg font-bold text-gray-900">
                오픈 준비중이에요
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                더 좋은 서비스로 찾아뵐게요.
                <br />
                조금만 기다려 주세요!
              </p>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-7 w-full rounded-xl bg-[#0e299c] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0a1f78]"
              >
                확인
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
