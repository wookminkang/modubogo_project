"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Copy,
  ExternalLink,
  Link as LinkIcon,
  Search,
  Trash2,
} from "lucide-react";
import dayjs from "@/lib/dayjs";
import Toast from "@/components/Toast";
import ConfirmToast from "@/components/ConfirmToast";
import { createKeywordProposal, deleteKeywordProposal } from "@/lib/keyword-actions";
import type { KeywordProposal } from "@/lib/keyword-db";

// 독립 영역이라 Seed 토큰 대신 모두보고 브랜드 네이비(#0e299c) 팔레트를 직접 쓴다.
const INPUT_CLS =
  "min-w-0 rounded-xl border border-[#dbe1f0] bg-white px-3.5 py-2.5 text-sm text-[#131b38] placeholder:text-[#9aa3bd] outline-none focus:border-[#0e299c] focus:ring-1 focus:ring-[#0e299c]";

export default function KeywordAdmin({ proposals }: { proposals: KeywordProposal[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [form, setForm] = useState({ hospitalName: "", region: "", field: "" });
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmDel, setConfirmDel] = useState<KeywordProposal | null>(null);

  const shareUrl = (nanoid: string) =>
    typeof window !== "undefined"
      ? `${window.location.origin}/keyword/${nanoid}`
      : `/keyword/${nanoid}`;

  const copyLink = async (nanoid: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl(nanoid));
      setToast("공유 링크를 복사했어요");
    } catch {
      setToast("복사에 실패했어요");
    }
  };

  const canCreate = form.hospitalName.trim() && form.region.trim() && form.field.trim();

  const handleCreate = () => {
    setCreating(true);
    startTransition(async () => {
      const res = await createKeywordProposal(form);
      setCreating(false);
      if (!res.ok) {
        setToast(res.error);
        return;
      }
      setForm({ hospitalName: "", region: "", field: "" });
      router.refresh();
      await copyLink(res.data.nanoid);
    });
  };

  const handleDelete = (p: KeywordProposal) => {
    startTransition(async () => {
      const res = await deleteKeywordProposal(p.id);
      setConfirmDel(null);
      setToast(res.ok ? "삭제했어요" : res.error);
      router.refresh();
    });
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <h1 className="flex items-center gap-2 text-xl font-bold text-[#131b38]">
        <Search size={20} className="text-[#0e299c]" />
        키워드 리포트 만들기
      </h1>
      <p className="mt-1 text-sm text-[#66708e]">
        병원 정보를 입력하면 환자들이 ChatGPT에 검색할 법한 키워드 50개와 설명을 뽑아
        공유 페이지로 만들어 드려요.
      </p>

      {/* 생성 폼 */}
      <div className="mt-5 rounded-2xl border border-[#e4e8f3] bg-white p-5">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <input
            value={form.hospitalName}
            onChange={set("hospitalName")}
            placeholder="병원명 (예: 리움한방병원_강동송파)"
            className={INPUT_CLS}
          />
          <input
            value={form.region}
            onChange={set("region")}
            placeholder="지역 (예: 강동송파)"
            className={INPUT_CLS}
          />
          <input
            value={form.field}
            onChange={set("field")}
            placeholder="진료 분야 (예: 통증&암 / 암 요양 / 교통사고·통증) — 제목에 그대로 표시돼요"
            onKeyDown={(e) => e.key === "Enter" && canCreate && !creating && handleCreate()}
            className={`${INPUT_CLS} sm:col-span-2`}
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={creating || !canCreate}
          className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0e299c] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0a1f78] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Search size={16} />
          {creating ? "환자 검색 키워드 뽑는 중… (30초~1분)" : "환자 검색 키워드 50개 뽑기"}
        </button>
        <p className="mt-2 text-xs text-[#97a1bc]">
          완료되면 공유 링크가 자동으로 복사돼요. 광고주에게 카톡으로 보내주세요.
        </p>
      </div>

      {/* 리포트 목록 */}
      {proposals.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[#dbe1f0] py-14 text-center text-sm text-[#97a1bc]">
          아직 만든 리포트가 없어요.
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {proposals.map((p) => {
            const count = p.groups.reduce((s, g) => s + g.keywords.length, 0);
            return (
              <div key={p.id} className="rounded-2xl border border-[#e4e8f3] bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-base font-bold text-[#131b38]">
                        {p.hospitalName}
                      </span>
                      <span className="shrink-0 rounded-full bg-[#eaeef8] px-2 py-0.5 text-xs font-bold text-[#0e299c]">
                        키워드 {count}개
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#97a1bc]">
                      {p.region} · {p.field} · {dayjs(p.createdAt).format("YYYY.MM.DD")}
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirmDel(p)}
                    aria-label="삭제"
                    className="shrink-0 cursor-pointer rounded-lg p-1.5 text-[#97a1bc] transition-colors hover:bg-[#fdecec] hover:text-[#e25151]"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#f0f3fa] px-3 py-2">
                  <LinkIcon size={13} className="shrink-0 text-[#97a1bc]" />
                  <span className="min-w-0 flex-1 truncate text-xs text-[#66708e]">
                    /keyword/{p.nanoid}
                  </span>
                  <Link
                    href={`/keyword/${p.nanoid}`}
                    target="_blank"
                    className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#0e299c] transition-opacity hover:opacity-80"
                  >
                    <ExternalLink size={12} />
                    보기
                  </Link>
                  <button
                    onClick={() => copyLink(p.nanoid)}
                    className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md bg-[#0e299c] px-2 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-80"
                  >
                    <Copy size={12} />
                    복사
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
      {confirmDel && (
        <ConfirmToast
          title="이 리포트를 삭제할까요?"
          subtitle={confirmDel.hospitalName}
          message="공유 링크도 함께 열리지 않게 되며 되돌릴 수 없어요."
          yesLabel="삭제"
          noLabel="취소"
          onYes={() => handleDelete(confirmDel)}
          onNo={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}
