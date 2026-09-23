"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, Plus, X } from "lucide-react";
import { Checkbox } from "@seed-design/react";
import IconCheckmarkFill from "@karrotmarket/react-monochrome-icon/IconCheckmarkFill";
import { ActionButton } from "seed-design/ui/action-button";
import { Text } from "seed-design/ui/text";
import { submitGeoIntake } from "@/lib/geo-intake-actions";
import {
  DAYS,
  DEFAULT_WEEK,
  DOCTOR_PARTS,
  FIELD_BY_KEY,
  KEYWORD_MONTH_MIN,
  WEEKDAYS,
  applyFormat,
  dayLine,
  displayValue,
  doctorLine,
  doctorsFromHomepage,
  emptyDoctor,
  isRequired,
  isVisible,
  joinSlots,
  lineList,
  parseDoctors,
  parseSchedule,
  SECRET_KEYS,
  stringifyDoctors,
  slotValues,
  STEPS,
  stepValid,
  type DoctorEntry,
  type GeoIntakeAnswers,
  type GeoIntakeFieldDef,
  type GeoIntakeFieldKey,
  type GeoIntakeStep,
} from "@/lib/geo-intake-fields";
import {
  CARD,
  CHOICE,
  CHOICE_OFF,
  CHOICE_ON,
  FIELD_GAP,
  ERROR_BOX,
  FieldLabel,
  INPUT,
  NOTE,
  ScreenHeading,
} from "./funnel-ui";
import { TimePicker } from "./TimePicker";

// GEO 병원 정보 폼 — 토스 퍼널. 준비자료 폼(IntakeForm.tsx)과 같은 뼈대:
// 안내(0) → 단계(1~N) → 입력 확인(N+1) → 제출 → 완료.
// 단계는 URL(?step=)에 반영해 브라우저 뒤로/앞으로가 단계 단위로 동작하고,
// 입력값은 localStorage 에 임시 저장해 새로고침해도 이어서 쓸 수 있다 (계정 문항은 제외).
//
// 크기·간격·색은 전부 funnel-ui.tsx 의 규칙만 쓴다 — 화면마다 따로 정하면 금세 제각각이 된다.

const CONFIRM = STEPS.length + 1;
const TOTAL_PHASES = STEPS.length;

const clampStep = (n: number) => Math.min(CONFIRM, Math.max(0, n));
const readStepFromUrl = (): number | null => {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("step");
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isInteger(n) ? clampStep(n) : null;
};

// 임시 저장 — 계정 문항(FTP·CAFE24)은 병원 PC 브라우저에 남기지 않도록 뺀다.
const draftKey = (nanoid: string) => `geo-intake-draft:${nanoid}`;
type Draft = { answers?: GeoIntakeAnswers; screen?: number };
const readDraft = (nanoid: string): Draft | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(nanoid));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null; // 손상된 draft 는 무시
  }
};
const withoutSecrets = (a: GeoIntakeAnswers): GeoIntakeAnswers => {
  const copy = { ...a };
  for (const k of SECRET_KEYS) delete copy[k];
  return copy;
};

export default function GeoIntakeForm({ nanoid, company }: { nanoid: string; company: string }) {
  const [screen, setScreen] = useState(() => {
    // URL(?step=) 우선 → 없으면 draft → 0
    const fromUrl = readStepFromUrl();
    if (fromUrl !== null) return fromUrl;
    const s = readDraft(nanoid)?.screen;
    return typeof s === "number" ? clampStep(s) : 0;
  });
  const [answers, setAnswers] = useState<GeoIntakeAnswers>(() => {
    const saved = readDraft(nanoid)?.answers ?? {};
    // 정식 병원명은 관리자가 링크 만들 때 넣은 병원명으로 미리 채운다 (수정 가능).
    return { hospital_name: company, ...saved };
  });
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const stepUrl = (n: number) =>
    n <= 0 ? window.location.pathname : `${window.location.pathname}?step=${n}`;

  // 브라우저 뒤로/앞으로가 단계를 오가도록: 마운트 시 URL 정렬 + popstate 동기화.
  useEffect(() => {
    // 링크를 열자마자 중간 단계부터 시작하는 경우(임시저장 복구, ?step= 링크 공유)에는
    // 뒤로 갈 기록이 없다. 그냥 두면 뒤로가기가 폼 밖(빈 화면)으로 나가버리므로,
    // 지나온 단계를 히스토리에 깔아 둬서 한 단계씩 되짚어갈 수 있게 한다.
    window.history.replaceState(null, "", stepUrl(0));
    for (let i = 1; i <= screen; i++) window.history.pushState(null, "", stepUrl(i));
    const onPop = () => setScreen(readStepFromUrl() ?? 0);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // 마운트 시 1회만 등록
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 화면 전환 시 최상단으로 (퍼널 UX)
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen, done]);

  // 입력값 변경 시 임시 저장. 외부 시스템 동기화라 setState 없음.
  useEffect(() => {
    if (done) return;
    try {
      window.localStorage.setItem(
        draftKey(nanoid),
        JSON.stringify({ answers: withoutSecrets(answers), screen }),
      );
    } catch {
      // 저장 실패(용량 등)는 무시 — 저장은 편의 기능일 뿐
    }
  }, [answers, screen, done, nanoid]);

  const setValue = (k: GeoIntakeFieldKey, v: string) => setAnswers((p) => ({ ...p, [k]: v }));

  const move = (dir: 1 | -1) => {
    // 뒤로: 히스토리 pop → 브라우저 뒤로가기와 동일 (popstate 가 단계 동기화)
    if (dir === -1) {
      window.history.back();
      return;
    }
    const n = clampStep(screen + dir);
    if (n === screen) return;
    setScreen(n);
    window.history.pushState(null, "", stepUrl(n));
  };

  const handleSubmit = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    const res = await submitGeoIntake(nanoid, answers, consent);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    try {
      window.localStorage.removeItem(draftKey(nanoid)); // 성공 시 임시 저장 정리
    } catch {}
    setDone(true);
  };

  if (done) return <DoneScreen company={answers.hospital_name || company} />;

  const phase = screen === 0 ? 0 : screen === CONFIRM ? TOTAL_PHASES : screen;
  const ctaProps = { variant: "brandSolid" as const, size: "large" as const, className: "w-full" };

  let cta: React.ReactNode;
  if (screen === 0) {
    cta = (
      <ActionButton {...ctaProps} onClick={() => move(1)}>
        시작하기
      </ActionButton>
    );
  } else if (screen === CONFIRM) {
    cta = (
      <ActionButton {...ctaProps} loading={saving} disabled={!consent} onClick={handleSubmit}>
        제출하기
      </ActionButton>
    );
  } else {
    const step = STEPS[screen - 1];
    cta = (
      <ActionButton {...ctaProps} disabled={!stepValid(step, answers)} onClick={() => move(1)}>
        {screen === STEPS.length ? "입력 내용 확인" : "다음"}
      </ActionButton>
    );
  }

  return (
    <div className="flex-1">
      <TopBar phase={phase} showBack={screen !== 0} onBack={() => move(-1)} />

      <div className="mx-auto flex w-full max-w-[480px] flex-col px-5 pb-32">
        {screen === 0 && <IntroScreen company={company} />}

        {screen >= 1 && screen <= STEPS.length && (
          <StepScreen step={STEPS[screen - 1]} answers={answers} onChange={setValue} />
        )}

        {screen === CONFIRM && (
          <ConfirmScreen answers={answers} consent={consent} onConsent={setConsent} error={error} />
        )}
      </div>

      <StickyBar>{cta}</StickyBar>
    </div>
  );
}

// ── 상단 바 — 뒤로가기 + 얇은 진행선 (스크롤해도 위에 붙어 있다) ──
function TopBar({ phase, showBack, onBack }: { phase: number; showBack: boolean; onBack: () => void }) {
  return (
    <div className="sticky top-0 z-[5] bg-[var(--seed-color-bg-layer-default)]">
      <div className="mx-auto flex h-14 w-full max-w-[480px] items-center px-2">
        {showBack && (
          <ActionButton variant="ghost" size="medium" onClick={onBack} aria-label="이전">
            <ArrowLeft size={20} />
          </ActionButton>
        )}
      </div>
      <div className="h-[3px] w-full bg-[var(--seed-color-bg-neutral-weak)]">
        <div
          className="h-full bg-[var(--seed-color-bg-brand-solid)] transition-[width] duration-300"
          style={{ width: `${(phase / TOTAL_PHASES) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ── 하단 고정 CTA — 본문이 버튼 뒤로 비치지 않게 배경을 깔아둔다 ──
function StickyBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[4] bg-gradient-to-t from-[var(--seed-color-bg-layer-default)] from-70% to-transparent pt-8">
      <div className="mx-auto w-full max-w-[480px] px-5 pb-[max(20px,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}

// ── 0단계 · 안내 ──
function IntroScreen({ company }: { company: string }) {
  return (
    <div>
      <ScreenHeading
        title={
          <>
            홈페이지 제작에 필요한
            <br />
            정보를 알려주세요
          </>
        }
        subtitle={`${company ? `${company} · ` : ""}${STEPS.length}단계, 약 10분이면 충분해요.`}
      />

      <ol className="flex flex-col">
        {STEPS.map((s, idx) => (
          <li key={s.title} className="flex gap-3 py-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--seed-color-bg-brand-weak)]">
              <Text textStyle="t3Bold" color="fg.brand">
                {idx + 1}
              </Text>
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
              <Text as="p" textStyle="t5Bold">
                {s.title}
              </Text>
              <Text as="p" textStyle="t4Regular" color="fg.neutralSubtle" className="leading-[1.5]">
                {s.subtitle}
              </Text>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ── 1~N단계 · 입력 ──
function StepScreen({
  step,
  answers,
  onChange,
}: {
  step: GeoIntakeStep;
  answers: GeoIntakeAnswers;
  onChange: (k: GeoIntakeFieldKey, v: string) => void;
}) {
  return (
    <div>
      <ScreenHeading title={step.title} subtitle={step.subtitle} />

      <div className={FIELD_GAP}>
        {step.id === "hours" && <WeekHours answers={answers} onChange={onChange} />}
        {step.keys.includes("keywords") && <KeywordNotice />}

        {step.id === "hours"
          ? null
          : step.keys.map((key) => {
              const def = FIELD_BY_KEY.get(key)!;
              if (!isVisible(def, answers)) return null;
              return (
                <FieldInput
                  key={key}
                  def={def}
                  value={answers[key] ?? ""}
                  required={isRequired(def, answers)}
                  hint={
                    // 의료진을 홈페이지에서 참고하기로 했으면 홈페이지 주소가 필수가 된 이유를 알려준다
                    key === "homepage_url" && doctorsFromHomepage(answers)
                      ? "의료진 정보를 홈페이지에서 참고해요"
                      : def.hint
                  }
                  onChange={(v) => onChange(key, v)}
                />
              );
            })}

        {step.keys.includes("doctors_source") && doctorsFromHomepage(answers) && (
          <Note>기존 홈페이지의 의료진 소개를 참고해 작성할게요. 7단계에서 홈페이지 주소를 꼭 알려주세요.</Note>
        )}
        {step.keys.includes("hospital_type") && answers.hospital_type === "hospital" && (
          <Note>한방병원은 병상 수만 알려주시면 돼요. 기기 문항은 건너뜁니다.</Note>
        )}
      </div>
    </div>
  );
}

/** 고른 답에 따라 덧붙는 한 줄 안내 */
function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${NOTE} px-4 py-3.5`}>
      <Text as="p" textStyle="t4Regular" color="fg.brand" className="leading-[1.55]">
        {children}
      </Text>
    </div>
  );
}

function FieldInput({
  def,
  value,
  required,
  hint,
  onChange,
}: {
  def: GeoIntakeFieldDef;
  value: string;
  required: boolean;
  hint?: React.ReactNode;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <FieldLabel label={def.label} required={required} hint={hint} />

      {def.choices ? (
        <div className="grid grid-cols-2 gap-2">
          {def.choices.map((c) => {
            const selected = value === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => onChange(c.value)}
                aria-pressed={selected}
                className={`${CHOICE} ${selected ? CHOICE_ON : CHOICE_OFF}`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      ) : def.group ? (
        <DoctorList def={def} value={value} onChange={onChange} />
      ) : def.repeat ? (
        <SlotInputs def={def} value={value} onChange={onChange} />
      ) : def.multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={def.placeholder}
          aria-label={def.label}
          rows={def.rows ?? 4}
          className={`${INPUT} resize-y leading-[1.6]`}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(applyFormat(def, e.target.value))}
          placeholder={def.placeholder}
          aria-label={def.label}
          // 숫자만 받는 칸은 휴대폰에서 숫자 키패드가 뜨게
          inputMode={
            def.format === "phone"
              ? "tel"
              : def.format === "biz" || def.format === "digits"
                ? "numeric"
                : undefined
          }
          // 계정 문항은 브라우저 자동완성·저장 제안을 끈다
          autoComplete={def.secret ? "off" : undefined}
          // 비밀번호 칸은 어깨너머로 보이지 않게 가린다
          type={def.key.endsWith("_pw") ? "password" : def.format === "phone" ? "tel" : "text"}
          className={INPUT}
        />
      )}
    </div>
  );
}

// ── 진료시간 — 요일 한 줄씩. 기본 시간표를 한 번에 깔고 다른 날만 고치는 흐름 ──
function WeekHours({
  answers,
  onChange,
}: {
  answers: GeoIntakeAnswers;
  onChange: (k: GeoIntakeFieldKey, v: string) => void;
}) {
  const untouched = DAYS.every((d) => !answers[d.hours]);

  return (
    <div className="flex flex-col gap-3">
      {untouched && (
        <button
          type="button"
          onClick={() => {
            for (const [k, v] of Object.entries(DEFAULT_WEEK)) onChange(k as GeoIntakeFieldKey, v);
          }}
          className={`${NOTE} flex flex-col gap-1 px-4 py-3.5 text-left`}
        >
          <Text as="span" textStyle="t5Bold" color="fg.brand">
            기본 시간표로 시작하기
          </Text>
          <Text as="span" textStyle="t4Regular" color="fg.neutralSubtle" className="leading-[1.5]">
            평일 09:00~18:00 · 토 09:00~13:00 · 일·공휴일 휴진 · 점심 13:00~14:00
          </Text>
        </button>
      )}

      <div className="flex flex-col gap-2">
        {DAYS.map((day) => (
          <DayRow key={day.hours} day={day} answers={answers} onChange={onChange} />
        ))}
      </div>

      <SameAsMonday answers={answers} onChange={onChange} />
    </div>
  );
}

function DayRow({
  day,
  answers,
  onChange,
}: {
  day: (typeof DAYS)[number];
  answers: GeoIntakeAnswers;
  onChange: (k: GeoIntakeFieldKey, v: string) => void;
}) {
  const hoursDef = FIELD_BY_KEY.get(day.hours)!;
  const lunchDef = FIELD_BY_KEY.get(day.lunch)!;
  const hours = answers[day.hours] ?? "";
  const closed = hours === "휴진";
  const open = !!hours && !closed;
  const { start, end } = parseSchedule(hoursDef, hours);

  const lunch = answers[day.lunch] ?? "";
  const hasLunch = !!lunch && lunch !== "없음";
  const lunchTimes = parseSchedule(lunchDef, lunch);

  return (
    <div className={`${CARD} flex flex-col gap-2.5 px-4 py-3.5`}>
      <div className="flex items-center justify-between gap-3">
        <Text as="span" textStyle="t5Bold">
          {day.label}
        </Text>
        <Toggle
          on={open}
          off={closed}
          onLabel="진료"
          offLabel="휴진"
          onSelect={() => onChange(day.hours, day.defaultRange)}
          offSelect={() => onChange(day.hours, "휴진")}
        />
      </div>

      {open && (
        <>
          <TimeRange
            start={start}
            end={end}
            label={`${day.label} 진료`}
            onChange={(s, e) => onChange(day.hours, `${s}~${e}`)}
          />

          <CheckLine
            checked={hasLunch}
            onChange={(c) => onChange(day.lunch, c ? lunchDef.schedule!.defaultRange : "없음")}
            label="점심시간 있음"
          />

          {hasLunch && (
            <TimeRange
              start={lunchTimes.start}
              end={lunchTimes.end}
              label={`${day.label} 점심`}
              onChange={(s, e) => onChange(day.lunch, `${s}~${e}`)}
            />
          )}
        </>
      )}
    </div>
  );
}

/** 시작~종료 한 쌍 — 진료시간과 점심시간이 같은 자리에 오도록 한 컴포넌트로 묶는다 */
function TimeRange({
  start,
  end,
  label,
  onChange,
}: {
  start: string;
  end: string;
  label: string;
  onChange: (start: string, end: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <TimePicker value={start} onChange={(s) => onChange(s, end)} label={`${label} 시작 시각`} />
      <Text textStyle="t4Regular" color="fg.neutralSubtle" className="shrink-0">
        ~
      </Text>
      <TimePicker value={end} onChange={(e) => onChange(start, e)} label={`${label} 종료 시각`} />
    </div>
  );
}

/**
 * 둘 중 하나 고르는 토글. Seed SegmentedControl 은 "아직 안 고름" 상태를 표현하지 못해서
 * (선택 표시가 늘 한 칸에 놓인다) 직접 만든다 — 진료시간은 안 고른 날이 보여야 한다.
 */
function Toggle({
  on,
  off,
  onLabel,
  offLabel,
  onSelect,
  offSelect,
}: {
  on: boolean;
  off: boolean;
  onLabel: string;
  offLabel: string;
  onSelect: () => void;
  offSelect: () => void;
}) {
  const base = "rounded-[9px] px-4 py-1.5 transition-colors";
  const picked = "bg-[var(--seed-color-bg-brand-solid)]";
  const idle = "";
  return (
    <div className="flex gap-0.5 rounded-[11px] bg-[var(--seed-color-bg-neutral-weak)] p-0.5">
      <button type="button" onClick={onSelect} aria-pressed={on} className={`${base} ${on ? picked : idle}`}>
        <Text textStyle="t4Bold" color={on ? "fg.brandContrast" : "fg.neutralSubtle"}>
          {onLabel}
        </Text>
      </button>
      <button type="button" onClick={offSelect} aria-pressed={off} className={`${base} ${off ? picked : idle}`}>
        <Text textStyle="t4Bold" color={off ? "fg.brandContrast" : "fg.neutralSubtle"}>
          {offLabel}
        </Text>
      </button>
    </div>
  );
}

/** 체크박스 한 줄 (Seed Checkbox) */
function CheckLine({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <Checkbox.Root checked={checked} onCheckedChange={(checked) => onChange(checked === true)}>
      <Checkbox.Control>
        <Checkbox.Indicator checked={<IconCheckmarkFill />} />
      </Checkbox.Control>
      <Checkbox.Label>
        <Text textStyle="t4Regular" color="fg.neutralSubtle">
          {label}
        </Text>
      </Checkbox.Label>
      <Checkbox.HiddenInput />
    </Checkbox.Root>
  );
}

/** 월요일에 고른 진료·점심시간을 화~금에 한 번에 채운다 */
function SameAsMonday({
  answers,
  onChange,
}: {
  answers: GeoIntakeAnswers;
  onChange: (k: GeoIntakeFieldKey, v: string) => void;
}) {
  const monday = answers.hours_mon;
  if (!monday) return null;
  const mondayLunch = answers.lunch_mon ?? "";
  const rest = WEEKDAYS.slice(1);
  if (rest.every((d) => answers[d.hours] === monday && (answers[d.lunch] ?? "") === mondayLunch)) return null;
  return (
    <ActionButton
      variant="neutralWeak"
      size="medium"
      onClick={() =>
        rest.forEach((d) => {
          onChange(d.hours, monday);
          onChange(d.lunch, mondayLunch);
        })
      }
    >
      화~금도 월요일({monday})과 같게
    </ActionButton>
  );
}

// ── 키워드 안내 — 어떻게 적는지, 몇 개까지 적어야 하는지 먼저 알려준다 ──
function KeywordNotice() {
  return (
    <div className={`${CARD} flex flex-col gap-4 px-4 py-4`}>
      <div className="flex flex-col gap-2">
        <Text as="p" textStyle="t5Bold" color="fg.brand">
          이렇게 적어 주세요
        </Text>
        <Text as="p" textStyle="t5Bold">
          지역구 + 증상/질환
        </Text>
        <div className="flex flex-wrap gap-1.5">
          {["송파구 허리디스크", "잠실 교통사고 한의원", "강동구 여드름"].map((example) => (
            <span key={example} className="rounded-lg bg-[var(--seed-color-bg-neutral-weak)] px-2.5 py-1">
              <Text textStyle="t3Medium">{example}</Text>
            </span>
          ))}
        </div>
        <Text as="p" textStyle="t4Regular" color="fg.neutralSubtle">
          환자분들이 실제로 검색하는 말이에요.
        </Text>
      </div>

      <div className="flex flex-col gap-2 border-t border-[var(--seed-color-stroke-neutral-muted)] pt-4">
        <Text as="p" textStyle="t5Bold" color="fg.brand">
          30개를 다 채우지 않으셔도 돼요
        </Text>
        <ul className="flex flex-col gap-1.5">
          <Bullet>10개만 적어 주셔도 충분해요.</Bullet>
          <Bullet>남은 칸은 적어주신 키워드를 보고 저희가 채워요.</Bullet>
          <Bullet>
            <b className="font-semibold text-[var(--seed-color-fg-neutral)]">여드름</b>을 적어주시면, 여드름 키워드로
            서로 겹치지 않게 한 달 치를 만들어 드려요.
          </Bullet>
        </ul>
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span
        aria-hidden
        className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[var(--seed-color-fg-neutral-subtle)]"
      />
      <Text as="span" textStyle="t4Regular" color="fg.neutralSubtle" className="leading-[1.6]">
        {children}
      </Text>
    </li>
  );
}

// ── 의료진 — "추가" 버튼으로 한 분씩 늘려간다 ──
function DoctorList({
  def,
  value,
  onChange,
}: {
  def: GeoIntakeFieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const { max, unit, addLabel } = def.group!;
  // 화면에 보이는 칸은 여기서 들고 있는다. 저장값(JSON)은 성함이 빈 분을 버리기 때문에,
  // 저장값만 보고 그리면 "추가"를 눌러 생긴 빈 칸이 바로 사라진다.
  const [list, setList] = useState<DoctorEntry[]>(() => {
    const saved = parseDoctors(value);
    return saved.length ? saved : [emptyDoctor()];
  });
  const saved = parseDoctors(value);

  const write = (next: DoctorEntry[]) => {
    setList(next);
    onChange(stringifyDoctors(next));
  };

  const setPart = (index: number, key: keyof DoctorEntry, v: string) =>
    write(list.map((d, i) => (i === index ? { ...d, [key]: v } : d)));

  return (
    <div className="flex flex-col gap-3">
      {list.map((doctor, index) => (
        <div
          key={index}
          className={`${CARD} flex flex-col gap-3 px-4 py-4`}
        >
          <div className="flex items-center justify-between">
            <Text as="span" textStyle="t5Bold">
              의료진 {index + 1}
            </Text>
            {list.length > 1 && (
              <button
                type="button"
                onClick={() => write(list.filter((_, i) => i !== index))}
                aria-label={`의료진 ${index + 1} 삭제`}
                className="rounded-lg p-1 text-[var(--seed-color-fg-neutral-subtle)] transition-colors hover:bg-[var(--seed-color-bg-neutral-weak)]"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {DOCTOR_PARTS.map((part) => (
            <div key={part.key} className="flex flex-col gap-1.5">
              <div className="flex items-baseline gap-1.5">
                <Text as="span" textStyle="t4Bold" color="fg.neutralSubtle">
                  {part.label}
                </Text>
                {part.required ? (
                  <span className="text-[var(--seed-color-fg-brand)]">*</span>
                ) : (
                  <Text as="span" textStyle="t3Regular" color="fg.neutralSubtle">
                    선택
                  </Text>
                )}
              </div>
              {part.rows > 0 ? (
                <textarea
                  value={doctor[part.key]}
                  onChange={(e) => setPart(index, part.key, e.target.value)}
                  placeholder={part.placeholder}
                  aria-label={`의료진 ${index + 1} ${part.label}`}
                  rows={part.rows}
                  className={`${INPUT} resize-y leading-[1.6]`}
                />
              ) : (
                <input
                  value={doctor[part.key]}
                  onChange={(e) =>
                    setPart(
                      index,
                      part.key,
                      part.digitsOnly ? e.target.value.replace(/\D/g, "").slice(0, 10) : e.target.value,
                    )
                  }
                  placeholder={part.placeholder}
                  aria-label={`의료진 ${index + 1} ${part.label}`}
                  inputMode={part.digitsOnly ? "numeric" : undefined}
                  className={INPUT}
                />
              )}
            </div>
          ))}
        </div>
      ))}

      {list.length < max && (
        <ActionButton
          variant="neutralWeak"
          size="large"
          className="w-full"
          onClick={() => write([...list, emptyDoctor()])}
        >
          <span className="flex items-center justify-center gap-1.5">
            <Plus size={18} />
            {addLabel}
          </span>
        </ActionButton>
      )}

      <Text textStyle="t4Regular" color="fg.neutralSubtle" className="text-right">
        {saved.length}
        {unit} 등록
      </Text>
    </div>
  );
}

// ── 칸을 나눠 받는 문항 (키워드·보유 장비) ──
function SlotInputs({
  def,
  value,
  onChange,
}: {
  def: GeoIntakeFieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const { count, unit } = def.repeat!;
  const slots = slotValues(value, count);
  const filled = lineList(value).length;
  const enough = def.key === "keywords" ? filled >= KEYWORD_MONTH_MIN : filled > 0;

  const setSlot = (i: number, v: string) => {
    const next = [...slots];
    next[i] = v.replace(/\n/g, " ");
    onChange(joinSlots(next));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Text textStyle="t4Regular" color="fg.neutralSubtle">
          {def.key === "keywords"
            ? enough
              ? "한 달 치를 채웠어요"
              : filled === 0
                ? "10개만 적어주셔도 괜찮아요"
                : "남은 칸은 저희가 채워드릴게요"
            : "빈 칸은 비워두셔도 돼요"}
        </Text>
        <Text textStyle="t4Bold" color={enough ? "fg.brand" : "fg.neutralSubtle"}>
          {filled} / {count}
          {unit}
        </Text>
      </div>

      <div className="flex flex-col gap-1.5">
        {slots.map((v, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <Text textStyle="t4Medium" color="fg.neutralSubtle" className="w-5 shrink-0 text-right">
              {i + 1}
            </Text>
            <input
              value={v}
              onChange={(e) => setSlot(i, e.target.value)}
              placeholder={def.placeholder}
              aria-label={`${def.label} ${i + 1}`}
              className={INPUT}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 입력 확인 + 개인정보 동의 ──
function ConfirmScreen({
  answers,
  consent,
  onConsent,
  error,
}: {
  answers: GeoIntakeAnswers;
  consent: boolean;
  onConsent: (v: boolean) => void;
  error: string;
}) {
  return (
    <div>
      <ScreenHeading
        title={
          <>
            입력하신 내용을
            <br />
            확인해 주세요
          </>
        }
        subtitle="제출한 뒤에는 이 링크로 수정할 수 없어요. 고칠 내용이 있으면 이전으로 돌아가세요."
      />

      <div className="flex flex-col gap-6">
        {STEPS.map((step) => (
          <section key={step.title} className="flex flex-col gap-2">
            <Text as="p" textStyle="t4Bold" color="fg.neutralSubtle">
              {step.title}
            </Text>
            <div className={`${CARD} px-4`}>
              {step.id === "hours"
                ? DAYS.map((day) => {
                    const line = dayLine(day, answers);
                    return <SummaryRow key={day.hours} label={day.label} value={line || "—"} filled={!!line} />;
                  })
                : step.keys.map((key) => {
                    const def = FIELD_BY_KEY.get(key)!;
                    if (!isVisible(def, answers)) return null;
                    const raw = answers[key]?.trim() ?? "";
                    // 계정 정보는 화면에 그대로 보이지 않게 입력 여부만 표시
                    const value = !raw
                      ? "—"
                      : def.secret
                        ? "입력함"
                        : def.group
                          ? parseDoctors(raw)
                              .map((d) => doctorLine(d))
                              .join("\n")
                          : def.repeat
                          ? `${lineList(raw).length}${def.repeat.unit}`
                          : displayValue(def, raw);
                    return (
                      <SummaryRow key={key} label={def.shortLabel ?? def.label} value={value} filled={!!raw} />
                    );
                  })}
            </div>
          </section>
        ))}

        <label className={`${CARD} flex cursor-pointer gap-3 px-4 py-4`}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => onConsent(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--seed-color-bg-brand-solid)]"
          />
          <span className="flex flex-col gap-1.5">
            <Text as="span" textStyle="t5Bold">
              개인정보 수집·이용에 동의합니다{" "}
              <span className="text-[var(--seed-color-fg-brand)]">*</span>
            </Text>
            <Text as="span" textStyle="t4Regular" color="fg.neutralSubtle" className="leading-[1.6]">
              수집 항목: 담당자 성함·연락처, 홈페이지 주소, FTP·CAFE24 계정 정보
              <br />
              수집 목적: 홈페이지 제작 및 GEO 작업 · 보유 기간: 계약 종료 시까지
              <br />
              동의하지 않으실 수 있으나, 이 경우 작업 진행이 어렵습니다.
            </Text>
          </span>
        </label>

        {error && (
          <div className={`${ERROR_BOX} px-4 py-3.5`}>
            <Text as="p" textStyle="t4Medium" color="fg.critical">
              {error}
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, filled }: { label: string; value: string; filled: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--seed-color-stroke-neutral-muted)] py-3.5 last:border-0">
      <Text textStyle="t4Regular" color="fg.neutralSubtle" className="shrink-0">
        {label}
      </Text>
      <Text
        textStyle="t4Medium"
        color={filled ? "fg.neutral" : "fg.neutralSubtle"}
        className="max-w-[62%] whitespace-pre-wrap break-words text-right leading-[1.5]"
      >
        {value}
      </Text>
    </div>
  );
}

// ── 제출 완료 ──
function DoneScreen({ company }: { company: string }) {
  return (
    <div className="flex flex-1 items-center justify-center px-5 py-20">
      <div className="flex w-full max-w-[480px] flex-col items-center gap-5 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--seed-color-bg-brand-solid)]">
          <Check size={30} strokeWidth={3} className="text-[var(--seed-color-fg-brand-contrast)]" />
        </span>
        <div className="flex flex-col gap-2">
          <Text as="p" textStyle="t8Bold">
            제출이 완료되었습니다
          </Text>
          <Text as="p" textStyle="t5Regular" color="fg.neutralSubtle" className="leading-[1.55]">
            {company ? `${company} ` : ""}정보를 보내주셔서 감사합니다.
            <br />
            확인 후 연락드릴게요.
          </Text>
        </div>
      </div>
    </div>
  );
}
