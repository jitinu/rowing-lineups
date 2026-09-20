"use client";

import { CalendarDays, GitCompareArrows, LogIn, LogOut, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "@/lib/actions/auth";
import type { Viewer } from "@/lib/auth";
import { cn } from "@/lib/cn";

const links = [
  { href: "/sessions", label: "Sessions", icon: CalendarDays },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
  { href: "/roster", label: "Roster", icon: Users },
];

export function AppNav({ viewer }: { viewer: Viewer }) {
  const pathname = usePathname();
  if (pathname.startsWith("/share/")) return null;
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex h-12 w-full max-w-7xl items-center gap-2 px-4 sm:px-6">
        <Link href="/sessions" className="mr-2 flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-block size-2.5 rounded-full bg-accent" aria-hidden />
          Lineups
        </Link>
        <nav className="flex items-center gap-1" aria-label="Primary">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm transition-colors",
                  active ? "bg-surface-2 text-text" : "text-text-2 hover:bg-surface hover:text-text",
                )}
              >
                <Icon className="size-4" aria-hidden />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {viewer.userId ? (
            <>
              {viewer.coach ? (
                <span className="hidden text-xs text-text-2 sm:inline">{viewer.coach.name}</span>
              ) : (
                <span className="rounded border border-border px-1.5 py-0.5 text-[11px] text-text-2">Read only</span>
              )}
              <form action={signOut}>
                <button
                  type="submit"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-text-2 hover:bg-surface hover:text-text"
                  aria-label="Sign out"
                >
                  <LogOut className="size-4" aria-hidden />
                </button>
              </form>
            </>
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-text-2 hover:bg-surface hover:text-text"
            >
              <LogIn className="size-4" aria-hidden />
              <span>Sign in</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
