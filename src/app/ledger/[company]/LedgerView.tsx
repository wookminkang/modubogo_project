import { Fragment } from "react";
import Image from "next/image";
import { Text } from "seed-design/ui/text";
import dayjs from "@/lib/dayjs";
import type { LedgerEntry } from "@/lib/db";

interface Props {
  company: string;
  entries: LedgerEntry[];
  today: string;
  /** 광고 배너 설정 — enabled + url 이 모두 있을 때만 노출. */
  ad?: { enabled: boolean; url: string };
}

/** 숫자(원) → "10,281,964" (천단위, 기호 없음). */
function won(n: number): string {
  return Math.abs(n).toLocaleString("ko-KR");
}

/**
 * 광고주(비로그인) 읽기전용 입금·소진 관리내역 뷰 (토스 스타일 거래 피드, 라이트 테마).
 * 상단: 남은 금액 + 소진·입금 합계 밴드. 하단: 전체 거래를 날짜별로 묶은 플랫 피드.
 */
export default function LedgerView({ entries, ad }: Props) {
  const adUrl = ad?.url?.trim() ?? "";
  const showAd = !!(ad?.enabled && adUrl);
  // 표시할 거래내역만(빈 행 제거) + 날짜 있는 것만.
  const dated = entries.filter(
    (e) =>
      e.deposit_date &&
      (e.vendor?.trim() ||
        e.deposit_amount != null ||
        e.spend_amount != null ||
        e.contract_note?.trim()),
  );

  // 전체 합계 + 남은 금액(입금 − 소진). 초과 소진이면 음수.
  const totalDeposit = dated.reduce((s, e) => s + (e.deposit_amount ?? 0), 0);
  const totalSpend = dated.reduce((s, e) => s + (e.spend_amount ?? 0), 0);
  const remaining = totalDeposit - totalSpend;

  // 날짜별 그룹(최신 날짜 먼저).
  const map = new Map<string, LedgerEntry[]>();
  for (const e of dated) {
    const d = e.deposit_date!;
    const arr = map.get(d);
    if (arr) arr.push(e);
    else map.set(d, [e]);
  }
  const groups = Array.from(map.keys())
    .sort((a, b) => (a < b ? 1 : -1))
    .map((d) => ({ date: d, items: map.get(d)! }));

  // 리스트 중간 지점 — 이 인덱스의 날짜 그룹 앞에 마스코트를 끼워 넣는다.
  const mascotAt = Math.floor(groups.length / 2);

  return (
    <div className="mx-auto max-w-[480px]">
      <div className="bg-white p-5 sm:rounded-[20px] sm:shadow-sm">
        {/* ── 제목 (좌: 텍스트 / 우: APNG) ─────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Text as="h1" textStyle="t9Bold" className="block text-gray-900">
              결제 내역을
              <br />
              안내드려요
            </Text>
          </div>
          <Image
            src="/amount-anim.png"
            alt=""
            width={84}
            height={84}
            unoptimized
            className="shrink-0"
          />
        </div>

        {groups.length > 0 ? (
          <>
            {/* ── 남은 금액 + 소진·입금 요약 밴드 (카드 폭 꽉 채움) ── */}
            <div className="-mx-5 mt-5 bg-gray-50 px-5 py-4">
              <div className="flex items-center gap-2 pb-4">
                <Image
                  src="/ledger-remain-3d.svg"
                  alt=""
                  width={34}
                  height={34}
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-400">남은 금액</p>
                  <p
                    className={`mt-0.5 text-xl font-bold tracking-tight ${
                      remaining < 0 ? "text-[#c0392b]" : "text-[#191f28]"
                    }`}
                  >
                    {remaining < 0 ? "−" : ""}
                    {won(remaining)}
                    <span className="ml-0.5 text-sm font-semibold text-gray-400">
                      원
                    </span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-gray-200 pt-4">
                <div className="flex items-center gap-2">
                  <Image
                    src="/ledger-spend-3d.svg"
                    alt=""
                    width={34}
                    height={34}
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-400">소진</p>
                    <p className="mt-0.5 text-xl font-bold tracking-tight text-[#191f28]">
                      −{won(totalSpend)}
                      <span className="ml-0.5 text-sm font-semibold text-gray-400">
                        원
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Image
                    src="/ledger-deposit-3d.svg"
                    alt=""
                    width={34}
                    height={34}
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-400">입금</p>
                    <p className="mt-0.5 text-xl font-bold tracking-tight text-[#0e299c]">
                      +{won(totalDeposit)}
                      <span className="ml-0.5 text-sm font-semibold text-gray-400">
                        원
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 거래 피드 (날짜별 그룹) ─────────────────────── */}
            {groups.map((g, gi) => (
              <Fragment key={g.date}>
                {gi === mascotAt && showAd && (
                  <div className="-mx-5 my-3 px-5">
                    {/* 가로형 광고 배너 — 클릭 시 설정된 링크로 이동 */}
                    <a
                      href={adUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative block overflow-hidden rounded-2xl bg-gradient-to-r from-[#eef2fd] to-[#e3ebff] px-4 py-4 transition-shadow hover:shadow-md"
                    >
                      <span className="absolute right-3 top-3 rounded bg-gray-900/50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
                        AD
                      </span>
                      <Image
                        src="/medi-symbol.png"
                        alt="메디로드"
                        width={88}
                        height={104}
                        unoptimized
                        className="h-9 w-auto"
                      />
                      <p className="mt-2 text-sm font-bold text-[#0e299c]">
                        우리 동네 병원을 가장 쉽게 찾는 방법
                      </p>
                    </a>
                  </div>
                )}
                <div className="mt-5">
                <p className="mb-1 text-sm text-gray-400">
                  {dayjs(g.date).format("M월 D일 dddd")}
                </p>
                <div>
                  {g.items.map((e) => {
                    const isDeposit = (e.deposit_amount ?? 0) > 0;
                    const amount = isDeposit
                      ? e.deposit_amount!
                      : e.spend_amount ?? 0;
                    const desc =
                      [e.vendor?.trim(), e.contract_note?.trim()]
                        .filter(Boolean)
                        .join(" · ") || "-";
                    return (
                      <div key={e.id} className="flex items-center gap-3 py-3">
                        <Image
                          src={
                            isDeposit ? "/deposit-icon.svg" : "/spend-icon.svg"
                          }
                          alt=""
                          width={40}
                          height={40}
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <p
                            className={`text-[18px] font-bold leading-tight tracking-tight ${
                              isDeposit ? "text-[#0e299c]" : "text-[#191f28]"
                            }`}
                          >
                            {isDeposit ? "" : "−"}
                            {won(amount)}원
                          </p>
                          <p className="truncate text-sm text-gray-400">
                            {desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </div>
              </Fragment>
            ))}
          </>
        ) : (
          <p className="py-12 text-center text-sm text-gray-400">
            아직 등록된 거래내역이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
