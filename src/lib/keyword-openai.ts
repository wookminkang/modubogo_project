import OpenAI from "openai";

// GEO 키워드 리포트 생성 — 암환자·교통사고 환자처럼 한방병원/요양병원을 찾는
// 환자들이 ChatGPT 에 실제로 입력할 법한 검색 질의를 환자군별로 추리하고,
// 왜 이 키워드인지(그룹별 이유)와 왜 GEO 작업이 필요한지 설명까지 함께 만든다.
// 결과는 /keyword/{nanoid} 공유 페이지에 그대로 노출된다.
//
// geo-check(geo-openai.ts)와 같은 OPENAI_API_KEY 를 쓰지만 완전 별개 기능이다.

export const KEYWORD_MODEL = "gpt-5.5";
/** 전체 키워드 상한 (그룹 합계). */
export const MAX_KEYWORDS = 50;

const SYSTEM = `당신은 한국 의료·병원 마케팅에서 GEO(생성형 엔진 최적화)를 담당하는 검색 전략가입니다.
실제 환자와 보호자가 ChatGPT 같은 AI 검색에 입력할 법한 자연스러운 한국어 검색 질의를 추리하고,
그 근거를 광고주(병원 원장님)가 이해할 수 있는 쉬운 말로 설명합니다.

[키워드 규칙]
1. "지역명 + 증상/질환/진료 분야" 조합을 중심으로 만듭니다.
2. ★ 실제 사용자는 길게 쓰지 않습니다. "지역+증상" 만 치는 짧고 간단한 형태
   (예: "강동구 암요양병원", "둔촌동 허리디스크 한의원", "잠실 교통사고 한방병원")를
   그룹마다 절반 이상 넣고, 나머지를 질문형·추천형 대화체(예: "~추천해줘", "~어디가 좋아?")로 섞습니다.
3. ★ "근처" 표현도 실제로 많이 씁니다. "OO 근처 요양병원", "잠실 근처 한방병원 추천",
   "우리집 근처 교통사고 병원"처럼 근처 패턴 키워드를 그룹마다 1~3개씩 포함합니다.
4. 특정 병원 이름이나 광고 문구는 키워드에 절대 넣지 않습니다.
5. 지역명은 인접 지역·생활권 변형을 포함합니다. (예: 강동송파 → 강동구, 송파구, 둔촌동, 천호, 잠실, 명일 등)
6. 진료 분야에 맞는 환자군을 3~5개로 나누고, 환자군마다 키워드를 배분합니다.
   (예: 암 분야면 "암 진단 직후 환자", "항암 치료 중 환자", "요양·회복기 환자·보호자" /
    통증 분야면 "교통사고 후유증 환자", "목·어깨 통증 환자", "허리·디스크 환자")
7. 키워드는 전체 합계 정확히 ${MAX_KEYWORDS}개. 서로 중복되거나 사실상 같은 키워드는 안 됩니다.

[설명 규칙 — 광고주가 읽는 글]
- summary: 이 환자군들이 왜 이런 식으로 검색하는지, 키워드를 어떤 기준으로 뽑았는지 3~5문장.
  특히 "사용자는 문장을 길게 쓰기보다 '지역+증상'처럼 간단 명료하게 검색하는 경우가 대부분"이라는
  점을 꼭 언급하고, 그래서 짧은 형태와 질문형을 함께 구성했다고 설명합니다.
- 그룹별 reason: 이 환자군이 실제로 겪는 상황과 검색 심리를 근거로, 왜 이 키워드 묶음이 필요한지 2~4문장.
- why_geo: 요즘 환자들이 네이버 대신 ChatGPT 같은 AI에 병원을 물어보는 흐름과,
  이 키워드들로 GEO 작업을 하면 병원에 어떤 효과가 있는지 4~6문장.
- 전문 용어(GEO 등)를 쓰면 바로 쉬운 말로 풀어 설명합니다. 과장·확정적 효과 보장 표현은 쓰지 않습니다.`;

// Responses API strict json_schema — 모든 depth 에 required + additionalProperties:false 필수.
const PROPOSAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "why_geo", "groups"],
  properties: {
    summary: { type: "string", description: "키워드 선정 접근 요약 (광고주용 쉬운 설명)" },
    why_geo: { type: "string", description: "이 키워드로 GEO 작업이 필요한 이유 (광고주용)" },
    groups: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "reason", "keywords"],
        properties: {
          title: { type: "string", description: "환자군 이름 (예: 교통사고 후유증 환자)" },
          reason: { type: "string", description: "이 환자군 키워드를 뽑은 이유" },
          keywords: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

export type ProposalInput = {
  hospitalName: string;
  region: string;
  /** 진료 분야·대상 환자 (예: "암 요양·한방 치료", "교통사고·목·허리 통증") */
  field: string;
};

export type ProposalGroup = { title: string; reason: string; keywords: string[] };

export type GeneratedProposal = {
  summary: string;
  whyGeo: string;
  groups: ProposalGroup[];
};

/** 키워드 리포트 생성. 실패 시 throw (호출부 서버 액션이 에러 문자열로 흡수). */
export async function generateProposal(input: ProposalInput): Promise<GeneratedProposal> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY 환경변수가 설정되지 않았습니다. .env.local 에 키를 추가한 뒤 서버를 재시작하세요.",
    );
  }
  const client = new OpenAI({ apiKey });

  const res = await client.responses.create({
    model: KEYWORD_MODEL,
    // 웹검색 없이 순수 발상+작문 작업. medium 이면 품질/속도 균형이 맞다.
    reasoning: { effort: "medium" },
    instructions: SYSTEM,
    input: `아래 병원의 GEO 키워드 리포트를 만들어 주세요.
환자군별 그룹으로 나눠 전체 ${MAX_KEYWORDS}개 키워드와 선정 이유, GEO 작업이 필요한 이유를 함께 작성합니다.

- 병원명: ${input.hospitalName} (키워드에 넣지 말 것)
- 지역: ${input.region}
- 진료 분야·대상 환자: ${input.field}`,
    text: {
      format: {
        type: "json_schema",
        name: "geo_keyword_proposal",
        strict: true,
        schema: PROPOSAL_SCHEMA,
      },
    },
  });

  const raw = res.output_text?.trim();
  if (!raw) throw new Error("키워드를 뽑지 못했습니다. 잠시 후 다시 시도해 주세요.");

  let parsed: { summary?: unknown; why_geo?: unknown; groups?: unknown };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    throw new Error("결과를 해석하지 못했습니다. 다시 시도해 주세요.");
  }
  if (
    typeof parsed.summary !== "string" ||
    typeof parsed.why_geo !== "string" ||
    !Array.isArray(parsed.groups)
  ) {
    throw new Error("결과 형식이 올바르지 않습니다. 다시 시도해 주세요.");
  }

  // 그룹·키워드 정리 — trim, 빈 값·전체 중복 제거, 합계 상한 적용
  // (json_schema 로는 개수 제약을 못 걸어 코드에서 마감)
  const seen = new Set<string>();
  let remaining = MAX_KEYWORDS;
  const groups: ProposalGroup[] = [];
  for (const rawGroup of parsed.groups) {
    if (!rawGroup || typeof rawGroup !== "object") continue;
    const g = rawGroup as { title?: unknown; reason?: unknown; keywords?: unknown };
    const title = typeof g.title === "string" ? g.title.trim() : "";
    const reason = typeof g.reason === "string" ? g.reason.trim() : "";
    if (!title || !Array.isArray(g.keywords)) continue;

    const keywords: string[] = [];
    for (const k of g.keywords) {
      if (typeof k !== "string" || remaining - keywords.length <= 0) continue;
      const v = k.trim();
      if (!v || seen.has(v)) continue;
      seen.add(v);
      keywords.push(v);
    }
    if (!keywords.length) continue;
    remaining -= keywords.length;
    groups.push({ title, reason, keywords });
    if (remaining <= 0) break;
  }
  if (!groups.length) throw new Error("뽑힌 키워드가 없습니다. 다시 시도해 주세요.");

  return {
    summary: parsed.summary.trim(),
    whyGeo: parsed.why_geo.trim(),
    groups,
  };
}
