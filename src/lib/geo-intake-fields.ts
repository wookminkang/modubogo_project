// GEO 병원 정보 폼의 문항·단계 정의와 검증 규칙.
// 퍼널 화면(클라이언트)과 제출 액션(서버)이 같은 규칙을 쓰도록 한 곳에 둔다.
// "use server"/"server-only" 를 붙이지 않아 어디서든 import 가능한 순수 상수 모듈 (intake-fields.ts 와 같은 방식).
//
// 문항을 바꾸려면 여기만 고치면 된다 — DB 는 answers jsonb 한 칸이라 스키마 변경이 없다.

export type GeoIntakeFieldKey =
  | "contact_name"
  | "contact_phone"
  | "hospital_name"
  | "address"
  | "phone"
  | "biz_number"
  | "director"
  | "doctors_source"
  | "hours_weekday"
  | "hours_sat"
  | "hours_sun"
  | "hours_holiday"
  | "lunch"
  | "doctors"
  | "keywords"
  | "homepage_url"
  | "ftp_account"
  | "cafe24_account"
  | "cafe24_otp_contact";

export interface GeoIntakeFieldDef {
  key: GeoIntakeFieldKey;
  label: string;
  placeholder: string;
  required: boolean;
  /** true 면 textarea */
  multiline?: boolean;
  rows?: number;
  hint?: string;
  /** 계정 정보 — 브라우저 임시저장(localStorage)에 남기지 않는다 */
  secret?: boolean;
  /** 입력 중 자동 서식 (숫자만 받아 하이픈 자동 삽입). phone = 전화번호, biz = 사업자등록번호 */
  format?: "phone" | "biz";
  /** 있으면 입력 칸 대신 버튼으로 하나를 고른다. 저장값은 value */
  choices?: { value: string; label: string }[];
  /** 요약·관리자 화면용 짧은 이름 (없으면 label) */
  shortLabel?: string;
}

export type GeoIntakeAnswers = Partial<Record<GeoIntakeFieldKey, string>>;

/** 매월 1일~말일, 하루 1개 기준. 달마다 28~31일이라 안내 문구는 "약 30개" */
export const KEYWORD_TARGET = 30;
/** 가장 짧은 달(28일) — 이만큼 채우면 한 달 치를 채운 것으로 본다 */
export const KEYWORD_MONTH_MIN = 28;

const SHORT_MAX = 200;
const LONG_MAX = 5000;

export const FIELDS: GeoIntakeFieldDef[] = [
  // 1. 담당자
  { key: "contact_name", label: "작성자 성함", placeholder: "예) 김민수", required: true },
  { key: "contact_phone", label: "연락처", placeholder: "예) 010-1234-5678", required: true, format: "phone" },

  // 2. 병원 정보
  { key: "hospital_name", label: "정식 병원명", placeholder: "사업자등록증·간판에 적힌 이름", required: true },
  { key: "address", label: "도로명 주소", placeholder: "예) 서울 강동구 강동대로 243", required: true },
  { key: "phone", label: "대표 전화번호", placeholder: "예) 02-1234-5678", required: true, format: "phone" },
  { key: "biz_number", label: "사업자등록번호", placeholder: "예) 123-45-67890", required: true, format: "biz" },
  { key: "director", label: "대표원장 성함", placeholder: "예) 홍길동", required: true },

  // 3. 진료시간
  { key: "hours_weekday", label: "평일(월~금)", placeholder: "예) 09:00~18:00 / 요일마다 다르면 '월·수 09~20시, 화·목·금 09~18시'", required: true },
  { key: "hours_sat", label: "토요일", placeholder: "예) 09:00~13:00 / 쉬면 '휴진'", required: true },
  { key: "hours_sun", label: "일요일", placeholder: "예) 휴진", required: true },
  { key: "hours_holiday", label: "공휴일", placeholder: "예) 휴진", required: true },
  { key: "lunch", label: "점심시간", placeholder: "예) 13:00~14:00 / 없으면 '없음'", required: true },

  // 4. 의료진 — 직접 적기 번거로우면 기존 홈페이지를 참고하도록 고를 수 있다
  {
    key: "doctors_source",
    label: "의료진 정보는 어떻게 알려주시겠어요?",
    shortLabel: "의료진 정보",
    placeholder: "",
    required: true,
    choices: [
      { value: "manual", label: "직접 입력하기" },
      { value: "homepage", label: "홈페이지 참고하기" },
    ],
  },
  {
    key: "doctors",
    label: "의료진 목록",
    placeholder: "한 분당 한 줄로 적어 주세요.\n예) 홍길동 / 대표원장 / 한방재활의학과 전문의 / OO대 졸업, OO학회 정회원",
    required: true,
    multiline: true,
    rows: 6,
    hint: "이름 / 직함 / 전문의 자격 / 주요 경력",
  },

  // 5. 키워드
  {
    key: "keywords",
    label: "키워드",
    placeholder: "한 줄에 하나씩 적어 주세요.\n예) 송파구 허리디스크 한방병원\n잠실 교통사고 치료 병원",
    required: true,
    multiline: true,
    rows: 12,
    hint: `한 줄에 하나씩, 한 달 치(약 ${KEYWORD_TARGET}개)`,
  },

  // 6. 홈페이지·계정
  { key: "homepage_url", label: "기존 홈페이지 주소", placeholder: "예) https://www.example.com", required: false },
  { key: "ftp_account", label: "FTP 계정", placeholder: "아이디 / 비밀번호", required: false, secret: true, hint: "모르시면 비워두세요" },
  { key: "cafe24_account", label: "CAFE24 계정", placeholder: "아이디 / 비밀번호", required: false, secret: true, hint: "모르시면 비워두세요" },
  {
    key: "cafe24_otp_contact",
    label: "CAFE24 인증번호 받는 담당자",
    placeholder: "성함 / 휴대폰 번호",
    required: false,
    hint: "로그인할 때 휴대폰 인증이 필요할 수 있어요",
  },
];

export const FIELD_BY_KEY = new Map(FIELDS.map((f) => [f.key, f]));

export interface GeoIntakeStep {
  title: string;
  subtitle: string;
  keys: GeoIntakeFieldKey[];
}

export const STEPS: GeoIntakeStep[] = [
  { title: "담당자", subtitle: "작업 중 연락드릴 분을 알려주세요.", keys: ["contact_name", "contact_phone"] },
  {
    title: "병원 정보",
    subtitle: "홈페이지에 표기할 기본 정보예요.",
    keys: ["hospital_name", "address", "phone", "biz_number", "director"],
  },
  {
    title: "진료시간",
    subtitle: "요일마다 따로 적어 주세요. 쉬는 날은 '휴진'이라고 적어 주세요.",
    keys: ["hours_weekday", "hours_sat", "hours_sun", "hours_holiday", "lunch"],
  },
  {
    title: "의료진",
    subtitle: "직접 적어 주시거나, 기존 홈페이지의 의료진 소개를 참고하도록 고를 수 있어요.",
    keys: ["doctors_source", "doctors"],
  },
  {
    title: "키워드",
    subtitle: "매월 1일부터 말일까지 하루에 하나씩 작업해요. 작업을 원하시는 키워드를 적어 주세요.",
    keys: ["keywords"],
  },
  {
    title: "홈페이지·계정",
    subtitle: "기존 홈페이지와 관리 계정 정보예요. 모르는 건 비워두셔도 됩니다.",
    keys: ["homepage_url", "ftp_account", "cafe24_account", "cafe24_otp_contact"],
  },
];

export const SECRET_KEYS = FIELDS.filter((f) => f.secret).map((f) => f.key);

// ── 키워드 ──────────────────────────────────────────────────

/** 한 줄에 하나 — 빈 줄 제거, 앞뒤 공백 정리 */
export function keywordList(text: string | undefined): string[] {
  return (text ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

// ── 전화번호 서식 ──────────────────────────────────────────

/**
 * 숫자만 남겨 한국 전화번호 형태로 하이픈을 넣는다. 입력 중에도 호출되므로 자릿수가 모자라도 동작한다.
 *   010-1234-5678 · 010-123-4567 · 02-123-4567 · 02-1234-5678 · 031-123-4567 · 1588-1234
 */
export function formatPhone(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 11);
  if (d.startsWith("02")) {
    const n = d.slice(0, 10);
    if (n.length <= 2) return n;
    if (n.length <= 5) return `${n.slice(0, 2)}-${n.slice(2)}`;
    if (n.length <= 9) return `${n.slice(0, 2)}-${n.slice(2, 5)}-${n.slice(5)}`;
    return `${n.slice(0, 2)}-${n.slice(2, 6)}-${n.slice(6)}`;
  }
  // 1588·1644 같은 대표번호 (8자리)
  if (/^1[5-9]\d{2}/.test(d) && d.length <= 8) {
    return d.length <= 4 ? d : `${d.slice(0, 4)}-${d.slice(4)}`;
  }
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

/** 사업자등록번호 10자리 → 123-45-67890. 입력 중에도 동작한다. */
export function formatBizNumber(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

/** 문항의 format 에 맞는 서식 적용. format 이 없으면 그대로 돌려준다. */
export function applyFormat(def: GeoIntakeFieldDef, value: string): string {
  if (def.format === "phone") return formatPhone(value);
  if (def.format === "biz") return formatBizNumber(value);
  return value;
}

// ── 검증 ────────────────────────────────────────────────────

/**
 * 입력을 정해진 문항 키로만 추려 다듬는다 (서버 액션의 신뢰 경계).
 * 모르는 키·문자열 아닌 값은 버리고, 앞뒤 공백 제거 후 길이 상한으로 자른다.
 */
export function sanitizeAnswers(raw: unknown): GeoIntakeAnswers {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: GeoIntakeAnswers = {};
  for (const f of FIELDS) {
    const v = src[f.key];
    if (typeof v !== "string") continue;
    const max = f.multiline ? LONG_MAX : SHORT_MAX;
    const trimmed = f.multiline
      ? v.split("\n").map((l) => l.trimEnd()).join("\n").trim()
      : v.trim();
    if (!trimmed) continue;
    if (f.choices && !f.choices.some((c) => c.value === trimmed)) continue;
    out[f.key] = trimmed.slice(0, max);
  }
  // 숨겨진 문항의 값은 저장하지 않는다 (홈페이지 참고로 바꿨는데 예전에 쓰던 의료진 목록이 남는 경우)
  for (const f of FIELDS) if (!isVisible(f, out)) delete out[f.key];
  return out;
}

// ── 조건부 문항 ────────────────────────────────────────────
// 의료진을 "홈페이지 참고하기"로 고르면 의료진 목록은 받지 않고, 대신 홈페이지 주소가 필수가 된다
// (참고할 홈페이지가 없으면 의료진 정보를 얻을 길이 없으므로).

export const doctorsFromHomepage = (a: GeoIntakeAnswers) => a.doctors_source === "homepage";

/** 지금 답변 상태에서 이 문항을 보여줄지 */
export function isVisible(f: GeoIntakeFieldDef, a: GeoIntakeAnswers): boolean {
  if (f.key === "doctors") return a.doctors_source === "manual";
  return true;
}

/** 지금 답변 상태에서 이 문항이 필수인지 */
export function isRequired(f: GeoIntakeFieldDef, a: GeoIntakeAnswers): boolean {
  if (f.key === "doctors") return a.doctors_source === "manual";
  if (f.key === "homepage_url") return doctorsFromHomepage(a);
  return f.required;
}

/** 화면 표시용 값 — 버튼형 문항은 저장값 대신 라벨로 */
export function displayValue(f: GeoIntakeFieldDef, value: string | undefined): string {
  if (!value) return "";
  return f.choices?.find((c) => c.value === value)?.label ?? value;
}

function filled(f: GeoIntakeFieldDef, answers: GeoIntakeAnswers): boolean {
  const v = answers[f.key];
  if (f.key === "keywords") return keywordList(v).length > 0;
  return !!v?.trim();
}

/** 이 단계의 필수 문항이 모두 채워졌는지 — 퍼널 "다음" 버튼 활성 기준 */
export function stepValid(step: GeoIntakeStep, answers: GeoIntakeAnswers): boolean {
  return step.keys.every((k) => {
    const f = FIELD_BY_KEY.get(k)!;
    return !isRequired(f, answers) || filled(f, answers);
  });
}

/** 제출 전 최종 검증. 문제가 있으면 사용자에게 보여줄 문장, 없으면 null. */
export function validateSubmission(answers: GeoIntakeAnswers, consent: boolean): string | null {
  const missing = FIELDS.find((f) => isRequired(f, answers) && !filled(f, answers));
  if (missing?.choices) return `'${missing.shortLabel ?? missing.label}'을(를) 골라 주세요.`;
  if (missing) return `'${missing.shortLabel ?? missing.label}'을(를) 입력해 주세요.`;
  if (!consent) return "개인정보 수집·이용에 동의해 주세요.";
  return null;
}
