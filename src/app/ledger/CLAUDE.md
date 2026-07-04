# ledger 라우터 — 병원별 입금·소진 관리내역 (구글시트 스타일)

> 이 파일은 `src/app/ledger/` 하위 작업 시 자동 로드됩니다.

## 목적

병원(회사)마다 입금·소진 거래내역을 구글시트처럼 관리한다. 거래 상세내역을 입력하면
**월별 요약(입금/소진/당월 잔액/누적 잔액)이 자동 계산**된다.

## 페이지 구성

| 경로 | 파일 | 역할 | 인증 |
|------|------|------|------|
| `/ledger` | `page.tsx` | 병원 목록 (companiesSummary 재사용) | Admin, `force-dynamic` |
| `/ledger/[company]` | `[company]/page.tsx` + `LedgerSheet.tsx` | 시트 뷰 + 인라인 편집 | Admin, `force-dynamic` |

- `layout.tsx`: 앱 공통 `Header`/`Footer`. 헤더 nav에 "입금소진" 탭 추가됨.
- `[company]` 파라미터는 `resolveCompanyParam`(nanoid 또는 상호명)으로 해석.

## 데이터 흐름

- 테이블: `ledger_entries` (`sql/ledger_entries.sql` — Supabase에서 1회 실행 필요).
  **테이블이 없으면 `getLedgerEntries`가 `[]` 폴백** → 생성 전에도 앱이 안 깨진다.
- 조회: `getLedgerEntries(company)` (`@/lib/db`).
- 저장: `saveLedgerEntries(company, entries)` (`@/lib/ledger-actions`) — 전량 delete→insert 교체
  (보고서 자식 테이블과 동일 방식). 빈 행은 저장 전 제거. 저장 후 `revalidatePath`.

## LedgerSheet (클라이언트)

- **셀이 항상 편집 가능**(구글시트식). 편집/저장 버튼 없이 **입력을 멈추면 자동 저장**
  (디바운스 `SAVE_DELAY` 900ms). `rows` 상태가 단일 소스(요약도 여기서 파생).
- 자동 저장은 **직렬화 큐**: 저장 중 새 변경은 `pendingRef`에 모아 끝난 뒤 재실행(전량 교체
  save가 겹쳐 delete/insert가 뒤섞이는 것 방지).
- 우측 상단에 저장 상태 표시(idle/saving/saved/error). 실패 시 "다시 시도" 버튼.
- **월별 요약은 `deposit_date`의 `YYYY-MM` 기준으로 자동 집계**. 누적 잔액 = 당월 잔액 누계.
- 금액은 숫자만 저장(문자열 digits), 표시는 `formatKRW`(₩ + 천단위, 음수 빨강).

## 주의

- 색상은 첨부 시트 디자인 매칭용 리터럴 hex 사용(헤더 `#3b5bd9`, 입금 `#2563eb`, 소진 `#c0392b`).
  기존 report 페이지도 브랜드 hex(`#0e299c` 등)를 직접 쓰므로 컨벤션 일관.
