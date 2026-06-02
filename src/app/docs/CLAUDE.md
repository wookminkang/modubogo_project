# docs 라우터 — 사용 가이드 화면

> 이 파일은 `src/app/docs/` 하위 작업 시 자동 로드됩니다.

## 목적

모두보고 서비스의 **웹 기반 인터랙티브 사용 가이드**. 마크다운 문서가 아니라 실제 화면 페이지로, 각 기능을 설명합니다. 좌측 사이드바(데스크탑) + 햄버거 드로어(모바일) 네비게이션을 가집니다.

## 페이지 구성 (순서 = 가이드 흐름)

| 경로 | 폴더 | 내용 |
|------|------|------|
| `/docs` | `page.tsx` | 서비스 소개 (진입점, `DocsBanner` 포함) |
| `/docs/background` | `background/` | 서비스 배경/문제의식 |
| `/docs/report-view` | `report-view/` | 클라이언트가 보는 보고서 화면 설명 |
| `/docs/report-manage` | `report-manage/` | 관리자 보고서 작성/수정/삭제 |
| `/docs/dashboard` | `dashboard/` | 관리자 대시보드 설명 |
| `/docs/alimtalk` | `alimtalk/` | 카카오 알림톡 발송 |
| `/docs/naver` | `naver/` | 네이버 광고 API 연동 |
| `/docs/colors` | `colors/` | 카테고리 색상 설정 |
| `/docs/security` | `security/` | 보안 및 접근 관리 (마지막 페이지) |

## 핵심 파일

- `nav.ts` — **네비게이션 배열(순서 정의)**. 모든 사이드바/모바일 메뉴가 이걸 참조.
- `layout.tsx` — 헤더(로고+관리자 로그인 링크) + 사이드바 + 푸터(회사 정보).
- `DocsSidebar.tsx` — `"use client"`, `usePathname()`으로 현재 페이지 강조.
- `DocsMobileMenu.tsx` — `"use client"`, 모바일 드로어.
- `DocsBanner.tsx` — `/docs` 인덱스 전용 상단 배너.

## 새 문서 페이지 추가 패턴 (중요)

1. `docs/{새-페이지}/page.tsx` 생성 (서버 컴포넌트).
2. **`nav.ts`에 `{ label, href }` 항목 추가** — 안 하면 사이드바에 안 뜸.
3. 페이지는 기존 구조를 따를 것:
   - `<header>` (라벨 `모두보고 Docs` + `<h1>` 제목 + 설명)
   - `<section>` 본문 (작은 회색 점 `w-1 h-1 rounded-full bg-gray-400` 불릿 리스트)
   - 하단 이전/다음 네비게이션 (`ArrowLeft`/`ArrowRight`)
4. **이전/다음 링크는 자동 갱신 안 됨.** 삽입 위치의 앞/뒤 페이지의 하단 링크도 수동으로 고쳐야 함.

## 스타일 토큰

- 브랜드 컬러 `#0e299c`, 배너 그라데이션 `from-[#0e299c] to-[#071660]`.
- `md`(768px) 기준으로 사이드바↔모바일 메뉴 전환.
- 모든 스타일은 인라인 Tailwind 클래스. 별도 CSS 없음.
