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
  | "director_license"
  | "hours_mon"
  | "hours_tue"
  | "hours_wed"
  | "hours_thu"
  | "hours_fri"
  | "hours_sat"
  | "hours_sun"
  | "hours_holiday"
  | "lunch_mon"
  | "lunch_tue"
  | "lunch_wed"
  | "lunch_thu"
  | "lunch_fri"
  | "lunch_sat"
  | "lunch_sun"
  | "lunch_holiday"
  | "doctors_source"
  | "doctors"
  | "hospital_type"
  | "beds"
  | "devices"
  | "keywords"
  | "homepage_url"
  | "ftp_id"
  | "ftp_pw"
  | "cafe24_id"
  | "cafe24_pw"
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
  /** 입력 중 자동 서식 (숫자만 받아 하이픈 자동 삽입). phone = 전화번호, biz = 사업자등록번호, digits = 숫자만 */
  format?: "phone" | "biz" | "digits";
  /** 있으면 입력 칸 대신 버튼으로 하나를 고른다. 저장값은 value */
  choices?: { value: string; label: string }[];
  /**
   * 진료시간 문항 — 입력 칸 대신 [진료/휴진] 버튼 + 30분 단위 시각 선택기로 받는다.
   * 저장값은 "09:00~18:00" 또는 closedLabel("휴진"/"없음") 한 문자열.
   */
  schedule?: { closedLabel: string; openLabel: string; defaultRange: string };
  /**
   * 칸을 나눠 여러 개를 받는 문항 (키워드·보유 장비).
   * 저장값은 줄바꿈으로 합친 한 문자열이라 다른 문항과 똑같이 다룬다.
   */
  repeat?: { count: number; unit: string };
  /**
   * "추가" 버튼으로 항목을 늘려가며 받는 문항 (의료진).
   * 저장값은 JSON 배열 문자열 — 한 명이 여러 칸(성함·직함·면허번호·경력)으로 나뉘어서
   * 한 줄 문자열로는 나중에 다시 쪼갤 수 없다.
   */
  group?: { max: number; unit: string; addLabel: string };
  /** 요약·관리자 화면용 짧은 이름 (없으면 label) */
  shortLabel?: string;
}

export type GeoIntakeAnswers = Partial<Record<GeoIntakeFieldKey, string>>;

/** 매월 1일~말일, 하루 1개 기준. 달마다 28~31일이라 안내 문구는 "약 30개" */
export const KEYWORD_TARGET = 30;
/** 가장 짧은 달(28일) — 이만큼 채우면 한 달 치를 채운 것으로 본다 */
export const KEYWORD_MONTH_MIN = 28;
/** 보유 장비 입력 칸 수 */
export const DEVICE_SLOTS = 12;
/** 의료진은 최대 몇 명까지 추가할 수 있는지 */
export const DOCTOR_MAX = 12;

const SHORT_MAX = 200;
const LONG_MAX = 5000;

const OPEN = (defaultRange: string) =>
  ({ closedLabel: "휴진", openLabel: "진료", defaultRange }) satisfies GeoIntakeFieldDef["schedule"];

/** 진료시간 단계의 요일 — 요일마다 [진료시간, 점심시간] 두 문항이 한 묶음이다 */
export const DAYS = [
  { hours: "hours_mon", lunch: "lunch_mon", label: "월요일", defaultRange: "09:00~18:00" },
  { hours: "hours_tue", lunch: "lunch_tue", label: "화요일", defaultRange: "09:00~18:00" },
  { hours: "hours_wed", lunch: "lunch_wed", label: "수요일", defaultRange: "09:00~18:00" },
  { hours: "hours_thu", lunch: "lunch_thu", label: "목요일", defaultRange: "09:00~18:00" },
  { hours: "hours_fri", lunch: "lunch_fri", label: "금요일", defaultRange: "09:00~18:00" },
  { hours: "hours_sat", lunch: "lunch_sat", label: "토요일", defaultRange: "09:00~13:00" },
  { hours: "hours_sun", lunch: "lunch_sun", label: "일요일", defaultRange: "09:00~13:00" },
  { hours: "hours_holiday", lunch: "lunch_holiday", label: "공휴일", defaultRange: "09:00~13:00" },
] as const satisfies { hours: GeoIntakeFieldKey; lunch: GeoIntakeFieldKey; label: string; defaultRange: string }[];

/** 점심시간 문항 → 그 날의 진료시간 문항 (진료하는 날에만 점심시간을 묻는다) */
export const LUNCH_OF = new Map<GeoIntakeFieldKey, GeoIntakeFieldKey>(DAYS.map((d) => [d.lunch, d.hours]));

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
  {
    key: "director_license",
    label: "대표원장 의사면허번호",
    shortLabel: "대표원장 면허번호",
    placeholder: "예) 123456",
    required: true,
    format: "digits",
  },

  // 3. 진료시간 — 요일마다 [진료/휴진] + 30분 단위 시각 선택, 진료하는 날엔 점심시간까지
  ...DAYS.flatMap(({ hours, lunch, label, defaultRange }): GeoIntakeFieldDef[] => [
    { key: hours, label, placeholder: "", required: true, schedule: OPEN(defaultRange) },
    {
      key: lunch,
      label: "점심시간",
      shortLabel: `${label.replace("요일", "")} 점심시간`,
      placeholder: "",
      required: false,
      schedule: { closedLabel: "없음", openLabel: "있음", defaultRange: "13:00~14:00" },
    },
  ]),

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
    label: "의료진",
    placeholder: "",
    required: true,
    group: { max: DOCTOR_MAX, unit: "명", addLabel: "의료진 추가" },
    hint: "한 분씩 추가해 주세요",
  },

  // 5. 병원 종류 → 한의원이면 보유 기기까지
  {
    key: "hospital_type",
    label: "병원 종류가 어떻게 되나요?",
    shortLabel: "병원 종류",
    placeholder: "",
    required: true,
    choices: [
      { value: "hospital", label: "한방병원" },
      { value: "clinic", label: "한의원" },
    ],
  },
  {
    key: "beds",
    label: "병상 수",
    placeholder: "예) 15",
    required: true,
    format: "digits",
    hint: "입원실 병상이 몇 개인지 알려주세요",
  },
  {
    key: "devices",
    label: "보유 피부기기",
    placeholder: "",
    required: false,
    repeat: { count: DEVICE_SLOTS, unit: "대" },
    hint: "장비 소개 페이지에 쓸 기기명이에요. 없으면 비워두세요",
  },

  // 6. 키워드 — 칸을 나눠 하나씩
  {
    key: "keywords",
    label: "키워드",
    placeholder: "",
    required: true,
    repeat: { count: KEYWORD_TARGET, unit: "개" },
    hint: "한 칸에 하나씩",
  },

  // 7. 홈페이지·계정
  { key: "homepage_url", label: "기존 홈페이지 주소", placeholder: "예) https://www.example.com", required: false },
  { key: "ftp_id", label: "FTP 아이디", placeholder: "예) hospital_ftp", required: false, secret: true, hint: "모르시면 비워두세요" },
  { key: "ftp_pw", label: "FTP 비밀번호", placeholder: "", required: false, secret: true },
  { key: "cafe24_id", label: "CAFE24 아이디", placeholder: "예) hospital2024", required: false, secret: true, hint: "모르시면 비워두세요" },
  { key: "cafe24_pw", label: "CAFE24 비밀번호", placeholder: "", required: false, secret: true },
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
  /** "hours" 단계는 문항을 하나씩 늘어놓지 않고 요일 표 하나로 그린다 (입력·확인·관리자 화면 공통) */
  id?: "hours";
}

/** 대부분의 병원이 이렇게 한다 — 진료시간 단계에서 한 번에 적용할 기본값 */
export const DEFAULT_WEEK: GeoIntakeAnswers = {
  hours_mon: "09:00~18:00",
  hours_tue: "09:00~18:00",
  hours_wed: "09:00~18:00",
  hours_thu: "09:00~18:00",
  hours_fri: "09:00~18:00",
  hours_sat: "09:00~13:00",
  hours_sun: "휴진",
  hours_holiday: "휴진",
  lunch_mon: "13:00~14:00",
  lunch_tue: "13:00~14:00",
  lunch_wed: "13:00~14:00",
  lunch_thu: "13:00~14:00",
  lunch_fri: "13:00~14:00",
  lunch_sat: "없음",
};

/** 진료시간 단계에서 "월요일과 같게" 한 번에 채울 요일 (월~금). 진료시간·점심시간을 함께 복사한다 */
export const WEEKDAYS = DAYS.slice(0, 5);

export const STEPS: GeoIntakeStep[] = [
  { title: "담당자", subtitle: "작업 중 연락드릴 분을 알려주세요.", keys: ["contact_name", "contact_phone"] },
  {
    title: "병원 정보",
    subtitle: "홈페이지에 표기할 기본 정보예요.",
    keys: ["hospital_name", "address", "phone", "biz_number", "director", "director_license"],
  },
  {
    title: "진료시간",
    subtitle: "요일마다 진료 여부를 고르고, 시간을 눌러 골라 주세요.",
    keys: DAYS.flatMap((d) => [d.hours, d.lunch]),
    id: "hours",
  },
  {
    title: "의료진",
    subtitle: "직접 적어 주시거나, 기존 홈페이지의 의료진 소개를 참고하도록 고를 수 있어요.",
    keys: ["doctors_source", "doctors"],
  },
  {
    title: "병원 종류",
    subtitle: "고르신 종류에 따라 한 가지만 더 여쭤볼게요.",
    keys: ["hospital_type", "beds", "devices"],
  },
  {
    title: "키워드",
    subtitle: "매월 1일부터 말일까지 하루에 하나씩 작업해요. 원하시는 키워드를 적어 주세요.",
    keys: ["keywords"],
  },
  {
    title: "홈페이지·계정",
    subtitle: "기존 홈페이지와 관리 계정 정보예요. 모르는 건 비워두셔도 됩니다.",
    keys: ["homepage_url", "ftp_id", "ftp_pw", "cafe24_id", "cafe24_pw", "cafe24_otp_contact"],
  },
];

export const SECRET_KEYS = FIELDS.filter((f) => f.secret).map((f) => f.key);

// ── 여러 칸 문항 (키워드·보유 장비) ─────────────────────────
// 저장은 줄바꿈으로 합친 한 문자열. 칸 순서를 유지해야 해서 편집 중에는 빈 줄도 그대로 둔다.

/** 줄바꿈 문자열 → 값 목록 (빈 줄 제거, 앞뒤 공백 정리) */
export function lineList(text: string | undefined): string[] {
  return (text ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** 저장 문자열 → 입력 칸 배열 (칸 수만큼 빈 칸을 채워서) */
export function slotValues(text: string | undefined, count: number): string[] {
  const lines = (text ?? "").split("\n").slice(0, count);
  return Array.from({ length: count }, (_, i) => lines[i] ?? "");
}

/** 입력 칸 배열 → 저장 문자열 (뒤쪽 빈 칸은 버린다) */
export function joinSlots(values: string[]): string {
  const out = [...values];
  while (out.length && !out[out.length - 1].trim()) out.pop();
  return out.join("\n");
}

// ── 의료진 (추가 버튼으로 늘려가는 문항) ────────────────────
// 저장값은 JSON 배열 문자열. 한 명이 칸 네 개로 나뉘어 있어 한 줄 문자열로는 다시 못 쪼갠다.

export interface DoctorEntry {
  name: string;
  title: string;
  license: string;
  career: string;
}

/** 의료진 한 명의 입력 칸 — 화면은 이 정의만 보고 그린다 */
export const DOCTOR_PARTS = [
  { key: "name", label: "성함", placeholder: "예) 홍길동", required: true, digitsOnly: false, rows: 0 },
  { key: "title", label: "직함", placeholder: "예) 대표원장", required: true, digitsOnly: false, rows: 0 },
  {
    key: "license",
    label: "의사면허번호",
    placeholder: "예) 123456",
    required: true,
    digitsOnly: true,
    rows: 0,
  },
  {
    key: "career",
    // 여러 줄을 적는 칸 — 자격·학력·학회를 한 줄에 몰아 적게 하면 읽기도 쓰기도 어렵다
    label: "전문 분야·주요 경력",
    placeholder: "한 줄에 하나씩 적어 주세요.\n예) 한방재활의학과 전문의\nOO대학교 한의과대학 졸업\n대한한방재활의학과학회 정회원",
    required: false,
    digitsOnly: false,
    rows: 4,
  },
] as const satisfies {
  key: keyof DoctorEntry;
  label: string;
  placeholder: string;
  required: boolean;
  digitsOnly: boolean;
  /** 0 보다 크면 여러 줄 입력(textarea), 값은 그 줄 수만큼 높이를 잡는다 */
  rows: number;
}[];

export const emptyDoctor = (): DoctorEntry => ({ name: "", title: "", license: "", career: "" });

/** 저장값 → 목록. 형식이 깨졌으면 빈 목록 (남이 보낸 값을 그대로 믿지 않는다) */
export function parseDoctors(value: string | undefined): DoctorEntry[] {
  if (!value?.trim()) return [];
  try {
    const raw: unknown = JSON.parse(value);
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, DOCTOR_MAX).map((item) => {
      const o = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const str = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, SHORT_MAX) : "");
      // 경력만 여러 줄 — 줄바꿈을 살리고 길이 상한도 넉넉히
      const multi = (v: unknown) =>
        typeof v === "string"
          ? v
              .split("\n")
              .map((l) => l.trim())
              .join("\n")
              .trim()
              .slice(0, LONG_MAX)
          : "";
      return { name: str(o.name), title: str(o.title), license: str(o.license), career: multi(o.career) };
    });
  } catch {
    return [];
  }
}

/**
 * 목록 → 저장값. **한 칸이라도 적은 카드는 남긴다** (성함만 보고 버리면, 직함·경력을 먼저 적은 분의
 * 입력이 단계를 넘어갔다 오는 순간 사라진다). 아무것도 안 적은 카드만 버린다.
 */
export function stringifyDoctors(list: DoctorEntry[]): string {
  const kept = list.filter((d) => d.name.trim() || d.title.trim() || d.license.trim() || d.career.trim());
  return kept.length ? JSON.stringify(kept.slice(0, DOCTOR_MAX)) : "";
}

/** 관리자·확인 화면용 한 줄 — "홍길동 · 대표원장 · 면허 123456 · OO대 졸업" */
export function doctorLine(d: DoctorEntry): string {
  const career = d.career.split("\n").filter(Boolean).join(" · ");
  return [d.name, d.title, d.license && `면허 ${d.license}`, career].filter(Boolean).join(" · ");
}

// ── 진료시간 ────────────────────────────────────────────────

/** 06:00 ~ 23:30, 30분 단위 */
export const TIME_OPTIONS: string[] = Array.from({ length: (24 - 6) * 2 }, (_, i) => {
  const h = 6 + Math.floor(i / 2);
  return `${String(h).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`;
});

const RANGE_RE = /^([01]\d|2[0-3]):([0-5]\d)~([01]\d|2[0-3]):([0-5]\d)$/;

export interface Schedule {
  closed: boolean;
  start: string;
  end: string;
}

/** 저장값 → 화면 상태. 값이 없거나 형식이 깨졌으면 기본 시간대를 돌려준다 (closed 는 false). */
export function parseSchedule(def: GeoIntakeFieldDef, value: string | undefined): Schedule {
  const fallback = def.schedule?.defaultRange ?? "09:00~18:00";
  const [ds, de] = fallback.split("~");
  if (value && def.schedule && value === def.schedule.closedLabel) {
    return { closed: true, start: ds, end: de };
  }
  const m = value?.match(RANGE_RE);
  if (!m) return { closed: false, start: ds, end: de };
  const [start, end] = value!.split("~");
  return { closed: false, start, end };
}

/** 저장해도 되는 진료시간 값인지 — "휴진"/"없음" 이거나 HH:MM~HH:MM */
export function isValidSchedule(def: GeoIntakeFieldDef, value: string): boolean {
  if (def.schedule && value === def.schedule.closedLabel) return true;
  return RANGE_RE.test(value);
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
  if (def.format === "digits") return value.replace(/\D/g, "").slice(0, 10);
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
    const many = f.multiline || f.repeat;
    const max = many ? LONG_MAX : SHORT_MAX;
    const trimmed = many
      ? v.split("\n").map((l) => l.trim()).join("\n").trim()
      : v.trim();
    if (!trimmed) continue;
    if (f.choices && !f.choices.some((c) => c.value === trimmed)) continue;
    if (f.schedule && !isValidSchedule(f, trimmed)) continue;
    if (f.group) {
      const list = parseDoctors(trimmed);
      if (!list.length) continue;
      out[f.key] = stringifyDoctors(list);
      continue;
    }
    if (f.repeat) {
      // 칸 수보다 많이 보내온 값은 버린다
      out[f.key] = lineList(trimmed).slice(0, f.repeat.count).join("\n");
      continue;
    }
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

/** 보유 기기는 한의원에만, 병상 수는 한방병원에만 묻는다 */
export const isClinic = (a: GeoIntakeAnswers) => a.hospital_type === "clinic";
export const isKoreanHospital = (a: GeoIntakeAnswers) => a.hospital_type === "hospital";

/** 지금 답변 상태에서 이 문항을 보여줄지 */
export function isVisible(f: GeoIntakeFieldDef, a: GeoIntakeAnswers): boolean {
  if (f.key === "doctors") return a.doctors_source === "manual";
  if (f.key === "devices") return isClinic(a);
  if (f.key === "beds") return isKoreanHospital(a);
  // 점심시간은 그 날 진료할 때만 묻는다 (휴진이면 숨기고 저장도 안 한다)
  const dayKey = LUNCH_OF.get(f.key);
  if (dayKey) {
    const hours = a[dayKey];
    return !!hours && hours !== "휴진";
  }
  return true;
}

/** 지금 답변 상태에서 이 문항이 필수인지 */
export function isRequired(f: GeoIntakeFieldDef, a: GeoIntakeAnswers): boolean {
  if (f.key === "doctors") return a.doctors_source === "manual";
  // 숨어 있는 문항은 필수가 아니다 (한방병원이면 기기, 한의원이면 병상 수)
  if (f.key === "beds") return isKoreanHospital(a);
  if (f.key === "homepage_url") return doctorsFromHomepage(a);
  return f.required;
}

/** 요일 한 줄 요약 — "09:00~18:00 · 점심 13:00~14:00" / "휴진" / 아직 안 고름이면 "" */
export function dayLine(day: (typeof DAYS)[number], a: GeoIntakeAnswers): string {
  const hours = a[day.hours];
  if (!hours) return "";
  if (hours === "휴진") return "휴진";
  const lunch = a[day.lunch];
  return lunch && lunch !== "없음" ? `${hours} · 점심 ${lunch}` : hours;
}

/** 화면 표시용 값 — 버튼형 문항은 저장값 대신 라벨로 */
export function displayValue(f: GeoIntakeFieldDef, value: string | undefined): string {
  if (!value) return "";
  return f.choices?.find((c) => c.value === value)?.label ?? value;
}

function filled(f: GeoIntakeFieldDef, answers: GeoIntakeAnswers): boolean {
  const v = answers[f.key];
  // 의료진은 필수 칸(성함·직함·면허번호)이 다 찬 분이 한 명이라도 있어야 한다
  if (f.group) {
    const list = parseDoctors(v);
    return list.length > 0 && list.every((d) => d.name && d.title && d.license);
  }
  if (f.repeat) return lineList(v).length > 0;
  if (f.schedule) return !!v && isValidSchedule(f, v);
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
  if (missing?.schedule) return `'${missing.shortLabel ?? missing.label}' 진료시간을 골라 주세요.`;
  if (missing?.group) return "의료진의 성함·직함·의사면허번호를 모두 적어 주세요.";
  if (missing) return `'${missing.shortLabel ?? missing.label}'을(를) 입력해 주세요.`;
  if (!consent) return "개인정보 수집·이용에 동의해 주세요.";
  return null;
}
