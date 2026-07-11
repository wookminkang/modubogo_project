# admin 라우터 — 관리자 영역

> 이 파일은 `src/app/admin/` 하위 작업 시 자동 로드됩니다. admin 작업을 시작하면 이 문서를 먼저 참고하세요.

## 목적

광고비 보고서 시스템의 **관리자 전용 영역**. 비밀번호로 보호되며, KPI 모니터링·알림톡 로그·카테고리 색상 설정을 담당합니다. 일반 사용자용 `/report`와 분리된 보호 구역입니다.

## 페이지 구성

| 경로 | 파일 | 역할 | 인증 |
|------|------|------|------|
| `/admin/login` | `login/page.tsx` | 비밀번호 로그인 폼 → 성공 시 `/hospital`로 이동 | 공개 |
| `/admin/dashboard` | `dashboard/page.tsx` | KPI 카드, 월별 광고비 트렌드(바차트), 만료 임박 계약(D-day) | 필수 |
| `/admin/alimtalk-logs` | `alimtalk-logs/page.tsx` | 알림톡 발송 이력 (성공/실패 탭, `?status=`) | 필수 |
| `/admin/category-colors` | `category-colors/page.tsx` | 카테고리 배경/텍스트 색상 CRUD | 필수 |

- `dashboard`, `alimtalk-logs`는 `export const dynamic = "force-dynamic"` (항상 최신 데이터).
- `layout.tsx`: 최대 너비 600px, 모바일 우선 레이아웃.

## 핵심 컴포넌트

- `dashboard/DashboardCharts.tsx` — Recharts `MonthlyBarChart`. 금액은 `fmt()`로 "억/천만/백만/만" 한글화.
- `dashboard/MonthSelector.tsx` — `"use client"`, 월 선택 시 `?month=YYYY-MM` 변경.
- `category-colors/CategoryColorEditor.tsx` — `"use client"`, 색상 CRUD. 저장/삭제 시 `ConfirmToast` → `Toast` 패턴 (UI_PATTERNS.md 참고).
- `category-colors/actions.ts` — 서버 액션, `revalidatePath`로 재생성.

## 인증 방식

- `@/lib/admin`의 `isAdmin()`로 검증. 미인증 시 `/admin/login`으로 리다이렉트.
- `@/lib/admin-actions`의 `loginAdmin()`/`logoutAdmin()` 서버 액션.
- 쿠키 `admin_session`(httpOnly, 7일)에 비밀번호를 담아 `ADMIN_PASSWORD` 환경변수와 **평문 비교**.
- ⚠️ 현재 비밀번호가 평문으로 쿠키/환경변수에 저장됨. 보안 강화 작업 시 이 점을 고려.

## 데이터 소스 (`@/lib/db`)

- `getDashboardRawDataFromDB()` — 대시보드 KPI (reports + categories + validity)
- `getAlimtalkLogs()` — 알림톡 로그 전체 (최신순)
- `getCategoryColorsFromDB()` / `upsertCategoryColor()` — 카테고리 색상

## 작업 시 주의

- 새 보호 페이지를 추가하면 페이지 상단에서 `isAdmin()` 체크 + 리다이렉트를 반드시 넣을 것.
- 알림톡 로그의 `recipients`는 문자열 배열(JSON).
- 금액 포맷은 dashboard의 `fmt()` 규칙을 따를 것.
