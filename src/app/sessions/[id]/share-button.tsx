"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui";

export function ShareButton({ sessionId }: { sessionId: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/share/${sessionId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.open(url, "_blank", "noopener");
    }
  }

  return (
    <Button size="sm" variant="ghost" onClick={copy} title="Copy read-only link">
      {copied ? <Check className="size-3.5" aria-hidden /> : <Share2 className="size-3.5" aria-hidden />}
      {copied ? "Copied" : "Share"}
    </Button>
  );
}
