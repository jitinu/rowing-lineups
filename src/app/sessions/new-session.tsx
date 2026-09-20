"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useState } from "react";

import { Button, ErrorNotice, Input, Label, Select, Spinner } from "@/components/ui";
import { SLOTS } from "@/domain/types";
import { createSession } from "@/lib/actions/sessions";
import { todayIso } from "@/lib/format";

export function NewSessionButton({ existing }: { existing: string[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createSession, null);
  const [date, setDate] = useState(todayIso());
  const [slot, setSlot] = useState<string>(existing.includes(`${todayIso()}:AM`) ? "PM" : "AM");
  const taken = existing.includes(`${date}:${slot}`);

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        Session
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-2 rounded-card border border-border bg-surface p-3">
      <div className="space-y-1">
        <Label htmlFor="session_date">Date</Label>
        <Input
          id="session_date"
          name="session_date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-40"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="slot">Slot</Label>
        <Select id="slot" name="slot" value={slot} onChange={(e) => setSlot(e.target.value)} className="w-24">
          {SLOTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="Optional" className="w-48" />
      </div>
      <Button type="submit" variant="primary" disabled={pending || taken}>
        {pending ? <Spinner className="text-on-accent" /> : "Create"}
      </Button>
      <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Cancel">
        <X className="size-4" />
      </Button>
      {taken ? <p className="w-full text-xs text-text-3">That slot already exists.</p> : null}
      {state && !state.ok ? <ErrorNotice message={state.error} className="w-full" /> : null}
    </form>
  );
}
