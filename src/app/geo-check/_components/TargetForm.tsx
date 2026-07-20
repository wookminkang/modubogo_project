"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGeoTarget } from "@/lib/geo-actions";

// 체크 대상 병원 등록 폼. 접었다 펴는 형태로 목록 위에 둔다.
export default function TargetForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [aliases, setAliases] = useState("");
  const [region, setRegion] = useState("");
  const [sites, setSites] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!name.trim() || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await createGeoTarget({
        name,
        aliases: aliases.split(","),
        siteDomains: sites.split(","),
        region,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setName("");
      setAliases("");
      setRegion("");
      setSites("");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-[#0e299c] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0a1f7a]"
      >
        + 대상 병원 등록
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-semibold text-[#6b7684]">병원명 *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="리움한방병원"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#0e299c]"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-semibold text-[#6b7684]">
            다른 표기 (쉼표로 구분)
          </span>
          <input
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            placeholder="리움병원, RIUM"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#0e299c]"
          />
        </label>
        <label className="flex w-full flex-col gap-1 sm:w-32">
          <span className="text-xs font-semibold text-[#6b7684]">지역</span>
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="광주"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#0e299c]"
          />
        </label>
      </div>

      <label className="mt-3 flex flex-col gap-1">
        <span className="text-xs font-semibold text-[#6b7684]">
          공식 홈페이지 도메인 (쉼표로 구분)
        </span>
        <input
          value={sites}
          onChange={(e) => setSites(e.target.value)}
          placeholder="reumsp.com, reumhospital.com"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#0e299c]"
        />
      </label>

      <p className="mt-2 text-xs text-[#6b7684]">
        답변 본문에 병원명이 없어도 <b>공식 홈페이지가 출처로 인용되면 노출(O)</b>로 봅니다.
        다른 표기는 오탐·미탐을 잡는 핵심 설정이니, 답변에 나왔는데 X로 나오면 그 표기를
        여기에 추가하세요.
      </p>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending || !name.trim()}
          className="rounded-lg bg-[#0e299c] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0a1f7a] disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {pending ? "등록 중…" : "등록"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-[#6b7684]"
        >
          취소
        </button>
      </div>
    </div>
  );
}
