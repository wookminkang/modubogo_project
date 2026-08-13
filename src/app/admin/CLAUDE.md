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
| `/admin/accounts` | `accounts/page.tsx` | 관리자 계정별 메뉴 권한 토글 (현재: 진료일정) | 슈퍼 전용 |
| `/admin/employees` | `employees/page.tsx` | 직원 가입 승인/거절, 전체 직원 목록 | 필수 |
| `/admin/employees/worklogs` | `employees/worklogs/page.tsx` | 전체 직원 업무일지 모아보기(직원/월 필터) | 필수 |
| `/admin/employees/leave` | `employees/leave/page.tsx` | 휴가신청 승인/거절 — 승인 시 직원 캘린더에 반영 | 필수 |
| `/admin/employees/tasks` | `employees/tasks/page.tsx` | 직원 업무 배정 — 등록 폼 중심 + 배정한 업무 수정/삭제(`AssignedTaskList.tsx`: 제목·내용·담당자 즉시 검색, 직원 필터, 완료 건 접힘). 상태 카운트·상태별 조회는 진행 현황이 담당. 진행 현황 각 행의 "수정"이 `?edit=&#task-` 딥링크로 들어온다 | 필수 |
| `/admin/employees/progress` | `employees/progress/page.tsx` | 진행 현황 — 지라 스타일 칸반 보드(`AdminTaskBoard.tsx`, 보기 전용·드래그 없음). 직원 필터 칩 즉시 반영, 카드 "수정"은 할당 페이지 딥링크 | 필수 |

- `dashboard`, `alimtalk-logs`는 `export const dynamic = "force-dynamic"` (항상 최신 데이터).
- `layout.tsx`: 최대 너비 600px, 모바일 우선 레이아웃. **단, `employees/layout.tsx`는 예외** — 아래 참고.

## `/admin/employees/*` 만 사이드바 레이아웃 (예외)

직원 승인·업무일지·휴가 승인 3개 페이지는 `employee/layout.tsx`(직원 쪽)와 톤을 맞춘
**좌측 사이드바 + 상단바** 레이아웃을 쓴다(`employees/layout.tsx`, `AdminEmployeesSidebar.tsx`,
`AdminEmployeesTopBar.tsx`). 다른 admin 페이지(dashboard/alimtalk-logs/category-colors)와
report/ledger 등은 건드리지 않음 — **직원 관련 화면만** 요청받아 범위를 좁혔다.

- 상위 `admin/layout.tsx`가 전체를 `max-w-[600px] mx-auto shadow-xl`로 감싸서, 그 안에서는
  넓은 사이드바가 나올 수 없다. `employees/layout.tsx`는 `fixed inset-0`로 뷰포트 전체를 덮어
  부모의 폭 제약을 벗어난다 — 이 트릭을 깨는 수정(예: fixed 제거)은 레이아웃이 600px로 눌리니 주의.
- 각 페이지(`page.tsx`/`worklogs/page.tsx`/`leave/page.tsx`)는 더 이상 자체 뒤로가기 링크나
  `px-4 py-6` 같은 패딩을 갖지 않는다 — 네비게이션은 사이드바가, 패딩은 레이아웃의 `<main>`이
  담당(`max-w-5xl mx-auto px-6 py-8`). 새 페이지를 이 아래 추가하면 이 컨벤션을 따를 것.
- "관리자 홈" 버튼은 상단바 좌측에 있다(`AdminEmployeesTopBar.tsx`) — 사이드바 하단에 있던 걸
  옮긴 것. 채팅 위젯 아이콘에 가려 잘 안 보였던 문제라 상단바가 더 안전한 위치.

## 핵심 컴포넌트

- `dashboard/DashboardCharts.tsx` — Recharts `MonthlyBarChart`. 금액은 `fmt()`로 "억/천만/백만/만" 한글화.
- `dashboard/MonthSelector.tsx` — `"use client"`, 월 선택 시 `?month=YYYY-MM` 변경.
- `category-colors/CategoryColorEditor.tsx` — `"use client"`, 색상 CRUD. 저장/삭제 시 `ConfirmToast` → `Toast` 패턴 (UI_PATTERNS.md 참고).
- `category-colors/actions.ts` — 서버 액션, `revalidatePath`로 재생성.

## 인증 방식

- `@/lib/admin`의 `isAdmin()`로 검증. 미인증 시 `/admin/login`으로 리다이렉트.
- `@/lib/admin-actions`의 `loginAdmin()`/`logoutAdmin()` 서버 액션.
- 쿠키 `admin_session`(httpOnly)에 `admin_users.id`를 서명해 저장. 로그인 폼의 "로그인 상태 유지" 체크 시 5일 유지, 미체크 시 세션 쿠키(브라우저 종료 시 만료). 비밀번호는 `@/lib/auth-crypto`의
  scrypt 해시(`hashPassword`/`verifyPassword`)로 검증 — 평문 비교 아님.
- `employees`(직원 업무일지)는 **완전히 별도 계정 체계**(`admin_users`와 무관). 인증은
  `@/lib/employee`·`employee-actions.ts`, 쿠키는 `employee_session`으로 분리되어 있다.
  자세한 내용은 `src/app/employee/CLAUDE.md` 참고.

## 데이터 소스 (`@/lib/db`)

- `getDashboardRawDataFromDB()` — 대시보드 KPI (reports + categories + validity)
- `getAlimtalkLogs()` — 알림톡 로그 전체 (최신순)
- `getCategoryColorsFromDB()` / `upsertCategoryColor()` — 카테고리 색상
- `getAllWorkLogsForAdmin()` — 전체 직원 업무일지(직원/월 필터), `employees/worklogs`에서 사용

## 메뉴별 권한 (두 계정 체계)

- **관리자**(`admin_users.allowed_menus`): 헤더 탭 8개 전부 권한 대상. super는 항상 전부, staff는 부여받은 키만 노출·접근. 판정은 `@/lib/admin`의 `canAccessMenu(user, menu)` 하나로 통일 — 각 메뉴 페이지 가드와 헤더 탭 필터가 모두 이 함수를 쓴다. 권한 없으면 `/admin/dashboard`로 리다이렉트. `/hospital`은 비로그인 공개 접근은 기존대로 두고 로그인한 staff만 검사.
- **직원**(`employees.allowed_menus`): 직원 사이드바 확장 메뉴(현재 `holiday`). 권한 있으면 `EmployeeSidebar`에 진료일정이 추가되고 `/holiday` 접근 허용.
- `/holiday` 가드는 두 체계를 모두 받는 `@/lib/menu-access`의 `getHolidayAccess()`/`hasHolidayAccess()`를 쓴다 (관리자 or 권한 있는 직원).
- 토글 UI: `/admin/accounts` (super 전용) — 관리자 섹션(8개 메뉴) + 직원 섹션(진료일정).
- SQL: `sql/admin_users_allowed_menus.sql`, `sql/employees_allowed_menus.sql`

## 작업 시 주의

- 새 보호 페이지를 추가하면 페이지 상단에서 `isAdmin()` 체크 + 리다이렉트를 반드시 넣을 것.
- 알림톡 로그의 `recipients`는 문자열 배열(JSON).
- 금액 포맷은 dashboard의 `fmt()` 규칙을 따를 것.
- `employees/page.tsx`의 승인/거절은 `isAdmin()`(super/staff 모두)이면 가능 — super 전용으로
  제한하려면 `approveEmployeeAction`/`rejectEmployeeAction`(`@/lib/employee-actions`)의 체크를
  `requireSuperAdmin()`으로 바꿀 것.
