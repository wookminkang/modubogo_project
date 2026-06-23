"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Link as LinkIcon,
  Copy,
  Trash2,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import dayjs from "@/lib/dayjs";
import Toast from "@/components/Toast";
import ConfirmToast from "@/components/ConfirmToast";
import { createIntakeForm, deleteIntakeForm } from "@/lib/intake-actions";
import type { IntakeSubmission } from "@/lib/db";

export default function IntakesView({
  intakes,
}: {
  intakes: IntakeSubmission[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newCompany, setNewCompany] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDel, setConfirmDel] = useState<IntakeSubmission | null>(null);

  const intakeUrl = (nanoid: string) =>
    typeof window !== "undefined"
      ? `${window.location.origin}/intake/${nanoid}`
      : `/intake/${nanoid}`;

  const copyLink = async (nanoid: string) => {
    try {
      await navigator.clipboard.writeText(intakeUrl(nanoid));
      setToast("링크를 복사했어요");
    } catch {
      setToast("복사에 실패했어요");
    }
  };

  const handleCreate = () => {
    startTransition(async () => {
      const nanoid = await createIntakeForm(newCompany);
      setNewCompany("");
      router.refresh();
      await copyLink(nanoid);
    });
  };

  const handleDelete = (it: IntakeSubmission) => {
    startTransition(async () => {
      await deleteIntakeForm(it.nanoid);
      setConfirmDel(null);
      setToast("삭제했어요");
      router.refresh();
    });
  };

  return (
    <div className="min-h-screen bg-[#F0F4FA] px-4 py-6">
      {/* 헤더 */}
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <ClipboardList size={22} className="text-[#0e299c]" />
          광고주 준비자료 폼
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          신규 광고주에게 보낼 자료 제출 링크를 만들고 제출 현황을 확인해요.
        </p>
      </div>

      {/* 신규 생성 */}
      <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-semibold text-gray-700">
          새 폼 만들기
        </label>
        <div className="flex gap-2">
          <input
            value={newCompany}
            onChange={(e) => setNewCompany(e.target.value)}
            placeholder="병원명 (선택 — 광고주가 입력할 수도 있어요)"
            onKeyDown={(e) => e.key === "Enter" && !pending && handleCreate()}
            className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#0e299c]"
          />
          <button
            onClick={handleCreate}
            disabled={pending}
            className="flex shrink-0 items-center gap-1 rounded-xl bg-[#0e299c] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0a1f78] disabled:opacity-50"
          >
            <Plus size={16} />
            생성
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          생성하면 제출 링크가 자동으로 복사돼요. 알림톡·문자로 보내주세요.
        </p>
      </div>

      {/* 목록 */}
      {intakes.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center text-sm text-gray-400 shadow-sm">
          아직 만든 폼이 없어요.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {intakes.map((it) => {
            const submitted = it.status === "submitted";
            return (
              <div
                key={it.nanoid}
                className="rounded-2xl bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-base font-bold text-gray-900">
                        {it.company || "병원명 미지정"}
                      </span>
                      <StatusBadge submitted={submitted} />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      생성 {dayjs(it.created_at).format("YYYY.MM.DD")}
                      {submitted &&
                        it.submitted_at &&
                        ` · 제출 ${dayjs(it.submitted_at).format("YYYY.MM.DD")}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirmDel(it)}
                    aria-label="삭제"
                    className="shrink-0 rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                {/* 링크 */}
                <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2">
                  <LinkIcon size={13} className="shrink-0 text-gray-400" />
                  <span className="min-w-0 flex-1 truncate text-xs text-gray-500">
                    /intake/{it.nanoid}
                  </span>
                  <button
                    onClick={() => copyLink(it.nanoid)}
                    className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[#0e299c] hover:bg-[#0e299c]/10"
                  >
                    <Copy size={12} />
                    복사
                  </button>
                </div>

                {/* 제출 보기 */}
                {submitted && (
                  <Link
                    href={`/admin/intakes/${it.nanoid}`}
                    className="mt-2 flex items-center justify-between rounded-lg bg-[#0e299c]/5 px-3 py-2.5 text-sm font-semibold text-[#0e299c] transition-colors hover:bg-[#0e299c]/10"
                  >
                    제출 내용 보기
                    <ChevronRight size={16} />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
      {confirmDel && (
        <ConfirmToast
          title="이 폼을 삭제할까요?"
          subtitle={confirmDel.company || "병원명 미지정"}
          message="제출된 파일도 함께 삭제되며 되돌릴 수 없어요."
          yesLabel="삭제"
          noLabel="취소"
          onYes={() => handleDelete(confirmDel)}
          onNo={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}

function StatusBadge({ submitted }: { submitted: boolean }) {
  return submitted ? (
    <span className="shrink-0 rounded-full bg-[#0e299c]/10 px-2 py-0.5 text-xs font-bold text-[#0e299c]">
      제출완료
    </span>
  ) : (
    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500">
      대기
    </span>
  );
}
