// ChatGPT 답변에 특정 병원이 등장하는지 코드로 판정한다.
//
// 한국어 병원명은 표기가 흔들린다 — "리움한방병원" / "리움 한방병원" / "리움한방병원(광주)".
// 그래서 공백·구두점을 지운 정규화 문자열끼리 비교한다.
// 이 파일은 외부 의존이 없는 순수 함수만 둔다. 판정 규칙은 앞으로 가장 자주
// 손보게 될 부분이라, 서버 액션("use server")에서 분리해야 단독으로 검증하기 쉽다.

/** 정규화 과정에서 남긴 문자들의 원문(NFKC 기준) 인덱스. 매칭 구간을 원문으로 되돌릴 때 쓴다. */
type Normalized = { text: string; map: number[] };

const STRIP_RE = /[\s​ ()（）[\]{}<>·・.,、'"“”‘’\-–—_/\\|*#~!?:;]/;

/**
 * NFKC → 소문자 → 공백·구두점 제거.
 * "리움 한방병원(광주)" → "리움한방병원광주"
 *
 * NFKC 를 가장 먼저 해야 전각 문자나 자모가 분리된 입력이 제대로 합쳐진다.
 */
function normalizeWithMap(s: string): Normalized {
  const base = s.normalize("NFKC").toLowerCase();
  let text = "";
  const map: number[] = [];
  for (let i = 0; i < base.length; i++) {
    const ch = base[i];
    if (STRIP_RE.test(ch)) continue;
    text += ch;
    map.push(i);
  }
  return { text, map };
}

/** 비교용 정규화. 인덱스 맵이 필요 없을 때 쓴다. */
export function normalize(s: string): string {
  return normalizeWithMap(s).text;
}

/**
 * 병원 유형 접미사. 긴 것부터 두어야 "한방병원"이 "병원"보다 먼저 잡힌다.
 * (핵심 토큰 추출과 근접 매칭 양쪽에서 쓰인다.)
 */
const SUFFIXES = [
  "한방병원", "요양병원", "재활병원", "치과병원", "종합병원", "대학병원",
  "정형외과", "신경외과", "산부인과", "피부과", "안과", "이비인후과",
  "한의원", "치과의원", "의원", "치과", "병원",
  "클리닉", "의료원", "메디컬센터", "센터", "의료재단",
];

/**
 * 정식명에서 유형 접미사를 떼어낸 핵심 토큰.
 * "리움한방병원" → "리움",  "둥촌요양병원" → "둥촌"
 */
export function coreToken(name: string): string {
  const n = normalize(name);
  for (const suf of SUFFIXES) {
    const s = normalize(suf);
    if (n.length > s.length && n.endsWith(s)) return n.slice(0, -s.length);
  }
  return n;
}

export type MatchStrength = "exact" | "alias" | "fuzzy" | "none";

export type CodeMatch = {
  found: boolean;
  /** 답변에서 실제로 매칭된 표기 (NFKC 기준 원문 발췌) */
  matchedText: string | null;
  strength: MatchStrength;
};

/**
 * 핵심 토큰 뒤에 붙으면 병원이 아니라고 봐야 하는 말들.
 * "리움미술관", "리움타워" 같은 동명 고유명사를 걸러낸다.
 */
const NON_MEDICAL_RE =
  /미술관|박물관|갤러리|아파트|오피스|타워|호텔|카페|약국|학원|공원|마트|극장|교회|성당/;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 정규화 인덱스 구간을 원문(NFKC) 발췌로 되돌린다. */
function sliceOriginal(base: string, norm: Normalized, from: number, len: number): string {
  if (len <= 0 || from < 0 || from >= norm.map.length) return "";
  const start = norm.map[from];
  const end = norm.map[Math.min(from + len - 1, norm.map.length - 1)] + 1;
  return base.slice(start, end).trim();
}

/**
 * 답변 텍스트에 병원이 등장하는지 판정한다.
 *
 * 1) 정식명 완전 일치 (공백·괄호 무시)
 * 2) 등록된 별칭
 * 3) 핵심 토큰 + 유형 접미사 근접 매칭
 *
 * 3번에서 핵심 토큰 단독 매칭을 인정하지 않는 이유: "리움"만 찾으면 리움미술관 같은
 * 무관한 고유명사에 걸린다. 반드시 6자 이내에 병원류 접미사가 따라와야 인정하고,
 * 그렇게 잡힌 건 strength "fuzzy" 로 표시해 검토 대상으로 넘긴다
 * (예: "리움요양병원"은 "리움한방병원"과 다른 병원일 수 있다).
 */
export function matchHospital(
  answer: string,
  name: string,
  aliases: string[] = [],
): CodeMatch {
  if (!answer || !name) return { found: false, matchedText: null, strength: "none" };

  const base = answer.normalize("NFKC").toLowerCase();
  const norm = normalizeWithMap(answer);
  const hay = norm.text;

  // 1) 정식명 완전 일치
  const nName = normalize(name);
  if (nName) {
    const at = hay.indexOf(nName);
    if (at !== -1) {
      return {
        found: true,
        matchedText: sliceOriginal(base, norm, at, nName.length),
        strength: "exact",
      };
    }
  }

  // 2) 등록된 별칭 — 오탐/미탐을 잡는 실질적인 튜닝 손잡이
  for (const alias of aliases) {
    const na = normalize(alias);
    if (!na) continue;
    const at = hay.indexOf(na);
    if (at !== -1) {
      return {
        found: true,
        matchedText: sliceOriginal(base, norm, at, na.length),
        strength: "alias",
      };
    }
  }

  // 3) 핵심 토큰 + 유형 접미사 근접 매칭
  const core = coreToken(name);
  if (core.length >= 2) {
    const sufAlt = SUFFIXES.map((s) => escapeRe(normalize(s))).join("|");
    // 간격을 3자로 제한한다. 지점/지역명("리움광주한방병원")은 통과시키되,
    // "리움미술관 근처 병원" 처럼 무관한 말이 끼어든 경우를 걸러내기 위함.
    const re = new RegExp(`${escapeRe(core)}([가-힣a-z0-9]{0,3})(?:${sufAlt})`);
    const m = hay.match(re);
    if (m && m.index !== undefined && !NON_MEDICAL_RE.test(m[1] ?? "")) {
      return {
        found: true,
        matchedText: sliceOriginal(base, norm, m.index, m[0].length),
        strength: "fuzzy",
      };
    }
  }

  return { found: false, matchedText: null, strength: "none" };
}

/**
 * ChatGPT 가 인용한 출처 중에 공식 홈페이지가 있는지 본다.
 * 답변 본문에 이름이 안 나와도 홈페이지가 출처로 쓰였다면 그것도 노출이다.
 *
 * 서브도메인도 인정한다 (blog.reumsp.com → reumsp.com 등록으로 잡힌다).
 */
export function citesOwnSite(
  citations: { url: string }[],
  siteDomains: string[],
): { cited: boolean; matchedUrl: string | null } {
  const wanted = siteDomains
    .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0])
    .filter(Boolean);
  if (!wanted.length) return { cited: false, matchedUrl: null };

  for (const c of citations) {
    let host: string;
    try {
      host = new URL(c.url).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      continue;
    }
    if (wanted.some((d) => host === d || host.endsWith(`.${d}`))) {
      return { cited: true, matchedUrl: c.url };
    }
  }
  return { cited: false, matchedUrl: null };
}

/**
 * LLM 이 인용했다고 주장하는 문구가 실제로 답변에 있는지 확인한다.
 * 모델이 답변에 없는 문장을 지어내는 경우가 있어서, 이걸 통과 못 하면
 * LLM 판정을 신뢰하지 않고 검토 대상으로 넘긴다.
 */
export function quoteExistsInAnswer(answer: string, quote: string | null): boolean {
  if (!quote) return false;
  const hay = normalize(answer);
  const needle = normalize(quote);
  return needle.length > 0 && hay.includes(needle);
}
