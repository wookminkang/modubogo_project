"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  FileUp,
  Paperclip,
  Pencil,
  X,
} from "lucide-react";
import { Dialog } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { Text } from "seed-design/ui/text";
import {
  TEXT_FIELDS,
  FILE_FIELDS,
  type TextFieldDef,
  type FileFieldDef,
  type IntakeFiles,
  type IntakeFileMeta,
} from "@/lib/intake-fields";
import { submitIntake } from "@/lib/intake-actions";

// ── 필드 정의 조회용 맵 ──────────────────────────────────────
const TEXT_DEF = new Map(TEXT_FIELDS.map((f) => [f.key, f]));
const FILE_DEF = new Map(FILE_FIELDS.map((f) => [f.key, f]));

type FieldKey = TextFieldDef["key"] | FileFieldDef["key"];

// 파일 삭제 확인 대상
type RemoveReq =
  | { kind: "new"; key: string; idx: number; name: string }
  | { kind: "existing"; key: string; path: string; name: string };

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
  submitted,
  initialCompany,
  initialText,
  initialFiles,
}: {
  nanoid: string;
  submitted: boolean;
  initialCompany: string;
  initialText: Record<string, string>;
  initialFiles: IntakeFiles;
}) {
  // 제출 완료 상태면 먼저 "이미 제출됨" 안내 화면을 보여준다(수정하기 누르면 폼 진입).
  const [reviewing, setReviewing] = useState(submitted);
  // screen: 0 = intro, 1..STEPS.length = 스텝, STEPS.length+1 = 확인
  const [screen, setScreen] = useState(0);
  const [company, setCompany] = useState(initialCompany);
  const [text, setText] = useState<Record<string, string>>(initialText);
  // 새로 추가한 파일 (File 객체)
  const [files, setFiles] = useState<Record<string, File[]>>({});
  // 기존에 제출된 파일 메타 (유지/삭제 대상)
  const [existing, setExisting] = useState<IntakeFiles>(initialFiles);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  // 파일 삭제 확인 다이얼로그 대상
  const [removeReq, setRemoveReq] = useState<RemoveReq | null>(null);

  const CONFIRM = STEPS.length + 1;

  // 화면 전환 시 최상단으로 (퍼널 UX)
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen, reviewing, done]);

  const setTextValue = (k: string, v: string) =>
    setText((p) => ({ ...p, [k]: v }));

  const addFiles = (k: string, list: FileList | null, multiple: boolean) => {
    if (!list || !list.length) return;
    const incoming = Array.from(list);
    setFiles((p) => ({
      ...p,
      [k]: multiple ? [...(p[k] ?? []), ...incoming] : [incoming[0]],
    }));
    // 단일 파일 항목을 새로 올리면 기존 파일은 교체로 간주해 제거
    if (!multiple) setExisting((p) => ({ ...p, [k]: [] }));
  };
  const removeFile = (k: string, idx: number) =>
    setFiles((p) => ({ ...p, [k]: (p[k] ?? []).filter((_, i) => i !== idx) }));
  const removeExisting = (k: string, path: string) =>
    setExisting((p) => ({
      ...p,
      [k]: (p[k as FileFieldDef["key"]] ?? []).filter((m) => m.path !== path),
    }));

  // X 클릭 → 확인 다이얼로그에서 "예" 누르면 실제 삭제
  const confirmRemove = () => {
    const r = removeReq;
    if (!r) return;
    if (r.kind === "new") removeFile(r.key, r.idx);
    else removeExisting(r.key, r.path);
    setRemoveReq(null);
  };

  const move = (dir: 1 | -1) =>
    setScreen((s) => Math.min(CONFIRM, Math.max(0, s + dir)));

  // 스텝 진행 가능 여부 (현재는 계산서 이메일만 필수)
  const stepValid = (stepIdx: number) => {
    const step = STEPS[stepIdx - 1];
    if (!step) return true;
    if (step.keys.includes("billing_email"))
      return isEmail(text["billing_email"] ?? "");
    return true;
  };

  const phase = screen === 0 ? 0 : screen === CONFIRM ? TOTAL_PHASES : screen;

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("company", company.trim());
      for (const f of TEXT_FIELDS) fd.set(f.key, text[f.key] ?? "");
      for (const f of FILE_FIELDS) {
        for (const file of files[f.key] ?? []) fd.append(f.key, file);
        // 유지할 기존 파일 경로 전달
        for (const m of existing[f.key] ?? []) fd.append("keep", m.path);
      }
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

  // 제출 완료 후 재진입 — 안내 화면 + 수정하기
  if (reviewing)
    return (
      <AlreadyScreen
        company={company}
        onEdit={() => {
          setReviewing(false);
          setScreen(1); // 안내(intro) 건너뛰고 첫 스텝부터
        }}
      />
    );

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
        {submitted ? "수정 내용 제출" : "제출하기"}
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
            editing={submitted}
          />
        )}

        {screen >= 1 && screen <= STEPS.length && (
          <StepScreen
            step={STEPS[screen - 1]}
            index={screen}
            total={STEPS.length}
            text={text}
            files={files}
            existing={existing}
            onText={setTextValue}
            onAddFiles={addFiles}
            onRequestRemove={setRemoveReq}
          />
        )}

        {screen === CONFIRM && (
          <ConfirmScreen
            company={company}
            text={text}
            files={files}
            existing={existing}
            error={error}
          />
        )}

        <StickyBar>{cta}</StickyBar>
      </div>

      {/* 파일 삭제 확인 다이얼로그 */}
      <Dialog.Root
        open={!!removeReq}
        onOpenChange={(open) => {
          if (!open) setRemoveReq(null);
        }}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>파일을 삭제할까요?</Dialog.Title>
              <Dialog.Description>
                {removeReq?.name
                  ? `'${removeReq.name}' 파일을 목록에서 제거합니다.`
                  : "이 파일을 목록에서 제거합니다."}
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
              <div className="grid w-full grid-cols-2 gap-2">
                <ActionButton
                  variant="neutralWeak"
                  className="w-full"
                  onClick={() => setRemoveReq(null)}
                >
                  아니요
                </ActionButton>
                <ActionButton
                  variant="brandSolid"
                  className="w-full"
                  onClick={confirmRemove}
                >
                  예
                </ActionButton>
              </div>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
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
  editing,
}: {
  company: string;
  onCompany: (v: string) => void;
  defaultLocked: boolean;
  editing: boolean;
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
          {editing
            ? "이미 제출한 내용을 불러왔어요. 수정 후 다시 제출해 주세요."
            : "5단계로 나눠 천천히 안내해 드릴게요. 가지고 계신 자료부터 올리시면 됩니다."}
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
  existing,
  onText,
  onAddFiles,
  onRequestRemove,
}: {
  step: StepDef;
  index: number;
  total: number;
  text: Record<string, string>;
  files: Record<string, File[]>;
  existing: IntakeFiles;
  onText: (k: string, v: string) => void;
  onAddFiles: (k: string, l: FileList | null, multiple: boolean) => void;
  onRequestRemove: (req: RemoveReq) => void;
}) {
  return (
    <div className="flex flex-col gap-5 py-5 pt-10">
      <div className="flex flex-col gap-2">
        <Text as="p" textStyle="t6Bold" color="fg.neutralSubtle">
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
                existing={existing[fdef.key] ?? []}
                onAdd={(l) => onAddFiles(key, l, fdef.multiple)}
                onRequestRemove={onRequestRemove}
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
  existing,
  onAdd,
  onRequestRemove,
}: {
  def: FileFieldDef;
  value: File[];
  existing: IntakeFileMeta[];
  onAdd: (l: FileList | null) => void;
  onRequestRemove: (req: RemoveReq) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const hasAny = value.length > 0 || existing.length > 0;
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel no={def.no} label={def.label} hint={def.hint} />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--seed-color-stroke-neutral)] bg-[var(--seed-color-bg-neutral-weak)] px-4 py-4 text-sm font-semibold text-[var(--seed-color-fg-neutral-subtle)] transition-colors hover:border-[var(--seed-color-bg-brand-solid)] hover:bg-[var(--seed-color-bg-brand-solid)] hover:text-white"
      >
        <FileUp size={18} />
        {hasAny && !def.multiple
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
      {hasAny && (
        <div className="flex flex-col gap-1.5">
          {/* 기존 제출 파일 */}
          {existing.map((m) => (
            <FileRow
              key={m.path}
              name={m.name}
              size={m.size}
              badge="기존"
              onRemove={() =>
                onRequestRemove({
                  kind: "existing",
                  key: def.key,
                  path: m.path,
                  name: m.name,
                })
              }
            />
          ))}
          {/* 새로 추가한 파일 */}
          {value.map((f, idx) => (
            <FileRow
              key={`${f.name}-${idx}`}
              name={f.name}
              size={f.size}
              onRemove={() =>
                onRequestRemove({
                  kind: "new",
                  key: def.key,
                  idx,
                  name: f.name,
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileRow({
  name,
  size,
  badge,
  onRemove,
}: {
  name: string;
  size: number;
  badge?: string;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-[var(--seed-color-bg-neutral-weak)] px-3 py-2">
      <Paperclip
        size={14}
        className="shrink-0 text-[var(--seed-color-fg-neutral-subtle)]"
      />
      <span className="min-w-0 flex-1 truncate text-sm text-[var(--seed-color-fg-neutral)]">
        {name}
      </span>
      {badge && (
        <span className="shrink-0 rounded bg-[var(--seed-color-bg-neutral)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--seed-color-fg-neutral-subtle)]">
          {badge}
        </span>
      )}
      <span className="shrink-0 text-xs text-[var(--seed-color-fg-neutral-subtle)]">
        {fmtSize(size)}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="삭제"
        className="shrink-0 cursor-pointer rounded-full p-0.5 text-[var(--seed-color-fg-neutral-subtle)] hover:bg-[var(--seed-color-bg-neutral)] hover:text-[var(--seed-color-fg-neutral)]"
      >
        <X size={15} />
      </button>
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
  existing,
  error,
}: {
  company: string;
  text: Record<string, string>;
  files: Record<string, File[]>;
  existing: IntakeFiles;
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
          {TEXT_FIELDS.map((f) => {
            const v = text[f.key]?.trim();
            return (
              <SummaryRow
                key={f.key}
                no={f.no}
                label={f.label}
                value={v || "—"}
                emphasize={!!v}
              />
            );
          })}
          {FILE_FIELDS.map((f) => {
            const count = (existing[f.key]?.length ?? 0) + (files[f.key]?.length ?? 0);
            return (
              <SummaryRow
                key={f.key}
                no={f.no}
                label={f.label}
                value={count ? `파일 ${count}개` : "—"}
                emphasize={count > 0}
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
        color={emphasize ? "fg.neutral" : "fg.neutralSubtle"}
      >
        {value}
      </Text>
    </div>
  );
}

// ── 제출 완료 후 재진입 안내 (수정하기) ──
function AlreadyScreen({
  company,
  onEdit,
}: {
  company: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--seed-color-bg-brand-solid)]">
        <CheckCircle2 size={28} className="text-white" />
      </span>
      <Text as="p" textStyle="t8Bold">
        이미 제출이 완료되었어요
      </Text>
      <Text
        as="p"
        textStyle="t6Regular"
        color="fg.neutralSubtle"
        className="mt-2 max-w-[300px]"
      >
        {company ? `${company} ` : ""}준비자료가 정상적으로 접수되었습니다.
        내용을 바꾸시려면 수정해 주세요.
      </Text>
      <div className="mt-6 w-full max-w-[300px]">
        <ActionButton
          variant="brandSolid"
          size="large"
          className="w-full"
          onClick={onEdit}
        >
          <Pencil size={16} />
          제출 내용 수정하기
        </ActionButton>
      </div>
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
