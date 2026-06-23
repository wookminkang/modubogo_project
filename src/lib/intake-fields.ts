// 신규 광고주 준비자료 제출 폼의 필드 정의.
// 클라이언트(폼 렌더링)와 서버(검증·저장·조회) 양쪽에서 공유한다.
// "use server"/"server-only" 를 붙이지 않아 어디서든 import 가능한 순수 상수 모듈.

/** 텍스트(서술형) 항목 — intake_submissions 의 개별 컬럼에 매핑 */
export interface TextFieldDef {
  /** DB 컬럼명 = 폼 input name */
  key:
    | "billing_email"
    | "medical_staff"
    | "inpatient_rooms"
    | "equipment_list"
    | "strengths"
    | "required_text";
  /** 화면에 보여줄 번호 (준비자료 목록 순번) */
  no: number;
  label: string;
  placeholder: string;
  /** true 면 textarea(여러 줄), false 면 한 줄 input */
  multiline: boolean;
  /** input type (email 등). 기본 text */
  type?: "email" | "text";
}

/** 파일 업로드 항목 — Storage 에 저장, files JSONB 에 메타 기록 */
export interface FileFieldDef {
  /** files JSONB 의 키 = 폼 input name = Storage 경로 prefix */
  key:
    | "business_license"
    | "medical_open_cert"
    | "specialist_certs"
    | "staff_photos"
    | "hospital_photos"
    | "logo";
  no: number;
  label: string;
  /** 여러 파일 허용 여부 */
  multiple: boolean;
  /** input accept 속성 */
  accept: string;
  /** 안내 문구 */
  hint?: string;
}

export const TEXT_FIELDS: TextFieldDef[] = [
  {
    key: "billing_email",
    no: 1,
    label: "계산서 발급 이메일",
    placeholder: "세금계산서를 받으실 이메일 주소",
    multiline: false,
    type: "email",
  },
  {
    key: "medical_staff",
    no: 4,
    label: "내부 의료진 현황",
    placeholder: "원장/의료진 명단, 직책, 진료과목 등을 적어주세요.",
    multiline: true,
  },
  {
    key: "inpatient_rooms",
    no: 8,
    label: "입원실 구성",
    placeholder: "예) 1인실 2개, 2인실 3개, 다인실 1개 등",
    multiline: true,
  },
  {
    key: "equipment_list",
    no: 9,
    label: "병원 내부 기기 목록 (모델명)",
    placeholder: "보유 장비명과 모델명을 한 줄에 하나씩 적어주세요.",
    multiline: true,
  },
  {
    key: "strengths",
    no: 10,
    label: "병원 강점",
    placeholder: "다른 병원과 차별화되는 강점, 자랑하고 싶은 점을 적어주세요.",
    multiline: true,
  },
  {
    key: "required_text",
    no: 11,
    label: "필수 문구",
    placeholder: "광고에 반드시 포함되어야 하는 문구가 있다면 적어주세요.",
    multiline: true,
  },
];

export const FILE_FIELDS: FileFieldDef[] = [
  {
    key: "business_license",
    no: 2,
    label: "사업자등록증",
    multiple: false,
    accept: "image/*,application/pdf",
    hint: "이미지 또는 PDF",
  },
  {
    key: "medical_open_cert",
    no: 3,
    label: "의료기관 개설신고증명서",
    multiple: false,
    accept: "image/*,application/pdf",
    hint: "이미지 또는 PDF",
  },
  {
    key: "specialist_certs",
    no: 5,
    label: "내부 의료진 전문의 자격증",
    multiple: true,
    accept: "image/*,application/pdf",
    hint: "여러 장 업로드 가능",
  },
  {
    key: "staff_photos",
    no: 6,
    label: "내부 의료진 사진",
    multiple: true,
    accept: "image/*",
    hint: "여러 장 업로드 가능",
  },
  {
    key: "hospital_photos",
    no: 7,
    label: "병원 사진",
    multiple: true,
    accept: "image/*",
    hint: "여러 장 업로드 가능",
  },
  {
    key: "logo",
    no: 12,
    label: "로고 (AI 또는 이미지 파일)",
    multiple: true,
    accept: "image/*,.ai,.eps,.pdf,.svg",
    hint: "AI·EPS·이미지 등",
  },
];

/** 화면 순서대로 합친 전체 항목 (번호순) */
export const ALL_FIELDS_ORDERED = [
  ...TEXT_FIELDS.map((f) => ({ kind: "text" as const, ...f })),
  ...FILE_FIELDS.map((f) => ({ kind: "file" as const, ...f })),
].sort((a, b) => a.no - b.no);

/** files JSONB 에 저장되는 개별 파일 메타 */
export interface IntakeFileMeta {
  /** 원본 파일명 */
  name: string;
  /** Storage 내부 경로 (signed URL 생성에 사용) */
  path: string;
  /** 바이트 크기 */
  size: number;
}

/** files JSONB 전체 형태: { [FileFieldDef.key]: IntakeFileMeta[] } */
export type IntakeFiles = Partial<Record<FileFieldDef["key"], IntakeFileMeta[]>>;
