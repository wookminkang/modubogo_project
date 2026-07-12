// 외주 디자이너 작업 요청서(브리프)의 필드 정의.
// 클라이언트(폼 렌더링)와 서버(저장·조회·뷰)에서 공유한다.
// "use server"/"server-only" 를 붙이지 않아 어디서든 import 가능한 순수 상수 모듈.

/** 브리프 값 타입 — 단일 입력은 string, 다중 선택(multi)은 string[] */
export type DesignContent = Record<string, string | string[]>;

export type DesignFieldType = "text" | "textarea" | "date" | "select" | "multi";

export interface DesignFieldDef {
  /** content jsonb 의 키 = 폼 input name */
  key: string;
  label: string;
  type: DesignFieldType;
  placeholder?: string;
  /** select / multi 의 선택지 */
  options?: string[];
  /** true 면 한 줄에 2개 배치(좁은 입력) */
  half?: boolean;
  /** textarea 높이(줄 수). 기본 3 */
  rows?: number;
  /** 안내 문구 */
  hint?: string;
}

export interface DesignSection {
  title: string;
  /** 섹션 부제(선택) */
  subtitle?: string;
  fields: DesignFieldDef[];
}

// ── 브리프 섹션·필드 (간소화 버전) ──────────────────────────────
export const DESIGN_SECTIONS: DesignSection[] = [
  {
    title: "작업 개요",
    fields: [
      { key: "task_name", label: "작업명", type: "text", placeholder: "예) 7월 건강검진 이벤트 메인 배너" },
      { key: "purpose", label: "작업 목적", type: "textarea", rows: 10, placeholder: "예) 메인 페이지에서 이벤트를 홍보하고 예약을 유도하기 위함" },
      { key: "etc", label: "기타 요청사항", type: "textarea", placeholder: "추가로 전달할 요청사항이 있으면 적어주세요." },
      { key: "content", label: "작업 내용", type: "textarea", rows: 10, placeholder: "예) PC 배너 1종, Mobile 배너 1종" },
      { key: "due_date", label: "마감일", type: "date" },
    ],
  },
  {
    title: "문구",
    subtitle: "배너에 들어갈 문구를 자유롭게 적어주세요.",
    fields: [
      {
        key: "copy",
        label: "문구",
        type: "textarea",
        rows: 10,
        placeholder: "예)\n메인: 건강검진 최대 30% 할인\n서브: 7월 한정 이벤트\n버튼: 예약하기",
      },
    ],
  },
  {
    title: "디자인 방향",
    fields: [
      { key: "direction", label: "디자인 방향", type: "textarea", placeholder: "예) 심플한 스타일, 신뢰감 있는 분위기" },
    ],
  },
];

/** 모든 필드를 평면으로 (key → def 조회용) */
export const DESIGN_FIELDS: DesignFieldDef[] = DESIGN_SECTIONS.flatMap((s) => s.fields);
export const DESIGN_FIELD_MAP = new Map(DESIGN_FIELDS.map((f) => [f.key, f]));

// ── 전달 자료(파일 첨부) ─────────────────────────────────────
/** 첨부 파일이 저장되는 Storage 버킷. 서버·클라이언트 공용(브라우저 직접 업로드에 필요). */
export const DESIGN_BUCKET = "design-files";

export interface DesignFileMeta {
  name: string;
  path: string;
  size: number;
}
/** files jsonb: 파일 필드 key → 메타 배열 */
export type DesignFiles = Record<string, DesignFileMeta[]>;

export interface DesignFileFieldDef {
  key: string;
  label: string;
  accept: string;
  hint?: string;
}

export const DESIGN_FILE_FIELDS: DesignFileFieldDef[] = [
  {
    key: "materials",
    label: "전달 자료",
    accept: "image/*,.pdf,.ai,.psd,.svg,.zip",
    hint: "로고 · 의료진 사진 · 참고 이미지 등",
  },
];

/** 목록/뷰에 보일 제목 계산: 작업명 > 기본값 */
export function designTitle(content: DesignContent, fallback = "제목 없는 요청서"): string {
  const task = typeof content.task_name === "string" ? content.task_name.trim() : "";
  return task || fallback;
}
