"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Link as LinkIcon,
  Trash2,
  ChevronRight,
  Briefcase,
  User,
} from "lucide-react";
import dayjs from "@/lib/dayjs";
import Toast from "@/components/Toast";
import ConfirmToast from "@/components/ConfirmToast";
import { createDesignForm, deleteDesignForm } from "@/lib/design-actions";
import { designTitle } from "@/lib/design-fields";
import type {
  DesignRequest,
  Designer,
  OutsourcePost,
  OutsourcePayment,
} from "@/lib/db";
import PartnersTab from "./PartnersTab";
import BoardTab from "./BoardTab";
import PaymentsTab from "./PaymentsTab";

type Tab = "requests" | "designers" | "developers" | "board" | "payments";

export default function OutsourceView({
  requests,
  partners,
  posts,
  payments,
  partnerFileUrls,
}: {
  requests: DesignRequest[];
  /** 디자이너+개발자 전체 (role 로 탭 분기) */
  partners: Designer[];
  posts: OutsourcePost[];
  payments: OutsourcePayment[];
  /** 파트너 첨부 이미지 미리보기 URL (path → signed url) */
  partnerFileUrls: Record<string, string>;
}) {
  const [tab, setTab] = useState<Tab>("requests");
  const designerName = new Map(partners.map((d) => [d.id, d.name]));
  const designers = partners.filter((p) => p.role === "designer");
  const developers = partners.filter((p) => p.role === "developer");

  return (
    <div className="mx-auto w-full max-w-[900px] px-5 py-8">
      <h1 className="text-2xl font-bold text-[#0e299c]">외주 관리</h1>

      {/* 탭 — 5개라 좁은 화면에선 가로 스크롤 */}
      <div className="mt-4 flex gap-1 overflow-x-auto border-b border-gray-100">
        <TabButton active={tab === "requests"} onClick={() => setTab("requests")}>
          요청서 {requests.length > 0 && <Count n={requests.length} />}
        </TabButton>
        <TabButton active={tab === "designers"} onClick={() => setTab("designers")}>
          디자이너 {designers.length > 0 && <Count n={designers.length} />}
        </TabButton>
        <TabButton active={tab === "developers"} onClick={() => setTab("developers")}>
          개발자 {developers.length > 0 && <Count n={developers.length} />}
        </TabButton>
        <TabButton active={tab === "board"} onClick={() => setTab("board")}>
          게시판 {posts.length > 0 && <Count n={posts.length} />}
        </TabButton>
        <TabButton active={tab === "payments"} onClick={() => setTab("payments")}>
          외주비 (정산) {payments.length > 0 && <Count n={payments.length} />}
        </TabButton>
      </div>

      {tab === "requests" ? (
        <RequestsTab requests={requests} designerName={designerName} />
      ) : tab === "designers" ? (
        <PartnersTab
          role="designer"
          partners={designers}
          fileUrls={partnerFileUrls}
        />
      ) : tab === "developers" ? (
        <PartnersTab
          role="developer"
          partners={developers}
          fileUrls={partnerFileUrls}
        />
      ) : tab === "board" ? (
        <BoardTab posts={posts} />
      ) : (
        <PaymentsTab payments={payments} partners={partners} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative -mb-px inline-flex items-center gap-1.5 px-4 py-3 text-sm font-bold transition-colors ${
        active ? "text-[#0e299c]" : "text-gray-400 hover:text-gray-600"
      }`}
    >
      {children}
      {active && (
        <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-[#0e299c]" />
      )}
    </button>
  );
}

function Count({ n }: { n: number }) {
  return (
    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-500">
      {n}
    </span>
  );
}

// ── 요청서 탭 ──────────────────────────────────────────────────
function RequestsTab({
  requests,
  designerName,
}: {
  requests: DesignRequest[];
  designerName: Map<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState("");
  const [confirmDel, setConfirmDel] = useState<DesignRequest | null>(null);

  const designUrl = (nanoid: string) =>
    typeof window !== "undefined"
      ? `${window.location.origin}/design/${nanoid}`
      : `/design/${nanoid}`;

  const handleCreate = () => {
    startTransition(async () => {
      try {
        const nanoid = await createDesignForm();
        router.push(`/outsource/${nanoid}`);
      } catch {
        setToast("생성에 실패했어요.");
      }
    });
  };

  const copyLink = async (nanoid: string) => {
    try {
      await navigator.clipboard.writeText(designUrl(nanoid));
      setToast("디자이너 링크를 복사했어요.");
    } catch {
      setToast("복사에 실패했어요.");
    }
  };

  const handleDelete = () => {
    if (!confirmDel) return;
    const target = confirmDel;
    setConfirmDel(null);
    startTransition(async () => {
      try {
        await deleteDesignForm(target.nanoid);
        setToast("삭제되었어요.");
        router.refresh();
      } catch {
        setToast("삭제에 실패했어요.");
      }
    });
  };

  return (
    <div>
      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm text-gray-500">총 {requests.length}건</p>
        <button
          type="button"
          onClick={handleCreate}
          disabled={pending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#0e299c] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0a1f78] disabled:opacity-60"
        >
          <Plus size={16} />새 요청서
        </button>
      </div>

      {requests.length === 0 ? (
        <EmptyState icon={<Briefcase size={32} className="text-gray-300" />}>
          아직 요청서가 없어요. “새 요청서”로 시작하세요.
        </EmptyState>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {requests.map((r) => {
            const assignee = r.designer_id ? designerName.get(r.designer_id) : null;
            return (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 p-4 transition-colors hover:bg-gray-50/60"
              >
                <Link
                  href={`/outsource/${r.nanoid}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-base font-bold text-gray-900">
                        {r.title?.trim() || designTitle(r.content)}
                      </p>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                      <span>{dayjs(r.created_at).format("YYYY.MM.DD")}</span>
                      {assignee && (
                        <span className="inline-flex items-center gap-0.5 text-[#0e299c]">
                          <User size={11} />
                          {assignee}
                        </span>
                      )}
                    </p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-gray-300" />
                </Link>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => copyLink(r.nanoid)}
                    title="디자이너 링크 복사"
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#0e299c]"
                  >
                    <LinkIcon size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDel(r)}
                    title="삭제"
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {confirmDel && (
        <ConfirmToast
          title="요청서를 삭제할까요?"
          subtitle="첨부한 자료도 함께 삭제됩니다."
          message={confirmDel.title?.trim() || designTitle(confirmDel.content)}
          yesLabel="삭제"
          onYes={handleDelete}
          onNo={() => setConfirmDel(null)}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </div>
  );
}

export function EmptyState({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 py-16 text-center">
      {icon}
      <p className="text-sm text-gray-400">{children}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: "draft" | "sent" }) {
  const sent = status === "sent";
  return (
    <span
      className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${
        sent ? "bg-[#0e299c]/10 text-[#0e299c]" : "bg-gray-100 text-gray-500"
      }`}
    >
      {sent ? "전달완료" : "작성중"}
    </span>
  );
}
