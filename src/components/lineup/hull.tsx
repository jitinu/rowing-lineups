import type { HTMLAttributes, ReactNode, Ref } from "react";

import { type Seat, SEATS, type Side } from "@/domain/types";
import { cn } from "@/lib/cn";

/** Top-down view: bow at the top, cox at the stern. Port is on the left, starboard on the right. */
export const BOW_TO_STERN: Seat[] = [...SEATS];

export type RigSide = Exclude<Side, "both">;

export function otherSide(side: RigSide): RigSide {
  return side === "port" ? "starboard" : "port";
}

export function HullHeader() {
  return (
    <div className="grid grid-cols-[2.5rem_1fr_2.5rem] px-1 pt-1 text-[10px] font-medium uppercase tracking-wide text-text-3" aria-hidden>
      <span className="text-center">Port</span>
      <span />
      <span className="text-center">Stbd</span>
    </div>
  );
}

/**
 * One seat row: [port oar zone] [hull cell] [starboard oar zone].
 * The hull cell draws the boat sides; the first and last rows round off the bow and stern.
 */
export function HullRow({
  ref,
  seat,
  children,
  port,
  starboard,
  className,
  cellClassName,
  ...rest
}: {
  ref?: Ref<HTMLLIElement>;
  seat: Seat;
  children: ReactNode;
  port?: ReactNode;
  starboard?: ReactNode;
  className?: string;
  cellClassName?: string;
} & Omit<HTMLAttributes<HTMLLIElement>, "children">) {
  const isBow = seat === "bow";
  const isStern = seat === "cox";
  return (
    <li ref={ref} className={cn("grid grid-cols-[2.5rem_1fr_2.5rem] items-stretch px-1", className)} {...rest}>
      <span className="flex items-center justify-end">{port}</span>
      <div
        className={cn(
          "flex min-w-0 items-center gap-1.5 border-x border-border-strong px-1.5 py-1",
          isBow && "rounded-t-[2.5rem] border-t pt-3",
          isStern && "rounded-b-2xl border-b pb-2",
          cellClassName,
        )}
      >
        {children}
      </div>
      <span className="flex items-center justify-start">{starboard}</span>
    </li>
  );
}

/** A sweep oar drawn from the hull outward. Dashed when the seated rower does not row this side. */
export function Oar({
  side,
  mismatch,
  onClick,
  label,
  className,
}: {
  side: RigSide;
  mismatch?: boolean;
  onClick?: () => void;
  label?: string;
  className?: string;
}) {
  const svg = (
    <svg
      viewBox="0 0 40 12"
      className={cn("h-3 w-10", side === "port" ? "" : "-scale-x-100", className)}
      aria-hidden
    >
      <line x1="40" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="2" strokeDasharray={mismatch ? "3 2" : undefined} />
      <rect x="1" y="2" width="12" height="8" rx="2" fill={mismatch ? "none" : "currentColor"} stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
  if (!onClick) {
    return (
      <span className={cn("inline-flex text-text-2", mismatch && "text-text")} title={label}>
        {svg}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn("inline-flex rounded p-0.5 text-text-2 hover:bg-surface-2 hover:text-text", mismatch && "text-text")}
    >
      {svg}
    </button>
  );
}

/** Empty oar zone that, when clickable, re-rigs the seat to this side. */
export function OarSlot({ onClick, label }: { onClick?: () => void; label: string }) {
  if (!onClick) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex h-4 w-10 items-center justify-center rounded text-transparent opacity-0 hover:bg-surface-2 hover:text-text-3 hover:opacity-100 focus-visible:opacity-100"
    >
      <span className="h-px w-6 border-t border-dashed border-current" />
    </button>
  );
}
