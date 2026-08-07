# employee 라우터 — 직원 업무일지·휴가신청

> 이 파일은 `src/app/employee/` 하위 작업 시 자동 로드됩니다.

## 목적

직원이 스스로 회원가입하고, 관리자 승인 후 로그인해 **업무일지(캘린더)** 를 작성·조회하고 **휴가신청**을 넣는 영역. `admin_users`(super/staff) 체계와 **완전히 분리된** 별도 계정 시스템이다 — 직원 로그인이 보고서 수정 등 관리자 권한으로 이어지지 않도록 의도적으로 나눴다.

## 페이지 구성

| 경로 | 파일 | 역할 | 인증 |
|------|------|------|------|
| `/employee/signup` | `signup/page.tsx` | 회원가입 (이름/아이디/연락처/이메일/입사일/비밀번호) → status="pending"으로 저장 | 공개 |
| `/employee/login` | `login/page.tsx` | 로그인. pending/rejected 상태면 별도 에러 메시지 | 공개 |
| `/employee` | `page.tsx` + `WorkLogCalendar.tsx` | 업무일지 — **월 캘린더 그리드**, 날짜 클릭 시 옆 패널에서 자유 텍스트 작성·저장 | 직원, `force-dynamic` |
| `/employee/leave` | `leave/page.tsx` | 휴가신청 — 기간(시작일~종료일)+사유 신청 폼 + 내 신청 목록(대기중/승인됨/거절됨) | 직원, `force-dynamic` |

- `layout.tsx`: 관리자 `Header`를 쓰지 않는 독립 레이아웃. **로그인 상태면 좌측 사이드바**(`EmployeeSidebar.tsx`, 업무일지/휴가신청 2개 메뉴만) + **상단바**(`EmployeeTopBar.tsx`, 아바타+이름 프로필과 로그아웃 — 참고 디자인의 상단 우측 프로필 자리를 재현), 비로그인(로그인/가입 화면)은 단순 센터 레이아웃.
- 참고 디자인(사이드바+캘린더 대시보드)의 검색창/알림종/아바타는 실제 기능이 없어 **의도적으로 만들지 않았다** — 페이지 타이틀만 노출.
- 관리자 쪽 승인/조회 화면은 `/admin/employees`, `/admin/employees/worklogs`, `/admin/employees/leave` (해당 폴더는 `src/app/admin/CLAUDE.md` 참고).

## 인증 흐름 (admin.ts 미러링, 완전 별도 구현)

- `@/lib/employee.ts` — `getEmployeeUser()`(쿠키 `employee_session` → HMAC 검증 → `employees` 조회, `status !== "approved"`면 null), `requireEmployee()`(가드), `listEmployees()`(관리자 승인 화면용).
- `@/lib/employee-actions.ts`(`"use server"`) — `signupEmployee`/`loginEmployee`/`logoutEmployee`, 관리자 전용 `approveEmployeeAction`/`rejectEmployeeAction`.
- 암호화는 `@/lib/auth-crypto`를 admin과 **그대로 공유**(`hashPassword`/`verifyPassword`/`signSession`/`verifySession`는 범용 함수). `employees` 테이블은 `admin_users`와 동일하게 RLS on + 정책 없음 → `supabaseAdmin`(service-role)으로만 접근.
- `employees`에는 `phone`/`email`/`hire_date` 컬럼도 있다(`sql/employees_contact.sql`, `sql/employees_hire_date.sql` — 기존 `sql/employees.sql`을 이미 실행한 뒤 추가된 마이그레이션이라 **별도로 한 번 더 실행 필요**). `phone`/`email`/`hire_date`는 가입 폼 필수 입력이며 `listEmployees()`(관리자 목록)에는 포함, 세션 타입(`EmployeeUser`)에는 굳이 안 넣음(본인 화면에서 쓰는 곳 없음). `hire_date`는 현재 표시 용도로만 쓴다 — 입사일 비례 연차 계산 등은 아직 안 만듦(스코프 밖).
- 세션 쿠키명은 `employee_session`(admin은 `admin_session`)으로 완전히 분리되어 있어 서로 영향 없음.

## 업무일지 데이터

- 테이블: `work_logs` (`sql/work_logs.sql`). `(employee_id, log_date)` 유니크 — **직원당 하루 1건**. 비밀정보가 없어 `employees`와 달리 anon 클라이언트(`@/lib/db`)로 접근.
- 조회: `getWorkLogForDate`/`getWorkLogsForMonth(employeeId, month)`(`@/lib/db`) — 캘린더는 월 단위로만 불러온다(전체 이력 통째로 안 가져옴).
- 저장: `saveWorkLog(logDate, content)`(`@/lib/worklog-actions`) — **employeeId는 클라이언트 입력을 받지 않고 세션(`getEmployeeUser()`)에서만 가져온다.** 다른 직원 명의로 저장하는 것을 막기 위함이니 이 부분을 절대 인자로 바꾸지 말 것.
- `upsertWorkLog`는 `onConflict: "employee_id,log_date"`로 upsert — 같은 날짜 재저장 시 덮어쓴다.
- **캘린더 그리드 계산**은 `src/app/holiday/[company]/send/HolidayClient.tsx`와 동일한 방식(dayjs `daysInMonth`/`startWeekday` → 7칸 패딩)을 `WorkLogCalendar.tsx`에 그대로 가져다 썼다. 월 이동은 새로 안 만들고 기존 `@/components/MonthNav`(`?month=YYYY-MM`)를 재사용.
- **공휴일**은 새로 안 만들고 기존 `@/lib/publicHoliday`의 `getPublicHolidays(year, month)`(공공데이터포털, `DATA_GO_KR_SERVICE_KEY` 필요, 하루 캐시)를 그대로 재사용 — `page.tsx`에서 조회해 `WorkLogCalendar`에 `holidays` prop으로 넘기고, 날짜 숫자를 빨간색 + 이름 칩으로 표시한다.

## 휴가신청 데이터

- 테이블: `leave_requests` (`sql/leave_requests.sql`). `work_logs`와 동일 컨벤션(비밀정보 없음, RLS 없음, anon 클라이언트, 테이블 없으면 조회 폴백 `[]`).
- 조회: `getLeaveRequestsByEmployee`(본인)/`getAllLeaveRequestsForAdmin(filters?)`(관리자, `employeeId`/`status` 필터 지원, `@/lib/db`).
- 신청: `submitLeaveRequest(formData)`(`@/lib/leave-actions`) — 업무일지와 동일하게 **employeeId는 세션에서만** 가져온다. 시작일 > 종료일이면 거부. **대기중/승인된 기존 신청과 기간이 겹치면 거부**(`error=overlap`) — 중복 신청 방지.
- 취소: `cancelLeaveRequestAction(formData)` — 본인 소유 + `status='pending'`인 건만 삭제 가능(`deleteLeaveRequest`가 두 조건 다 필터에 걸어서, 승인/거절된 신청은 직원이 못 지운다).
- 승인/거절: `approveLeaveRequestAction`/`rejectLeaveRequestAction`(관리자 전용, `isAdmin()` 가드) — **승인된 휴가만** `/employee` 캘린더에 "휴가" 칩으로 표시된다(`status==='approved'`인 것만 필터해서 `WorkLogCalendar`에 `leaveRanges`로 넘김).
- 되돌리기: `revertLeaveRequestAction` — 관리자가 승인/거절을 잘못 눌렀을 때 `status`를 `pending`으로 되돌린다(`decided_at`도 null로 리셋).
- ⚠️ 관리자 화면(`/admin/employees/leave`)에서 직원 이름을 표시할 때 **`employees`를 anon 클라이언트로 join하면 안 된다** — `employees`는 RLS로 잠겨 있어 이름이 비게 된다(업무일지 관리자 화면에서 실제로 겪은 버그). 반드시 `listEmployees()`(service-role) 결과를 employee_id→name Map으로 만들어 매칭할 것.

## 연차(휴가 잔여일수) 관리

- `employees.annual_leave_days`(numeric, 기본 15) — 직원별 연간 부여일수. `sql/employees_leave_quota.sql`(이미 만든 `employees` 테이블에 추가된 마이그레이션, **별도 실행 필요**).
- 관리자가 `/admin/employees` "전체 직원" 목록에서 승인된 직원마다 인라인으로 수정(`updateLeaveQuotaAction`, `@/lib/employee-actions`).
- **사용일수 계산은 DB 컬럼이 아니라 매번 즉석 계산**이다 — 저장된 "사용 누계" 컬럼이 없고, `status='approved'`인 `leave_requests` 중 **시작일 기준 올해**인 것만 모아 `leaveAmount(r)`(`@/lib/utils` — 반차는 0.5, 종일은 `daysInclusive`)을 합산한다. 잔여 = 부여일수 − 합산(소수점 가능). 이 로직은 `employee/leave/page.tsx`(본인용)와 `admin/employees/page.tsx`(관리자용)에 각각 있다 — 계산 방식을 바꾸려면 두 군데 다 고칠 것.
- 연차 계산은 **달력일 기준**(주말/공휴일도 포함해서 셈)이다.
- **반차 지원**: `leave_requests.unit`(`'full' | 'half_am' | 'half_pm'`, `sql/leave_requests_unit.sql` — 별도 마이그레이션 필요)로 구분한다. 반차는 **항상 하루짜리**(`start_date === end_date`)이고 **0.5일 고정 차감** — `leaveAmount(request)`(`@/lib/utils`)가 `unit !== 'full'`이면 무조건 0.5, 아니면 `daysInclusive`를 반환한다. 연차 사용량 합산·목록 표시 전부 `daysInclusive` 대신 이 함수를 쓴다.
  - `submitLeaveRequest`는 **반차일 때 클라이언트가 보낸 종료일을 무시하고 서버에서 `endDate = startDate`로 강제**한다 — 클라이언트 조작으로 반차인데 여러 날짜 범위가 들어가는 것을 막기 위함.
  - 겹침(overlap) 검사는 `unit`과 무관하게 **날짜 범위만** 본다 — 즉 같은 날 오전반차+오후반차를 나눠 신청하는 것도 현재는 막힌다(하루를 두 번 신청하는 셈이라 겹침으로 처리). 필요해지면 이 부분만 별도로 풀어야 함.
- 잔여일수를 초과해 신청해도 **막지 않는다** — `LeaveRequestForm.tsx`에서 초과 시 빨간 경고 문구만 보여주고 제출은 허용(관리자가 승인 단계에서 최종 판단하는 구조).
- 카카오 알림톡 연동(신청/승인/거절 알림)과 "업무일지 미작성 직원 파악"은 **의도적으로 스코프 밖**(정책 확정 후 별도 작업).
- **연차 부여일수는 정적 값이 아니라 근속 기반으로 계산된다** — `computeEntitledLeaveDays(hireDate, annualLeaveDays, asOf)`(`@/lib/utils`, 근로기준법 60조 방식): 입사 1년 미만은 만근 개월당 1일(최대 11일), 1년 이상은 관리자가 설정한 `annual_leave_days`를 그대로 적용. `hire_date`가 없는 레거시 계정은 근속 계산이 불가능하니 바로 연간 한도를 준다. `monthsBetween(start, end)`도 같은 파일에 있다. 이 로직도 `employee/leave/page.tsx`와 `admin/employees/page.tsx` 두 군데서 각각 호출한다 — 계산식을 바꾸면 두 곳 다 고칠 것.
- 사용일수(`usedDays`)는 여전히 **달력연도** 기준 집계인데, 부여일수(`entitledDays`)는 **입사일 기준 근속**으로 계산되어 기준이 다르다 — 의도적 단순화다(근로기준법의 입사연도 기준 사이클까지 맞추려면 사용일수도 입사일 기준으로 바꿔야 하는데, 아직 안 했음).

## 작업 시 주의

- 날짜는 한국 기준(KST)으로 계산한다: `new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })` (geo-check의 `kstDate`/`todayKst`와 동일 패턴, 프로젝트 전역 공용 유틸은 없음 — 필요 시 각자 인라인).
- UI는 Seed Design이 아니라 Tailwind + 브랜드 hex(`#0e299c`)를 직접 사용한다 — `admin/login`, `super/*`와 톤을 맞춘 것으로 의도적 선택(design-system.md의 Seed 우선 규칙은 report/ledger 등 광고주 대면 화면 기준).
- 사이드바 레이아웃은 데스크톱 우선. 모바일 전용 햄버거 메뉴 등은 아직 없다(스코프 밖).
