# ledger 라우터 — 병원별 입금·소진 관리내역 (구글시트 스타일)

> 이 파일은 `src/app/ledger/` 하위 작업 시 자동 로드됩니다.

## 목적

병원(회사)마다 입금·소진 거래내역을 구글시트처럼 관리한다. 거래 상세내역을 입력하면
**월별 요약(입금/소진/당월 잔액/누적 잔액)이 자동 계산**된다.

## 페이지 구성

| 경로 | 파일 | 역할 | 인증 |
|------|------|------|------|
| `/ledger` | `page.tsx` | 병원 목록 (companiesSummary 재사용) | Admin, `force-dynamic` |
| `/ledger/[company]` | `[company]/page.tsx` + `LedgerSheet.tsx` | **관리자 편집 시트**(구글시트식 인라인) | Admin, `force-dynamic` |
| `/ledger/[company]/view` | `[company]/view/page.tsx` + `LedgerView.tsx` | **광고주 공개 읽기전용 뷰**(모바일 카드형) | 링크 공개, `force-dynamic` |

- **편집(마스터)과 조회(광고주)를 별도 라우트로 분리.** 편집은 admin 전용(`redirect("/admin/login")`),
  `/view`는 인증 없이 **링크만 있으면 열람**. `/view`는 로그인 여부와 무관하게 항상 읽기전용이라
  관리자가 광고주 화면을 그대로 미리보고 공유할 수 있다(편집 시트 상단 "광고주 화면 보기" 링크).
- `LedgerView`(읽기전용)는 시안(`시안4_모바일`) 매칭 **모바일 카드형** UI:
  월 필터=Seed `Tabs`, 유형 필터(전체/입금/소진)=Seed `SegmentedControl`, 검색=Seed `TextField`,
  입금/소진 뱃지=Seed `Badge`(`informative`/`critical`), 타이포=Seed `Text`. 카드/다크 요약은
  Seed 컴포넌트가 없어 Tailwind + 시안 리터럴 hex(`#2563eb`/`#ef4444`/`#222b63`)로 작성.
- 광고주가 `/view`에 접속하면 `layout.tsx`의 `Header`가 `showNav={!!user}=false`라 nav/유저정보
  없이 공개 헤더("광고 운영보고 시스템")만 노출된다. (`ReportHeader`/`ReportFooter`는 사용 안 함.)
- `LedgerSheet`(편집)와 `LedgerView`(조회)는 집계·표시 로직을 각자 갖는다(시트=표/월요약,
  뷰=카드/건수집계). 공용 유틸 `@/lib/ledger`(`summarizeLedger`/`formatKRW`)는 현재 미사용.
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
