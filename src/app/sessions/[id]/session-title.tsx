"use client";

import { Pencil } from "lucide-react";
import { useState, useTransition } from "react";

import { updateSessionTitle } from "@/lib/actions/sessions";

export function SessionTitle({ sessionId, title, canEdit }: { sessionId: string; title: string | null; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title ?? "");
  const [pending, start] = useTransition();

  if (!canEdit) return title ? <span className="text-base font-normal text-text-2">{title}</span> : null;

  if (editing) {
    return (
      <form
        className="inline-flex"
        onSubmit={(e) => {
          e.preventDefault();
          setEditing(false);
          if (draft.trim() !== (title ?? "")) start(() => updateSessionTitle(sessionId, draft).then(() => undefined));
        }}
      >
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => e.currentTarget.form?.requestSubmit()}
          placeholder="Session title"
          aria-label="Session title"
          className="h-7 w-44 rounded-md border border-border-strong px-2 text-sm font-normal"
        />
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded px-1 text-base font-normal text-text-2 hover:bg-surface hover:text-text"
      aria-label="Edit session title"
    >
      {title || <span className="text-text-3">Add title</span>}
      <Pencil className="size-3 text-text-3" aria-hidden />
    </button>
  );
}
