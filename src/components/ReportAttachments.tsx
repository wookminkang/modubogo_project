"use client";

import { useEffect, useState } from "react";
import { Download, Paperclip, X } from "lucide-react";

export interface ReportAttachment {
  name: string;
  size: number;
  isImage: boolean;
  /** 보기용 signed URL (발급 실패 시 null) */
  url: string | null;
  /** 다운로드 강제(Content-Disposition) signed URL */
  downloadUrl: string | null;
}

const fmtSize = (n: number) =>
  n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))}KB`
    : `${(n / 1024 / 1024).toFixed(1)}MB`;

/**
 * 광고주 상세 뷰의 첨부자료 목록.
 * 이미지는 페이지 안에서 확대(라이트박스), PDF·기타 파일은 새 탭으로 연다.
 * (모바일 브라우저는 iframe 내 PDF 렌더링이 불안정해 OS 기본 뷰어에 맡긴다)
 */
export default function ReportAttachments({
  attachments,
}: {
  attachments: ReportAttachment[];
}) {
  const [zoomed, setZoomed] = useState<ReportAttachment | null>(null);

  if (attachments.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-gray-900">
        <Paperclip size={15} className="text-[#0e299c]" />
        첨부자료
      </h3>
      <ul className="flex flex-col gap-2">
        {attachments.map((a, i) => {
          const rowClass =
            "flex w-full items-center gap-2.5 rounded-lg bg-[#F0F4FA] px-3 py-2.5 text-left transition-colors hover:bg-[#e7edf6]";
          const inner = (
            <>
              {a.isImage && a.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.url}
                  alt={a.name}
                  className="h-11 w-11 shrink-0 rounded-md object-cover"
                />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white">
                  <Paperclip size={16} className="text-gray-400" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-gray-700">
                  {a.name}
                </span>
                <span className="block text-xs text-gray-400">
                  {fmtSize(a.size)}
                </span>
              </span>
              <Download size={16} className="shrink-0 text-[#0e299c]" />
            </>
          );

          // URL 발급 실패 → 비활성 행
          if (!a.url) {
            return (
              <li key={`${a.name}-${i}`}>
                <div className={`${rowClass} pointer-events-none opacity-50`}>
                  {inner}
                </div>
              </li>
            );
          }

          // 이미지 → 화면 내 확대 / 그 외 → 새 탭
          return (
            <li key={`${a.name}-${i}`}>
              {a.isImage ? (
                <button
                  type="button"
                  onClick={() => setZoomed(a)}
                  className={rowClass}
                >
                  {inner}
                </button>
              ) : (
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={rowClass}
                >
                  {inner}
                </a>
              )}
            </li>
          );
        })}
      </ul>

      {zoomed?.url && (
        <Lightbox
          name={zoomed.name}
          url={zoomed.url}
          downloadUrl={zoomed.downloadUrl}
          onClose={() => setZoomed(null)}
        />
      )}
    </div>
  );
}

function Lightbox({
  name,
  url,
  downloadUrl,
  onClose,
}: {
  name: string;
  url: string;
  downloadUrl: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${name} 미리보기`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/80 p-4"
    >
      <div className="flex w-full max-w-[720px] items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
          {name}
        </span>
        {downloadUrl && (
          <a
            href={downloadUrl}
            onClick={(e) => e.stopPropagation()}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-semibold text-white active:bg-white/25"
          >
            <Download size={14} />
            다운로드
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="shrink-0 rounded-lg bg-white/15 p-1.5 text-white active:bg-white/25"
        >
          <X size={16} />
        </button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={name}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain"
      />
    </div>
  );
}
