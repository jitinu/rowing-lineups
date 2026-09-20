"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";

import type { Rower, Side } from "@/domain/types";
import { cn } from "@/lib/cn";

export function SideMark({ side, className }: { side: Side; className?: string }) {
  const letter = side === "port" ? "P" : side === "starboard" ? "S" : "B";
  return (
    <span
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-[10px] font-semibold leading-none",
        side === "both" ? "border border-border text-text-3" : "bg-surface-2 text-text-2",
        className,
      )}
      aria-label={side}
    >
      {letter}
    </span>
  );
}

export interface RowerChipProps {
  rower: Rower;
  dragId: string;
  disabled?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  trailing?: ReactNode;
  className?: string;
}

export function RowerChip({ rower, dragId, disabled, selected, dimmed, onClick, trailing, className }: RowerChipProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { rowerId: rower.id },
    disabled,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border bg-bg px-2 text-sm select-none",
        disabled ? "cursor-default" : "cursor-grab touch-none active:cursor-grabbing",
        selected ? "border-accent ring-1 ring-accent" : "border-border",
        dimmed && "opacity-50",
        isDragging && "z-20 opacity-90 shadow-md",
        className,
      )}
      onClick={onClick}
      {...(disabled ? {} : listeners)}
      {...(disabled ? {} : attributes)}
      data-rower-chip={rower.id}
    >
      {rower.is_coxswain ? (
        <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm border border-border text-[10px] font-semibold text-text-3" aria-label="coxswain">
          C
        </span>
      ) : (
        <SideMark side={rower.side} />
      )}
      <span className="min-w-0 flex-1 truncate">{rower.name}</span>
      {rower.weight_kg != null ? <span className="tabular text-[11px] text-text-3">{rower.weight_kg}</span> : null}
      {trailing}
    </div>
  );
}
