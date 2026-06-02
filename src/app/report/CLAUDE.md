# report 라우터 — 광고 운영 보고서 (메인 기능)

> 이 파일은 `src/app/report/` 하위 작업 시 자동 로드됩니다. 이 프로젝트의 **핵심 라우터**이며 가장 복잡합니다.

## 목적

병원/의료기관의 월별 광고비 집행·계약·심의 현황을 정리하는 보고서 시스템. 네이버 광고·데이블 실적 자동 연동, 알림톡 발송, 비밀번호 보호 공개 뷰를 포함합니다.

## 페이지 구성

| 경로 | 파일 | 역할 | 인증 |
|------|------|------|------|
| `/report` | `page.tsx` + `CompanyList.tsx` | 전체 회사 목록 (유형 탭 필터 + 검색 300ms 디바운스) | Admin, `force-dynamic` |
| `/report/new` | `new/page.tsx` + `NewReportForm.tsx` | 신규 보고서 작성 (status="작성중") | Admin |
| `/report/[company]` | `[company]/page.tsx` | 회사별 월별 보고서 목록 + 설정/알림톡/삭제 버튼 | Admin |
| `/report/[company]/[month]` | `[company]/[month]/page.tsx` | **보고서 상세 (공개 뷰)** — 차트·계약·심의 | 비밀번호 옵션 |
| `/report/[company]/[month]/edit` | `edit/EditForm.tsx` | 보고서 수정 (status="완료") + 삭제 | Admin |

- `[company]/layout.tsx`: `ReportHeader` + `ReportFooter` 래핑.
- `[company]/[month]/loading.tsx`: 로딩 스켈레톤.

## 폼 구조 (new / edit 공통)

`react-hook-form` + `useFieldArray`로 3개 동적 섹션:
1. **집행 항목** — 구분/채널/집행사/계약기간/금액/정렬순서 → `report_categories`
2. **광고 계약·리포트** — 계약명/키워드/링크/정렬 → `contract_items`
3. **광고 심의·운영** — 카테고리/주제/유효기간/정렬 → `validity_items`

- "이전 달 보고서 불러오기" → `loadLatestReportData()` (`@/lib/copy-actions`) → `reset(data)`.
- 저장: `upsertReport()` (`@/lib/db`)가 3개 자식 테이블을 함께 저장.

## 외부 API 연동 (주의 깊게)

| API | lib | 캐싱 | 비고 |
|-----|-----|------|------|
| 네이버 광고 | `@/lib/naverAd` `getNaverAdCosts`/`getBizmoney` | 없음 | HMAC-SHA256 서명. 파워링크/플레이스/파워컨텐츠 3종 병렬. 실패 시 `null` |
| 데이블 잔액 | `@/lib/dableAd` `getDableReport` | `revalidate:600` (10분) | rate limit 시 `{rateLimited:true}` → UI에 "10분 후 업데이트" |
| 데이블 소진 | `@/lib/dableAd` `getDableMonthlySpend` | `no-store` (매번 최신) | 월/오늘 소진. daily_report 통합 조회 |
| 알림톡 | `@/lib/bizgo` `sendAlimtalk` | - | BizGo, 발송 후 `logAlimtalk` 기록 |

- 상세 페이지는 비즈머니·네이버(현월+연도 전체 월)·데이블을 **모두 `Promise.all`로 병렬** 로드. 각각 `.catch(()=>null)`로 부분 실패 허용.
- 네이버 월 집계: 현월은 오늘까지, 과월은 말일까지.

## 작업 시 주의 (함정)

- **URL 인코딩 필수**: `company`/`month`는 동적 파라미터. 읽을 때 `decodeURIComponent`, 링크 만들 때 `encodeURIComponent`. 회사명에 특수문자(`/`, 지점명) 가능.
- **비밀번호 보호**: 쿠키 `report_auth_{reportId}`에 평문 저장. 불일치 시 `<PasswordGate>` 표시. 인증은 `@/lib/actions`.
- **정렬**: categories/contracts/validity 모두 `sort_order` 숫자 필드로 정렬. 저장 시 `Number(x.sort_order) || 0`.
- **카테고리 색상**: `{ ...DEFAULT_COLORS, ...dbColors }` 머지 (DB 우선). `@/lib/categoryColors`.
- **금액 합계**: `getTotalAmount()` (`@/lib/mockData`). 네이버 비용은 별도로 더함.
- 컴포넌트 폭: 상세 `max-w-[420px]`, 목록 `max-w-[600px]`.
- 차트/테이블 컴포넌트는 `@/components`에 있음 (`CategoryDonutChart`, `CategoryTable`, `ContractTable`, `ValidityTable`, `MonthCompareChart`, `MonthlyTrendChart`).
