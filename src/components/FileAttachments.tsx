"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileUp, Paperclip, X } from "lucide-react";
import type { DesignFileMeta } from "@/lib/design-fields";

export type NewFile = { file: File; url: string | null };

export const IMG_RE = /\.(png|jpe?g|gif|webp|svg|avif)$/i;
export const PDF_RE = /\.pdf$/i;

const fmtSize = (n: number) =>
  n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))}KB`
    : `${(n / 1024 / 1024).toFixed(1)}MB`;

type PreviewKind = "image" | "pdf" | "other";
const kindOf = (name: string): PreviewKind =>
  IMG_RE.test(name) ? "image" : PDF_RE.test(name) ? "pdf" : "other";

/** 파일 목록 → NewFile[] (미리보기용 objectURL 생성) */
export function toNewFiles(list: FileList | null): NewFile[] {
  if (!list?.length) return [];
  return Array.from(list).map((file) => ({
    file,
    url: URL.createObjectURL(file),
  }));
}

/** 언마운트/저장 완료 시 objectURL 해제 (메모리 누수 방지) */
export function revokeNewFiles(files: NewFile[]) {
  for (const f of files) if (f.url) URL.revokeObjectURL(f.url);
}

/**
 * 재사용 첨부 업로더 — 부모가 existing/newFiles 상태를 보유하고 핸들러를 넘긴다.
 * 행을 클릭하면 미리보기(이미지 확대 / PDF 인라인 / 그 외 새 탭 열기)가 열린다.
 */
export default function FileAttachments({
  existing,
  newFiles,
  urls,
  accept,
  onAdd,
  onRemoveNew,
  onRemoveExisting,
}: {
  existing: DesignFileMeta[];
  newFiles: NewFile[];
  /** 저장된 파일의 미리보기 URL (path → signed url) */
  urls: Record<string, string>;
  accept?: string;
  onAdd: (list: FileList | null) => void;
  onRemoveNew: (idx: number) => void;
  onRemoveExisting: (path: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ name: string; url: string } | null>(
    null,
  );
  const hasAny = existing.length > 0 || newFiles.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--seed-color-stroke-neutral-muted)] bg-[var(--seed-color-bg-neutral-weak)] px-4 py-4 text-sm font-semibold text-[var(--seed-color-fg-neutral-muted)] transition-colors hover:border-[#0e299c] hover:text-[#0e299c]"
      >
        <FileUp size={18} />
        파일 추가하기
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          onAdd(e.target.files);
          e.target.value = "";
        }}
      />
      {hasAny && (
        <div className="flex flex-col gap-1.5">
          {existing.map((m) => (
            <FileRow
              key={m.path}
              name={m.name}
              size={m.size}
              url={urls[m.path]}
              tone="saved"
              onPreview={setPreview}
              onRemove={() => onRemoveExisting(m.path)}
            />
          ))}
          {newFiles.map((e, idx) => (
            <FileRow
              key={`${e.file.name}-${idx}`}
              name={e.file.name}
              size={e.file.size}
              url={e.url ?? undefined}
              tone="pending"
              onPreview={setPreview}
              onRemove={() => onRemoveNew(idx)}
            />
          ))}
        </div>
      )}
      {newFiles.length > 0 && (
        <p className="text-xs text-amber-600">
          * “저장/등록”을 눌러야 첨부가 반영됩니다.
        </p>
      )}

      {preview && (
        <PreviewOverlay
          name={preview.name}
          url={preview.url}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}

function FileRow({
  name,
  size,
  url,
  tone,
  onPreview,
  onRemove,
}: {
  name: string;
  size: number;
  url?: string;
  tone: "saved" | "pending";
  onPreview: (p: { name: string; url: string }) => void;
  onRemove: () => void;
}) {
  const saved = tone === "saved";
  const kind = kindOf(name);
  const thumb = kind === "image" ? url : undefined;

  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-[var(--seed-color-bg-neutral-weak)] px-3 py-2">
      <button
        type="button"
        disabled={!url}
        onClick={() => url && onPreview({ name, url })}
        title={url ? "미리보기" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left disabled:cursor-default"
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={name}
            className="h-10 w-10 shrink-0 rounded-md object-cover"
          />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--seed-color-bg-neutral)]">
            <Paperclip
              size={16}
              className="text-[var(--seed-color-fg-neutral-muted)]"
            />
          </span>
        )}
        <span
          className={`min-w-0 flex-1 truncate text-sm text-[var(--seed-color-fg-neutral)] ${
            url ? "hover:underline" : ""
          }`}
        >
          {name}
        </span>
      </button>
      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
          saved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
        }`}
      >
        {saved ? "첨부됨" : "저장 전"}
      </span>
      <span className="shrink-0 text-xs text-[var(--seed-color-fg-neutral-muted)]">
        {fmtSize(size)}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="삭제"
        className="shrink-0 rounded-full p-0.5 text-[var(--seed-color-fg-neutral-muted)] hover:bg-[var(--seed-color-bg-neutral)] hover:text-[var(--seed-color-fg-neutral)]"
      >
        <X size={15} />
      </button>
    </div>
  );
}

/** 첨부 미리보기 오버레이 — 이미지는 확대, PDF는 인라인, 그 외는 새 탭 안내. */
function PreviewOverlay({
  name,
  url,
  onClose,
}: {
  name: string;
  url: string;
  onClose: () => void;
}) {
  const kind = kindOf(name);

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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/70 p-4"
    >
      <div className="flex w-full max-w-[900px] items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
          {name}
        </span>
        <a
          href={url}
          download={name}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/25"
        >
          <Download size={14} />
          다운로드
        </a>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="shrink-0 rounded-lg bg-white/15 p-1.5 text-white hover:bg-white/25"
        >
          <X size={16} />
        </button>
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-[900px] flex-1 items-center justify-center overflow-hidden rounded-xl bg-white"
      >
        {kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={name}
            className="max-h-[80vh] w-auto max-w-full object-contain"
          />
        ) : kind === "pdf" ? (
          <iframe src={url} title={name} className="h-[80vh] w-full" />
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <Paperclip size={28} className="text-gray-400" />
            <p className="text-sm text-gray-600">
              이 형식은 미리보기를 지원하지 않아요.
            </p>
            <a
              href={url}
              download={name}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-[#0e299c] px-4 py-2 text-sm font-semibold text-white"
            >
              새 탭에서 열기
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
