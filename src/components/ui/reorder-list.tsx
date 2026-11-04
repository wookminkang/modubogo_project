"use client";

import { useState, type PointerEvent, type ReactNode } from "react";
import { Reorder, useDragControls } from "motion/react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListProps {
  /** 항목 순서대로 나열한 고유 키 (useFieldArray 의 field.id) */
  ids: string[];
  /** 한 칸 옮겨질 때마다 호출된다 — useFieldArray 의 move(from, to) 를 그대로 넘기면 된다 */
  onMove: (from: number, to: number) => void;
  className?: string;
  children: ReactNode;
}

/**
 * 드래그로 순서를 바꾸는 세로 목록. 마우스·터치 모두 지원하고,
 * 화면 끝으로 끌면 자동으로 스크롤된다(motion Reorder).
 */
export function ReorderList({ ids, onMove, className, children }: ListProps) {
  const handleReorder = (next: string[]) => {
    // Reorder 는 한 번에 한 항목만 옮긴 배열을 넘겨준다 → 어디서 어디로 갔는지 찾는다
    let start = 0;
    while (start < ids.length && ids[start] === next[start]) start++;
    if (start === ids.length) return;
    let end = ids.length - 1;
    while (end > start && ids[end] === next[end]) end--;

    if (next[start] === ids[end]) onMove(end, start); // 위로 올림
    else onMove(start, end); // 아래로 내림
  };

  return (
    <Reorder.Group
      as="div"
      axis="y"
      values={ids}
      onReorder={handleReorder}
      className={cn("flex flex-col gap-3", className)}
    >
      {children}
    </Reorder.Group>
  );
}

interface ItemProps {
  id: string;
  className?: string;
  /** 넘겨받은 handle(드래그 손잡이)을 원하는 자리에 배치한다 */
  children: (handle: ReactNode) => ReactNode;
}

/** 손잡이를 잡았을 때만 끌린다 — 안쪽 입력칸·버튼은 평소처럼 쓸 수 있다. */
export function ReorderItem({ id, className, children }: ItemProps) {
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);

  const handle = (
    <button
      type="button"
      aria-label="드래그해서 순서 변경"
      onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        controls.start(e);
      }}
      className="-ml-1.5 flex h-7 w-6 cursor-grab touch-none select-none items-center justify-center rounded text-[var(--seed-color-fg-neutral-muted)] transition-colors hover:bg-[var(--seed-color-bg-neutral-weak-pressed)] hover:text-[var(--seed-color-fg-neutral)] active:cursor-grabbing"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );

  return (
    <Reorder.Item
      as="div"
      value={id}
      dragListener={false}
      dragControls={controls}
      layout="position"
      whileDrag={{ scale: 1.02 }}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      className={cn(dragging && "shadow-lg", className)}
    >
      {children(handle)}
    </Reorder.Item>
  );
}
