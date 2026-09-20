"use client";

import { Check } from "lucide-react";
import { type ReactNode, useState } from "react";

import { cn } from "@/lib/cn";

export interface MenuItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  checked?: boolean;
  disabled?: boolean;
  /** Draw a divider above this item. */
  group?: boolean;
  onSelect: () => void;
}

/**
 * Small anchored menu. Fixed positioning lets it escape scroll containers.
 * `trigger` receives the toggle handler and open state and must spread `onClick` onto a button.
 */
export function AnchoredMenu({
  items,
  trigger,
  align = "right",
  className,
}: {
  items: MenuItem[];
  trigger: (props: { onClick: (e: React.MouseEvent<HTMLElement>) => void; "aria-haspopup": "menu"; "aria-expanded": boolean }) => ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const [anchor, setAnchor] = useState<{ y: number; up: boolean; x: number } | null>(null);
  const open = anchor !== null;
  const toggle = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (open) return setAnchor(null);
    const r = e.currentTarget.getBoundingClientRect();
    // Open upward when the space below is short (roughly 7 rows at 32px).
    const up = window.innerHeight - r.bottom < 224 && r.top > window.innerHeight - r.bottom;
    setAnchor({
      y: up ? window.innerHeight - r.top + 4 : r.bottom + 4,
      up,
      x: align === "right" ? window.innerWidth - r.right : r.left,
    });
  };
  return (
    <div className={cn("relative shrink-0", className)}>
      {trigger({ onClick: toggle, "aria-haspopup": "menu", "aria-expanded": open })}
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Close menu" onClick={(e) => { e.stopPropagation(); setAnchor(null); }} />
          <ul
            role="menu"
            style={{ ...(anchor.up ? { bottom: anchor.y } : { top: anchor.y }), ...(align === "right" ? { right: anchor.x } : { left: anchor.x }) }}
            className="fixed z-20 max-h-[60vh] min-w-36 overflow-y-auto rounded-md border border-border bg-bg py-1 shadow-md"
          >
            {items.map((it) => (
              <li key={it.key} className={cn(it.group && "mt-1 border-t border-border pt-1")}>
                <button
                  type="button"
                  role={it.checked === undefined ? "menuitem" : "menuitemradio"}
                  aria-checked={it.checked}
                  disabled={it.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    setAnchor(null);
                    it.onSelect();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm whitespace-nowrap hover:bg-surface disabled:opacity-50",
                    it.checked && "font-medium",
                  )}
                >
                  {it.icon ? <span className="flex size-4 items-center justify-center text-text-2">{it.icon}</span> : null}
                  <span className="flex-1">{it.label}</span>
                  {it.checked ? <Check className="size-3.5" aria-hidden /> : null}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
