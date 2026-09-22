"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, ChevronDown } from "lucide-react";
import { ActionButton } from "seed-design/ui/action-button";
import { Text } from "seed-design/ui/text";
import { submitGeoIntake } from "@/lib/geo-intake-actions";
import {
  FIELD_BY_KEY,
  KEYWORD_MONTH_MIN,
  KEYWORD_TARGET,
  applyFormat,
  displayValue,
  doctorsFromHomepage,
  isRequired,
  isVisible,
  SECRET_KEYS,
  STEPS,
  keywordList,
  stepValid,
  type GeoIntakeAnswers,
  type GeoIntakeFieldDef,
  type GeoIntakeFieldKey,
  type GeoIntakeStep,
} from "@/lib/geo-intake-fields";

// GEO 병원 정보 폼 — 토스 퍼널. 준비자료 폼(IntakeForm.tsx)과 같은 뼈대:
// 안내(0) → 단계(1~N) → 입력 확인(N+1) → 제출 → 완료.
// 단계는 URL(?step=)에 반영해 브라우저 뒤로/앞으로가 단계 단위로 동작하고,
// 입력값은 localStorage 에 임시 저장해 새로고침해도 이어서 쓸 수 있다 (계정 문항은 제외).

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

// 입력 글자는 16px(text-base) 유지 — 16px 미만이면 iOS Safari 가 입력 칸을 누를 때 화면을 확대한다.
// 플레이스홀더만 14px 로 줄여 입력값과 구분되게 한다.
const inputCls =
  "w-full rounded-xl border border-[var(--seed-color-stroke-neutral-muted)] bg-[var(--seed-color-bg-neutral-weak)] px-4 py-3 text-base text-[var(--seed-color-fg-neutral)] outline-none transition-colors focus:border-[var(--seed-color-stroke-brand)] placeholder:text-sm placeholder:text-[var(--seed-color-fg-neutral-subtle)]";

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
    if (readStepFromUrl() !== screen) window.history.replaceState(null, "", stepUrl(screen));
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
    <div className="flex-1 px-4 py-6">
      <div className="mx-auto flex max-w-[480px] flex-col rounded-2xl">
        <ProgressBar phase={phase} showBack={screen !== 0} onBack={() => move(-1)} />

        {screen === 0 && <IntroScreen company={company} />}

        {screen >= 1 && screen <= STEPS.length && (
          <StepScreen
            step={STEPS[screen - 1]}
            index={screen}
            answers={answers}
            onChange={setValue}
          />
        )}

        {screen === CONFIRM && (
          <ConfirmScreen answers={answers} consent={consent} onConsent={setConsent} error={error} />
        )}

        <StickyBar>{cta}</StickyBar>
      </div>
    </div>
  );
}

// ── 상단 진행 표시줄 + 뒤로가기 (준비자료 폼과 동일 스타일) ──
function ProgressBar({
  phase,
  showBack,
  onBack,
}: {
  phase: number;
  showBack: boolean;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {showBack && (
        <div className="-mx-2 flex">
          <ActionButton variant="ghost" size="xsmall" onClick={onBack} aria-label="이전">
            <ArrowLeft size={18} />
          </ActionButton>
        </div>
      )}
      <div className="flex items-center gap-3">
        <Text textStyle="t7Bold" color="fg.neutralSubtle" className="shrink-0">
          {phase} / {TOTAL_PHASES}
        </Text>
        <div className="flex flex-1 gap-1.5">
          {Array.from({ length: TOTAL_PHASES }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < phase
                  ? "bg-[var(--seed-color-bg-brand-solid)]"
                  : "bg-[var(--seed-color-bg-brand-weak)]"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 하단 고정 CTA ──
function StickyBar({ children }: { children: React.ReactNode }) {
  return <div className="sticky bottom-0 z-[1] rounded-b-2xl pt-3 pb-20 backdrop-blur">{children}</div>;
}

// ── 0단계 · 안내 ──
function IntroScreen({ company }: { company: string }) {
  return (
    <div className="flex flex-col gap-5 py-5 pt-10">
      <div className="flex flex-col gap-2">
        <Text as="p" textStyle="t6Regular" color="fg.neutralSubtle">
          {company ? `${company} · ` : ""}홈페이지·GEO 정보 요청
        </Text>
        <Text as="h1" textStyle="t10Bold">
          홈페이지 제작에 필요한
          <br />
          정보를 알려주세요!
        </Text>
        <Text as="p" textStyle="t4Regular" color="fg.neutralSubtle">
          {STEPS.length}단계로 나눠 안내해 드릴게요. 약 10분이면 충분합니다.
        </Text>
      </div>

      <div className="flex flex-col gap-2 py-2">
        {STEPS.map((s, idx) => (
          <div key={s.title}>
            <div className="flex items-center gap-3 rounded-2xl p-2 py-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--seed-color-bg-neutral-weak)] text-sm font-bold text-[var(--seed-color-fg-neutral)]">
                {idx + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Text as="p" textStyle="t5Bold">
                  {s.title}
                </Text>
                <Text as="p" textStyle="t4Regular" color="fg.neutralSubtle">
                  {s.subtitle}
                </Text>
              </div>
            </div>
            {idx < STEPS.length - 1 && (
              <div className="flex justify-center">
                <ChevronDown size={20} className="text-[var(--seed-color-fg-neutral-subtle)]" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 1~N단계 · 입력 ──
function StepScreen({
  step,
  index,
  answers,
  onChange,
}: {
  step: GeoIntakeStep;
  index: number;
  answers: GeoIntakeAnswers;
  onChange: (k: GeoIntakeFieldKey, v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5 py-5 pt-10">
      <div className="flex flex-col gap-2">
        <Text as="p" textStyle="t6Bold" color="fg.neutralSubtle">
          STEP {index} / {STEPS.length}
        </Text>
        <Text as="h1" textStyle="t9Bold">
          {step.title}
        </Text>
        <Text as="p" textStyle="t4Regular" color="fg.neutralSubtle">
          {step.subtitle}
        </Text>
      </div>

      <div className="flex flex-col gap-6">
        {step.keys.map((key) => {
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
          <div className="rounded-xl bg-[var(--seed-color-bg-brand-weak)] px-4 py-3 text-sm text-[#0e299c]">
            기존 홈페이지의 의료진 소개를 참고해 작성할게요. 6단계에서 홈페이지 주소를 꼭 알려주세요.
          </div>
        )}
      </div>
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
  hint?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
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
                className={`rounded-xl border px-4 py-4 text-base font-semibold transition-colors ${
                  selected
                    ? "border-[var(--seed-color-stroke-brand)] bg-[var(--seed-color-bg-brand-weak)] text-[#0e299c]"
                    : "border-[var(--seed-color-stroke-neutral-muted)] bg-[var(--seed-color-bg-neutral-weak)] text-[var(--seed-color-fg-neutral)]"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      ) : def.multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={def.placeholder}
          rows={def.rows ?? 4}
          className={`${inputCls} resize-y`}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(applyFormat(def, e.target.value))}
          placeholder={def.placeholder}
          // 숫자만 받는 칸은 휴대폰에서 숫자 키패드가 뜨게
          inputMode={def.format === "phone" ? "tel" : def.format === "biz" ? "numeric" : undefined}
          type={def.format === "phone" ? "tel" : "text"}
          // 계정 문항은 브라우저 자동완성·저장 제안을 끈다
          autoComplete={def.secret ? "off" : undefined}
          className={inputCls}
        />
      )}
      {def.key === "keywords" && <KeywordCounter count={keywordList(value).length} />}
    </div>
  );
}

function KeywordCounter({ count }: { count: number }) {
  const full = count >= KEYWORD_MONTH_MIN;
  return (
    <div className="flex items-center justify-between">
      <Text textStyle="t3Regular" color="fg.neutralSubtle">
        {full
          ? "한 달 치를 채웠어요"
          : count === 0
            ? "빈 줄은 세지 않아요"
            : `한 달 치는 약 ${KEYWORD_TARGET}개예요`}
      </Text>
      <Text textStyle="t3Bold" color={full ? "fg.brand" : "fg.neutralSubtle"}>
        {count}개
      </Text>
    </div>
  );
}

function FieldLabel({ label, required, hint }: { label: string; required: boolean; hint?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Text as="span" textStyle="t5Bold">
        {label}
      </Text>
      {required ? (
        <span className="text-xs font-bold text-[#e25151]">필수</span>
      ) : (
        <span className="text-xs text-[var(--seed-color-fg-neutral-subtle)]">선택</span>
      )}
      {hint && (
        <Text textStyle="t3Regular" color="fg.neutralSubtle">
          · {hint}
        </Text>
      )}
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
    <div className="flex flex-col gap-5 py-5 pt-10">
      <div className="flex flex-col gap-2">
        <Text as="h1" textStyle="t10Bold">
          입력하신 내용을
          <br />
          확인해 주세요
        </Text>
        <Text as="p" textStyle="t6Regular" color="fg.neutralSubtle">
          내용이 맞으면 제출해 주세요. 수정하려면 이전으로 돌아가세요. 제출한 뒤에는 이 링크로 수정할 수 없어요.
        </Text>
      </div>

      {STEPS.map((step) => (
        <div key={step.title} className="flex flex-col gap-2">
          <Text as="p" textStyle="t6Bold" color="fg.neutralSubtle">
            {step.title}
          </Text>
          <div className="rounded-2xl bg-[var(--seed-color-bg-neutral-weak)] px-4">
            {step.keys.map((key) => {
              const def = FIELD_BY_KEY.get(key)!;
              if (!isVisible(def, answers)) return null;
              const raw = answers[key]?.trim() ?? "";
              // 계정 정보는 화면에 그대로 보이지 않게 입력 여부만 표시
              const value = !raw
                ? "—"
                : def.secret
                  ? "입력함"
                  : key === "keywords"
                    ? `${keywordList(raw).length}개`
                    : displayValue(def, raw);
              return (
                <SummaryRow key={key} label={def.shortLabel ?? def.label} value={value} emphasize={!!raw} />
              );
            })}
          </div>
        </div>
      ))}

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--seed-color-stroke-neutral-muted)] px-4 py-4">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => onConsent(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--seed-color-bg-brand-solid)]"
        />
        <span className="flex flex-col gap-1">
          <Text as="span" textStyle="t5Bold">
            개인정보 수집·이용에 동의합니다 <span className="text-[#e25151]">(필수)</span>
          </Text>
          <Text as="span" textStyle="t3Regular" color="fg.neutralSubtle">
            수집 항목: 담당자 성함·연락처, 홈페이지 주소, FTP·CAFE24 계정 정보
            <br />
            수집 목적: 홈페이지 제작 및 GEO 작업 · 보유 기간: 계약 종료 시까지
            <br />
            동의하지 않으실 수 있으나, 이 경우 작업 진행이 어렵습니다.
          </Text>
        </span>
      </label>

      {error && (
        <div className="rounded-xl bg-[#fdecec] px-4 py-3 text-sm font-medium text-[#c0392b]">{error}</div>
      )}
    </div>
  );
}

function SummaryRow({ label, value, emphasize }: { label: string; value: string; emphasize: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--seed-color-stroke-neutral-muted)] py-3 last:border-0">
      <Text textStyle="t5Bold" color="fg.neutralSubtle" className="shrink-0">
        {label}
      </Text>
      <Text
        textStyle="t5Medium"
        className="max-w-[60%] whitespace-pre-wrap break-words text-right"
        color={emphasize ? "fg.neutral" : "fg.neutralSubtle"}
      >
        {value}
      </Text>
    </div>
  );
}

// ── 제출 완료 ──
function DoneScreen({ company }: { company: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="mx-auto flex max-w-[480px] flex-col items-center gap-4 rounded-2xl px-6 py-14 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--seed-color-bg-brand-solid)]">
          <Check size={28} className="text-white" />
        </span>
        <div className="mb-2 flex flex-col gap-2">
          <Text as="p" textStyle="t8Bold">
            제출이 완료되었습니다
          </Text>
          <Text as="p" textStyle="t6Regular" color="fg.neutralSubtle">
            {company ? `${company} ` : ""}정보를 보내주셔서 감사합니다. 확인 후 연락드릴게요.
          </Text>
        </div>
      </div>
    </div>
  );
}
