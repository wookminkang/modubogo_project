# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # 개발 서버 실행 (http://localhost:3000)
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버 실행
npm run lint     # ESLint 검사
```

## 기술 스택

| 기술 | 버전 | 비고 |
|------|------|------|
| Next.js | 16 | App Router |
| React | 19 | |
| TypeScript | 5 | strict 모드 |
| Tailwind CSS | 4 | `@import "tailwindcss"` 방식 |
| TanStack Query | 5 | 서버 상태 관리 |
| React Hook Form | 7 | 폼 상태 관리 |
| lucide-react | latest | 아이콘 |

## 프로젝트 구조

```
src/
  app/              # Next.js App Router 페이지 및 레이아웃
    layout.tsx      # 루트 레이아웃 (QueryProvider 포함)
    globals.css     # 전역 스타일 (Tailwind v4 설정)
    admin/          # 관리자 영역 (보호)        → admin/CLAUDE.md
    docs/           # 사용 가이드 화면          → docs/CLAUDE.md
    hospital/       # 병원 목록 (작업 중)        → hospital/CLAUDE.md
    report/         # 광고 운영 보고서 (메인)    → report/CLAUDE.md
  components/       # 공통 컴포넌트 (차트/테이블/Toast/설정 버튼 등)
    ui/             # shadcn/ui 기반 헤드리스 컴포넌트
  hooks/            # get-query-client.ts (React Query)
  lib/              # DB·외부 API·서버 액션 (아래 "공통 모듈" 참고)
  providers/
    QueryProvider.tsx  # TanStack Query 클라이언트 설정 ("use client")
```

## 라우터별 가이드 (작업 전 필독)

각 라우터 폴더에는 **그 영역의 설명서인 `CLAUDE.md`가 있고, 해당 폴더 파일을 작업할 때 자동 로드됩니다.** 작업 시작 전 해당 문서를 먼저 확인하세요.

| 라우터 | 설명서 | 한 줄 요약 |
|--------|--------|-----------|
| `admin` | `src/app/admin/CLAUDE.md` | 비밀번호로 보호되는 관리자 대시보드·알림톡 로그·색상 설정 |
| `docs` | `src/app/docs/CLAUDE.md` | 웹 기반 사용 가이드 화면 (`nav.ts`로 페이지 등록) |
| `hospital` | `src/app/hospital/CLAUDE.md` | 병원 목록 (TanStack Query SSR 패턴, `[slug]` 미완성) |
| `report` | `src/app/report/CLAUDE.md` | **메인.** 보고서 작성/조회, 네이버·데이블 연동, 알림톡 |

> UI 규칙(토스트/확인창 패턴, 디자인 토큰)은 루트의 `UI_PATTERNS.md`를 따른다.

## 공통 모듈 (`src/lib`)

- DB: `db.ts` (Supabase reports/categories/validity/contracts/company_settings/alimtalk_logs/category_colors)
- 외부 API: `naverAd.ts`(네이버 광고·비즈머니), `dableAd.ts`(데이블), `bizgo.ts`(카카오 알림톡)
- 인증: `admin.ts`/`admin-actions.ts`(관리자), `actions.ts`(보고서 비밀번호 게이트)
- 서버 액션: `company-actions.ts`(회사 설정 저장), `copy-actions.ts`(이전 보고서 복사)
- 기타: `categoryColors.ts`, `dayjs.ts`, `utils.ts`(cn), `mockData.ts`(타입·`getTotalAmount`)
- `src/app/api` 라우트는 없음 — 서버 통신은 모두 **서버 액션**(`"use server"`)으로 처리.

## 아키텍처 핵심 사항

### Tailwind CSS v4
`tailwind.config.js` 없이 `globals.css`에서 `@import "tailwindcss"`로 임포트한다. 커스텀 테마는 `@theme inline { ... }` 블록 안에 정의한다. CSS 변수(`--color-*`, `--font-*`)로 토큰을 선언하면 Tailwind 유틸리티 클래스로 자동 노출된다.

### TanStack Query
`src/providers/QueryProvider.tsx`가 `QueryClient`를 보유하며 `ReactQueryDevtools`를 포함한다. 기본 `staleTime`은 60초. 이 Provider는 서버 컴포넌트인 `layout.tsx`에서 `children`을 감싸는 방식으로 마운트된다.

### Server / Client 컴포넌트 경계
- `app/` 하위 파일은 기본적으로 서버 컴포넌트다.
- `useState`, `useEffect`, TanStack Query 훅, React Hook Form 등 클라이언트 API를 사용하는 파일 상단에 반드시 `"use client"`를 선언한다.
- 상태를 실제로 사용하는 가장 낮은 컴포넌트로 `"use client"` 경계를 밀어내 서버 컴포넌트 범위를 최대화한다.

### 경로 별칭
`@/*` → `src/*` (tsconfig `paths` 설정). 상대 경로 대신 항상 `@/` 별칭을 사용한다.

## 디자인 시스템

| 항목 | 값 |
|------|-----|
| 포인트 컬러 | `#0e299c` |
| 기본 텍스트 | `#333333` (살짝 그레이) |
| 배경 컬러 | `#F0F4FA` |
