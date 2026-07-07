import Image from "next/image";
import { Text } from "seed-design/ui/text";
import dayjs from "@/lib/dayjs";
import type { LedgerEntry } from "@/lib/db";

interface Props {
  company: string;
  entries: LedgerEntry[];
  today: string;
}

/** 숫자(원) → "10,281,964" (천단위, 기호 없음). */
function won(n: number): string {
  return Math.abs(n).toLocaleString("ko-KR");
}

/**
 * 광고주(비로그인) 읽기전용 입금·소진 관리내역 뷰 (토스 스타일 거래 피드, 라이트 테마).
 * 상단: 소진·입금 합계 밴드. 하단: 전체 거래를 날짜별로 묶은 플랫 피드.
 */
export default function LedgerView({ entries }: Props) {
  // 표시할 거래내역만(빈 행 제거) + 날짜 있는 것만.
  const dated = entries.filter(
    (e) =>
      e.deposit_date &&
      (e.vendor?.trim() ||
        e.deposit_amount != null ||
        e.spend_amount != null ||
        e.contract_note?.trim()),
  );

  // 전체 합계.
  const totalDeposit = dated.reduce((s, e) => s + (e.deposit_amount ?? 0), 0);
  const totalSpend = dated.reduce((s, e) => s + (e.spend_amount ?? 0), 0);

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
            {/* ── 소진·입금 요약 밴드 (카드 폭 꽉 채움) ───────── */}
            <div className="-mx-5 mt-5 grid grid-cols-2 gap-4 bg-gray-100 px-5 py-4">
              <div>
                <p className="text-sm font-medium text-gray-400">소진</p>
                <p className="mt-0.5 text-2xl font-bold tracking-tight text-[#191f28]">
                  −{won(totalSpend)}
                  <span className="ml-0.5 text-base font-semibold text-gray-400">
                    원
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">입금</p>
                <p className="mt-0.5 text-2xl font-bold tracking-tight text-[#0e299c]">
                  +{won(totalDeposit)}
                  <span className="ml-0.5 text-base font-semibold text-gray-400">
                    원
                  </span>
                </p>
              </div>
            </div>

            {/* ── 거래 피드 (날짜별 그룹) ─────────────────────── */}
            {groups.map((g) => (
              <div key={g.date} className="mt-5">
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
