# CLAUDE.md

Claude Code가 이 저장소에서 작업할 때 따르는 지침. **작업 시작 전 관련 참조 문서를 먼저 읽는다.**

## 작업 규칙 (먼저 읽기)

1. **라우터를 건드리기 전, 해당 폴더의 `CLAUDE.md`를 먼저 읽는다.** 각 라우터에 그 영역 설명서가 있고, 그 폴더 파일을 열면 자동 로드된다.
2. **UI를 만들 땐 디자인 시스템 규칙을 따른다** → `context/design-system.md` (Seed 컴포넌트 우선, Tailwind는 최후 수단)
3. **서버 통신은 항상 서버 액션(`"use server"`)으로 한다.** `src/app/api` 라우트는 쓰지 않는다.
4. **`"use client"`는 클라이언트 API를 실제로 쓰는 가장 낮은 컴포넌트에만** 선언해 서버 컴포넌트 범위를 최대화한다.
5. **import는 항상 별칭 사용**: `@/*` → `src/*`, `seed-design/*` → `src/seed-design/*`. 상대 경로 금지.
6. **커밋·푸시는 사용자가 명시적으로 요청할 때만** 한다.

## 참조 문서 맵

| 무엇을 작업하나                        | 읽을 문서                    |
| -------------------------------------- | ---------------------------- |
| 관리자 영역(대시보드·알림톡 로그·색상) | `src/app/admin/CLAUDE.md`    |
| 사용 가이드 화면                       | `src/app/docs/CLAUDE.md`     |
| 병원 목록 (작업 중)                    | `src/app/hospital/CLAUDE.md` |
| **보고서 (메인 기능)**                 | `src/app/report/CLAUDE.md`   |
| UI·디자인 시스템                       | `context/design-system.md`   |

## 기술 스택

Next.js 16 (App Router) · React 19 · TypeScript 5 (strict) · Tailwind CSS 4 · TanStack Query 5 · React Hook Form 7 · Seed Design(`@seed-design/*`) · 아이콘 `lucide-react`

```bash
npm run dev      # 개발 서버 (localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
```

## 디렉터리 지도

```
src/
  app/          # App Router. 라우터별 CLAUDE.md 존재 (admin/docs/hospital/report)
    layout.tsx  # 루트 레이아웃 (QueryProvider 마운트)
    globals.css # Tailwind v4 + Seed 테마 진입점
  components/   # 공통 컴포넌트 (차트/테이블/Toast/설정 버튼). ui/ = shadcn 헤드리스
  seed-design/  # Seed 로컬 래퍼 컴포넌트 (seed-design/ui/*)
  lib/          # DB·외부 API·서버 액션 (아래 참고)
  hooks/        # get-query-client.ts
  providers/    # QueryProvider.tsx ("use client")
```

## 공통 모듈 (`src/lib`)

- **DB**: `db.ts` — Supabase (reports/categories/validity/contracts/company_settings/alimtalk_logs/category_colors)
- **외부 API**: `naverAd.ts`(네이버 광고·비즈머니), `dableAd.ts`(데이블), `bizgo.ts`(카카오 알림톡)
- **인증**: `admin.ts`/`admin-actions.ts`(관리자), `actions.ts`(보고서 비밀번호 게이트)
- **서버 액션**: `company-actions.ts`(회사 설정), `copy-actions.ts`(보고서 복사)
- **기타**: `categoryColors.ts`, `dayjs.ts`, `utils.ts`(cn), `mockData.ts`(타입·`getTotalAmount`)

## 아키텍처 메모

- **Tailwind v4**: `tailwind.config.js` 없음. `globals.css`에서 `@import "tailwindcss"` + Seed 테마. 토큰은 `@theme inline { ... }`의 CSS 변수로 선언하면 유틸리티로 노출.
- **TanStack Query**: `QueryProvider.tsx`가 `QueryClient` 보유, 기본 `staleTime` 60초. 서버 컴포넌트 `layout.tsx`에서 마운트.
