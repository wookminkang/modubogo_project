# 병원 공휴일 진료 일정 관리 & 알림톡 전송 기능

## 개요
매월 말, 다음달 공휴일에 대해 병원별로 진료 여부를 설정하고
환자에게 알림톡으로 안내하는 기능

---

## 전체 플로우

```
[어드민]
  1. /report/[company] 페이지
     → "다음달 공휴일 진료 안내" 버튼 클릭

  2. 공휴일 목록 조회 (공공데이터 API 또는 수동 등록)
     → 다음달 공휴일 리스트 표시

  3. 각 공휴일마다 진료 여부 설정
     - 정상 진료
     - 휴무
     - 단축 진료 (시간 입력)

  4. 저장 → DB에 병원별 공휴일 일정 저장

  5. 알림톡 전송 버튼
     → 설정된 수신자(recipient1~3)에게 알림톡 발송

[환자/수신자]
  → 알림톡 수신
     "[병원명] 6월 공휴일 진료 안내"
     내용: 날짜별 정상/휴무/단축 정보
```

---

## DB 설계

### 신규 테이블: `holiday_schedules`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | int8 (PK) | |
| company | text | 병원명 (company_settings.company) |
| date | date | 공휴일 날짜 |
| holiday_name | text | 공휴일명 (예: 현충일) |
| status | text | open / closed / short |
| short_hours | text | 단축 시간 (예: 09:00~13:00), status=short일 때 |
| note | text | 추가 메모 (선택) |
| created_at | timestamptz | |

```sql
CREATE TABLE holiday_schedules (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  company text NOT NULL,
  date date NOT NULL,
  holiday_name text NOT NULL,
  status text NOT NULL DEFAULT 'open', -- open | closed | short
  short_hours text,
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (company, date)
);
```

---

## 공휴일 데이터 소스

### 옵션 A: 공공데이터포털 API (추천)
- URL: `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo`
- 파라미터: `solYear`, `solMonth`, `ServiceKey`
- 무료, 월별 조회 가능

### 옵션 B: 수동 관리
- DB에 공휴일 마스터 테이블을 별도로 관리
- 매년 어드민이 직접 입력

→ **옵션 A로 진행** (자동화)

---

## 화면 구성

### 1. 병원 상세 페이지 `/report/[company]`
- 기존 버튼 영역에 `공휴일 진료 설정` 버튼 추가
- 클릭 시 모달 또는 전용 페이지로 이동

### 2. 공휴일 설정 페이지 `/report/[company]/holiday`
```
┌─────────────────────────────────┐
│  [병원명] 6월 공휴일 진료 설정    │
├─────────────────────────────────┤
│  6월 6일 (목) 현충일             │
│  ○ 정상 진료   ● 휴무   ○ 단축  │
├─────────────────────────────────┤
│  6월 ○○일 (○) ○○일              │
│  ● 정상 진료   ○ 휴무   ○ 단축  │
├─────────────────────────────────┤
│  [저장]  [알림톡 전송]            │
└─────────────────────────────────┘
```

---

## 알림톡 템플릿

```
[병원명] 6월 공휴일 진료 안내

안녕하세요, [병원명]입니다.
6월 공휴일 진료 일정을 안내드립니다.

📅 6월 6일 (목) 현충일
   → 휴무

📅 6월 ○○일 (○) ○○○일
   → 정상 진료

📅 6월 ○○일 (○) ○○○일
   → 단축 진료 (09:00 ~ 13:00)

문의: 02-XXXX-XXXX
```

---

## 구현 순서

### Phase 1 - 데이터 기반
- [ ] Supabase `holiday_schedules` 테이블 생성 (SQL 실행)
- [ ] 공공데이터 API 키 발급 및 `getPublicHolidays(year, month)` 함수 구현
- [ ] DB 저장/조회 함수 (`db.ts`에 추가)

### Phase 2 - 어드민 UI
- [ ] `/report/[company]/holiday/page.tsx` 페이지 생성
- [ ] 공휴일 목록 + 진료 여부 라디오 UI
- [ ] 저장 server action 구현

### Phase 3 - 알림톡 전송
- [ ] 알림톡 템플릿 bizgo 등록
- [ ] 전송 로직 구현 (`sendHolidayAlimtalk`)
- [ ] 전송 버튼 및 로그 저장

### Phase 4 - 자동화 (옵션)
- [ ] 매월 25일 자동으로 다음달 공휴일 세팅 알림 (cron)

---

## 파일 구조 (예상)

```
src/
  app/
    report/[company]/
      holiday/
        page.tsx          # 공휴일 설정 페이지
        HolidayForm.tsx   # 클라이언트 폼 컴포넌트
        actions.ts        # 저장 / 알림톡 전송 server action
  lib/
    publicHoliday.ts      # 공공데이터 API 호출
    db.ts                 # getHolidaySchedules, upsertHolidaySchedule 추가
```
