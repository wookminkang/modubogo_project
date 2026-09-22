"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight, ClipboardList, Copy, Link as LinkIcon, Plus, Trash2 } from "lucide-react";
import dayjs from "@/lib/dayjs";
import Toast from "@/components/Toast";
import ConfirmToast from "@/components/ConfirmToast";
import { createGeoIntake, deleteGeoIntake } from "@/lib/geo-intake-actions";
import type { GeoIntakeStatus } from "@/lib/geo-intake-db";

// 테마(다크/라이트) 적응 색상 — Seed 시맨틱 토큰 (준비자료 폼 IntakesView 와 동일 규칙)
const PAGE = "bg-[var(--seed-color-bg-layer-basement)]";
const CARD = "bg-[var(--seed-color-bg-layer-default)]";
const CHIP = "bg-[var(--seed-color-bg-neutral-weak)]";
const FG = "text-[var(--seed-color-fg-neutral)]";
const FG_SUB = "text-[var(--seed-color-fg-neutral-subtle)]";
const BORDER = "border-[var(--seed-color-stroke-neutral-muted)]";
const BRAND_CHIP = "bg-[var(--seed-color-bg-brand-weak)] text-[#0e299c]";

export type GeoIntakeListItem = {
  nanoid: string;
  company: string | null;
  status: GeoIntakeStatus;
  createdBy: string | null;
  createdAt: string;
  submittedAt: string | null;
};

export default function GeoIntakesView({ intakes }: { intakes: GeoIntakeListItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newCompany, setNewCompany] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDel, setConfirmDel] = useState<GeoIntakeListItem | null>(null);

  const linkUrl = (nanoid: string) => `${window.location.origin}/geo-intake/${nanoid}`;

  const copyLink = async (nanoid: string) => {
    try {
      await navigator.clipboard.writeText(linkUrl(nanoid));
      setToast("링크를 복사했어요");
    } catch {
      setToast("복사에 실패했어요");
    }
  };

  const handleCreate = () => {
    if (!newCompany.trim()) {
      setToast("병원명을 입력해 주세요");
      return;
    }
    startTransition(async () => {
      const res = await createGeoIntake(newCompany);
      if (!res.ok) {
        setToast(res.error);
        return;
      }
      setNewCompany("");
      router.refresh();
      await copyLink(res.data.nanoid);
    });
  };

  const handleDelete = (it: GeoIntakeListItem) => {
    startTransition(async () => {
      const res = await deleteGeoIntake(it.nanoid);
      setConfirmDel(null);
      setToast(res.ok ? "삭제했어요" : res.error);
      if (res.ok) router.refresh();
    });
  };

  return (
    <div className={`flex-1 ${PAGE} px-4 py-6`}>
      <div className="mx-auto max-w-6xl">
        <Link
          href="/geo-check"
          className={`mb-4 inline-flex items-center gap-1.5 text-sm font-semibold ${FG_SUB} transition-colors hover:text-[#0e299c]`}
        >
          <ArrowLeft size={18} />
          GEO 체크
        </Link>

        {/* 헤더 */}
        <div className="mb-5">
          <h1 className={`flex items-center gap-2 text-xl font-bold ${FG}`}>
            <ClipboardList size={22} className={FG} />
            병원 정보 폼
          </h1>
          <p className={`mt-1 text-sm ${FG_SUB}`}>
            GEO·홈페이지 작업을 시작할 병원에 보낼 정보 요청 링크를 만들고 제출 현황을 확인해요.
          </p>
        </div>

        {/* 신규 생성 */}
        <div className={`mb-5 rounded-2xl ${CARD} p-4 shadow-sm`}>
          <label className={`mb-2 block text-sm font-semibold ${FG}`}>새 링크 만들기</label>
          <div className="flex gap-2">
            <input
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              placeholder="병원명"
              onKeyDown={(e) => e.key === "Enter" && !pending && handleCreate()}
              className={`min-w-0 flex-1 rounded-xl border ${BORDER} ${CHIP} px-3 py-2.5 text-sm ${FG} placeholder:text-[var(--seed-color-fg-neutral-subtle)] outline-none focus:border-[#0e299c] focus:ring-1 focus:ring-[#0e299c]`}
            />
            <button
              onClick={handleCreate}
              disabled={pending}
              className="flex shrink-0 cursor-pointer items-center gap-1 rounded-xl bg-[#0e299c] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0a1f78] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} />
              생성
            </button>
          </div>
          <p className={`mt-2 text-xs ${FG_SUB}`}>
            생성하면 링크가 자동으로 복사돼요. 병원에 한 번 제출하면 같은 링크로는 수정할 수 없어요.
          </p>
        </div>

        {/* 목록 */}
        {intakes.length === 0 ? (
          <div className={`rounded-2xl ${CARD} py-16 text-center text-sm ${FG_SUB} shadow-sm`}>
            아직 만든 링크가 없어요.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {intakes.map((it) => {
              const submitted = it.status === "submitted";
              return (
                <div key={it.nanoid} className={`rounded-2xl ${CARD} p-4 shadow-sm`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`truncate text-base font-bold ${FG}`}>{it.company || "병원명 미지정"}</span>
                        <StatusBadge submitted={submitted} />
                      </div>
                      <p className={`mt-1 text-xs ${FG_SUB}`}>
                        생성 {dayjs(it.createdAt).format("YYYY.MM.DD")}
                        {it.createdBy ? ` · ${it.createdBy}` : ""}
                        {submitted && it.submittedAt && ` · 제출 ${dayjs(it.submittedAt).format("YYYY.MM.DD")}`}
                      </p>
                    </div>
                    <button
                      onClick={() => setConfirmDel(it)}
                      aria-label="삭제"
                      className={`shrink-0 cursor-pointer rounded-lg p-1.5 ${FG_SUB} transition-colors hover:bg-[#fdecec] hover:text-[#e25151]`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>

                  {/* 링크 — 제출 전에만 의미가 있다 */}
                  {!submitted && (
                    <div className={`mt-3 flex items-center gap-1.5 rounded-lg ${CHIP} px-3 py-2`}>
                      <LinkIcon size={13} className={`shrink-0 ${FG_SUB}`} />
                      <span className={`min-w-0 flex-1 truncate text-xs ${FG_SUB}`}>/geo-intake/{it.nanoid}</span>
                      <button
                        onClick={() => copyLink(it.nanoid)}
                        className={`flex shrink-0 cursor-pointer items-center gap-1 rounded-md ${BRAND_CHIP} px-2 py-1 text-xs font-semibold transition-opacity hover:opacity-80`}
                      >
                        <Copy size={12} />
                        복사
                      </button>
                    </div>
                  )}

                  {submitted && (
                    <Link
                      href={`/geo-intakes/${it.nanoid}`}
                      className={`mt-3 flex items-center justify-between rounded-lg ${BRAND_CHIP} px-3 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80`}
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
            title="이 링크를 삭제할까요?"
            subtitle={confirmDel.company || "병원명 미지정"}
            message={
              confirmDel.status === "submitted"
                ? "제출된 정보(계정 정보 포함)도 함께 삭제되며 되돌릴 수 없어요."
                : "삭제하면 이 링크로 더 이상 제출할 수 없어요."
            }
            yesLabel="삭제"
            noLabel="취소"
            onYes={() => handleDelete(confirmDel)}
            onNo={() => setConfirmDel(null)}
          />
        )}
      </div>
    </div>
  );
}

function StatusBadge({ submitted }: { submitted: boolean }) {
  return submitted ? (
    <span className={`shrink-0 rounded-full ${BRAND_CHIP} px-2 py-0.5 text-xs font-bold`}>제출완료</span>
  ) : (
    <span className={`shrink-0 rounded-full ${CHIP} px-2 py-0.5 text-xs font-bold ${FG_SUB}`}>대기</span>
  );
}
