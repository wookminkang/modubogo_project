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
  providers/
    QueryProvider.tsx  # TanStack Query 클라이언트 설정 ("use client")
```

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
