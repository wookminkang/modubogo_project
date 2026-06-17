'use client';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function OrderStepper({ value, onChange }: Props) {
  const num = parseInt(value) || 0;

  return (
    <div className="flex items-center gap-1 bg-[var(--seed-color-bg-neutral-weak)] px-2 py-0.5 rounded-lg">
      <span className="text-xs text-[var(--seed-color-fg-neutral)] font-medium">순서</span>
      <button
        type="button"
        onClick={() => onChange(String(Math.max(0, num - 1)))}
        className="w-5 h-5 flex items-center justify-center text-[var(--seed-color-fg-neutral)] hover:bg-[var(--seed-color-bg-neutral-weak-pressed)] rounded transition-colors text-sm font-bold"
      >
        −
      </button>
      <input
        type="number"
        min={0}
        value={num}
        onChange={(e) => onChange(String(Math.max(0, parseInt(e.target.value) || 0)))}
        className="w-7 text-center text-xs text-[var(--seed-color-fg-neutral)] font-bold bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(String(num + 1))}
        className="w-5 h-5 flex items-center justify-center text-[var(--seed-color-fg-neutral)] hover:bg-[var(--seed-color-bg-neutral-weak-pressed)] rounded transition-colors text-sm font-bold"
      >
        +
      </button>
    </div>
  );
}
