# 모두보고(modu_bogo) 단계별 최적화 로드맵

## Context

모두보고는 Next.js 16(App Router) + React 19 광고 운영 보고서 앱이다. 현재 코드베이스는 기능적으로 동작하지만 다음과 같은 구조적 약점이 있다:

- **데이터 패칭**: 대부분 서버 컴포넌트에서 `await` 직접 호출 후 props로 내려주는 방식. TanStack Query는 `/hospital` 한 곳에서만 모범 패턴(prefetch + HydrationBoundary + useSuspenseQuery)으로 쓰이고, 쿼리키/옵션 팩토리가 없어 재사용·캐시 일관성이 없다.
- **로딩/에러 처리**: `error.tsx` 전무, `loading.tsx` 1개, `not-found.tsx` 루트 1개, Suspense 1곳뿐. `global-error.tsx`·`middleware.ts` 없음.
- **보안(심각)**: 보고서 비밀번호 평문 저장·비교·쿠키, `upsertReport`/`deleteReport`/회사설정/카테고리색상 서버액션에 권한 체크 없음, **Supabase RLS 미설정** → anon key로 전체 데이터 조회 가능.
- **폴더 구조**: 백업/구버전 중복 파일 4개, `/hospital/[slug]` 미완성 플레이스홀더.

목표는 이를 단계별로(하나씩) 개선하는 것이다. 사용자 결정에 따라 **TanStack Query 데이터 레이어 전환을 1순위**로 진행하되, SSR 이점(서버 prefetch + 하이드레이션)을 유지한다. 전체 로드맵을 먼저 세우고, 이번 실행 범위는 **Phase 0 + Phase 1**까지로 한다. 이후 단계는 각각 완료 후 다시 승인받아 진행한다.

---

## 전체 로드맵 (개요)

| Phase | 주제 | 이번 실행 |
|-------|------|:---:|
| 0 | 빠른 정리 — 중복 파일 삭제 | ✅ |
| 1 | TanStack Query 데이터 레이어 구축 + 핵심 조회 페이지 마이그레이션 (SSR 유지) | ✅ |
| 2 | 복잡 페이지 마이그레이션 (`/report/[company]/[month]` 외부 API) + Suspense 스트리밍 정교화 | 다음 |
| 3 | 에러 처리 — 세그먼트별 `error.tsx`, `global-error.tsx`, `not-found.tsx`, QueryErrorResetBoundary | 다음 |
| 4 | 폴더 구조 정리 — 컴포넌트/쿼리 재배치, `/hospital/[slug]` 정리 | 다음 |
| 5 | 보안 — **RLS 설정(최우선)**, 서버액션 권한 가드, 비밀번호 해싱, rate limiting, middleware | 다음 |

> ⚠️ **보안 주의**: RLS가 미설정이라 anon key로 모든 회사 데이터가 노출될 수 있다. TanStack 전환이 이 위험을 키우지는 않지만(서버액션 경유 유지), Phase 5에서 RLS를 최우선으로 다룬다. 그 전까지 anon key로 직접 조회하는 신규 클라이언트 패칭은 도입하지 않는다.

---

## Phase 0 — 빠른 정리 (중복 파일 삭제)

구버전/백업 파일 4개 제거. 삭제 전 각 파일이 어디서도 import되지 않는지 grep으로 재확인 후 삭제.

- `src/app/report/CompanyList 2.tsx`
- `src/app/report/[company]/page 2.tsx`
- `src/components/AlimtalkSettingsButton 2.tsx`
- `src/lib/db 2.ts`
- (추가로 확인) `src/lib/copy-actions.ts`가 빈 파일이면 사용처 확인 후 제거 검토

**검증**: `npm run lint` + `npm run build` 통과(미참조 확인).

---

## Phase 1 — TanStack Query 데이터 레이어 (SSR 유지)

### 1a. 쿼리 레이어 기반 구축

기존 `src/hooks/get-query-client.ts`(이미 `getQueryClient`, staleTime 60s, gcTime 24h 보유)를 그대로 활용한다. 새로 추가:

**`src/lib/queryKeys.ts`** — 중앙 쿼리키 팩토리:
```ts
export const queryKeys = {
  hospitals: () => ["hospitals"] as const,
  companiesSummary: () => ["companies", "summary"] as const,
  companyReports: (company: string) => ["companies", company, "reports"] as const,
  report: (company: string, month: string) => ["report", company, month] as const,
  alimtalkLogs: () => ["alimtalk", "logs"] as const,
  dashboard: (month?: string) => ["dashboard", month ?? "all"] as const,
  categoryColors: () => ["category-colors"] as const,
};
```

**`src/lib/queries.ts`** — 쿼리 옵션 팩토리 (서버 prefetch와 클라이언트 useSuspenseQuery가 **동일 객체** 공유 → 키/패칭 함수 drift 방지). 각 함수는 기존 `src/lib/db.ts`의 서버액션을 그대로 `queryFn`으로 사용:
```ts
import { getCompaniesSummaryFromDB, getAlimtalkLogs, ... } from "@/lib/db";
import { queryKeys } from "@/lib/queryKeys";

export const companiesSummaryQuery = () => ({
  queryKey: queryKeys.companiesSummary(),
  queryFn: getCompaniesSummaryFromDB,
});
export const companyReportsQuery = (company: string) => ({
  queryKey: queryKeys.companyReports(company),
  queryFn: () => getReportsByCompanyFromDB(company),
});
// alimtalkLogs, dashboard, categoryColors 동일 패턴
```
> force-dynamic였던 admin 페이지는 옵션에 `staleTime: 0`을 주어 항상 신선하게 유지.

기존 `/hospital`의 인라인 `["hospitalList"]` 키도 이 팩토리(`hospitals()`)로 통일.

### 1b. 핵심 조회 페이지 마이그레이션 (SSR 패턴)

`/hospital`과 동일한 3단 패턴으로 전환. **페이지 상단의 `isAdmin()`/`redirect()` 인증 가드는 서버에서 그대로 유지**하고, 데이터 흐름만 바꾼다.

서버 `page.tsx`:
```tsx
const qc = getQueryClient();
void qc.prefetchQuery(companiesSummaryQuery());
return (
  <HydrationBoundary state={dehydrate(qc)}>
    <Suspense fallback={<CompanyListSkeleton />}>
      <CompanyListClient />
    </Suspense>
  </HydrationBoundary>
);
```
클라이언트 컴포넌트:
```tsx
"use client";
const { data } = useSuspenseQuery(companiesSummaryQuery());
```

**대상 페이지 (단순·저위험 조회부터):**
1. `src/app/report/page.tsx` + `src/app/report/CompanyList.tsx` → `companiesSummaryQuery`
2. `src/app/report/[company]/page.tsx` + `CompanyReports.tsx` → `companyReportsQuery(company)` (단, 내부 Naver `unstable_cache` 호출부는 이번 단계에서 건드리지 않고 유지 — 외부 API는 Phase 2)
3. `src/app/admin/dashboard/page.tsx` → `dashboard` 쿼리 (`staleTime: 0`)
4. `src/app/admin/alimtalk-logs/page.tsx` → `alimtalkLogs` 쿼리 (`staleTime: 0`)

> `/report/[company]/[month]` 상세(외부 API 6~8개 병렬)는 복잡도가 높아 **Phase 2**로 분리한다.

### 1c. 공용 Suspense 폴백

`/hospital`의 임시 문구("주방에서 요리를…") 대신, 페이지 성격에 맞는 스켈레톤을 `src/components`에 추가하거나 기존 `report/[company]/[month]/loading.tsx` 스타일을 재사용. 최소한 리스트/카드용 스켈레톤 1~2개.

---

## 마이그레이션 시 주의사항

- 서버액션(`"use server"`)을 `queryFn`으로 호출하는 것은 클라이언트에서 정상 동작(`/hospital`에서 검증됨). RLS 미설정 상태에서도 서버액션 경유이므로 노출면이 늘지 않는다.
- 인증 가드(`isAdmin`)는 **반드시 서버 page.tsx에서 prefetch 이전에** 수행하고 미인증 시 redirect.
- 회사명 URL 파라미터는 기존대로 `decodeURIComponent`/`encodeURIComponent` 유지. 쿼리키에는 디코딩된 회사명 사용.
- props로 데이터를 받던 클라이언트 컴포넌트는 useSuspenseQuery로 직접 조회하도록 시그니처 변경 — 호출부(부모) 정리 필요.

---

## 핵심 파일

- 신규: `src/lib/queryKeys.ts`, `src/lib/queries.ts`
- 기존 활용: `src/hooks/get-query-client.ts`, `src/providers/QueryProvider.tsx`
- 참조 패턴: `src/app/hospital/page.tsx`, `src/app/hospital/_components/HospitalList.tsx`
- 수정: `src/app/report/page.tsx`, `src/app/report/CompanyList.tsx`, `src/app/report/[company]/page.tsx`, `src/app/report/[company]/CompanyReports.tsx`, `src/app/admin/dashboard/page.tsx`, `src/app/admin/alimtalk-logs/page.tsx`
- 데이터 소스(변경 없음, queryFn로 재사용): `src/lib/db.ts`

---

## 검증

1. `npm run dev` 후 각 마이그레이션 페이지(`/report`, `/report/[회사]`, `/admin/dashboard`, `/admin/alimtalk-logs`) 접속 → 데이터 정상 렌더 확인.
2. React Query Devtools에서 해당 쿼리가 서버 prefetch로 **hydrated** 상태로 들어오는지(초기 로딩 깜빡임 없음) 확인.
3. 미인증 상태로 admin 페이지 접근 시 `/admin/login`으로 redirect 유지되는지 확인.
4. `npm run lint` + `npm run build` 통과.
5. Phase 0: 삭제한 중복 파일이 빌드에 영향 없는지 확인.

---

## 다음 단계 예고 (이번 실행 범위 아님)

- **Phase 2**: `/report/[company]/[month]` 상세를 외부 API(Naver/Dable/Bizmoney)별 개별 쿼리로 분리 + Suspense 스트리밍으로 점진 렌더.
- **Phase 3**: 세그먼트별 `error.tsx`(QueryErrorResetBoundary 연동), `global-error.tsx`, 라우터별 `not-found.tsx`, `loading.tsx` 보강.
- **Phase 4**: 폴더 구조 정리(`src/queries/` 분리 검토, 컴포넌트 그룹화, `/hospital/[slug]` 구현 또는 제거).
- **Phase 5**: 보안 — RLS 정책 설정(최우선), 모든 mutate 서버액션에 `isAdmin()` 가드, 보고서 비밀번호 해싱(`auth-crypto.ts` 재사용), 비밀번호 시도 rate limiting, `middleware.ts` 도입 검토.
