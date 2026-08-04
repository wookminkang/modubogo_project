# GEO 키워드 리포트 (`/keyword`)

암환자·교통사고 환자처럼 한방병원/요양병원을 찾는 환자들이 **ChatGPT 에 뭐라고 검색하는지
추리해서 50개를 뽑고**, 왜 이 키워드인지 + 왜 GEO 작업이 필요한지 설명하는 **공유 페이지**를
만드는 영역.

**모두보고 앱과 분리된 독립 기능이다.** 공통 Header/Footer 를 쓰지 않고 자체 레이아웃을 쓴다
(모두보고 로고 + 브랜드 네이비 #0e299c 팔레트, Pretendard 폰트, 일러스트는
`public/images/keyword/` 의 gpt-image-1 사전 생성 에셋). `/geo-check`(노출 O/X 점검)와도
무관 — OPENAI_API_KEY 만 공유한다.
(이전에 있던 geo-work 라우트/테이블은 폐기됨 — sql/keyword_proposals.sql 상단에서 drop.)

## 흐름

1. 관리자가 `/keyword` 에서 병원명·지역·진료 분야 입력 → **환자 검색 키워드 50개 뽑기**
2. GPT(`gpt-5.5`, Responses API + json_schema strict)가 환자군 3~5개로 나눠
   키워드 50개 + 그룹별 선정 이유 + summary + why_geo 를 생성 → 리포트로 저장
3. 공유 링크 `/keyword/{nanoid}` 자동 복사 → 광고주에게 카톡 전달
4. 광고주는 링크만으로 열람 (인증 없음, 편집 없음)

리포트는 **불변 스냅샷**이다 — 수정 기능이 없고, 다시 뽑으려면 새로 생성한다.
키워드는 개별 행이 아니라 `keyword_proposals.groups`(jsonb)에 통째로 저장한다.

## 구조

```
keyword/               [관리자] 생성 폼 + 리포트 목록 (KeywordAdmin). isAdmin 게이트, maxDuration=120
keyword/[token]/       [공개] 리포트 공유 페이지 — 환자군별 키워드 + 설명
layout.tsx             자체 상단 바 (모두보고 Header 미사용)
```

관련 lib (`src/lib/`):

| 파일 | 역할 |
| --- | --- |
| `keyword-db.ts` | 쿼리 레이어. read 폴백 / write throw (geo-db.ts 규칙) |
| `keyword-openai.ts` | 키워드+설명 생성 (Responses API + json_schema strict, `gpt-5.5`) |
| `keyword-actions.ts` | 서버 액션. 생성·삭제는 isAdmin, 공유 페이지는 공개 |

스키마: `sql/keyword_proposals.sql` (Supabase SQL 에디터에서 수동 실행)

## 주의점

- 생성은 30초~1분 걸린다. `/keyword` page 의 `maxDuration=120` 을 지울 것 — 지우면 Vercel 에서 잘린다.
- 키워드에 병원명이 들어가면 안 된다 (프롬프트에 명시). GEO 측정(geo-check)과 같은 원칙.
- ChatGPT 실제 검색 로그는 존재하지 않는다 — 환자 검색 심리 기반 **추리**임을 광고주 안내 문구에 유지할 것.
