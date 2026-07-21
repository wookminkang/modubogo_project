import OpenAI from "openai";
import { quoteExistsInAnswer } from "./geo-match";
import type { GeoCitation, GeoVerdict } from "./geo-db";

// GEO 노출 체크의 OpenAI 호출부. 두 호출을 철저히 분리한다.
//
//  1) 수집(askChatGpt) — 사용자가 실제로 던지는 키워드 문장 그대로만 보낸다.
//     ★ 여기에 병원명을 절대 넣지 않는다. "리움한방병원 나오는지 봐줘" 식으로 물으면
//       모델이 힌트를 받아 언급해버려서 측정 자체가 무의미해진다.
//  2) 판정(judgeAnswer) — 검색 없이, 수집된 답변 텍스트만 놓고 등장 여부를 판단한다.

/**
 * 답변 수집용. chatgpt.com 이 쓰는 현행 세대(5.6)에 맞춘다.
 *
 * 참고: chatgpt.com 을 그대로 추종하는 `-chat-latest` 별칭은 5.3 에서 멈춰 있고
 * 5.6 세대에는 그 별칭이 없다. 대신 5.6 은 sol/terra/luna 세 변형으로 제공된다.
 * chatgpt.com 기본값에 가장 가까운 걸로 sol 을 쓴다 — 변형이 바뀌면 이 상수만 고치면 된다.
 * (5.6 은 reasoning 모델이라 5.3-chat 보다 검색을 여러 번 돌려 더 느리고 비싸다.)
 */
export const COLLECT_MODEL = "gpt-5.6-sol";
/** 판정용. 텍스트만 보고 판단하는 짧은 작업이라 작은 모델로 충분하다. */
export const JUDGE_MODEL = "gpt-5.4-mini";

function client(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY 환경변수가 설정되지 않았습니다. .env.local 에 키를 추가한 뒤 서버를 재시작하세요.",
    );
  }
  return new OpenAI({ apiKey });
}

export type CollectResult = {
  answer: string;
  citations: GeoCitation[];
  model: string;
};

/**
 * 키워드를 ChatGPT에 그대로 물어보고 답변과 인용 출처를 가져온다.
 *
 * @param keyword 사용자가 실제로 입력하는 문장 (예: "둥촌동 요양병원 추천해줘")
 * @param region  검색 지역 힌트 (예: "광주"). 지역 키워드의 결과 현실성을 높인다.
 */
export async function askChatGpt(
  keyword: string,
  region: string | null,
  signal: AbortSignal,
): Promise<CollectResult> {
  const res = await client().responses.create(
    {
      model: COLLECT_MODEL,
      tools: [
        {
          type: "web_search",
          user_location: {
            type: "approximate",
            country: "KR",
            ...(region ? { city: region } : {}),
          },
        },
      ],
      // 키워드 원문 그대로. 병원명·판정 지시를 섞지 않는다.
      input: keyword,
    },
    { signal },
  );

  return {
    answer: res.output_text ?? "",
    citations: extractCitations(res),
    model: COLLECT_MODEL,
  };
}

/** 응답에서 web_search 인용 출처(url_citation)를 URL 기준 중복 제거해 뽑는다. */
function extractCitations(res: OpenAI.Responses.Response): GeoCitation[] {
  const seen = new Set<string>();
  const out: GeoCitation[] = [];
  for (const item of res.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part.type !== "output_text") continue;
      for (const ann of part.annotations ?? []) {
        if (ann.type !== "url_citation" || !ann.url || seen.has(ann.url)) continue;
        seen.add(ann.url);
        out.push({ url: ann.url, title: ann.title ?? ann.url });
      }
    }
  }
  return out;
}

export type JudgeResult = {
  mentioned: boolean;
  verdict: GeoVerdict;
  rank: number | null;
  matchedText: string | null;
  reason: string;
  /** 모델이 인용했다는 문구가 실제 답변에 없으면 true — 환각으로 보고 검토 대상으로 넘긴다. */
  quoteHallucinated: boolean;
};

const JUDGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["mentioned", "verdict", "rank", "matched_text", "reason"],
  properties: {
    mentioned: { type: "boolean", description: "답변에 이 병원이 등장하는가" },
    verdict: {
      type: "string",
      enum: ["recommended", "mentioned", "negative", "absent"],
      description: "recommended=추천됨, mentioned=언급만 됨, negative=부정적으로 언급, absent=등장 안 함",
    },
    rank: {
      type: ["integer", "null"],
      description: "답변이 병원을 나열했다면 몇 번째로 등장했는지. 목록 형태가 아니면 null",
    },
    matched_text: {
      type: ["string", "null"],
      description: "답변 원문에 문자 그대로 존재하는 병원 표기만 발췌. 없으면 null",
    },
    reason: { type: "string", description: "판단 근거 한 문장 (한국어)" },
  },
} as const;

const JUDGE_SYSTEM = `당신은 텍스트 판독기입니다. 주어진 답변 텍스트에 특정 병원이 등장하는지만 판단합니다.

[규칙]
- 오직 주어진 답변 텍스트 안에서만 판단하세요. 당신이 알고 있는 웹 지식이나 추론으로 보완하지 마세요.
- 지점·분원 표기가 달라도(예: "광주점", "(둥촌동)") 같은 브랜드면 등장으로 봅니다.
- 이름만 비슷한 다른 병원(예: "리움요양병원" vs "리움한방병원")은 등장이 아닙니다.
- matched_text 는 답변 원문에 문자 그대로 존재하는 부분만 그대로 복사하세요. 절대 지어내지 마세요.
- 등장하지 않으면 mentioned=false, verdict="absent", rank=null, matched_text=null 입니다.`;

/**
 * 수집된 답변 텍스트만 놓고 병원 등장 여부를 판정한다. 웹 검색을 쓰지 않는다.
 */
export async function judgeAnswer(
  answer: string,
  name: string,
  aliases: string[],
  signal: AbortSignal,
): Promise<JudgeResult> {
  if (!answer.trim()) {
    return {
      mentioned: false, verdict: "absent", rank: null, matchedText: null,
      reason: "답변이 비어 있습니다.", quoteHallucinated: false,
    };
  }

  const aliasLine = aliases.length ? `\n다른 표기: ${aliases.join(", ")}` : "";
  const res = await client().responses.create(
    {
      model: JUDGE_MODEL,
      instructions: JUDGE_SYSTEM,
      input: `[찾을 병원]\n정식명: ${name}${aliasLine}\n\n[답변 텍스트]\n${answer}`,
      text: {
        format: {
          type: "json_schema",
          name: "geo_judgement",
          strict: true,
          schema: JUDGE_SCHEMA,
        },
      },
    },
    { signal },
  );

  const raw = res.output_text?.trim();
  if (!raw) throw new Error("판정 응답이 비어 있습니다.");

  const parsed = JSON.parse(raw) as {
    mentioned: boolean; verdict: GeoVerdict; rank: number | null;
    matched_text: string | null; reason: string;
  };

  // 모델이 답변에 없는 문구를 인용하는 경우가 있다. 인용문이 실제로 존재하는지 확인한다.
  const quoteHallucinated =
    parsed.mentioned && !quoteExistsInAnswer(answer, parsed.matched_text);

  return {
    mentioned: parsed.mentioned,
    verdict: parsed.verdict,
    rank: parsed.rank,
    matchedText: parsed.matched_text,
    reason: parsed.reason,
    quoteHallucinated,
  };
}
