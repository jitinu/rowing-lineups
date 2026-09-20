"use client";

import { useActionState } from "react";

import { Button, ErrorNotice, Input, Label, Spinner } from "@/components/ui";
import { signIn } from "@/lib/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state && !state.ok ? <ErrorNotice message={state.error} /> : null}
      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending ? <Spinner className="text-on-accent" /> : "Sign in"}
      </Button>
    </form>
  );
}
