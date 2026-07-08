"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  FileUp,
  Link as LinkIcon,
  Paperclip,
  Send,
  Undo2,
  X,
} from "lucide-react";
import {
  DESIGN_SECTIONS,
  DESIGN_FILE_FIELDS,
  DESIGN_FIELDS,
  type DesignContent,
  type DesignFiles,
  type DesignFileMeta,
  type DesignFieldDef,
} from "@/lib/design-fields";
import {
  saveDesignForm,
  setDesignStatus,
  assignDesignerAction,
} from "@/lib/design-actions";
import type { Designer } from "@/lib/db";
import Toast from "@/components/Toast";

const fmtSize = (n: number) =>
  n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))}KB`
    : `${(n / 1024 / 1024).toFixed(1)}MB`;

// content 값 → 문자열/배열 헬퍼
const asStr = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : "";
const asArr = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v : [];

// 새로 고른 파일 + 미리보기 objectURL (이미지가 아니면 url=null)
type NewFile = { file: File; url: string | null };

export default function DesignRequestForm({
  nanoid,
  status,
  initialContent,
  initialFiles,
  designers,
  initialDesignerId,
  initialFileUrls,
}: {
  nanoid: string;
  status: "draft" | "sent";
  initialContent: DesignContent;
  initialFiles: DesignFiles;
  designers: Designer[];
  initialDesignerId: string | null;
  initialFileUrls: Record<string, string>;
}) {
  const router = useRouter();
  const [designerId, setDesignerId] = useState<string>(initialDesignerId ?? "");

  // 텍스트/선택 값
  const [content, setContent] = useState<DesignContent>(initialContent);
  // 새로 추가한 파일
  const [files, setFiles] = useState<Record<string, NewFile[]>>({});
  // 기존 첨부(유지/삭제 대상)
  const [existing, setExisting] = useState<DesignFiles>(initialFiles);
  // 저장된 이미지 미리보기 (path → signed URL, 저장 직후엔 로컬 objectURL)
  const [fileUrls, setFileUrls] = useState<Record<string, string>>(initialFileUrls);

  const [curStatus, setCurStatus] = useState(status);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const setValue = (key: string, value: string | string[]) =>
    setContent((p) => ({ ...p, [key]: value }));

  const toggleMulti = (key: string, option: string) => {
    const cur = asArr(content[key]);
    const next = cur.includes(option)
      ? cur.filter((o) => o !== option)
      : [...cur, option];
    setValue(key, next);
  };

  const addFiles = (key: string, list: FileList | null) => {
    if (!list?.length) return;
    const added: NewFile[] = Array.from(list).map((file) => ({
      file,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    setFiles((p) => ({ ...p, [key]: [...(p[key] ?? []), ...added] }));
  };
  const removeNew = (key: string, idx: number) =>
    setFiles((p) => {
      const arr = p[key] ?? [];
      const target = arr[idx];
      if (target?.url) URL.revokeObjectURL(target.url);
      return { ...p, [key]: arr.filter((_, i) => i !== idx) };
    });
  const removeExisting = (key: string, path: string) =>
    setExisting((p) => ({
      ...p,
      [key]: (p[key] ?? []).filter((m) => m.path !== path),
    }));

  const designUrl = () =>
    typeof window !== "undefined"
      ? `${window.location.origin}/design/${nanoid}`
      : `/design/${nanoid}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(designUrl());
      setToast("디자이너 링크를 복사했어요.");
    } catch {
      setToast("복사에 실패했어요.");
    }
  };

  const buildFormData = () => {
    const fd = new FormData();
    for (const f of DESIGN_FIELDS) {
      if (f.type === "multi") {
        for (const v of asArr(content[f.key])) fd.append(f.key, v);
      } else {
        fd.set(f.key, asStr(content[f.key]));
      }
    }
    for (const f of DESIGN_FILE_FIELDS) {
      for (const entry of files[f.key] ?? []) fd.append(f.key, entry.file);
      for (const m of existing[f.key] ?? []) fd.append("keep", m.path);
    }
    return fd;
  };

  const handleSave = async (opts?: { silent?: boolean }) => {
    setSaving(true);
    try {
      const res = await saveDesignForm(nanoid, buildFormData());
      // 방금 올린 이미지의 objectURL 을 저장된 메타(path)에 연결해 미리보기를 유지한다.
      const prevPaths = new Set(
        Object.values(existing).flat().map((m) => m.path),
      );
      const allNew = Object.values(files).flat();
      const localUrls: Record<string, string> = {};
      for (const meta of Object.values(res.files).flat()) {
        if (prevPaths.has(meta.path)) continue;
        const match = allNew.find(
          (e) => e.url && e.file.name === meta.name && e.file.size === meta.size,
        );
        if (match?.url) localUrls[meta.path] = match.url;
      }
      setFileUrls((p) => ({ ...p, ...localUrls }));
      setExisting(res.files);
      setFiles({});
      router.refresh();
      if (!opts?.silent) setToast("저장했어요.");
    } catch {
      setToast("저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (id: string) => {
    const prev = designerId;
    setDesignerId(id);
    try {
      await assignDesignerAction(nanoid, id || null);
      setToast(id ? "담당 디자이너를 지정했어요." : "담당자를 해제했어요.");
    } catch {
      setDesignerId(prev); // 롤백
      setToast("담당자 지정에 실패했어요.");
    }
  };

  const toggleStatus = async () => {
    const next = curStatus === "sent" ? "draft" : "sent";
    setCurStatus(next);
    try {
      await setDesignStatus(nanoid, next);
      setToast(next === "sent" ? "전달완료로 표시했어요." : "작성중으로 되돌렸어요.");
    } catch {
      setCurStatus(curStatus); // 롤백
      setToast("상태 변경에 실패했어요.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0e299c]">작업 요청서</h1>
        <p className="mt-1 text-sm text-gray-500">
          브리프를 작성하고 디자이너에게 링크를 전달하세요.
        </p>
      </div>

      {/* 디자이너 링크 + 상태 */}
      <div className="flex flex-col gap-2 rounded-2xl bg-[#F0F4FA] p-4">
        <p className="text-xs font-semibold text-gray-500">디자이너 공개 링크</p>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 text-xs text-gray-600">
            {designUrl()}
          </code>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0e299c] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0a1f78]"
          >
            <LinkIcon size={14} />
            복사
          </button>
        </div>
        <button
          type="button"
          onClick={toggleStatus}
          className={`mt-1 inline-flex w-fit items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            curStatus === "sent"
              ? "bg-gray-100 text-gray-500 hover:bg-gray-200"
              : "bg-[#0e299c]/10 text-[#0e299c] hover:bg-[#0e299c]/15"
          }`}
        >
          {curStatus === "sent" ? (
            <>
              <Undo2 size={14} />
              작성중으로 되돌리기
            </>
          ) : (
            <>
              <Send size={14} />
              전달완료로 표시
            </>
          )}
        </button>

        {/* 담당 디자이너 배정 */}
        <div className="mt-1 flex items-center gap-2">
          <span className="shrink-0 text-xs font-semibold text-gray-500">
            담당 디자이너
          </span>
          <select
            value={designerId}
            onChange={(e) => handleAssign(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#0e299c]"
          >
            <option value="">지정 안 함</option>
            {designers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.contact ? ` · ${d.contact}` : ""}
              </option>
            ))}
          </select>
        </div>
        {designers.length === 0 && (
          <p className="text-xs text-gray-400">
            · “외주 관리 &gt; 디자이너” 탭에서 먼저 디자이너를 등록하세요.
          </p>
        )}
      </div>

      {/* 브리프 섹션 */}
      {DESIGN_SECTIONS.map((section) => (
        <section key={section.title} className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">{section.title}</h2>
            {section.subtitle && (
              <p className="mt-0.5 text-xs text-gray-400">{section.subtitle}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-4">
            {section.fields.map((f) => (
              <Field
                key={f.key}
                def={f}
                content={content}
                onValue={setValue}
                onToggleMulti={toggleMulti}
              />
            ))}
          </div>
        </section>
      ))}

      {/* 전달 자료 (파일) */}
      {DESIGN_FILE_FIELDS.map((f) => (
        <section key={f.key} className="flex flex-col gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">{f.label}</h2>
            {f.hint && <p className="mt-0.5 text-xs text-gray-400">{f.hint}</p>}
          </div>
          <FileUpload
            accept={f.accept}
            newFiles={files[f.key] ?? []}
            existing={existing[f.key] ?? []}
            urls={fileUrls}
            onAdd={(l) => addFiles(f.key, l)}
            onRemoveNew={(idx) => removeNew(f.key, idx)}
            onRemoveExisting={(path) => removeExisting(f.key, path)}
          />
        </section>
      ))}

      {/* 저장 */}
      <div className="sticky bottom-0 -mx-5 border-t border-gray-100 bg-white/90 px-5 py-4 backdrop-blur">
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={saving}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0e299c] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0a1f78] disabled:opacity-60"
        >
          <Check size={16} />
          {saving ? "저장 중…" : "저장하기"}
        </button>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </div>
  );
}

// ── 단일 필드 렌더 ─────────────────────────────────────────────
function Field({
  def,
  content,
  onValue,
  onToggleMulti,
}: {
  def: DesignFieldDef;
  content: DesignContent;
  onValue: (key: string, value: string) => void;
  onToggleMulti: (key: string, option: string) => void;
}) {
  const value = content[def.key];
  const inputCls =
    "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-[#0e299c] placeholder:text-gray-400";
  const wrapCls = def.half ? "flex flex-col gap-1.5 w-[calc(50%-0.375rem)] min-w-[9rem]" : "flex flex-col gap-1.5 w-full";

  return (
    <div className={wrapCls}>
      <label className="text-sm font-semibold text-gray-700">{def.label}</label>

      {def.type === "textarea" ? (
        <textarea
          value={asStr(value)}
          onChange={(e) => onValue(def.key, e.target.value)}
          placeholder={def.placeholder}
          rows={def.rows ?? 3}
          className={`${inputCls} resize-none`}
        />
      ) : def.type === "date" ? (
        <input
          type="date"
          value={asStr(value)}
          onChange={(e) => onValue(def.key, e.target.value)}
          className={inputCls}
        />
      ) : def.type === "select" ? (
        <select
          value={asStr(value)}
          onChange={(e) => onValue(def.key, e.target.value)}
          className={inputCls}
        >
          <option value="">선택</option>
          {def.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : def.type === "multi" ? (
        <div className="flex flex-wrap gap-2">
          {def.options?.map((o) => {
            const active = asArr(value).includes(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() => onToggleMulti(def.key, o)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#0e299c] text-white"
                    : "bg-[#F0F4FA] text-gray-500 hover:bg-[#e7edf6]"
                }`}
              >
                {o}
              </button>
            );
          })}
        </div>
      ) : (
        <input
          type="text"
          value={asStr(value)}
          onChange={(e) => onValue(def.key, e.target.value)}
          placeholder={def.placeholder}
          className={inputCls}
        />
      )}
    </div>
  );
}

const IMG_RE = /\.(png|jpe?g|gif|webp|svg|avif)$/i;

// ── 파일 업로드 ────────────────────────────────────────────────
function FileUpload({
  accept,
  newFiles,
  existing,
  urls,
  onAdd,
  onRemoveNew,
  onRemoveExisting,
}: {
  accept: string;
  newFiles: NewFile[];
  existing: DesignFileMeta[];
  urls: Record<string, string>;
  onAdd: (l: FileList | null) => void;
  onRemoveNew: (idx: number) => void;
  onRemoveExisting: (path: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const hasAny = newFiles.length > 0 || existing.length > 0;
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm font-semibold text-gray-500 transition-colors hover:border-[#0e299c] hover:text-[#0e299c]"
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
              preview={IMG_RE.test(m.name) ? urls[m.path] : undefined}
              tone="saved"
              onRemove={() => onRemoveExisting(m.path)}
            />
          ))}
          {newFiles.map((e, idx) => (
            <FileRow
              key={`${e.file.name}-${idx}`}
              name={e.file.name}
              size={e.file.size}
              preview={e.url ?? undefined}
              tone="pending"
              onRemove={() => onRemoveNew(idx)}
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
      {/* 썸네일 미리보기 (이미지) 또는 아이콘 */}
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
          saved
            ? "bg-green-100 text-green-700"
            : "bg-amber-100 text-amber-700"
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
