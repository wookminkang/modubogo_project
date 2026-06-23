"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  FileUp,
  Paperclip,
  X,
} from "lucide-react";
import { ActionButton } from "seed-design/ui/action-button";
import { Text } from "seed-design/ui/text";
import {
  TEXT_FIELDS,
  FILE_FIELDS,
  type TextFieldDef,
  type FileFieldDef,
} from "@/lib/intake-fields";
import { submitIntake } from "@/lib/intake-actions";

// ── 필드 정의 조회용 맵 ──────────────────────────────────────
const TEXT_DEF = new Map(TEXT_FIELDS.map((f) => [f.key, f]));
const FILE_DEF = new Map(FILE_FIELDS.map((f) => [f.key, f]));

type FieldKey = TextFieldDef["key"] | FileFieldDef["key"];

// ── 12개 항목을 5개 섹션 스텝으로 그룹화 (진료일정 퍼널과 동일한 단계형 UX) ──
interface StepDef {
  title: string;
  subtitle: string;
  keys: FieldKey[];
}
const STEPS: StepDef[] = [
  {
    title: "기본 정보",
    subtitle: "세금계산서 발급에 필요한 정보예요.",
    keys: ["billing_email"],
  },
  {
    title: "필수 서류",
    subtitle: "사업자·개설 관련 서류를 올려주세요.",
    keys: ["business_license", "medical_open_cert"],
  },
  {
    title: "의료진 정보",
    subtitle: "의료진 현황과 자격·사진을 준비해 주세요.",
    keys: ["medical_staff", "specialist_certs", "staff_photos"],
  },
  {
    title: "병원 정보",
    subtitle: "병원 사진과 시설·장비 정보를 알려주세요.",
    keys: ["hospital_photos", "inpatient_rooms", "equipment_list"],
  },
  {
    title: "소개 자료",
    subtitle: "광고에 쓸 강점·문구·로고를 받을게요.",
    keys: ["strengths", "required_text", "logo"],
  },
];

const TOTAL_PHASES = STEPS.length; // 5
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const fmtSize = (n: number) =>
  n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))}KB`
    : `${(n / 1024 / 1024).toFixed(1)}MB`;

export default function IntakeForm({
  nanoid,
  company: initialCompany,
}: {
  nanoid: string;
  company: string;
}) {
  // screen: 0 = intro, 1..STEPS.length = 스텝, STEPS.length+1 = 확인
  const [screen, setScreen] = useState(0);
  const [company, setCompany] = useState(initialCompany);
  const [text, setText] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const CONFIRM = STEPS.length + 1;

  // 화면 전환 시 최상단으로 (퍼널 UX)
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen]);

  const setTextValue = (k: string, v: string) =>
    setText((p) => ({ ...p, [k]: v }));

  const addFiles = (k: string, list: FileList | null, multiple: boolean) => {
    if (!list || !list.length) return;
    const incoming = Array.from(list);
    setFiles((p) => ({
      ...p,
      [k]: multiple ? [...(p[k] ?? []), ...incoming] : [incoming[0]],
    }));
  };
  const removeFile = (k: string, idx: number) =>
    setFiles((p) => ({ ...p, [k]: (p[k] ?? []).filter((_, i) => i !== idx) }));

  const move = (dir: 1 | -1) =>
    setScreen((s) => Math.min(CONFIRM, Math.max(0, s + dir)));

  // 스텝 진행 가능 여부 (현재는 계산서 이메일만 필수)
  const stepValid = (stepIdx: number) => {
    const step = STEPS[stepIdx - 1];
    if (!step) return true;
    if (step.keys.includes("billing_email")) {
      return isEmail(text["billing_email"] ?? "");
    }
    return true;
  };

  const phase =
    screen === 0 ? 0 : screen === CONFIRM ? TOTAL_PHASES : screen;

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("company", company.trim());
      for (const f of TEXT_FIELDS) fd.set(f.key, text[f.key] ?? "");
      for (const f of FILE_FIELDS)
        for (const file of files[f.key] ?? []) fd.append(f.key, file);
      await submitIntake(nanoid, fd);
      setDone(true);
    } catch (e) {
      console.error("준비자료 제출 실패:", e);
      setError("제출에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  if (done) return <DoneScreen company={company} />;

  // ── 하단 CTA ──
  const ctaProps = {
    variant: "brandSolid" as const,
    size: "large" as const,
    className: "w-full",
  };
  let cta: React.ReactNode = null;
  if (screen === 0) {
    cta = (
      <ActionButton
        {...ctaProps}
        disabled={!company.trim()}
        onClick={() => move(1)}
      >
        시작하기
      </ActionButton>
    );
  } else if (screen === CONFIRM) {
    cta = (
      <ActionButton {...ctaProps} loading={saving} onClick={handleSubmit}>
        제출하기
      </ActionButton>
    );
  } else {
    const last = screen === STEPS.length;
    cta = (
      <ActionButton
        {...ctaProps}
        disabled={!stepValid(screen)}
        onClick={() => move(1)}
      >
        {last ? "입력 내용 확인" : "다음"}
      </ActionButton>
    );
  }

  return (
    <div className="flex-1 px-4 py-6">
      <div className="mx-auto flex max-w-[480px] flex-col rounded-2xl shadow-sm">
        <ProgressBar
          phase={phase}
          showBack={screen !== 0}
          onBack={() => move(-1)}
        />

        {screen === 0 && (
          <IntroScreen
            company={company}
            onCompany={setCompany}
            defaultLocked={!!initialCompany}
          />
        )}

        {screen >= 1 && screen <= STEPS.length && (
          <StepScreen
            step={STEPS[screen - 1]}
            index={screen}
            total={STEPS.length}
            text={text}
            files={files}
            onText={setTextValue}
            onAddFiles={addFiles}
            onRemoveFile={removeFile}
          />
        )}

        {screen === CONFIRM && (
          <ConfirmScreen
            company={company}
            text={text}
            files={files}
            error={error}
          />
        )}

        <StickyBar>{cta}</StickyBar>
      </div>
    </div>
  );
}

// ── 상단 진행 표시줄 + 뒤로가기 (진료일정 ProgressBar 동일 스타일) ──
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
          <ActionButton
            variant="ghost"
            size="xsmall"
            onClick={onBack}
            aria-label="이전"
          >
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

// ── 하단 고정 CTA 래퍼 ──
function StickyBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 rounded-b-2xl pt-3 pb-20 backdrop-blur">
      {children}
    </div>
  );
}

// ── 0단계 · 안내 ──
function IntroScreen({
  company,
  onCompany,
  defaultLocked,
}: {
  company: string;
  onCompany: (v: string) => void;
  defaultLocked: boolean;
}) {
  return (
    <div className="flex flex-col gap-5 py-5 pt-10">
      <div className="flex flex-col gap-2">
        <Text as="p" textStyle="t6Regular" color="fg.neutralSubtle">
          광고 준비자료 요청
        </Text>
        <Text as="h1" textStyle="t10Bold">
          광고에 필요한
          <br />
          자료를 보내주세요!
        </Text>
        <Text as="p" textStyle="t4Regular" color="fg.neutralSubtle">
          5단계로 나눠 천천히 안내해 드릴게요. 가지고 계신 자료부터 올리시면
          됩니다.
        </Text>
      </div>

      {/* 병원명 */}
      <div className="flex flex-col gap-2">
        <Text as="span" textStyle="t5Bold">
          병원명
        </Text>
        <input
          value={company}
          onChange={(e) => onCompany(e.target.value)}
          placeholder="병원(기관) 이름을 입력해 주세요"
          readOnly={defaultLocked}
          className="w-full rounded-xl border border-[var(--seed-color-stroke-neutral-muted)] bg-[var(--seed-color-bg-neutral-weak)] px-4 py-3 text-base text-[var(--seed-color-fg-neutral)] outline-none transition-colors focus:border-[var(--seed-color-stroke-brand)] read-only:opacity-80"
        />
      </div>

      {/* 진행 단계 안내 카드 */}
      <div className="flex flex-col gap-2 py-2">
        {STEPS.map((s, idx) => (
          <div key={idx}>
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
                <ChevronDown
                  size={20}
                  className="text-[var(--seed-color-fg-neutral-subtle)]"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 1~N단계 · 섹션별 입력 ──
function StepScreen({
  step,
  index,
  total,
  text,
  files,
  onText,
  onAddFiles,
  onRemoveFile,
}: {
  step: StepDef;
  index: number;
  total: number;
  text: Record<string, string>;
  files: Record<string, File[]>;
  onText: (k: string, v: string) => void;
  onAddFiles: (k: string, l: FileList | null, multiple: boolean) => void;
  onRemoveFile: (k: string, idx: number) => void;
}) {
  return (
    <div className="flex flex-col gap-5 py-5 pt-10">
      <div className="flex flex-col gap-2">
        <Text as="p" textStyle="t6Bold" color="fg.brand">
          STEP {index} / {total}
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
          const tdef = TEXT_DEF.get(key as TextFieldDef["key"]);
          if (tdef)
            return (
              <TextCard
                key={key}
                def={tdef}
                value={text[key] ?? ""}
                onChange={(v) => onText(key, v)}
              />
            );
          const fdef = FILE_DEF.get(key as FileFieldDef["key"]);
          if (fdef)
            return (
              <FileCard
                key={key}
                def={fdef}
                value={files[key] ?? []}
                onAdd={(l) => onAddFiles(key, l, fdef.multiple)}
                onRemove={(idx) => onRemoveFile(key, idx)}
              />
            );
          return null;
        })}
      </div>
    </div>
  );
}

// ── 텍스트(서술형) 입력 카드 ──
function TextCard({
  def,
  value,
  onChange,
}: {
  def: TextFieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const required = def.key === "billing_email";
  const inputCls =
    "w-full rounded-xl border border-[var(--seed-color-stroke-neutral-muted)] bg-[var(--seed-color-bg-neutral-weak)] px-4 py-3 text-base text-[var(--seed-color-fg-neutral)] outline-none transition-colors focus:border-[var(--seed-color-stroke-brand)] placeholder:text-[var(--seed-color-fg-neutral-subtle)]";
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel no={def.no} label={def.label} required={required} />
      {def.multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={def.placeholder}
          rows={4}
          className={`${inputCls} resize-none`}
        />
      ) : (
        <input
          type={def.type ?? "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={def.placeholder}
          className={inputCls}
        />
      )}
    </div>
  );
}

// ── 파일 업로드 카드 ──
function FileCard({
  def,
  value,
  onAdd,
  onRemove,
}: {
  def: FileFieldDef;
  value: File[];
  onAdd: (l: FileList | null) => void;
  onRemove: (idx: number) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel no={def.no} label={def.label} hint={def.hint} />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--seed-color-stroke-neutral)] bg-[var(--seed-color-bg-neutral-weak)] px-4 py-4 text-sm font-semibold text-[var(--seed-color-fg-neutral-subtle)] transition-colors hover:border-[var(--seed-color-stroke-brand)] hover:text-[var(--seed-color-fg-brand)]"
      >
        <FileUp size={18} />
        {value.length && !def.multiple
          ? "다시 선택하기"
          : def.multiple
            ? "파일 추가하기"
            : "파일 선택하기"}
      </button>
      <input
        ref={ref}
        type="file"
        accept={def.accept}
        multiple={def.multiple}
        className="hidden"
        onChange={(e) => {
          onAdd(e.target.files);
          e.target.value = ""; // 같은 파일 재선택 허용
        }}
      />
      {value.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {value.map((f, idx) => (
            <div
              key={`${f.name}-${idx}`}
              className="flex items-center gap-2 rounded-lg bg-[var(--seed-color-bg-neutral-weak)] px-3 py-2"
            >
              <Paperclip
                size={14}
                className="shrink-0 text-[var(--seed-color-fg-neutral-subtle)]"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--seed-color-fg-neutral)]">
                {f.name}
              </span>
              <span className="shrink-0 text-xs text-[var(--seed-color-fg-neutral-subtle)]">
                {fmtSize(f.size)}
              </span>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                aria-label="삭제"
                className="shrink-0 rounded-full p-0.5 text-[var(--seed-color-fg-neutral-subtle)] hover:bg-[var(--seed-color-bg-neutral)] hover:text-[var(--seed-color-fg-neutral)]"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldLabel({
  no,
  label,
  required,
  hint,
}: {
  no: number;
  label: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--seed-color-bg-neutral-weak)] px-1 text-xs font-bold text-[var(--seed-color-fg-neutral-subtle)]">
        {no}
      </span>
      <Text as="span" textStyle="t5Bold">
        {label}
      </Text>
      {required ? (
        <span className="text-xs font-bold text-[#e25151]">필수</span>
      ) : (
        <span className="text-xs text-[var(--seed-color-fg-neutral-subtle)]">
          선택
        </span>
      )}
      {hint && (
        <Text textStyle="t7Regular" color="fg.neutralSubtle">
          · {hint}
        </Text>
      )}
    </div>
  );
}

// ── 확인 화면 ──
function ConfirmScreen({
  company,
  text,
  files,
  error,
}: {
  company: string;
  text: Record<string, string>;
  files: Record<string, File[]>;
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
          내용이 맞으면 제출해 주세요. 수정하려면 이전으로 돌아가세요.
        </Text>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-[var(--seed-color-bg-neutral-weak)] px-4 py-3">
          <Text as="p" textStyle="t8Bold" className="break-keep">
            {company || "병원명 미입력"}
          </Text>
        </div>

        <div className="rounded-2xl bg-[var(--seed-color-bg-neutral-weak)] px-4">
          {TEXT_FIELDS.map((f) => (
            <SummaryRow
              key={f.key}
              no={f.no}
              label={f.label}
              value={text[f.key]?.trim() || "—"}
            />
          ))}
          {FILE_FIELDS.map((f) => {
            const list = files[f.key] ?? [];
            return (
              <SummaryRow
                key={f.key}
                no={f.no}
                label={f.label}
                value={
                  list.length
                    ? `파일 ${list.length}개`
                    : "—"
                }
                emphasize={list.length > 0}
              />
            );
          })}
        </div>

        {error && (
          <div className="rounded-xl bg-[#fdecec] px-4 py-3 text-sm font-medium text-[#c0392b]">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({
  no,
  label,
  value,
  emphasize,
}: {
  no: number;
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--seed-color-stroke-neutral-muted)] py-3 last:border-0">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="shrink-0 text-xs font-bold text-[var(--seed-color-fg-neutral-subtle)]">
          {no}
        </span>
        <Text textStyle="t5Bold" color="fg.neutralSubtle" className="truncate">
          {label}
        </Text>
      </div>
      <Text
        textStyle="t5Medium"
        className="max-w-[55%] whitespace-pre-wrap break-words text-right"
        color={emphasize ? "fg.brand" : "fg.neutral"}
      >
        {value}
      </Text>
    </div>
  );
}

// ── 완료 화면 ──
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
            {company ? `${company} ` : ""}준비자료를 보내주셔서 감사합니다.
            확인 후 연락드릴게요.
          </Text>
        </div>
      </div>
    </div>
  );
}
