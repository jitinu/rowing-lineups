import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto mt-12 w-full max-w-sm">
      <h1 className="mb-6 text-lg font-semibold tracking-tight">Sign in</h1>
      <LoginForm next={next} />
    </div>
  );
}
