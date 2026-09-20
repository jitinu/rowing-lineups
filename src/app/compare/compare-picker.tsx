"use client";

import { ArrowLeftRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button, Label, Select, Spinner } from "@/components/ui";
import { sessionLabel } from "@/lib/format";
import type { SessionWithLineups } from "@/lib/queries";

export function ComparePicker({ sessions, a, b }: { sessions: SessionWithLineups[]; a: string | null; b: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  function navigate(next: { a: string | null; b: string | null }) {
    const qs = new URLSearchParams();
    if (next.a) qs.set("a", next.a);
    if (next.b) qs.set("b", next.b);
    start(() => router.replace(`${pathname}?${qs.toString()}`));
  }

  return (
    <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
      <Side label="A" sessions={sessions} value={a} onChange={(v) => navigate({ a: v, b })} />
      <div className="flex justify-center sm:pb-1">
        {pending ? (
          <Spinner />
        ) : (
          <Button size="icon" variant="ghost" aria-label="Swap A and B" onClick={() => navigate({ a: b, b: a })} disabled={!a && !b}>
            <ArrowLeftRight className="size-4" />
          </Button>
        )}
      </div>
      <Side label="B" sessions={sessions} value={b} onChange={(v) => navigate({ a, b: v })} />
    </div>
  );
}

function Side({
  label,
  sessions,
  value,
  onChange,
}: {
  label: string;
  sessions: SessionWithLineups[];
  value: string | null;
  onChange: (lineupId: string | null) => void;
}) {
  const session = sessions.find((s) => s.lineups.some((l) => l.id === value)) ?? null;
  const sessionSelectId = `cmp-${label}-session`;
  const lineupSelectId = `cmp-${label}-lineup`;

  function pickSession(sessionId: string) {
    const s = sessions.find((x) => x.id === sessionId);
    if (!s) return onChange(null);
    const primary = s.lineups.find((l) => l.is_primary) ?? s.lineups[0];
    onChange(primary?.id ?? null);
  }

  return (
    <fieldset className="grid gap-2 rounded-card border border-border bg-surface p-3">
      <legend className="px-1 text-xs font-semibold">{label}</legend>
      <div>
        <Label htmlFor={sessionSelectId}>Session</Label>
        <Select id={sessionSelectId} value={session?.id ?? ""} onChange={(e) => pickSession(e.target.value)}>
          <option value="">Choose</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {sessionLabel(s)}
              {s.title ? ` ${s.title}` : ""}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor={lineupSelectId}>Lineup</Label>
        <Select id={lineupSelectId} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} disabled={!session}>
          {!session ? <option value="">Choose a session</option> : null}
          {session?.lineups.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
              {l.is_primary ? " (primary)" : ""}
            </option>
          ))}
        </Select>
      </div>
    </fieldset>
  );
}
