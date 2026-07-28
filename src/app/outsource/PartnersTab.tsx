"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, User, Code2, Check, X, Paperclip } from "lucide-react";
import Toast from "@/components/Toast";
import ConfirmToast from "@/components/ConfirmToast";
import FileAttachments, {
  toNewFiles,
  revokeNewFiles,
  IMG_RE,
  type NewFile,
} from "@/components/FileAttachments";
import {
  createPartnerAction,
  updatePartnerAction,
  deletePartnerAction,
} from "@/lib/design-actions";
import type { DesignFileMeta } from "@/lib/design-fields";
import { EmptyState } from "./OutsourceView";
import type { Designer, PartnerRole } from "@/lib/db";

// 연락처 자동 하이픈: 숫자(전화)로 보일 때만 한국 전화번호 형식으로 포맷.
// 이메일·카카오톡 아이디 등 문자가 섞이면 원본을 그대로 둔다.
function formatContact(v: string): string {
  if (!/^[\d\s()+\-]*$/.test(v)) return v; // 전화번호 형태가 아니면 그대로
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (!d) return "";
  if (d.startsWith("02")) {
    // 서울 지역번호 02-XXX(X)-XXXX
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`;
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}`;
  }
  // 휴대폰/그 외 국번 (010-1234-5678)
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

/** 역할별 문구·아이콘 (디자이너/개발자 탭이 같은 컴포넌트를 공유) */
const COPY: Record<
  PartnerRole,
  { label: string; unit: string; memoHint: string; icon: typeof User }
> = {
  designer: {
    label: "디자이너",
    unit: "명",
    memoHint: "메모 (단가·스타일·특이사항)",
    icon: User,
  },
  developer: {
    label: "개발자",
    unit: "명",
    memoHint: "메모 (단가·기술 스택·특이사항)",
    icon: Code2,
  },
};

type FormState = { name: string; contact: string; memo: string };

export default function PartnersTab({
  role,
  partners,
  fileUrls,
}: {
  role: PartnerRole;
  partners: Designer[];
  /** 저장된 첨부 이미지의 미리보기 URL (path → signed url) */
  fileUrls: Record<string, string>;
}) {
  const router = useRouter();
  const copy = COPY[role];
  const Icon = copy.icon;

  const [toast, setToast] = useState("");
  const [confirmDel, setConfirmDel] = useState<Designer | null>(null);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>(fileUrls);

  const handleDelete = async () => {
    if (!confirmDel) return;
    const target = confirmDel;
    setConfirmDel(null);
    try {
      await deletePartnerAction(target.id);
      setToast("삭제되었어요.");
      router.refresh();
    } catch {
      setToast("삭제에 실패했어요.");
    }
  };

  /** 방금 업로드한 이미지의 objectURL 을 저장된 메타 경로에 이어 붙여 미리보기를 유지 */
  const mergeLocalUrls = (saved: DesignFileMeta[], uploaded: NewFile[]) => {
    const next: Record<string, string> = {};
    for (const meta of saved) {
      if (urls[meta.path]) continue;
      const match = uploaded.find(
        (e) => e.url && e.file.name === meta.name && e.file.size === meta.size,
      );
      if (match?.url) next[meta.path] = match.url;
    }
    if (Object.keys(next).length) setUrls((p) => ({ ...p, ...next }));
  };

  return (
    <div>
      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          총 {partners.length}
          {copy.unit}
        </p>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#0e299c] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0a1f78]"
          >
            <Plus size={16} />
            {copy.label} 추가
          </button>
        )}
      </div>

      {/* 신규 등록 폼 */}
      {adding && (
        <div className="mt-4">
          <PartnerEditor
            role={role}
            urls={urls}
            initial={{ name: "", contact: "", memo: "" }}
            initialFiles={[]}
            submitLabel="등록"
            onCancel={() => setAdding(false)}
            onSubmit={(fd) => createPartnerAction(role, fd)}
            onSaved={(files, uploaded) => {
              mergeLocalUrls(files, uploaded);
              setAdding(false);
              setToast(`${copy.label}를 등록했어요.`);
              router.refresh();
            }}
          />
        </div>
      )}

      {/* 목록 */}
      {partners.length === 0 && !adding ? (
        <EmptyState icon={<Icon size={32} className="text-gray-300" />}>
          등록된 {copy.label}가 없어요. “{copy.label} 추가”로 등록하세요.
        </EmptyState>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {partners.map((d) =>
            editId === d.id ? (
              <li key={d.id}>
                <PartnerEditor
                  role={role}
                  urls={urls}
                  initial={{
                    name: d.name,
                    contact: d.contact ?? "",
                    memo: d.memo ?? "",
                  }}
                  initialFiles={d.files?.files ?? []}
                  submitLabel="저장"
                  onCancel={() => setEditId(null)}
                  onSubmit={(fd) => updatePartnerAction(d.id, fd)}
                  onSaved={(files, uploaded) => {
                    mergeLocalUrls(files, uploaded);
                    setEditId(null);
                    setToast("수정했어요.");
                    router.refresh();
                  }}
                />
              </li>
            ) : (
              <li
                key={d.id}
                className="flex items-start gap-3 rounded-2xl border border-gray-100 p-4"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0F4FA] text-[#0e299c]">
                  <Icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-gray-900">{d.name}</p>
                  {d.contact && (
                    <p className="mt-0.5 text-sm text-gray-600">{d.contact}</p>
                  )}
                  {d.memo && (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-gray-400">
                      {d.memo}
                    </p>
                  )}
                  <PartnerFiles files={d.files?.files ?? []} urls={urls} />
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditId(d.id)}
                    title="수정"
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#0e299c]"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDel(d)}
                    title="삭제"
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {confirmDel && (
        <ConfirmToast
          title={`${copy.label}를 삭제할까요?`}
          subtitle="첨부파일도 함께 삭제되며, 배정된 요청서의 담당자 표시는 해제됩니다."
          message={confirmDel.name}
          yesLabel="삭제"
          onYes={handleDelete}
          onNo={() => setConfirmDel(null)}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </div>
  );
}

/** 목록 행에 보여주는 첨부 요약 (클릭하면 새 탭에서 열림) */
function PartnerFiles({
  files,
  urls,
}: {
  files: DesignFileMeta[];
  urls: Record<string, string>;
}) {
  if (files.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {files.map((m) => {
        const url = urls[m.path];
        const thumb = IMG_RE.test(m.name) ? url : undefined;
        const inner = (
          <>
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumb}
                alt={m.name}
                className="h-5 w-5 shrink-0 rounded object-cover"
              />
            ) : (
              <Paperclip size={12} className="shrink-0 text-gray-400" />
            )}
            <span className="max-w-[180px] truncate">{m.name}</span>
          </>
        );
        const cls =
          "inline-flex items-center gap-1.5 rounded-lg bg-[#F0F4FA] px-2 py-1 text-xs text-gray-600";
        return (
          <li key={m.path}>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${cls} transition-colors hover:bg-[#e7edf6] hover:text-[#0e299c]`}
              >
                {inner}
              </a>
            ) : (
              <span className={cls}>{inner}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** 등록·수정 공용 인라인 폼 (이름/연락처/메모 + 첨부) */
function PartnerEditor({
  role,
  urls,
  initial,
  initialFiles,
  submitLabel,
  onCancel,
  onSubmit,
  onSaved,
}: {
  role: PartnerRole;
  urls: Record<string, string>;
  initial: FormState;
  initialFiles: DesignFileMeta[];
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (fd: FormData) => Promise<{ ok: boolean; files: Record<string, DesignFileMeta[]> }>;
  onSaved: (savedFiles: DesignFileMeta[], uploaded: NewFile[]) => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [existing, setExisting] = useState<DesignFileMeta[]>(initialFiles);
  const [newFiles, setNewFiles] = useState<NewFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const cls =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-[#0e299c] placeholder:text-gray-400";

  const cancel = () => {
    revokeNewFiles(newFiles);
    onCancel();
  };

  const save = async () => {
    if (!form.name.trim()) {
      setErr("이름을 입력해주세요.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.set("name", form.name);
      fd.set("contact", form.contact);
      fd.set("memo", form.memo);
      for (const m of existing) fd.append("keep", m.path);
      for (const e of newFiles) fd.append("files", e.file);

      const res = await onSubmit(fd);
      const saved = res.files.files ?? [];
      const uploaded = newFiles;
      setExisting(saved);
      setNewFiles([]);
      onSaved(saved, uploaded);
    } catch {
      setErr(`${submitLabel}에 실패했어요.`);
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-[#0e299c]/20 bg-[#F0F4FA] p-4">
      <div className="flex flex-col gap-2">
        <input
          className={cls}
          placeholder="이름 (필수)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className={cls}
          placeholder="연락처 (전화·이메일·카카오톡 등)"
          value={form.contact}
          onChange={(e) =>
            setForm({ ...form, contact: formatContact(e.target.value) })
          }
        />
        <textarea
          className={`${cls} resize-none`}
          rows={2}
          placeholder={COPY[role].memoHint}
          value={form.memo}
          onChange={(e) => setForm({ ...form, memo: e.target.value })}
        />
      </div>

      {/* 첨부 (포트폴리오·계약서 등) */}
      <FileAttachments
        existing={existing}
        newFiles={newFiles}
        urls={urls}
        onAdd={(list) => setNewFiles((p) => [...p, ...toNewFiles(list)])}
        onRemoveNew={(idx) =>
          setNewFiles((p) => {
            const t = p[idx];
            if (t?.url) URL.revokeObjectURL(t.url);
            return p.filter((_, i) => i !== idx);
          })
        }
        onRemoveExisting={(path) =>
          setExisting((p) => p.filter((m) => m.path !== path))
        }
      />

      {err && <p className="text-xs font-medium text-red-500">{err}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={cancel}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
        >
          <X size={15} />
          취소
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0e299c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a1f78] disabled:opacity-60"
        >
          <Check size={15} />
          {saving ? "저장 중…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
