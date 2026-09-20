"use client";

import { useDroppable } from "@dnd-kit/core";
import { Ban, Check, MoreHorizontal, Search } from "lucide-react";
import { useMemo, useState } from "react";

import type { Availability, AvailabilityStatus, Rower } from "@/domain/types";
import { cn } from "@/lib/cn";

import { RowerChip } from "./rower-chip";

export interface RosterSidebarProps {
  rowers: Rower[];
  assignedIds: Set<string>;
  availability: Availability[];
  canEdit: boolean;
  selectedRowerId: string | null;
  onChipClick: (rower: Rower) => void;
  onAvailability: (rower: Rower, status: AvailabilityStatus | null) => void;
}

export function RosterSidebar({ rowers, assignedIds, availability, canEdit, selectedRowerId, onChipClick, onAvailability }: RosterSidebarProps) {
  const [query, setQuery] = useState("");
  const { setNodeRef, isOver } = useDroppable({ id: "roster", disabled: !canEdit });
  const availByRower = useMemo(() => new Map(availability.map((a) => [a.rower_id, a])), [availability]);

  const q = query.trim().toLowerCase();
  const visible = rowers.filter((r) => r.active && (!q || r.name.toLowerCase().includes(q)));
  const free = visible.filter((r) => !assignedIds.has(r.id) && !availByRower.has(r.id));
  const sweep = free.filter((r) => !r.is_coxswain);
  const cox = free.filter((r) => r.is_coxswain);
  const unavailable = visible.filter((r) => availByRower.has(r.id));
  const groupProps = { availByRower, assignedIds, canEdit, selectedRowerId, onChipClick, onAvailability };

  return (
    <aside
      ref={setNodeRef}
      className={cn("order-first flex flex-col rounded-card border border-border bg-surface lg:order-none lg:sticky lg:top-16 lg:self-start", isOver && "border-border-strong")}
      aria-label="Roster"
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Search className="size-4 text-text-3" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Roster"
          aria-label="Search roster"
          className="h-7 w-full bg-transparent text-sm outline-none placeholder:text-text-3"
        />
        <span className="tabular text-xs text-text-3">{free.length}</span>
      </div>
      <div className="flex-1 space-y-3 max-h-56 overflow-y-auto p-2 lg:max-h-[calc(100vh-10rem)]">
        {free.length === 0 && unavailable.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-text-3">{q ? "No matches" : "Everyone is seated"}</p>
        ) : null}
        <Group title="Rowers" items={sweep} {...groupProps} />
        <Group title="Coxswains" items={cox} {...groupProps} />
        <Group title="Out" items={unavailable} dimmed {...groupProps} />
      </div>
    </aside>
  );
}

function Group({
  title,
  items,
  dimmed,
  availByRower,
  assignedIds,
  canEdit,
  selectedRowerId,
  onChipClick,
  onAvailability,
}: {
  title: string;
  items: Rower[];
  dimmed?: boolean;
  availByRower: Map<string, Availability>;
} & Pick<RosterSidebarProps, "assignedIds" | "canEdit" | "selectedRowerId" | "onChipClick" | "onAvailability">) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-1 px-1 text-[11px] font-medium uppercase tracking-wide text-text-3">{title}</h3>
      <ul className="space-y-1">
        {items.map((r) => {
          const a = availByRower.get(r.id);
          return (
            <li key={r.id} className="flex items-center gap-1">
              <RowerChip
                rower={r}
                dragId={`roster:${r.id}`}
                disabled={!canEdit || !!a}
                dimmed={dimmed}
                selected={selectedRowerId === r.id}
                onClick={canEdit && !a ? () => onChipClick(r) : undefined}
                trailing={
                  a ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-text-2" title={a.reason ?? undefined}>
                      <Ban className="size-3" aria-hidden />
                      {a.status}
                    </span>
                  ) : assignedIds.has(r.id) ? (
                    <Check className="size-3.5 text-text-3" aria-label="Seated" />
                  ) : null
                }
              />
              {canEdit ? <AvailabilityMenu status={a?.status ?? null} onChange={(s) => onAvailability(r, s)} /> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AvailabilityMenu({ status, onChange }: { status: AvailabilityStatus | null; onChange: (s: AvailabilityStatus | null) => void }) {
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const open = anchor !== null;
  const options: { value: AvailabilityStatus | null; label: string }[] = [
    { value: null, label: "Available" },
    { value: "limited", label: "Limited" },
    { value: "out", label: "Out" },
  ];
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          if (open) return setAnchor(null);
          const r = e.currentTarget.getBoundingClientRect();
          setAnchor({ top: r.bottom + 4, right: window.innerWidth - r.right });
        }}
        className="flex size-7 items-center justify-center rounded-md text-text-3 hover:bg-surface-2 hover:text-text"
        aria-label="Availability"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Close menu" onClick={() => setAnchor(null)} />
          <ul
            role="menu"
            style={{ top: anchor.top, right: anchor.right }}
            className="fixed z-20 w-32 overflow-hidden rounded-md border border-border bg-bg py-1 shadow-md"
          >
            {options.map((o) => (
              <li key={o.label}>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={status === o.value}
                  onClick={() => {
                    setAnchor(null);
                    if (o.value !== status) onChange(o.value);
                  }}
                  className={cn("flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-surface", status === o.value && "font-medium")}
                >
                  {o.label}
                  {status === o.value ? <Check className="size-3.5" aria-hidden /> : null}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
