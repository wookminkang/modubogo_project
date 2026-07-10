"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileUp, Paperclip, Trash2, X } from "lucide-react";
import dayjs from "@/lib/dayjs";
import Toast from "@/components/Toast";
import ConfirmToast from "@/components/ConfirmToast";
import { saveBoardPostAction, deleteBoardPostAction } from "@/lib/board-actions";
import type { DesignFileMeta } from "@/lib/design-fields";

type NewFile = { file: File; url: string | null };

const IMG_RE = /\.(png|jpe?g|gif|webp|svg|avif)$/i;
const fmtSize = (n: number) =>
  n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))}KB`
    : `${(n / 1024 / 1024).toFixed(1)}MB`;

export default function BoardPostForm({
  id,
  author,
  createdAt,
  initialTitle,
  initialContent,
  initialFiles,
  initialFileUrls,
}: {
  id: string;
  author: string | null;
  createdAt: string;
  initialTitle: string;
  initialContent: string;
  initialFiles: DesignFileMeta[];
  initialFileUrls: Record<string, string>;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [existing, setExisting] = useState<DesignFileMeta[]>(initialFiles);
  const [newFiles, setNewFiles] = useState<NewFile[]>([]);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>(initialFileUrls);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const added: NewFile[] = Array.from(list).map((file) => ({
      file,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    setNewFiles((p) => [...p, ...added]);
  };
  const removeNew = (idx: number) =>
    setNewFiles((p) => {
      const t = p[idx];
      if (t?.url) URL.revokeObjectURL(t.url);
      return p.filter((_, i) => i !== idx);
    });
  const removeExisting = (path: string) =>
    setExisting((p) => p.filter((m) => m.path !== path));

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("title", title);
      fd.set("content", content);
      for (const e of newFiles) fd.append("files", e.file);
      for (const m of existing) fd.append("keep", m.path);

      const res = await saveBoardPostAction(id, fd);
      // 방금 올린 이미지의 objectURL 을 저장된 메타에 연결해 미리보기 유지
      const prevPaths = new Set(existing.map((m) => m.path));
      const localUrls: Record<string, string> = {};
      for (const meta of res.files.files ?? []) {
        if (prevPaths.has(meta.path)) continue;
        const match = newFiles.find(
          (e) => e.url && e.file.name === meta.name && e.file.size === meta.size,
        );
        if (match?.url) localUrls[meta.path] = match.url;
      }
      setFileUrls((p) => ({ ...p, ...localUrls }));
      setExisting(res.files.files ?? []);
      setNewFiles([]);
      router.refresh();
      setToast("저장했어요.");
    } catch {
      setToast("저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    setConfirmDel(false);
    startDelete();
  };
  const startDelete = async () => {
    try {
      await deleteBoardPostAction(id);
      router.push("/outsource");
      router.refresh();
    } catch {
      setToast("삭제에 실패했어요.");
    }
  };

  const inputCls =
    "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-[#0e299c] placeholder:text-gray-400";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0e299c]">게시글</h1>
        <p className="text-xs text-gray-400">
          {author ? `${author} · ` : ""}
          {dayjs(createdAt).format("YYYY.MM.DD")}
        </p>
      </div>

      {/* 제목 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-gray-700">제목</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          className={inputCls}
        />
      </div>

      {/* 내용 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-gray-700">내용</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 입력하세요"
          rows={12}
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* 첨부 */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">첨부파일</label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm font-semibold text-gray-500 transition-colors hover:border-[#0e299c] hover:text-[#0e299c]"
        >
          <FileUp size={18} />
          파일 추가하기
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {(existing.length > 0 || newFiles.length > 0) && (
          <div className="flex flex-col gap-1.5">
            {existing.map((m) => (
              <FileRow
                key={m.path}
                name={m.name}
                size={m.size}
                preview={IMG_RE.test(m.name) ? fileUrls[m.path] : undefined}
                tone="saved"
                onRemove={() => removeExisting(m.path)}
              />
            ))}
            {newFiles.map((e, idx) => (
              <FileRow
                key={`${e.file.name}-${idx}`}
                name={e.file.name}
                size={e.file.size}
                preview={e.url ?? undefined}
                tone="pending"
                onRemove={() => removeNew(idx)}
              />
            ))}
          </div>
        )}
        {newFiles.length > 0 && (
          <p className="text-xs text-amber-600">
            * “저장하기”를 눌러야 첨부가 반영됩니다.
          </p>
        )}
      </div>

      {/* 액션 */}
      <div className="sticky bottom-0 -mx-5 flex gap-2 border-t border-gray-100 bg-white/90 px-5 py-4 backdrop-blur">
        <button
          type="button"
          onClick={() => setConfirmDel(true)}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 py-3.5 text-sm font-semibold text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 size={16} />
          삭제
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0e299c] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0a1f78] disabled:opacity-60"
        >
          <Check size={16} />
          {saving ? "저장 중…" : "저장하기"}
        </button>
      </div>

      {confirmDel && (
        <ConfirmToast
          title="게시글을 삭제할까요?"
          subtitle="첨부파일도 함께 삭제됩니다."
          yesLabel="삭제"
          onYes={handleDelete}
          onNo={() => setConfirmDel(false)}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </div>
  );
}

function FileRow({
  name,
  size,
  preview,
  tone,
  onRemove,
}: {
  name: string;
  size: number;
  preview?: string;
  tone: "saved" | "pending";
  onRemove: () => void;
}) {
  const saved = tone === "saved";
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt={name}
          className="h-10 w-10 shrink-0 rounded-md object-cover"
        />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-200">
          <Paperclip size={16} className="text-gray-400" />
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{name}</span>
      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
          saved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
        }`}
      >
        {saved ? "첨부됨" : "저장 전"}
      </span>
      <span className="shrink-0 text-xs text-gray-400">{fmtSize(size)}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="삭제"
        className="shrink-0 rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
      >
        <X size={15} />
      </button>
    </div>
  );
}
