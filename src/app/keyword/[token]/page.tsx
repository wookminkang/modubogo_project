import { notFound } from "next/navigation";
import Image from "next/image";
import dayjs from "@/lib/dayjs";
import { getKeywordProposalByNanoid } from "@/lib/keyword-db";

// GEO 키워드 리포트 공유 페이지 — 링크(nanoid)만 있으면 누구나 열람.
// 디자인 원칙: 토스/당근처럼 플랫하고 깔끔하게. 그라데이션·블러·과한 그림자 금지.
// 위계는 타이포그래피(굵기·크기·회색 단계)와 브랜드 네이비(#0e299c) 포인트로만 만든다.
// 회색 스케일: 본문 #191f28 / 보조 #4e5968 / 흐림 #8b95a1 / 경계 #e5e8eb / 면 #f2f4f6
export const dynamic = "force-dynamic";

export default async function KeywordSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const proposal = await getKeywordProposalByNanoid(decodeURIComponent(token));
  if (!proposal) notFound();

  const count = proposal.groups.reduce((s, g) => s + g.keywords.length, 0);
  // GEO 콘텐츠에 반영할 병원 팩트 정보 — 광고주에게 회신을 요청하는 표준 체크리스트.
  const infoRequests = [
    {
      title: "입원실 병상 수",
      desc: "운영 중인 입원실의 병상(침대) 수, 상급 병실(1인실 등) 유무",
    },
    {
      title: "의료진 현황",
      desc: "최근 변경된 의료진 포함 — 성함, 직책, 전문 진료 분야",
    },
    {
      title: "공휴일·주말 외래 진료",
      desc: "365일 진료인 경우 공휴일에도 외래 진료가 가능한지, 가능한 시간대",
    },
    {
      title: "내원 안내",
      desc: "주차, 셔틀 운행 등 환자·보호자가 자주 묻는 이용 정보",
    },
  ];
  // 대표 키워드 — 환자군마다 첫 키워드를 하나씩 뽑아 최대 5개를 맨 위에 크게 보여준다.
  const highlights = proposal.groups.map((g) => g.keywords[0]).filter(Boolean).slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-6">
      {/* ── 표지 ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[25px] font-extrabold leading-snug tracking-tight text-[#191f28] sm:text-[28px]">
            {proposal.hospitalName}
            <br />
            <span className="text-[#0e299c]">({proposal.field})</span>
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#8b95a1]">
            <span>{proposal.region}</span>
            <span className="h-3 w-px bg-[#e5e8eb]" />
            <span>AI 검색 노출(GEO) 작업 키워드 제안서</span>
            <span className="h-3 w-px bg-[#e5e8eb]" />
            <span>{dayjs(proposal.createdAt).format("YYYY. MM. DD")}</span>
          </div>
        </div>
        <Image
          src="/robot-geo-sign.png"
          alt="GEO 팻말을 든 로봇"
          width={120}
          height={120}
          priority
          className="h-24 w-24 shrink-0 object-contain sm:h-[120px] sm:w-[120px]"
        />
      </div>

      {/* ── 환자들이 AI에 이렇게 물어봅니다 ── */}
      <section className="mt-7 rounded-2xl bg-white px-6 py-7 sm:px-8">
        <div className="flex flex-wrap gap-1.5">
          {proposal.groups.map((g) => (
            <span
              key={g.title}
              className="rounded-lg bg-[#eaeef8] px-2.5 py-1 text-[12px] font-semibold text-[#0e299c]"
            >
              {g.title}
            </span>
          ))}
        </div>
        <h2 className="mt-4 text-[19px] font-bold leading-relaxed tracking-tight text-[#191f28] sm:text-[21px]">
          한방병원·요양병원을 찾는 이런 환자분들이,
          <br />
          요즘 <span className="text-[#0e299c]">AI에 이렇게 물어봅니다</span>
        </h2>
        <ul className="mt-5 flex flex-col gap-2">
          {highlights.map((k) => (
            <li
              key={k}
              className="flex items-baseline gap-2.5 rounded-xl bg-[#f2f4f6] px-4 py-3.5"
            >
              <span className="shrink-0 text-[17px] font-extrabold leading-none text-[#0e299c]">
                “
              </span>
              <span className="text-[15px] font-semibold leading-6 text-[#191f28]">{k}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[14px] leading-[1.8] text-[#4e5968]">
          이런 환자와 보호자들이 실제로 AI 검색에 가장 많이 쓰는 형태의 질문들입니다. 사용자는
          문장을 길게 쓰기보다{" "}
          <b className="font-bold text-[#0e299c]">&ldquo;지역 + 증상&rdquo;</b>처럼 간단 명료하게
          검색하는 경우가 대부분이라, 짧은 검색어와 질문형을 함께 담았습니다. 저희는 이런 키워드{" "}
          {count}개를 기준으로 <b className="font-bold text-[#0e299c]">홈페이지 GEO 작업</b>을
          진행하려 합니다.
        </p>
      </section>

      {/* ── 01 키워드 선정 배경 ── */}
      <Section no="01" title="키워드를 이렇게 뽑았습니다">
        <p className="whitespace-pre-wrap text-[15px] leading-[1.85] text-[#4e5968]">
          {proposal.summary}
        </p>
      </Section>

      {/* ── 02 환자군별 키워드 ── */}
      <Section no="02" title={`환자들이 AI에 물어보는 질문 ${count}개`}>
        <div className="flex flex-col gap-8">
          {proposal.groups.map((g) => (
            <div key={g.title}>
              <div className="flex items-center gap-2.5 border-l-[3px] border-[#0e299c] pl-3">
                <h3 className="text-[16px] font-bold tracking-tight text-[#191f28]">{g.title}</h3>
                <span className="rounded-md bg-[#eaeef8] px-1.5 py-0.5 text-[11px] font-bold text-[#0e299c]">
                  {g.keywords.length}
                </span>
              </div>
              {g.reason && (
                <p className="mt-2 pl-3 text-[13.5px] leading-6 text-[#8b95a1]">{g.reason}</p>
              )}
              <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {g.keywords.map((k, i) => (
                  <li
                    key={k}
                    className="flex items-baseline gap-2 rounded-lg bg-[#f2f4f6] px-3 py-2.5 text-[13.5px] leading-5 text-[#4e5968]"
                  >
                    <span className="w-4 shrink-0 text-right text-[11px] font-semibold tabular-nums text-[#b0b8c1]">
                      {i + 1}
                    </span>
                    {k}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 알리다고 로봇 콜아웃 ── */}
      <div className="mt-4 flex items-center gap-4 rounded-2xl bg-white px-6 py-5 sm:gap-6 sm:px-8">
        <Image
          src="/robot-search.png"
          alt="검색 로봇"
          width={92}
          height={92}
          className="h-20 w-20 shrink-0 object-contain sm:h-[92px] sm:w-[92px]"
        />
        <div>
          <p className="text-[15px] font-bold tracking-tight text-[#0e299c]">
            환자의 검색 습관을 기준으로 한 개씩 검토해 담았습니다
          </p>
          <p className="mt-1.5 text-[13.5px] leading-6 text-[#8b95a1]">
            지역 생활권, 환자군별 검색 심리, 실제 AI 검색에서 쓰이는 표현 방식을 반영해 구성한
            키워드 세트입니다. 협의 과정에서 언제든 조정할 수 있습니다.
          </p>
        </div>
      </div>

      {/* ── 03 GEO 작업 이유 ── */}
      <Section no="03" title="이 키워드로 GEO 작업하는 이유">
        <p className="whitespace-pre-wrap text-[15px] leading-[1.85] text-[#4e5968]">
          {proposal.whyGeo}
        </p>
      </Section>

      {/* ── 결론 ── */}
      <section className="mt-4 rounded-2xl bg-[#0e299c] px-6 py-7 text-white sm:px-8">
        <p className="text-[17px] font-bold leading-[1.7] tracking-tight">
          그래서 저희는 위 키워드 {count}개를 기준으로
          <br className="hidden sm:block" /> {proposal.hospitalName} 홈페이지의 GEO 작업을
          진행하겠습니다.
        </p>
        <p className="mt-2.5 text-[13.5px] leading-6 text-white/75">
          진행 상황은 담당자가 정기적으로 공유드리며, 키워드는 협의에 따라 조정될 수 있습니다.
        </p>
      </section>

      {/* ── 04 광고주 확인 요청 정보 ── */}
      <Section no="04" title="확인을 요청드리는 정보">
        <p className="text-[14px] leading-[1.8] text-[#4e5968]">
          AI는 병상 수, 공휴일 진료 여부처럼{" "}
          <b className="font-bold text-[#0e299c]">구체적인 사실 정보</b>가 있을 때 병원을 더
          정확하게 소개합니다. 아래 내용을 담당자에게 회신해 주시면 GEO 콘텐츠에 반영하겠습니다.
        </p>
        <ul className="mt-4 flex flex-col gap-1.5">
          {infoRequests.map((item) => (
            <li key={item.title} className="rounded-xl bg-[#f2f4f6] px-4 py-3.5">
              <p className="flex items-center gap-2 text-[14px] font-bold tracking-tight text-[#191f28]">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0e299c] text-[10px] font-extrabold text-white">
                  ✓
                </span>
                {item.title}
              </p>
              <p className="mt-1 pl-6 text-[13.5px] leading-6 text-[#8b95a1]">{item.desc}</p>
            </li>
          ))}
        </ul>
      </Section>

      <p className="mt-8 text-center text-xs text-[#b0b8c1]">
        궁금한 점은 담당자에게 편하게 문의해 주세요.
      </p>
    </div>
  );
}

function Section({
  no,
  title,
  children,
}: {
  no: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 rounded-2xl bg-white px-6 py-7 sm:px-8">
      <div className="flex items-baseline gap-2.5">
        <span className="text-[13px] font-extrabold tabular-nums text-[#0e299c]">{no}</span>
        <h2 className="text-[18px] font-bold tracking-tight text-[#191f28]">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
