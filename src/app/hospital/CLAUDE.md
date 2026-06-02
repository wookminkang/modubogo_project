# hospital 라우터 — 병원 목록 (작업 중)

> 이 파일은 `src/app/hospital/` 하위 작업 시 자동 로드됩니다.

## 목적

등록된 병원 목록을 조회하는 화면. **TanStack Query SSR 프리페칭 패턴의 참고 구현**으로 보이며, 상세 페이지(`[slug]`)는 아직 미완성입니다.

## 구조

```
hospital/
├── page.tsx                    # 목록 페이지 (서버 컴포넌트, prefetch)
├── _components/
│   └── HospitalList.tsx        # "use client", useSuspenseQuery로 목록 렌더
└── [slug]/
    └── page.tsx                # 상세 페이지 — 현재 플레이스홀더 (미구현)
```

## 데이터 흐름 (핵심 패턴)

```
page.tsx (서버)
  → queryClient.prefetchQuery({ queryKey: ["hospitalList"], queryFn: getHospitalList })
  → dehydrate → <HydrationBoundary>
HospitalList.tsx (클라이언트)
  → useSuspenseQuery(["hospitalList"]) — 서버가 채운 캐시를 그대로 사용
```

- `Suspense` 폴백 있음 / `ErrorBoundary` 없음 (추가 시 직접 래핑 필요).
- `getHospitalList()` (`@/lib/db`) → Supabase `company_settings.company` 조회, 한글 오름차순 정렬.
- React Query 기본값: `staleTime 60s`, `gcTime 24h` (`@/hooks/get-query-client.ts`).

## 작업 시 주의

- `[slug]/page.tsx`는 현재 `"병원 리스트 탠스택퀄 ㅣ적용"` 텍스트만 있는 **미완성 상태**. 상세 기능을 여기에 구현하면 됨.
- 현재 목록은 병원명(`company`)만 표시. 보고서 수·유형 등은 `getCompaniesSummaryFromDB()`에 이미 있으니 확장 시 활용.
- 데이터 수정 후에는 `queryClient.invalidateQueries(["hospitalList"])`로 캐시 무효화 필요 (현재 읽기 전용).
- 실제 운영 보고서 화면은 `/report` 쪽이 메인. 이 라우터와 혼동 주의.
