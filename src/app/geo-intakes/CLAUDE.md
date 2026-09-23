# GEO 병원조사 (`/geo-intakes`, `/geo-intake/[token]`)

GEO·홈페이지 작업을 시작할 병원에서 기본 정보를 받는 **토스 퍼널** 폼.
관리자 헤더의 독립 탭이고, 권한 키는 `geo-intake`(`canAccessMenu(me, "geo-intake")`) — 메뉴 목록은
`src/components/Header.tsx`, 토글 화면은 `/admin/accounts`(`MenuPermissionEditor.tsx`), 키 정의는 `src/lib/admin.ts` 의 `MenuKey`.
`allowed_menus` 는 text[] 라 키를 늘려도 SQL 변경은 없다.

```
관리자 /geo-intakes          병원명 입력 → 링크 생성·복사 → 목록(대기/제출완료)
병원   /geo-intake/{nanoid}  안내 → 7단계 → 입력 확인 + 개인정보 동의 → 제출
관리자 /geo-intakes/{nanoid} 제출 내용 (계정 정보는 '보기' 눌러야 표시, 키워드 전체 복사)
```

- 문항·단계·검증은 `src/lib/geo-intake-fields.ts` 한 곳. DB 는 `answers jsonb` 한 칸이라 문항을 바꿔도 스키마 변경이 없다
- 퍼널 뼈대는 준비자료 폼(`src/app/intake/[token]/IntakeForm.tsx`)과 같다 — `?step=` URL 동기화, 브라우저 뒤로가기 = 이전 단계, localStorage 임시저장
- 스키마: `sql/geo_intakes.sql`
- 조건부 문항 — 규칙은 `isVisible`·`isRequired`(geo-intake-fields.ts) 한 곳에 모여 있다
  - 4단계 의료진: "직접 입력하기 / 홈페이지 참고하기". 홈페이지 참고면 의료진 목록은 숨기고 저장도 안 하며, 대신 7단계 홈페이지 주소가 필수가 된다
  - 5단계 병원 종류: "한방병원 / 한의원". **보유 피부기기는 한의원일 때만 묻는다**(`isClinic`) — 한방병원을 고르면 기기 칸은 숨기고 저장도 안 한다
  - 점심시간(`lunch_*`)은 그 요일이 진료일 때만 (아래 진료시간 항목 참고)

## 디자인 규칙 — `src/app/geo-intake/[token]/funnel-ui.tsx`

퍼널 화면(안내·7단계·입력 확인·완료)의 **제목/보조설명/라벨/입력칸/간격은 전부 이 파일 것만 쓴다.**
화면마다 크기·굵기를 따로 정하면 금세 제각각이 된다. 색은 하드코딩(`#0e299c`) 대신 Seed 토큰(`--seed-color-*`).

| 쓰임 | 무엇 |
| --- | --- |
| 화면 제목 | `ScreenHeading` (t9Bold 24px + t5Regular 보조설명) |
| 문항 라벨 | `FieldLabel` (t5Bold, 필수는 브랜드색 `*`, 선택은 회색 글씨) |
| 입력칸 | `INPUT` — 테두리 없는 회색 바탕, 포커스에만 브랜드 테두리. 글자는 16px 고정(iOS 확대 방지) |
| 누르는 칸 | `INPUT_BUTTON` — INPUT 과 같은 크기, 회색 카드 안에 놓이므로 바탕만 흰색 |
| 고르는 보기 | `CHOICE` + `CHOICE_ON`/`CHOICE_OFF` |
| 문항 간격 | `FIELD_GAP` |

- 진행바·뒤로가기는 화면 위에 고정(`TopBar`), CTA 는 아래 고정(`StickyBar`, `env(safe-area-inset-bottom)` 반영)
- 시각 선택(`TimePicker.tsx`)은 **휴대폰이면 바텀시트, PC 면 칸 아래 펼침** (`useIsMobile`, 640px 기준)
- 체크박스는 Seed `Checkbox`. 단 진료/휴진 토글은 직접 만든다 — Seed `SegmentedControl` 은 "아직 안 고름" 상태를 표현하지 못한다
- 입력칸은 Seed `TextField` 대신 `INPUT` 한 줄로 맞춘다. 이 폼은 칸 종류(글자·여러 칸·시각)가 여럿이라 전부 같은 높이·모서리여야 한 벌로 보인다

**문항 종류 — 화면은 `GeoIntakeFieldDef` 의 어느 칸이 있는지만 보고 그린다.** 새 문항은 FIELDS 에 추가하면 끝.

| 정의 | 화면 | 저장값 |
| --- | --- | --- |
| `choices` | 버튼 중 하나 고르기 | 고른 value |
| `schedule` | 진료/휴진 토글 + 시각 드롭다운 (30분 단위, `TIME_OPTIONS` = 06:00~23:30) | `"09:00~18:00"` 또는 `"휴진"`/`"없음"` |
| `repeat` | 번호 붙은 입력 칸 N개 (키워드 30, 장비 12) | 줄바꿈으로 합친 한 문자열 |
| `group` | "추가" 버튼으로 늘려가는 카드 (의료진, 최대 12명) | **JSON 배열 문자열** — 한 명이 칸 4개(성함·직함·면허번호·경력)라 한 줄로는 다시 못 쪼갠다 |
| `multiline` | textarea | 그대로 |
| `format` | phone·biz 는 하이픈 자동, digits 는 숫자만 | 서식 적용된 문자열 |

**진료시간 단계(`step.id === "hours"`)는 문항을 하나씩 늘어놓지 않고 요일 표 하나(`WeekHours`)로 그린다.** 입력 확인·관리자 화면도 같은 분기를 타서 요일당 한 줄(`dayLine`)로 보여준다.
- 요일마다 진료시간(`hours_*`)과 점심시간(`lunch_*`) 두 문항이 한 묶음 — `DAYS` 가 그 짝을 들고 있다. 점심시간은 그 날 진료할 때만 보이고(`isVisible` → `LUNCH_OF`), 휴진으로 바꾸면 저장도 안 된다
- 한 화면에 요일 8줄이라 **역할마다 생김새를 다르게 했다**: 진료/휴진은 세그먼트 토글, 시각은 드롭다운 모양(`TimeSelect`), 점심시간은 체크박스. 전부 같은 버튼으로 보이면 무엇을 누르는 건지 헷갈린다
- 아무것도 안 고른 상태에선 "기본 시간표로 시작하기"(`DEFAULT_WEEK`)를 먼저 띄워 한 번에 깔고 다른 날만 고치게 한다. 월요일이 나머지 평일과 다르면 "화~금도 월요일과 같게"가 뜬다
- 의료진(`group`)은 화면이 빈 칸까지 들고 있고(`useState`), 저장값에는 성함이 빈 분을 버린다 — 저장값만 보고 그리면 "추가"로 만든 빈 칸이 즉시 사라진다. 읽고 쓸 땐 `parseDoctors`/`stringifyDoctors`, 한 줄 표시는 `doctorLine`
- `repeat`·`schedule`·`group` 값은 서버에서도 다시 검증한다 (`sanitizeAnswers` — 형식이 깨진 진료시간은 버리고, 칸 수를 넘는 값은 자른다)
- 입력 칸에는 `aria-label={def.label}` 을 붙인다. 비밀번호 칸은 placeholder 가 없어 라벨이 없으면 어떤 칸인지 구분할 수 없다

**보안 — FTP·CAFE24 비밀번호가 들어오는 테이블이다.**
- RLS on + 정책 없음, 접근은 `supabaseAdmin`(service_role)만 (`geo-intake-db.ts`). anon 키로 되돌리지 말 것
- 제출 액션은 입력을 전부 재검증하고, **대기 상태에서만 저장**한다 — 제출된 링크는 덮어쓸 수 없다
- 제출된 링크로 다시 들어오면 "제출 완료" 안내만 보여주고 입력값을 내려보내지 않는다. 수정은 새 링크로
- 계정은 아이디·비밀번호를 따로 받는다(`ftp_id`/`ftp_pw`/`cafe24_id`/`cafe24_pw`, 모두 `secret: true`). 비밀번호 칸은 `type="password"`
- 임시저장에 계정 문항(`secret: true`)은 넣지 않는다 — 병원 PC 브라우저에 비밀번호가 남지 않게
- 관리자 목록 페이지에는 응답 본문을 넘기지 않는다 (상세 화면에서만 조회)
