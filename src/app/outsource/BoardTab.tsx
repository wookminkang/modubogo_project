"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  ChevronRight,
  MessageSquareText,
  Paperclip,
  Trash2,
} from "lucide-react";
import dayjs from "@/lib/dayjs";
import Toast from "@/components/Toast";
import ConfirmToast from "@/components/ConfirmToast";
import {
  createBoardPostAction,
  deleteBoardPostsAction,
} from "@/lib/board-actions";
import { EmptyState } from "./OutsourceView";
import type { OutsourcePost } from "@/lib/db";

export default function BoardTab({ posts }: { posts: OutsourcePost[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState("");
  // 선택 삭제
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDel, setConfirmDel] = useState(false);

  const allSelected = posts.length > 0 && selected.size === posts.length;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(posts.map((p) => p.id)));

  const handleCreate = () => {
    startTransition(async () => {
      try {
        const id = await createBoardPostAction();
        router.push(`/outsource/board/${id}`);
      } catch {
        setToast("글 작성에 실패했어요.");
      }
    });
  };

  const handleBulkDelete = () => {
    setConfirmDel(false);
    const ids = Array.from(selected);
    startTransition(async () => {
      try {
        await deleteBoardPostsAction(ids);
        setSelected(new Set());
        setToast(`${ids.length}개 삭제했어요.`);
        router.refresh();
      } catch {
        setToast("삭제에 실패했어요.");
      }
    });
  };

  const fileCount = (p: OutsourcePost) => p.files?.files?.length ?? 0;

  return (
    <div>
      <div className="mt-5 flex items-center justify-between gap-2">
        {/* 전체 선택 / 개수 */}
        {posts.length > 0 ? (
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-500">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 accent-[#0e299c]"
            />
            {selected.size > 0 ? `${selected.size}개 선택` : `총 ${posts.length}개`}
          </label>
        ) : (
          <span className="text-sm text-gray-500">총 0개</span>
        )}

        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => setConfirmDel(true)}
              disabled={pending}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-500 transition-colors hover:bg-red-100 disabled:opacity-60"
            >
              <Trash2 size={16} />
              삭제
            </button>
          )}
          <button
            type="button"
            onClick={handleCreate}
            disabled={pending}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#0e299c] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0a1f78] disabled:opacity-60"
          >
            <Plus size={16} />새 글 작성
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
        <EmptyState icon={<MessageSquareText size={32} className="text-gray-300" />}>
          아직 글이 없어요. “새 글 작성”으로 시작하세요.
        </EmptyState>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {posts.map((p) => {
            const checked = selected.has(p.id);
            return (
              <li
                key={p.id}
                className={`flex items-center gap-2 rounded-2xl border p-4 transition-colors ${
                  checked
                    ? "border-[#0e299c]/30 bg-[#0e299c]/5"
                    : "border-gray-100 hover:bg-gray-50/60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(p.id)}
                  aria-label="선택"
                  className="h-4 w-4 shrink-0 accent-[#0e299c]"
                />
                <Link
                  href={`/outsource/board/${p.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-base font-bold text-gray-900">
                        {p.title?.trim() || "제목 없음"}
                      </p>
                      {fileCount(p) > 0 && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 text-xs text-gray-400">
                          <Paperclip size={12} />
                          {fileCount(p)}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                      {p.author && <span>{p.author}</span>}
                      <span>{dayjs(p.created_at).format("YYYY.MM.DD")}</span>
                    </p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-gray-300" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {confirmDel && (
        <ConfirmToast
          title={`${selected.size}개 게시글을 삭제할까요?`}
          subtitle="선택한 글과 첨부파일이 모두 삭제됩니다."
          yesLabel="삭제"
          onYes={handleBulkDelete}
          onNo={() => setConfirmDel(false)}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </div>
  );
}
