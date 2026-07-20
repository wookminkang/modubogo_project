"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CardTitle } from "@/components/CardTitle";
import { addGeoKeywords, toggleGeoKeyword, deleteGeoKeyword } from "@/lib/geo-actions";
import type { GeoKeyword } from "@/lib/geo-db";
import { CATEGORY_OPTIONS, categoryClass } from "./categories";

// 체크 키워드 관리. 여러 줄 붙여넣기로 한 번에 등록하고, 개별로 켜고 끄거나 지운다.
export default function KeywordManager({
  targetId,
  keywords,
}: {
  targetId: string;
  keywords: GeoKeyword[];
}) {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "처리하지 못했습니다.");
        return;
      }
      after?.();
      router.refresh();
    });
  }

  const activeCount = keywords.filter((k) => k.active).length;

  return (
    <div>
      <CardTitle
        title="체크 키워드"
        description={`실행 시 활성 키워드 ${activeCount}개를 ChatGPT에 그대로 물어봅니다.`}
      />

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={3}
          placeholder={"광주 둥촌동 요양병원 추천해줘\n광주 북구 한방병원 어디가 좋아?"}
          className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#0e299c]"
        />
        <p className="mt-2 text-xs text-[#6b7684]">
          한 줄에 하나씩. 실제로 ChatGPT에 입력하는 문장 그대로 적으세요. 지역은 구체적으로
          쓰는 게 좋습니다 — &ldquo;둥촌동&rdquo;만 쓰면 서울 둔촌동으로 알아듣습니다.
        </p>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-[#6b7684]">
            분류
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none focus:border-[#0e299c]"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => run(() => addGeoKeywords(targetId, raw, category), () => setRaw(""))}
            disabled={pending || !raw.trim()}
            className="rounded-lg bg-[#0e299c] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0a1f7a] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {pending ? "처리 중…" : "키워드 추가"}
          </button>
        </div>
      </div>

      {keywords.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {keywords.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
            >
              <label className="flex flex-1 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={k.active}
                  disabled={pending}
                  onChange={(e) => run(() => toggleGeoKeyword(targetId, k.id, e.target.checked))}
                  className="h-4 w-4 accent-[#0e299c]"
                />
                {k.category && (
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${categoryClass(k.category)}`}
                  >
                    {k.category}
                  </span>
                )}
                <span className={`text-sm ${k.active ? "text-[#333d4b]" : "text-gray-400 line-through"}`}>
                  {k.keyword}
                </span>
              </label>
              <button
                type="button"
                onClick={() => run(() => deleteGeoKeyword(targetId, k.id))}
                disabled={pending}
                className="text-xs text-gray-400 transition-colors hover:text-red-500"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
