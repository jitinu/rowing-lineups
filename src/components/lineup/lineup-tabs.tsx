"use client";

import { ChevronLeft, ChevronRight, Copy, MoreHorizontal, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui";
import type { Lineup } from "@/domain/types";
import { cn } from "@/lib/cn";

export interface LineupTabsProps {
  lineups: Lineup[];
  activeId: string | null;
  canEdit: boolean;
  busy: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onClone: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onSetPrimary: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onDelete: (id: string) => void;
}

export function LineupTabs(props: LineupTabsProps) {
  const { lineups, activeId, canEdit, busy, onSelect, onCreate, onClone } = props;
  const active = lineups.find((l) => l.id === activeId) ?? null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      <div role="tablist" aria-label="Lineups" className="flex flex-wrap items-center gap-1">
        {lineups.map((l) => (
          <button
            key={l.id}
            role="tab"
            type="button"
            aria-selected={l.id === activeId}
            onClick={() => onSelect(l.id)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm",
              l.id === activeId ? "border-text bg-text text-bg" : "border-border text-text-2 hover:bg-surface",
            )}
          >
            {l.is_primary ? <Star className={cn("size-3.5", l.id === activeId ? "fill-bg" : "fill-accent text-accent")} aria-label="Primary" /> : null}
            {l.name}
          </button>
        ))}
      </div>
      {canEdit ? (
        <div className="flex items-center gap-1">
          {active ? <LineupMenu lineup={active} index={lineups.findIndex((l) => l.id === active.id)} count={lineups.length} {...props} /> : null}
          {active ? (
            <Button size="sm" variant="ghost" onClick={() => onClone(active.id)} disabled={busy} title="Clone lineup">
              <Copy className="size-3.5" aria-hidden />
              Clone
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={onCreate} disabled={busy} title="New empty lineup">
            <Plus className="size-3.5" aria-hidden />
            New
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function LineupMenu({ lineup, index, count, busy, onRename, onSetPrimary, onMove, onDelete }: LineupTabsProps & { lineup: Lineup; index: number; count: number }) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(lineup.name);

  if (renaming) {
    return (
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && name.trim() !== lineup.name) onRename(lineup.id, name);
          setRenaming(false);
        }}
      >
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setRenaming(false)}
          aria-label="Lineup name"
          className="h-8 w-32 rounded-md border border-border-strong px-2 text-sm"
        />
      </form>
    );
  }

  const item = (label: string, icon: React.ReactNode, onClick: () => void, opts: { disabled?: boolean; danger?: boolean } = {}) => (
    <li>
      <button
        type="button"
        role="menuitem"
        disabled={opts.disabled}
        onClick={() => {
          setOpen(false);
          onClick();
        }}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface disabled:opacity-40",
          opts.danger && "text-accent",
        )}
      >
        {icon}
        {label}
      </button>
    </li>
  );

  return (
    <div className="relative">
      <Button size="icon" variant="ghost" onClick={() => setOpen((v) => !v)} aria-label="Lineup actions" aria-haspopup="menu" aria-expanded={open} disabled={busy}>
        <MoreHorizontal className="size-4" />
      </Button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Close menu" onClick={() => setOpen(false)} />
          <ul role="menu" className="absolute left-0 z-20 mt-1 w-44 overflow-hidden rounded-md border border-border bg-bg py-1 shadow-md">
            {item("Rename", <Pencil className="size-3.5" aria-hidden />, () => { setName(lineup.name); setRenaming(true); })}
            {item("Set primary", <Star className="size-3.5" aria-hidden />, () => onSetPrimary(lineup.id), { disabled: lineup.is_primary })}
            {item("Move left", <ChevronLeft className="size-3.5" aria-hidden />, () => onMove(lineup.id, -1), { disabled: index === 0 })}
            {item("Move right", <ChevronRight className="size-3.5" aria-hidden />, () => onMove(lineup.id, 1), { disabled: index === count - 1 })}
            {item("Delete", <Trash2 className="size-3.5" aria-hidden />, () => onDelete(lineup.id), { danger: true })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
