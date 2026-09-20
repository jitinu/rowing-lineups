"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, ErrorNotice, Spinner, Textarea } from "@/components/ui";
import type { Coach, SessionNote } from "@/domain/types";
import { upsertMyNote } from "@/lib/actions/sessions";
import { cn } from "@/lib/cn";
import { formatTimestamp } from "@/lib/format";

export function NotesPanel({
  sessionId,
  notes,
  coaches,
  myCoachId,
}: {
  sessionId: string;
  notes: SessionNote[];
  coaches: Coach[];
  myCoachId: string | null;
}) {
  const ordered = [...coaches].sort((a, b) => (a.id === myCoachId ? -1 : b.id === myCoachId ? 1 : a.name.localeCompare(b.name)));
  return (
    <section aria-label="Coach notes">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-3">Notes</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((coach) => {
          const note = notes.find((n) => n.coach_id === coach.id);
          return coach.id === myCoachId ? (
            <MyNote key={coach.id} sessionId={sessionId} coach={coach} note={note} />
          ) : (
            <NoteCard key={coach.id} coach={coach} note={note} />
          );
        })}
      </div>
    </section>
  );
}

function NoteCard({ coach, note, children, className }: { coach: Coach; note?: SessionNote; children?: React.ReactNode; className?: string }) {
  return (
    <article className={cn("flex min-h-28 flex-col rounded-card border border-border bg-bg p-3", className)}>
      <header className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{coach.name}</span>
        {note ? <time className="text-[11px] text-text-3" dateTime={note.updated_at}>{formatTimestamp(note.updated_at)}</time> : null}
      </header>
      {children ?? (note ? <p className="whitespace-pre-wrap text-sm text-text-2">{note.body}</p> : <p className="text-xs text-text-3">No note</p>)}
    </article>
  );
}

function MyNote({ sessionId, coach, note }: { sessionId: string; coach: Coach; note?: SessionNote }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!note);
  const [draft, setDraft] = useState(note?.body ?? "");
  const [saved, setSaved] = useState(note?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    start(async () => {
      const res = await upsertMyNote(sessionId, draft);
      if (!res.ok) return setError(res.error);
      setSaved(draft.trim());
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <NoteCard coach={coach} note={note} className="border-border-strong">
      {editing ? (
        <div className="flex flex-1 flex-col gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Your note for this session"
            aria-label="Your note"
            className="flex-1 resize-none"
          />
          {error ? <ErrorNotice message={error} /> : null}
          <div className="flex justify-end gap-2">
            {saved ? (
              <Button size="sm" variant="ghost" onClick={() => { setDraft(saved); setEditing(false); }} disabled={pending}>
                Cancel
              </Button>
            ) : null}
            <Button size="sm" variant="primary" onClick={save} disabled={pending || (!saved && !draft.trim())}>
              {pending ? <Spinner className="text-on-accent" /> : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <p className="flex-1 whitespace-pre-wrap text-sm text-text-2">{saved}</p>
          <div className="mt-2 flex justify-end">
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)} aria-label="Edit note">
              <Pencil className="size-3.5" aria-hidden />
              Edit
            </Button>
          </div>
        </div>
      )}
    </NoteCard>
  );
}
