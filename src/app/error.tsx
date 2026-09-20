"use client";

import { Button, EmptyState } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState
      title="Something went wrong"
      hint={error.message || "Try again."}
      action={<Button onClick={reset}>Retry</Button>}
    />
  );
}
