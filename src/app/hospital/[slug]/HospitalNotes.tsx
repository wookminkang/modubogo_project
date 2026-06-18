"use client";

import { useState } from "react";
import { StickyNote, Trash2 } from "lucide-react";
import dayjs from "@/lib/dayjs";
import { Text } from "seed-design/ui/text";
import { ActionButton } from "seed-design/ui/action-button";
import Toast from "@/components/Toast";
import ConfirmToast from "@/components/ConfirmToast";
import {
  createHospitalNote,
  removeHospitalNote,
} from "@/lib/company-actions";
import type { HospitalNote } from "@/lib/db";

interface Props {
  company: string;
  initialNotes: HospitalNote[];
}

/**
 * 병원 운영 메모장(히스토리).
 * 작성 → 목록 최상단에 추가(최신순), 삭제 가능. 서버 액션으로 영속화하고
 * 반환된 행으로 로컬 상태를 갱신한다(낙관적 갱신, 라우트 refresh 불필요).
 */
export default function HospitalNotes({ company, initialNotes }: Props) {
  const [notes, setNotes] = useState<HospitalNote[]>(initialNotes);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [pendingDelete, setPendingDelete] = useState<HospitalNote | null>(null);

  async function handleSave() {
    const text = content.trim();
    if (!text) return;
    setSaving(true);
    try {
      const created = await createHospitalNote({ company, content: text });
      setNotes((prev) => [created, ...prev]);
      setContent("");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "메모 저장에 실패했어요.");
    }
    setSaving(false);
  }

  async function handleDelete(note: HospitalNote) {
    setPendingDelete(null);
    const prev = notes;
    setNotes((cur) => cur.filter((n) => n.id !== note.id)); // 낙관적 제거
    try {
      await removeHospitalNote(note.id);
    } catch {
      setNotes(prev); // 실패 시 롤백
      setToast("메모 삭제에 실패했어요.");
    }
  }

  return (
    <div className="px-4 py-4">
      {/* 작성 영역 */}
      <div className="rounded-2xl border border-[var(--seed-color-stroke-neutral-muted)] bg-[var(--seed-color-bg-layer-default)] p-4">
        <div className="flex items-center gap-1.5">
          <StickyNote size={15} className="text-[var(--seed-color-fg-neutral-muted)]" />
          <Text textStyle="t4Bold" color="fg.neutralMuted">
            운영 메모
          </Text>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="병원 운영 관련 메모를 남겨보세요. (예: 통화 내용, 요청사항, 특이사항)"
          rows={3}
          className="mt-3 w-full resize-none rounded-xl border border-[var(--seed-color-stroke-neutral-muted)] bg-[var(--seed-color-bg-neutral-weak)] px-3 py-2.5 text-sm text-[var(--seed-color-fg-neutral)] outline-none placeholder:text-[var(--seed-color-fg-neutral-subtle)] focus:border-[#0e299c] focus:ring-2 focus:ring-[#0e299c]/30"
        />
        <div className="mt-2 flex justify-end">
          <ActionButton
            type="button"
            variant="brandSolid"
            size="medium"
            loading={saving}
            onClick={handleSave}
          >
            메모 저장
          </ActionButton>
        </div>
      </div>

      {/* 히스토리 목록 */}
      <div className="mt-4 flex flex-col gap-2.5">
        {notes.length === 0 ? (
          <Text
            as="p"
            textStyle="t4Regular"
            color="fg.neutralSubtle"
            className="py-8 text-center"
          >
            아직 작성된 메모가 없어요.
          </Text>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="rounded-2xl border border-[var(--seed-color-stroke-neutral-muted)] bg-[var(--seed-color-bg-neutral-weak)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <Text
                  as="span"
                  textStyle="t3Regular"
                  color="fg.neutralMuted"
                >
                  {dayjs(note.created_at).format("YYYY.MM.DD HH:mm")}
                </Text>
                <button
                  type="button"
                  aria-label="메모 삭제"
                  onClick={() => setPendingDelete(note)}
                  className="shrink-0 rounded p-1 text-[var(--seed-color-fg-neutral-subtle)] transition-colors hover:text-[var(--seed-color-fg-critical)]"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <Text
                as="p"
                textStyle="t4Regular"
                color="fg.neutral"
                className="mt-1.5 whitespace-pre-line leading-relaxed"
              >
                {note.content}
              </Text>
            </div>
          ))
        )}
      </div>

      {pendingDelete && (
        <ConfirmToast
          title="메모 삭제"
          message="이 메모를 삭제할까요?"
          onYes={() => handleDelete(pendingDelete)}
          onNo={() => setPendingDelete(null)}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </div>
  );
}
