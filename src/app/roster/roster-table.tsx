"use client";

import { Archive, ArchiveRestore, Pencil, Search } from "lucide-react";
import { useState, useTransition } from "react";

import { SideMark } from "@/components/lineup/rower-chip";
import { Badge, Button, ErrorNotice } from "@/components/ui";
import type { Rower } from "@/domain/types";
import { setRowerActive } from "@/lib/actions/rowers";
import { cn } from "@/lib/cn";

import { RowerDialog } from "./rower-dialog";

export function RosterTable({ rowers, canEdit }: { rowers: Rower[]; canEdit: boolean }) {
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const q = query.trim().toLowerCase();
  const visible = rowers.filter((r) => (showInactive || r.active) && (!q || r.name.toLowerCase().includes(q) || r.squad?.toLowerCase().includes(q)));
  const sweep = visible.filter((r) => !r.is_coxswain);
  const cox = visible.filter((r) => r.is_coxswain);
  const inactiveCount = rowers.filter((r) => !r.active).length;

  function toggleActive(r: Rower) {
    setError(null);
    start(async () => {
      const res = await setRowerActive(r.id, !r.active);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-9 flex-1 min-w-48 items-center gap-2 rounded-md border border-border px-3">
          <Search className="size-4 text-text-3" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search roster" className="w-full bg-transparent text-sm outline-none placeholder:text-text-3" />
        </label>
        {inactiveCount > 0 ? (
          <label className="flex items-center gap-2 text-xs text-text-2">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="accent-accent" />
            Inactive ({inactiveCount})
          </label>
        ) : null}
      </div>
      {error ? <ErrorNotice message={error} /> : null}
      {visible.length === 0 ? <p className="py-8 text-center text-xs text-text-3">No matches</p> : null}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {sweep.length > 0 ? (
          <Section title="Rowers" count={sweep.length}>
            {sweep.map((r) => <RosterRow key={r.id} r={r} canEdit={canEdit} pending={pending} toggleActive={toggleActive} />)}
          </Section>
        ) : null}
        {cox.length > 0 ? (
          <Section title="Coxswains" count={cox.length}>
            {cox.map((r) => <RosterRow key={r.id} r={r} canEdit={canEdit} pending={pending} toggleActive={toggleActive} />)}
          </Section>
        ) : null}
      </div>
    </div>
  );
}

function RosterRow({ r, canEdit, pending, toggleActive }: { r: Rower; canEdit: boolean; pending: boolean; toggleActive: (r: Rower) => void }) {
  return (
    <li className={cn("flex h-10 items-center gap-2 px-3 text-sm", !r.active && "opacity-50")}>
      {r.is_coxswain ? (
        <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm border border-border text-[10px] font-semibold text-text-3">C</span>
      ) : (
        <SideMark side={r.side} />
      )}
      <span className="min-w-0 flex-1 truncate">{r.name}</span>
      {r.squad ? <Badge tone="outline" className="hidden sm:inline-flex">{r.squad}</Badge> : null}
      {r.class_year ? <span className="tabular hidden text-xs text-text-3 sm:inline">{r.class_year}</span> : null}
      <span className="tabular w-10 text-right text-xs text-text-3">{r.weight_kg ?? ""}</span>
      {canEdit ? (
        <span className="flex items-center">
          <RowerDialog
            rower={r}
            trigger={(open) => (
              <Button size="icon" variant="ghost" onClick={open} aria-label={`Edit ${r.name}`}>
                <Pencil className="size-3.5" />
              </Button>
            )}
          />
          <Button size="icon" variant="ghost" onClick={() => toggleActive(r)} disabled={pending} aria-label={r.active ? `Deactivate ${r.name}` : `Reactivate ${r.name}`}>
            {r.active ? <Archive className="size-3.5" /> : <ArchiveRestore className="size-3.5" />}
          </Button>
        </span>
      ) : null}
    </li>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-bg">
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-text-3">{title}</h2>
        <span className="tabular text-xs text-text-3">{count}</span>
      </header>
      <ul className="divide-y divide-border/70">{children}</ul>
    </section>
  );
}
