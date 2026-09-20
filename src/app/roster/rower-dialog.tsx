"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useCallback, useEffect, useState } from "react";

import { Button, ErrorNotice, Input, Label, Select, Spinner } from "@/components/ui";
import { type Rower, SIDES } from "@/domain/types";
import type { ActionResult } from "@/lib/actions/result";
import { createRower, updateRower } from "@/lib/actions/rowers";

export function RowerDialog({ rower, trigger }: { rower?: Rower; trigger?: (open: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);
  return (
    <>
      {trigger ? (
        trigger(show)
      ) : (
        <Button variant="primary" size="sm" onClick={show}>
          <Plus className="size-3.5" aria-hidden />
          Add
        </Button>
      )}
      {open ? <RowerForm rower={rower} onClose={hide} /> : null}
    </>
  );
}

function RowerForm({ rower, onClose }: { rower?: Rower; onClose: () => void }) {
  const action = rower ? updateRower.bind(null, rower.id) : createRower;
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null);
  const [isCox, setIsCox] = useState(rower?.is_coxswain ?? false);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-text/30 p-0 sm:items-center sm:p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="rower-dialog-title" className="w-full max-w-md rounded-t-card border border-border bg-bg p-4 shadow-lg sm:rounded-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="rower-dialog-title" className="text-sm font-semibold">{rower ? "Edit rower" : "New rower"}</h2>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>
        <form action={formAction} className="space-y-3">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={rower?.name} required autoFocus maxLength={80} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_coxswain" checked={isCox} onChange={(e) => setIsCox(e.target.checked)} className="accent-accent" />
            Coxswain
          </label>
          <div className="grid grid-cols-2 gap-3">
            {!isCox ? (
              <div>
                <Label htmlFor="side">Side</Label>
                <Select id="side" name="side" defaultValue={rower?.side ?? "port"}>
                  {SIDES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </div>
            ) : null}
            <div>
              <Label htmlFor="weight_kg">Weight kg</Label>
              <Input id="weight_kg" name="weight_kg" type="number" step="0.1" min="30" max="200" inputMode="decimal" defaultValue={rower?.weight_kg ?? ""} />
            </div>
            <div>
              <Label htmlFor="class_year">Class year</Label>
              <Input id="class_year" name="class_year" type="number" min="2000" max="2100" inputMode="numeric" defaultValue={rower?.class_year ?? ""} />
            </div>
          </div>
          {!isCox ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="can_steer" defaultChecked={rower?.can_steer ?? false} className="accent-accent" />
              Can steer
            </label>
          ) : null}
          {state && !state.ok ? <ErrorNotice message={state.error} /> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? <Spinner className="text-on-accent" /> : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
