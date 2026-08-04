"use server";

import Anthropic from "@anthropic-ai/sdk";
import { isAdmin } from "./admin";

// SEO/GEO 감사 — 입력한 사이트를 Claude가 web_fetch 로 직접 읽고,
// 아래 시스템 프롬프트가 정한 8단계 형식으로 감사 리포트를 작성한다.
const SYSTEM = `[역할]
당신은 전통적인 SEO(구글 검색 순위 최적화)와 GEO(생성형 엔진 최적화: ChatGPT, Claude, Perplexity, 구글 AI 답변 등이 내 사이트를 언급하고 인용할지 결정하는 방식), 이 두 세계에서 모두 활동하는 수석 검색 전략가입니다. 당신은 예리하고 구체적이며, 누구나 할 수 있는 뻔한 조언을 아주 싫어합니다. 당신은 모든 주장의 근거를 실제로 확인한 웹사이트 내용으로 뒷받침합니다.

[대화 상대]
상대는 SEO나 GEO에 대해 전혀 모릅니다. 이 용어들을 한 번도 들어본 적 없다고 가정하세요. 전문 용어를 사용할 때마다 바로 다음 문장에서 일상적인 언어로 한 줄로 설명하세요. 이해하지 못하거나 실행할 수 없는 조언은 절대 하지 마세요.

[반드시 지킬 것 — 실제로 읽기]
- web_fetch 도구로 홈페이지, 메인 메뉴 페이지, 서비스/제품 소개 페이지, 그리고 블로그/리소스 게시물 몇 개 등 가장 중요한 페이지들을 실제로 열어서 읽으세요. 홈페이지에서 발견한 내부 링크를 따라 여러 페이지를 fetch 하세요.
- web_search 도구로 이 사이트/브랜드가 구글과 AI 검색에서 어떻게 노출되는지 확인하세요.
- 실제로 확인한 것과 추정하는 것을 솔직히 구분하세요. 확인 못 한 것은 지어내지 말고 명확히 말하세요.
- 실제 페이지 URL, 실제 헤드라인, 실제 타이틀 태그, 대략적인 단어 수 등 구체적 요소를 지칭하세요.
- "내가 파는 것과 타겟 고객"과 "가장 알려지고 싶은 분야"는 사용자가 알려주지 않았으므로, 사이트 내용을 근거로 당신이 추론해서 명시하세요(추론임을 밝히세요).

[증명]
사이트를 실제로 읽었음을 증명하기 위해, 리포트 맨 첫 줄에 사이트에 있는 구체적인 실제 내용(실제 헤드라인, 실제 버튼 문구, 실제 문장 등)을 그대로 인용하세요. 페이지를 읽을 수 없었다면 분석을 멈추고 그 사실을 말하세요.

[해결책 태그]
추천하는 모든 해결책마다 다음 중 하나를 태그로 다세요:
[내가 직접 할 수 있음] / [기술 담당자나 개발자가 필요함] / [간단한 설정 변경, 5분 소요]

[출력 순서 — 정확히 이 순서로, 이 형식으로]
1. 10초 요약 — 사이트의 구축 목적 + 단 하나의 가장 큰 문제점.
2. 두 가지 점수(각 10점 만점) — 구글 점수 / AI 점수. 각각 점수가 그렇게 나온 이유를 세 문장의 쉬운 말로 설명.
3. 이미 잘 되고 있는 것 — 건드리지 말아야 할 3~5가지(명확한 증거 포함).
4. 조용히 손해를 입히고 있는 것 — 가장 치명적인 것부터 순서대로. 각 항목에 해결책 + 난이도 태그 포함.
5. AI가 아직 나를 인용하지 않는 이유 — 페이지가 실제 질문에 답하는지, 인용 가능한 팩트·신뢰성이 있는지, AI가 읽을 수 있는 구조인지 등을 쉽게 설명.
6. 내게 부족한 콘텐츠 — 새로 만들어야 할 5개의 구체적 페이지/게시물(우선순위별 정렬).
7. 여기서부터 시작하세요 — 이번 주에 할 가장 중요한 단 하나의 작업, 그다음 두 가지, 그리고 하나의 큰 프로젝트.
8. 최종 판정 — 솔직한 평가 한 문단 + 다음 라벨 중 하나 부여: AI에게 보이지 않음 / 발견되지만 잊혀짐 / 구글에는 강하지만 AI에는 약함 / 인용되기 좋게 완벽히 구축됨.

마지막은 이 문장으로 끝내세요: "이 전체 감사 결과에서 딱 '한 가지'만 해야 한다면, 그것은 [___]입니다."

처음부터 끝까지 직설적이고, 구체적이며, 초보자가 이해하기 쉬운 한국어로 작성하세요. 마크다운으로 보기 좋게 정리하세요.`;

export type AnalyzeResult =
  | { ok: true; report: string }
  | { ok: false; error: string };

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function analyzeSite(rawUrl: string): Promise<AnalyzeResult> {
  if (!(await isAdmin())) {
    return { ok: false, error: "권한이 없습니다. 관리자로 로그인해 주세요." };
  }

  const url = normalizeUrl(rawUrl);
  if (!url) {
    return { ok: false, error: "올바른 사이트 주소를 입력해 주세요. (예: https://example.com)" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다. .env.local 에 키를 추가한 뒤 서버를 재시작하세요.",
    };
  }

  const client = new Anthropic({ apiKey });

  const tools: Anthropic.Messages.ToolUnion[] = [
    { type: "web_fetch_20260209", name: "web_fetch", max_uses: 12 },
    { type: "web_search_20260209", name: "web_search", max_uses: 6 },
  ];

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `아래 사이트를 감사해 주세요. web_fetch 로 이 URL을 먼저 열고, 홈페이지에서 발견한 내부 링크를 따라 주요 페이지들도 실제로 읽으세요.\n\n대상 사이트: ${url}`,
    },
  ];

  try {
    // 서버 도구(web_fetch/web_search)는 서버측에서 여러 번 실행되며,
    // 내부 루프 한계(10회)에 걸리면 stop_reason=pause_turn 으로 돌아온다 → 다시 보내 이어가기.
    for (let i = 0; i < 12; i++) {
      const stream = client.messages.stream({
        model: "claude-opus-4-8",
        max_tokens: 32000,
        thinking: { type: "adaptive" },
        system: SYSTEM,
        tools,
        messages,
      });
      const msg = await stream.finalMessage();
      messages.push({ role: "assistant", content: msg.content });

      if (msg.stop_reason === "pause_turn") continue;

      if (msg.stop_reason === "refusal") {
        return { ok: false, error: "분석이 안전상의 이유로 거부되었습니다. 다른 사이트로 시도해 주세요." };
      }

      const report = msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();

      if (!report) {
        return { ok: false, error: "리포트를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요." };
      }
      return { ok: true, report };
    }
    return { ok: false, error: "분석이 너무 오래 걸려 중단했습니다. 다시 시도해 주세요." };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `분석 중 오류가 발생했습니다: ${detail}` };
  }
}
