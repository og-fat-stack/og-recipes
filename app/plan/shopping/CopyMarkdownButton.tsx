"use client";

import { useState } from "react";

export function CopyMarkdownButton({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(markdown);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // ignore
        }
      }}
      className="rounded-full border border-line-strong px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-subtle"
    >
      {copied ? "✓ Kopiert" : "📋 Als Markdown kopieren"}
    </button>
  );
}
